const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {checkUpdate} = require('../scripts/release-resources.cjs');

async function test() {
  const index = Buffer.from('synthetic resource index');
  const sha = createHash('sha256').update(index).digest('hex');
  const sourceSha = 'a'.repeat(40);
  const state = {sourceSha, resourceIndexSha256:sha};
  function request(previous = state, status = 200, missingScript = false) {
    let call = 0;
    return async () => {
      call++;
      if (call === 1) return {ok:true, arrayBuffer:async () => index};
      if (call === 2) return {ok:status === 200, status, json:async () => ({assets:[
        {name:'resource-version.json', browser_download_url:'https://example.invalid/state'},
        ...missingScript ? [] : [{name:'majsoul-mirage.user.js'}]
      ]})};
      return {ok:true, json:async () => previous};
    };
  }
  const check = (options = {}) => checkUpdate({repository:'owner/repository', sourceSha, request:request(), ...options});
  assert.equal((await check()).update, false);
  assert.equal((await check({force:true})).update, true);
  assert.equal((await check({request:request({...state, sourceSha:'b'.repeat(40)})})).update, true);
  assert.equal((await check({request:request({...state, resourceIndexSha256:'old'})})).update, true);
  assert.equal((await check({request:request(state, 404)})).update, true);
  assert.equal((await check({request:request(state, 200, true)})).update, true);
  const withoutState=async url => url.includes('bundle_info')
    ? {ok:true, arrayBuffer:async () => index} : {ok:true, json:async () => ({assets:[]})};
  assert.equal((await check({request:withoutState})).update,true);
  await assert.rejects(check({request:request(state, 403)}), /Release lookup HTTP 403/);
  await assert.rejects(check({request:request(state, 500)}), /Release lookup HTTP 500/);
  await assert.rejects(check({request:async () => ({ok:false, status:503})}), /Resource index HTTP 503/);
  const base=request();
  await assert.rejects(check({request:async (url, options) => url === 'https://example.invalid/state'
    ? {ok:false, status:502} : base(url,options)}), /Release state HTTP 502/);
  console.log('PASS: resource changes, unchanged state, source changes, force, initial release, and network errors');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
