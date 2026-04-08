/**
 * Hashes a string to an integer in [0, limit).
 * Stable: same input always returns the same index.
 */
export function hashToIndex(str, limit) {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xff
  return h % limit
}
