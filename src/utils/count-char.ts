export function countChar(s: string, c: string) {
  let result = 0;
  for (let i = 0; i < s.length; i++) if (s[i] == c) result++;
  return result;
}
