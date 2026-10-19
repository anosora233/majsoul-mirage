// Resource fingerprints are update signals, not official game version numbers.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const indexUrl = 'https://game.maj-soul.com/assetbundles/DXT/bundle_info_so.majset';
const hash = data => createHash('sha256').update(data).digest('hex');

async function checkUpdate({repository, sourceSha, force = false, request = fetch}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !sourceSha) throw Error('Repository and source SHA are required');
  async function get(url) {
    return request(url, {headers:{'Cache-Control':'no-cache'}, signal:AbortSignal.timeout(60000)});
  }
  const index = await get(indexUrl);
  if (!index.ok) throw Error('Resource index HTTP ' + index.status);
  const current = {sourceSha, resourceIndexSha256:hash(Buffer.from(await index.arrayBuffer()))};
  const release = await get(`https://api.github.com/repos/${repository}/releases/tags/latest`);
  if (release.status === 404) return {update:true, ...current};
  if (!release.ok) throw Error('Release lookup HTTP ' + release.status);
  const {assets} = await release.json();
  const state = assets.find(asset => asset.name === 'resource-version.json');
  if (!state || !assets.some(asset => asset.name === 'majsoul-mirage.user.js')) return {update:true, ...current};
  const response = await get(state.browser_download_url);
  if (!response.ok) throw Error('Release state HTTP ' + response.status);
  const previous = await response.json();
  return {update:force || previous.sourceSha !== sourceSha || previous.resourceIndexSha256 !== current.resourceIndexSha256, ...current};
}

function writeManifest(sourceSha) {
  if (!/^[a-f0-9]{40}$/.test(sourceSha || '')) throw Error('Expected a full source commit SHA');
  const manifest = {
    version:require('../package.json').version,
    sourceSha,
    resourceIndexUrl:indexUrl,
    resourceIndexSha256:hash(fs.readFileSync(path.join(root, '.cache/bundles/bundle_info_so.majset'))),
    userscriptSha256:hash(fs.readFileSync(path.join(root, 'majsoul-mirage.user.js'))),
    builtAt:new Date().toISOString()
  };
  const directory = path.join(root, '.cache/release');
  fs.mkdirSync(directory, {recursive:true});
  fs.writeFileSync(path.join(directory, 'resource-version.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(directory, 'notes.md'), [
    `Automated build of Majsoul Mirage ${manifest.version}.`, '',
    `- Source: ${manifest.sourceSha}`,
    `- Resource index SHA-256: \`${manifest.resourceIndexSha256}\``,
    `- Userscript SHA-256: \`${manifest.userscriptSha256}\``,
    `- Built at: ${manifest.builtAt}`, '',
    'This rolling release replaces previous attachments. Resource fingerprints are not official game version numbers.',
    'Build and automated tests passed; actual game UI compatibility is not guaranteed.',
    'Use at your own risk. Account restrictions, suspension, or permanent bans are possible.'
  ].join('\n') + '\n');
  return manifest;
}

if (require.main === module) {
  (async () => {
    if (process.argv[2] === 'check') {
      const state = await checkUpdate({repository:process.env.GITHUB_REPOSITORY, sourceSha:process.env.GITHUB_SHA,
        force:process.env.FORCE_BUILD === 'true'});
      console.log(JSON.stringify(state));
      if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `update=${state.update}\n`);
    } else if (process.argv[2] === 'manifest') {
      console.log(JSON.stringify(writeManifest(process.env.GITHUB_SHA)));
    } else throw Error('Usage: node scripts/release-resources.cjs check|manifest');
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = {checkUpdate, writeManifest};
