export function streamVoiceNoteHeader() {
  return { 'Content-Type': 'audio/ogg; codecs=opus' };
}
export default streamVoiceNoteStreamer;
function streamVoiceNoteStreamer() { return streamVoiceNoteHeader(); }
