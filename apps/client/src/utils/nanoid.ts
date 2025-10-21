export const nanoid = (size = 12) =>
  Array.from({ length: size }, () => Math.floor(Math.random() * 36).toString(36)).join('');
