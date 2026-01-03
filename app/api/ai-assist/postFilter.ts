// app/api/ai-assist/postFilter.ts

export function postFilter<T>(
  comments: T[] | Record<string, T[]>,
  _lines: string[]
): T[] | Record<string, T[]> {
  // 配列の場合
  if (Array.isArray(comments)) {
    return comments;
  }

  // Record の場合：各キーの配列をそのまま返す（まずは型を通す）
  const out: Record<string, T[]> = {};
  for (const [k, arr] of Object.entries(comments ?? {})) {
    out[k] = Array.isArray(arr) ? arr : [];
  }
  return out;
}
