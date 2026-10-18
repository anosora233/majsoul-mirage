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
    version: '0.4.10', active: true, readOnly: false, log: true, debug: false,
    onRequest: null, onResponse: null, onNotify: null,
    stats: { sockets: 0, requests: 0, responses: 0, notifications: 0,
      modified: 0, blocked: 0, synthetic: 0, localNotifications: 0, unsupported: 0, errors: 0 },
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
  function metadata(state, direction, service, method, id) {
    return {connection:state.id,direction,service,method,id,action:'pass'};
  }
  function capture(record, type, payload, phase = 'before') {
    const name = '.lq.'+(record.service ? record.service+'.'+record.method : record.method);
    if (api.debug !== true && !(typeof api.debug === 'string' && api.debug && name.includes(api.debug))) return;
    const snapshot = {bytes:Uint8Array.from(payload)};
    if (type) {
      try { snapshot.message = type.toObject(decode(type,payload),{longs:String,bytes:String,enums:String}); }
      catch (exception) { snapshot.error = exception.name; }
    }
    (record.content ||= {})[phase] = snapshot;
  }
  function dump(record) {
    if (record.content) scope.console.info(format(record)+' — content',record.content);
  }
  function format(record, detail = '') {
    const name = record.service ? record.service+'.'+record.method : record.method || '<unknown>';
    const id = record.id == null ? '' : ' #'+record.id;
    return '[MajsoulWS] '+record.action+' '+record.direction+' '+name
      +' [ws:'+record.connection+id+']'+(detail ? ' — '+detail : '');
  }
  function report(record, action, detail = '') {
    record.action = action;
    if (detail) record.detail = detail;
    if (api.log && (action !== 'pass' || api.log === 'all')) scope.console.info(format(record, detail));
    dump(record);
  }
  function error(state, stage, exception, record) {
    api.stats.errors++;
    // Exception text stays private; explicitly enabled debugging prints captured message snapshots.
    record ||= {connection:state.id,direction:'frame',method:null,id:null};
    record.action = 'error';
    record.detail = stage+' ('+(exception.name || 'Error')+'); original retained';
    scope.console.warn(format(record, record.detail));
    dump(record);
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
    api.stats.requests++;
    const record=metadata(state,'request',service,method,parsed.id);
    capture(record,types?.request,parsed.wrapper.data);
    if(!types){api.stats.unsupported++;return{data,pending,id:parsed.id,record};}
    if(!api.readOnly && typeof api.onRequest!=='function')return{data,pending,id:parsed.id,record};
    let message;
    try { message=decode(types.request,parsed.wrapper.data); }
    catch(exception){error(state,'request decode',exception,record);return{data,pending,id:parsed.id,record};}
    if(api.readOnly)return{data,pending,id:parsed.id,record};
    const context={socket:state.socket,connection:state.id,service,method,id:parsed.id,message};
    let action;
    try { action=call(api.onRequest,context); } catch(exception){error(state,'request hook',exception,record);return{data,pending,id:parsed.id,record};}
    try {
      if(action&&Object.prototype.hasOwnProperty.call(action,'respond')){
        if(!action.respond||typeof action.respond!=='object'||Array.isArray(action.respond))throw new TypeError('Local response must be an object');
        const response=types.response.fromObject(action.respond);
        const wrapper=wrapperType.create({name:'',data:encode(types.response,response)});
        capture(record,types.response,wrapper.data,'response');
        const notifications=(Array.isArray(action.notify) ? action.notify : action.notify ? [action.notify] : []).map(notice=>{
          const type=api.lookupType(notice.name);
          const payload=encode(type,type.fromObject(notice.message || {}));
          return{type,payload,data:packet(1,null,wrapperType.create({name:type.fullName,data:payload}))};
        });
        return{synthetic:packet(3,parsed.id,wrapper),notifications,record};
      }
      if(action===true){
        parsed.wrapper.data=encode(types.request,message);
        capture(record,types.request,parsed.wrapper.data,'after');
        return{data:packet(2,parsed.id,parsed.wrapper),pending,id:parsed.id,modified:true,record};
      }
    } catch(exception) { error(state,'request hook encode',exception,record); }
    return{data,pending,id:parsed.id,record};
  }
  function incoming(state,event) {
    if(!state.active||!api.active||state.syntheticEvents.has(event))return;
    let parsed;
    try{parsed=parse(event.data);}catch(exception){if(state.recognized)error(state,'frame decode',exception);return;}
    if(!parsed)return;
    expire(state);
    let type,context,handler,record;
    if(parsed.kind===3){
      const entry=state.pending.get(parsed.id);if(!entry)return;
      state.pending.delete(parsed.id);api.stats.responses++;
      record=metadata(state,'response',entry.service,entry.method,parsed.id);
      if(!entry.types){api.stats.unsupported++;capture(record,null,parsed.wrapper.data);report(record,'pass');return;}
      type=entry.types.response;handler=api.onResponse;
      context={socket:state.socket,connection:state.id,service:entry.service,method:entry.method,id:parsed.id};
    }else if(parsed.kind===1){
      if(!/^\.lq\.[A-Za-z_][\w.]*$/.test(parsed.wrapper.name))return;
      const name=parsed.wrapper.name.slice(4);
      record=metadata(state,'notify',null,name,null);
      try{type=root.lookupType('lq.'+name);}catch{
        api.stats.unsupported++;capture(record,null,parsed.wrapper.data);report(record,'pass');return;
      }
      state.recognized=true;api.stats.notifications++;
      handler=api.onNotify;
      context={socket:state.socket,connection:state.id,name};
    }else return;
    capture(record,type,parsed.wrapper.data);
    if(!api.readOnly && typeof handler!=='function'){report(record,'pass');return;}
    try{
      context.message=decode(type,parsed.wrapper.data);
      if(api.readOnly || call(handler,context)!==true){report(record,'pass');return;}
      parsed.wrapper.data=encode(type,context.message);
      capture(record,type,parsed.wrapper.data,'after');
      const result=packet(parsed.kind,parsed.id,parsed.wrapper);
      // Shadow the native event's data getter: retain target, ordering, isTrusted and listeners.
      Object.defineProperty(event,'data',{configurable:true,value:result.buffer});
      api.stats.modified++;
      report(record,'modified');
    }catch(exception){error(state,'incoming hook',exception,record);}
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
        api.stats.blocked++;api.stats.synthetic++;
        report(result.record,'blocked',result.notifications.length ? 'local response + notifications queued' : 'local response queued');
        // Unity records its waiting callback after send() returns; defer the local response.
        scope.queueMicrotask(()=>{
          if(!state.active||!api.active||socket.readyState!==NativeSocket.OPEN)return;
          for (const item of [{data:result.synthetic},...result.notifications]) {
            if (!state.active || !api.active || socket.readyState!==NativeSocket.OPEN) break;
            const event=new scope.MessageEvent('message',{data:item.data.buffer,origin:new URL(socket.url).origin});
            state.syntheticEvents.add(event);socket.dispatchEvent(event);
            if (item.type) {
              api.stats.localNotifications++;
              const record=metadata(state,'notify',null,item.type.fullName.slice(4),null);
              capture(record,item.type,item.payload);
              report(record,'local','synthetic notification');
            }
          }
        });
        return;
      }
      const returned=Reflect.apply(nativeSend,this,result.modified?[result.data]:arguments);
      if(result.pending)state.pending.set(result.id,result.pending);
      if(result.modified)api.stats.modified++;
      if(result.record && result.record.action!=='error')report(result.record,result.modified?'modified':'pass');
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
