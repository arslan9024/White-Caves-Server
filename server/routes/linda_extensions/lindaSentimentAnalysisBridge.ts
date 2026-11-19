export function detectSentiment(msg: string): string {
  return /interested|call me/i.test(msg) ? 'positive' : 'neutral';
}
export default detectSentiment;
