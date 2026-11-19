export function checkTemplateBraces(tpl: string): boolean {
  let count = 0;
  for (const ch of tpl) {
    if (ch === '{') count++;
    if (ch === '}') count--;
    if (count < 0) return false;
  }
  return count === 0;
}
export default checkTemplateBraces;
