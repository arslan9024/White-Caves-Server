export function getVoiceStreamHeaders(contentLength: number) {
  return { 'Content-Type': 'audio/ogg; codecs=opus', 'Content-Length': String(contentLength), 'Accept-Ranges': 'bytes' };
}
export default getVoiceStreamHeaders;
