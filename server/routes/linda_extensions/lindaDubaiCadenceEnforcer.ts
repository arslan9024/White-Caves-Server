export function allowSendAtCurrentHour(hourGST: number): boolean {
  return hourGST >= 9 && hourGST < 20;
}
export default allowSendAtCurrentHour;
