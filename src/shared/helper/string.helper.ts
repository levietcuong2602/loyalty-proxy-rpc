export const generateRandomString = (
  length: number,
  characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
