export function compileSpintaxSample(template: string): string {
  return template.replace(/\{([^{}]+)\}/g, (_, choices) => choices.split('|')[0]);
}
export default compileSpintaxSample;
