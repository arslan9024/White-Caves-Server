export function checkSpintaxBalance(tpl: string): boolean {
  const open = (tpl.match(/\{/g) || []).length;
  const close = (tpl.match(/\}/g) || []).length;
  return open === close;
}
export default checkSpintaxBalance;
