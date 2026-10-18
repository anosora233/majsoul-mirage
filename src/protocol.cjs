// Fields are [name, id, scalar type or message index, repeated packing: 1=true, 2=false].
function unpackProtocol(definitions, services) {
  const schema = {nested:{lq:{nested:{}}}}, methodMap = {service:{}};
  for (const [name, fields] of definitions) {
    const parts = name.split('.');
    let namespace = schema.nested.lq;
    for (const part of parts.slice(0, -1)) namespace = (namespace.nested ||= {})[part] ||= {};
    const message = (namespace.nested ||= {})[parts.at(-1)] ||= {};
    if (parts.length === 1) message.edition = 'proto2';
    message.fields = Object.fromEntries(fields.map(([name, id, type, repeated]) => [name, {
      id, type:typeof type === 'number' ? '.lq.' + definitions[type][0] : type,
      ...(repeated ? {rule:'repeated', options:{packed:repeated === 1}} : {})
    }]));
  }
  for (const [service, methods] of Object.entries(services)) {
    methodMap.service[service] = Object.fromEntries(Object.entries(methods)
      .map(([name, [request, response]]) => [name, {
        request:definitions[request][0], response:definitions[response][0]
      }]));
  }
  return {schema, methodMap};
}
module.exports = {unpackProtocol};
