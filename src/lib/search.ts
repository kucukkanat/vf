// Accent-, case- and spacing-insensitive text matching for member search.
// "Eşek Sıpası", "esek sipasi" and "eseksipasi" all fold to the same string.

const SPECIAL: Record<string, string> = { ı: 'i', ø: 'o', ß: 'ss', æ: 'ae', œ: 'oe', đ: 'd', ł: 'l', þ: 'th' }

export function fold(s: string | undefined | null): string {
  return (s ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[ıøßæœđłþ]/g, (c) => SPECIAL[c])
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/** True when the folded needle appears in any of the folded fields. */
export function matchesAny(needle: string, fields: (string | undefined | null)[]) {
  const n = fold(needle)
  return !n || fields.some((f) => fold(f).includes(n))
}
