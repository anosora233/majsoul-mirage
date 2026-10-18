/* Business-object hooks over the browser's native WebSocket events.
 * The client-supplied schema and method map are injected by the build entry.
 * protobuf.js handles encoding, 64-bit values and unknown-field preservation.
 */
function installWebSocketHook(scope, protobuf, schema, methodMap) {
  if (scope.majsoulWS) return scope.majsoulWS;
  const NativeSocket = scope.WebSocket;
  if (typeof NativeSocket !== 'function') throw new Error('Native WebSocket unavailable');
  const root = schema.lookupType ? schema : protobuf.Root.fromJSON(schema).resolveAll();
  const wrapperType = root.lookupType('lq.Wrapper');
  const sockets = new Map();
  const MAX_PENDING = 4096, TIMEOUT = 120000, MAX_FRAME = 16 * 1024 * 1024;
  const api = {
    version: '0.4.2', active: true, log: false,
    onRequest: null, onResponse: null, onNotify: null,
    stats: { sockets: 0, requests: 0, responses: 0, notifications: 0,
      modified: 0, synthetic: 0, unsupported: 0, errors: 0 },
    recent: [],
    lookupType(name) { return root.lookupType(name.startsWith('.') ? name : 'lq.' + name); },
    createRequest(service, method, object = {}) {
      const pair = getTypes(service, method);
      if (!pair) throw new Error('Unknown request type: ' + service + '.' + method);
      return pair.request.fromObject(object);
    },
    createResponse(service, method, object = {}) {
      const pair = getTypes(service, method);
      if (!pair) throw new Error('Unknown response type: ' + service + '.' + method);
      return pair.response.fromObject(object);
    },
    connections() { return Array.from(sockets.values(), s => ({id:s.id, recognized:s.recognized, pending:s.pending.size})); },
    uninstall() {
      api.active = false;
      if (scope.WebSocket === WrappedSocket) scope.WebSocket = NativeSocket;
      for (const state of Array.from(sockets.values())) cleanup(state);
      if (scope.majsoulWS === api) delete scope.majsoulWS;
    }
  };
  const typeCache = new Map();
  function getTypes(service, method) {
    const key = service + '.' + method;
    if (typeCache.has(key)) return typeCache.get(key);
    const mapping = methodMap.service[service]?.[method];
    let pair = null;
    if (mapping) {
      try { pair = {request:api.lookupType(mapping.request),response:api.lookupType(mapping.response)}; } catch { /* Client map includes unavailable debug types. */ }
    }
    typeCache.set(key,pair); return pair;
  }
  function bytes(data) {
    if (Object.prototype.toString.call(data)==='[object ArrayBuffer]') return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
    return null; // The inspected Unity bridge uses ArrayBuffer/typed-array messages.
  }
  function decode(type, data) {
    const reader = protobuf.Reader.create(data);
    reader.discardUnknown = false;
    return type.decode(reader);
  }
  function encode(type, message) {
    const error = type.verify(message);
    if (error) throw new Error('Invalid ' + type.fullName + ': ' + error);
    return type.encode(message).finish();
  }
  function packet(kind, id, wrapper) {
    const body = wrapperType.encode(wrapper).finish();
    const header = kind === 1 ? 1 : 3, result = new Uint8Array(header + body.length);
    result[0] = kind;
    if (header === 3) new DataView(result.buffer).setUint16(1,id,true);
    result.set(body,header);return result;
  }
  function parse(data) {
    const b = bytes(data);
    if (!b || b.length < 1 || b.length > MAX_FRAME || ![1,2,3].includes(b[0])) return null;
    const kind = b[0], header = kind === 1 ? 1 : 3;
    if (b.length < header) return null;
    return {kind,id:header===3?new DataView(b.buffer,b.byteOffset,b.byteLength).getUint16(1,true):null,
      wrapper:decode(wrapperType,b.subarray(header))};
  }
  function remember(state, direction, service, method, id) {
    api.recent.push({connection:state.id,direction,service,method,id});
    if (api.recent.length > 100) api.recent.shift();
    if (api.log) scope.console.info('[MajsoulWS]',direction,service ? service+'.'+method : method,id);
  }
  function error(state, stage, exception) {
    api.stats.errors++;
    // Do not log frames, login tokens, decoded account objects or user callbacks' messages.
    scope.console.warn('[MajsoulWS]',stage,'failed; original message retained.',{connection:state.id,error:exception.name||'Error'});
  }
  function expire(state) {
    const now=Date.now();
    for(const [id,entry] of state.pending)if(now-entry.created>TIMEOUT)state.pending.delete(id);
    while(state.pending.size>=MAX_PENDING)state.pending.delete(state.pending.keys().next().value);
  }
  function call(handler, context) {
    if (typeof handler !== 'function') return undefined;
    const action=handler(context);
    if (action && typeof action.then==='function') throw new TypeError('WebSocket business hooks must be synchronous');
    return action;
  }
  function outgoing(state,data) {
    const parsed=parse(data);
    if (!parsed || parsed.kind!==2) return {data};
    const match=/^\.lq\.([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)$/.exec(parsed.wrapper.name);
    if(!match)return{data};
    state.recognized=true;expire(state);
    const service=match[1],method=match[2],types=getTypes(service,method);
    const pending={service,method,types,created:Date.now()};
    api.stats.requests++;remember(state,'request',service,method,parsed.id);
    if(!types){api.stats.unsupported++;return{data,pending,id:parsed.id};}
    if(typeof api.onRequest!=='function')return{data,pending,id:parsed.id};
    const message=decode(types.request,parsed.wrapper.data);
    const context={socket:state.socket,connection:state.id,service,method,id:parsed.id,message};
    let action;
    try { action=call(api.onRequest,context); } catch(exception){error(state,'request hook',exception);return{data,pending,id:parsed.id};}
    try {
      if(action&&Object.prototype.hasOwnProperty.call(action,'respond')){
        if(!action.respond||typeof action.respond!=='object'||Array.isArray(action.respond))throw new TypeError('Local response must be an object');
        const response=types.response.fromObject(action.respond);
        const wrapper=wrapperType.create({name:'',data:encode(types.response,response)});
        return{synthetic:packet(3,parsed.id,wrapper)};
      }
      if(action===true){parsed.wrapper.data=encode(types.request,message);return{data:packet(2,parsed.id,parsed.wrapper),pending,id:parsed.id,modified:true};}
    } catch(exception) { error(state,'request hook encode',exception); }
    return{data,pending,id:parsed.id};
  }
  function incoming(state,event) {
    if(!state.active||!api.active||state.syntheticEvents.has(event))return;
    let parsed;
    try{parsed=parse(event.data);}catch(exception){if(state.recognized)error(state,'frame decode',exception);return;}
    if(!parsed)return;
    expire(state);
    let type,context,handler;
    if(parsed.kind===3){
      const entry=state.pending.get(parsed.id);if(!entry)return;
      state.pending.delete(parsed.id);api.stats.responses++;
      remember(state,'response',entry.service,entry.method,parsed.id);
      if(!entry.types){api.stats.unsupported++;return;}
      type=entry.types.response;handler=api.onResponse;
      context={socket:state.socket,connection:state.id,service:entry.service,method:entry.method,id:parsed.id};
    }else if(parsed.kind===1){
      if(!/^\.lq\.[A-Za-z_][\w.]*$/.test(parsed.wrapper.name))return;
      const name=parsed.wrapper.name.slice(4);
      try{type=root.lookupType('lq.'+name);}catch{api.stats.unsupported++;return;}
      state.recognized=true;api.stats.notifications++;
      remember(state,'notify',null,name,null);handler=api.onNotify;
      context={socket:state.socket,connection:state.id,name};
    }else return;
    if(typeof handler!=='function')return;
    try{
      context.message=decode(type,parsed.wrapper.data);
      if(call(handler,context)!==true)return;
      parsed.wrapper.data=encode(type,context.message);
      const result=packet(parsed.kind,parsed.id,parsed.wrapper);
      // Shadow the native event's data getter: retain target, ordering, isTrusted and listeners.
      Object.defineProperty(event,'data',{configurable:true,value:result.buffer});
      api.stats.modified++;
    }catch(exception){error(state,'incoming hook',exception);}
  }
  function cleanup(state){
    state.active=false;state.pending.clear();
    state.socket.removeEventListener('message',state.receive,{capture:true});
    state.socket.removeEventListener('close',state.close);
    if(state.socket.send===state.send){
      if(state.sendDescriptor)Object.defineProperty(state.socket,'send',state.sendDescriptor);
      else delete state.socket.send;
    }
    sockets.delete(state.socket);
  }
  function attach(socket){
    const nativeSend=socket.send;
    const state={socket,id:++api.stats.sockets,active:true,recognized:false,pending:new Map(),syntheticEvents:new WeakSet(),sendDescriptor:Object.getOwnPropertyDescriptor(socket,'send')};
    state.receive=event=>incoming(state,event);
    state.close=()=>cleanup(state);
    socket.addEventListener('message',state.receive,true);
    socket.addEventListener('close',state.close);
    state.send=function(data){
      if(this!==socket||!state.active||!api.active||socket.readyState!==NativeSocket.OPEN)return Reflect.apply(nativeSend,this,arguments);
      let result;
      try{result=outgoing(state,data);}catch(exception){error(state,'request decode/encode',exception);return Reflect.apply(nativeSend,this,arguments);}
      if(result.synthetic){
        if(socket.readyState!==NativeSocket.OPEN)return Reflect.apply(nativeSend,this,arguments);
        api.stats.synthetic++;
        // Unity records its waiting callback after send() returns; defer the local response.
        scope.queueMicrotask(()=>{
          if(!state.active||!api.active||socket.readyState!==NativeSocket.OPEN)return;
          const event=new scope.MessageEvent('message',{data:result.synthetic.buffer,origin:new URL(socket.url).origin});
          state.syntheticEvents.add(event);socket.dispatchEvent(event);
        });
        return;
      }
      const returned=Reflect.apply(nativeSend,this,result.modified?[result.data]:arguments);
      if(result.pending)state.pending.set(result.id,result.pending);
      if(result.modified)api.stats.modified++;
      return returned;
    };
    socket.send=state.send;sockets.set(socket,state);
  }
  const WrappedSocket=new Proxy(NativeSocket,{construct(target,args,newTarget){const socket=Reflect.construct(target,args,newTarget);attach(socket);return socket;}});
  scope.majsoulWS=api;scope.WebSocket=WrappedSocket;
  scope.console.info('[MajsoulWS] hook.ready',api.version);
  return api;
}
module.exports={installWebSocketHook};
