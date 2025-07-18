export function getChunks<T>(list: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    chunks.push(list.slice(i, i + chunkSize));
  }
  return chunks;
}
