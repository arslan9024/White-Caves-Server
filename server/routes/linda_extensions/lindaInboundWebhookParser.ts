export function parseInboundEvent(body: any) {
  return { jid: body.jid, message: body.text, fromMe: Boolean(body.fromMe) };
}
export default parseInboundEvent;
