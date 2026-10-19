const assert=require('node:assert/strict'),fs=require('node:fs');
const protobuf=require('protobufjs');
protobuf.util.Long=require('long');protobuf.configure();
const schema=require('../data/game-protocol.json'),map=require('../data/proto-config.json');
const {installWebSocketHook}=require('../src/websocket-core.cjs');
const root=protobuf.Root.fromJSON(schema).resolveAll(),wrapper=root.lookupType('lq.Wrapper');
const type=name=>root.lookupType('lq.'+name);
const raw=(t,obj)=>t.encode(t.fromObject(obj)).finish();
const concat=(...a)=>Buffer.concat(a.map(b=>Buffer.from(b)));
function frame(kind,id,name,data,extra){const body=concat(raw(wrapper,{name,data}),extra||[]),header=Buffer.alloc(kind===1?1:3);header[0]=kind;if(kind!==1)header.writeUInt16LE(id,1);return concat(header,body);}
const request=(id,s,m,obj={})=>frame(2,id,'.lq.'+s+'.'+m,raw(type(map.service[s][m].request),obj));
const response=(id,s,m,obj={})=>frame(3,id,'',raw(type(map.service[s][m].response),obj));
function decodeFrame(data){const b=Buffer.from(data),head=b[0]===1?1:3;const r=protobuf.Reader.create(b.subarray(head));r.discardUnknown=false;return {kind:b[0],id:head===3?b.readUInt16LE(1):null,wrapper:wrapper.decode(r)};}
function decode(t,data){const r=protobuf.Reader.create(data);r.discardUnknown=false;return t.decode(r);}
class NativeSocket extends EventTarget {
  static OPEN=1; static CONNECTING=0; static CLOSED=3;
  constructor(url){super();this.url=url;this.readyState=1;this.sent=[];this._handler=null;}
  get onmessage(){return this._handler;}
  set onmessage(fn){if(this._handler)this.removeEventListener('message',this._handler);this._handler=fn;if(fn)this.addEventListener('message',fn);}
  send(data){if(this.readyState===0)throw new DOMException('Connecting','InvalidStateError');if(this.readyState===3)return;this.sent.push(data);}
  receive(data){const b=Buffer.from(data);const event=new MessageEvent('message',{data:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)});this.dispatchEvent(event);return event;}
  close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
}
async function test(){
  const tasks=[],output=[],logs=[],warnings=[],scope={WebSocket:NativeSocket,MessageEvent,queueMicrotask,setTimeout(callback,delay){assert.equal(delay,0);tasks.push(callback);},console:{info(...a){output.push(a);logs.push(a.join(' '));},warn(...a){warnings.push(a.join(' '));}}};
  const api=installWebSocketHook(scope,protobuf,root,map);
  assert.equal(api.log,true);logs.length=0;
  assert.equal(api.debug,false);assert(!('recent' in api));
  assert.equal(installWebSocketHook(scope,protobuf,schema,map),api);
  assert.equal(scope.WebSocket.OPEN,NativeSocket.OPEN);
  const a=new scope.WebSocket('wss://example.invalid/a'),b=new scope.WebSocket('wss://example.invalid/b');
  assert(a instanceof NativeSocket);
  let received;const events=[];
  a.onmessage=function(e){assert.equal(this,a);received=e.data;events.push(e);};
  let other; a.addEventListener('message',e=>{other=e.data;});
  // Native send gets the identical typed-array object in default pass-through mode.
  const q=request(7,'Lobby','fetchInfo');a.send(q);assert.equal(a.sent.at(-1),q);
  const passthrough=response(7,'Lobby','fetchInfo',{character_info:{main_character_id:200007}});
  const event=a.receive(passthrough);assert.equal(event.data,received);assert.deepEqual(Buffer.from(received),passthrough);
  assert.deepEqual(logs,[],'Ordinary traffic must be quiet by default');
  // Unknown nested/root/wrapper fields must survive a business object mutation.
  const unknown=protobuf.Writer.create().uint32(900*8).uint64('9007199254740993').finish();
  const account=concat(raw(type('Account'),{account_id:1,title:2}),unknown);
  const login=concat(raw(type('ResLogin'),{account_id:1}),protobuf.Writer.create().uint32((type('ResLogin').fields.account.id<<3)|2).bytes(account).finish(),unknown);
  api.onResponse=ctx=>{if(ctx.method==='login'){assert.equal(ctx.message.account.title,2);ctx.message.account.title=99;return true;}};
  a.send(request(8,'Lobby','login'));
  const modified=a.receive(frame(3,8,'',login,unknown));
  assert.equal(modified,events.at(-1));assert.equal(modified.data,other);
  const parsed=decodeFrame(received),decoded=decode(type('ResLogin'),parsed.wrapper.data);
  assert.equal(decoded.account.title,99);assert.deepEqual(Buffer.from(decoded.$unknowns[0]),Buffer.from(unknown));
  assert.deepEqual(Buffer.from(decoded.account.$unknowns[0]),Buffer.from(unknown));
  assert.deepEqual(Buffer.from(parsed.wrapper.$unknowns[0]),Buffer.from(unknown));
  assert.equal(logs.at(-1),'[MajsoulWS] modified response Lobby.login [ws:1 #8]');
  // Connection-local request ID matching, including out-of-order responses.
  const matched=[];api.onResponse=ctx=>{matched.push([ctx.connection,ctx.method]);};
  a.send(request(9,'Lobby','fetchInfo'));b.send(request(9,'FastTest','authGame'));
  b.receive(response(9,'FastTest','authGame'));a.receive(response(9,'Lobby','fetchInfo'));
  assert.deepEqual(matched,[[2,'authGame'],[1,'fetchInfo']]);
  // 64-bit integer precision uses long, including a request rewrite.
  api.onRequest=ctx=>{assert.equal(ctx.message.timestamp.toString(),'9007199254740993');ctx.message.platform='hook';return true;};
  a.send(request(10,'Route','requestConnection',{timestamp:'9007199254740993',platform:'original'}));
  let sent=decodeFrame(a.sent.at(-1)),payload=decode(type('ReqRequestConnection'),sent.wrapper.data);
  assert.equal(payload.timestamp.toString(),'9007199254740993');assert.equal(payload.platform,'hook');
  assert.equal(logs.at(-1),'[MajsoulWS] modified request Route.requestConnection [ws:1 #10]');
  // Local responses use a microtask; request waiting callbacks are registered after send returns.
  api.onRequest=ctx=>ctx.method==='useTitle'?{respond:{}}:undefined;
  let waiting=false,localResponse;
  a.onmessage=e=>{if(decodeFrame(e.data).id===11){assert(waiting);localResponse=decodeFrame(e.data);}};
  const before=a.sent.length;a.send(request(11,'Lobby','useTitle',{title:5}));waiting=true;
  assert.equal(a.sent.length,before);assert.equal(localResponse,undefined);await Promise.resolve();assert.equal(localResponse.id,11);
  assert.equal(logs.at(-1),'[MajsoulWS] intercepted request Lobby.useTitle [ws:1 #11] — local response queued');
  assert.equal(api.stats.blocked,1);
  // Notification modifications are visible to native onmessage AND addEventListener.
  api.onNotify=ctx=>{assert.equal(ctx.name,'NotifyAccountUpdate');delete ctx.message.update.character;return true;};
  a.onmessage=e=>{received=e.data;};
  a.receive(frame(1,null,'.lq.NotifyAccountUpdate',raw(type('NotifyAccountUpdate'),{update:{character:{}}})));
  const notice=decode(type('NotifyAccountUpdate'),decodeFrame(received).wrapper.data);
  assert(!Object.prototype.hasOwnProperty.call(notice.update,'character'));assert.equal(other,received);
  assert.equal(logs.at(-1),'[MajsoulWS] modified notify NotifyAccountUpdate [ws:1]');
  // Exceptions do not leak callback details or rewrite original requests/responses.
  api.onRequest=()=>{throw new Error('private token should not appear');};
  const bad=request(12,'Lobby','fetchInfo');a.send(bad);assert.equal(a.sent.at(-1),bad);
  api.onResponse=()=>{throw new Error('private account should not appear');};
  const fallback=response(12,'Lobby','fetchInfo');a.receive(fallback);assert.deepEqual(Buffer.from(received),fallback);
  assert(warnings.at(-1).includes('error response Lobby.fetchInfo [ws:1 #12]'));
  assert(!JSON.stringify([logs,warnings]).includes('private'));
  // Unsupported methods, malformed traffic and normal textual sockets pass unchanged.
  api.onRequest=null;api.onResponse=null;api.onNotify=null;
  const unsupported=frame(2,13,'.lq.Lobby.futureMethod',[]);a.send(unsupported);assert.equal(a.sent.at(-1),unsupported);
  const unknownResponse=frame(3,13,'',[]);a.receive(unknownResponse);assert.deepEqual(Buffer.from(received),unknownResponse);
  a.send('ordinary non-game message');assert.equal(a.sent.at(-1),'ordinary non-game message');
  a.send(new Uint8Array([2,0,0,255]));
  // Logging modes change output only; the API keeps counters but no message queue.
  api.log=false;api.onResponse=ctx=>{ctx.message.character_info.main_character_id=200001;return true;};
  const quiet=logs.length;a.send(request(14,'Lobby','fetchInfo'));
  a.receive(response(14,'Lobby','fetchInfo',{character_info:{main_character_id:200007}}));
  assert.equal(logs.length,quiet);
  api.log='all';api.onResponse=null;
  a.send(request(15,'Lobby','fetchInfo'));a.receive(response(15,'Lobby','fetchInfo'));
  assert.deepEqual(logs.slice(-2),['[MajsoulWS] pass request Lobby.fetchInfo [ws:1 #15]',
    '[MajsoulWS] pass response Lobby.fetchInfo [ws:1 #15]']);
  api.log=true;api.onRequest=()=>({respond:{}});
  const malformed=frame(2,16,'.lq.Lobby.useTitle',[255]),beforeDecode=logs.length;
  a.send(malformed);assert.equal(a.sent.at(-1),malformed);
  assert.equal(logs.length,beforeDecode,'Failed decode must not claim a block or modification');
  assert(warnings.at(-1).includes('request Lobby.useTitle [ws:1 #16]'));
  // Targeted content debugging prints detached before/after snapshots, without retaining a queue.
  api.debug='.lq.Lobby.fetchInfo';api.log=false;api.onRequest=null;
  api.onResponse=ctx=>{ctx.message.character_info.main_character_id=200001;return true;};
  const debugStart=output.length;
  const original=response(18,'Lobby','fetchInfo',{character_info:{main_character_id:200007}});
  a.send(request(18,'Lobby','fetchInfo'));a.receive(original);
  const snapshots=output.slice(debugStart).filter(entry=>typeof entry[0] === 'object');
  assert.equal(snapshots.length,2);
  const snapshot=snapshots.find(entry=>entry[0].direction === 'response')[0];
  assert.equal(snapshot.before.character_info.main_character_id,200007);
  assert.equal(snapshot.after.character_info.main_character_id,200001);
  assert.equal(snapshot.name,'.lq.Lobby.fetchInfo');assert.equal(snapshot.action,'modified');assert(!('bytes' in snapshot.before));
  assert(!('content' in api));assert(!('recent' in api));
  const filtered=output.length;
  a.send(request(19,'Lobby','useTitle',{title:7}));a.receive(response(19,'Lobby','useTitle'));
  assert.equal(output.length,filtered,'The content filter must suppress unrelated messages');
  api.debug='broadcastInGame';
  const localNotice={seat:2,content:'{"emo_id":70004}'};
  api.onRequest=()=>({respond:{},notify:{name:'NotifyGameBroadcast',message:localNotice}});
  const blockedStart=output.length;
  a.send(request(20,'FastTest','broadcastInGame',{content:'{"emo":9}'}));await Promise.resolve();
  const blocked=output.slice(blockedStart).find(entry=>typeof entry[0] === 'object')[0];
  assert.equal(blocked.request.content,'{"emo":9}');assert.deepEqual(blocked.response,{});
  assert.equal(blocked.action,'intercepted');assert.equal(blocked.id,20);
  assert.deepEqual(blocked.notifications,[{name:'.lq.NotifyGameBroadcast',message:{seat:2,content:'{"emo_id":70004}'}}]);
  localNotice.seat=3;assert.equal(blocked.notifications[0].message.seat,2);
  assert(output.slice(blockedStart).filter(entry=>typeof entry[0] === 'object').every(entry=>entry.length===1));
  api.debug=true;api.onRequest=null;api.onResponse=null;
  const rawStart=output.length,opaque=Buffer.from([255,0,1]);
  a.send(frame(2,21,'.lq.Lobby.futureMethod',opaque));
  const rawSnapshot=output.slice(rawStart).find(entry=>typeof entry[0] === 'object')[0];
  assert.deepEqual(Buffer.from(rawSnapshot.message.bytes),opaque);
  api.debug=false;
  const stopped=output.length;a.send(request(22,'Lobby','fetchInfo'));a.receive(response(22,'Lobby','fetchInfo'));
  assert.equal(output.length,stopped);
  // Read-only inspection retains decoding and matching without invoking business hooks.
  api.readOnly=true;api.debug=true;
  const decodes={},restore=[];
  for(const name of ['ReqUseTitle','ResCommon','NotifyAccountUpdate']){
    const messageType=type(name);messageType.decode(new Uint8Array());
    const originalDecode=messageType.decode;
    messageType.decode=function(...args){decodes[name]=(decodes[name] || 0)+1;return originalDecode.apply(this,args);};
    restore.push(()=>{messageType.decode=originalDecode;});
  }
  const baseline={...api.stats},inspection=output.length;
  api.onRequest=api.onResponse=api.onNotify=()=>{throw Error('Read-only invoked a business hook');};
  const readRequest=request(23,'Lobby','useTitle',{title:7});
  a.send(readRequest);assert.equal(a.sent.at(-1),readRequest);
  const readResponse=response(23,'Lobby','useTitle');a.receive(readResponse);
  assert.deepEqual(Buffer.from(received),readResponse);
  const readNotice=frame(1,null,'.lq.NotifyAccountUpdate',raw(type('NotifyAccountUpdate'),{update:{character:{}}}));
  a.receive(readNotice);assert.deepEqual(Buffer.from(received),readNotice);
  await Promise.resolve();
  for(const key of ['modified','blocked','synthetic','localNotifications','errors'])assert.equal(api.stats[key],baseline[key]);
  assert.equal(api.stats.requests,baseline.requests+1);assert.equal(api.stats.responses,baseline.responses+1);
  assert.equal(api.stats.notifications,baseline.notifications+1);
  const inspected=output.slice(inspection).filter(entry=>typeof entry[0] === 'object');
  assert.equal(inspected.length,3);assert.equal(inspected[0][0].message.title,7);
  assert(inspected.every(entry=>!entry[0].after && !entry[0].response));
  assert.deepEqual(decodes,{ReqUseTitle:1,ResCommon:1,NotifyAccountUpdate:1},'Debug inspection reuses decoded messages');
  restore.forEach(reset=>reset());
  api.readOnly=false;api.debug=false;api.onRequest=()=>({respond:{}});
  const resumed=a.sent.length;a.send(request(24,'Lobby','useTitle',{title:7}));
  assert.equal(a.sent.length,resumed);await Promise.resolve();
  // A malformed known-local request is blocked before its business hook runs.
  api.localMethods.add('Lobby.useTitle');
  const localSent=a.sent.length;
  a.send(frame(2,25,'.lq.Lobby.useTitle',[255]));await Promise.resolve();
  assert.equal(a.sent.length,localSent);
  assert.equal(decode(type('ResCommon'),decodeFrame(received).wrapper.data).error.code,1);
  // Error replies do not depend on the failed normal response encoder.
  const responseType=type('ResCommon'), responseEncoder=responseType.encode;
  responseType.encode=()=>{throw Error('Response encoder failed');};
  a.send(request(26,'Lobby','useTitle',{title:1}));await Promise.resolve();
  responseType.encode=responseEncoder;
  assert.equal(a.sent.length,localSent);
  assert.equal(decode(type('ResCommon'),decodeFrame(received).wrapper.data).error.code,1);
  // Notifications attached to real responses arrive after native response listeners.
  api.onRequest=null;
  api.onResponse=ctx=>{ctx.notify={name:'NotifyGameBroadcast',message:{seat:2,content:'{"emo_id":70004}'}};return true;};
  api.onNotify=()=>{throw Error('Synthetic notification entered incoming hooks');};
  const responseEvents=[], trackResponse=event=>responseEvents.push(decodeFrame(event.data).kind);
  a.addEventListener('message',trackResponse);
  const beforeResponseErrors=api.stats.errors;
  a.send(request(27,'Lobby','fetchInfo'));a.receive(response(27,'Lobby','fetchInfo'));
  assert.deepEqual(responseEvents,[3]);
  assert.equal(decodeFrame(received).kind,3);
  await Promise.resolve();
  assert.deepEqual(responseEvents,[3],'Inbound notifications must wait beyond the microtask checkpoint');
  assert.equal(tasks.length,1);tasks.shift()();
  assert.deepEqual(responseEvents,[3,1]);
  assert.equal(decodeFrame(received).wrapper.name,'.lq.NotifyGameBroadcast');
  assert.equal(api.stats.errors,beforeResponseErrors);
  a.removeEventListener('message',trackResponse);
  // A native send failure must not be reported as a successful modification.
  class BrokenSocket extends NativeSocket { send(){throw Error('Native send failed');} }
  const failedScope={WebSocket:BrokenSocket,MessageEvent,queueMicrotask,console:scope.console};
  const failedApi=installWebSocketHook(failedScope,protobuf,schema,map);
  failedApi.onRequest=ctx=>{ctx.message.title=2;return true;};
  const failedSocket=new failedScope.WebSocket('wss://example.invalid/fail'),beforeSend=logs.length;
  assert.throws(()=>failedSocket.send(request(17,'Lobby','useTitle',{title:1})),/Native send failed/);
  assert.equal(logs.length,beforeSend);assert.equal(failedApi.stats.modified,0);failedApi.uninstall();
  // Native errors, close cleanup and restoring original API surface.
  const c=new scope.WebSocket('wss://example.invalid/c');c.readyState=0;assert.throws(()=>c.send(request(1,'Lobby','fetchInfo')),/Connecting/);
  assert.equal(api.connections().find(x=>x.id===3).pending,0);c.close();b.close();
  assert.equal(api.connections().length,1);
  api.uninstall();assert.equal(scope.WebSocket,NativeSocket);assert.equal(scope.majsoulWS,undefined);
  assert.equal(Object.hasOwn(a,'send'),false);a.send(q);assert.equal(a.sent.at(-1),q);
  console.log('PASS: native event delivery, per-socket IDs, PB mutations, unknown nested fields, int64, synthetic replies, notifications, fail-through, cleanup');

}
test().catch(e=>{console.error(e);process.exitCode=1;});
