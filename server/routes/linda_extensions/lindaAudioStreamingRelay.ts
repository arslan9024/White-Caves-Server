export function getAudioRelayHeaders() {
  return { 'Cache-Control': 'public, max-age=86400', 'Accept-Ranges': 'bytes' };
}
export default getAudioRelayHeaders;
