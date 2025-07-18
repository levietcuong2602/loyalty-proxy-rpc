export function isMilliseconds(timestamp: number): boolean {
  const timestampLength = timestamp.toString().length;
  const isMilliseconds = timestampLength > 10;
  return isMilliseconds;
}
