const t = (s: string) => (s ?? "").trim();

export function normalizeDesire(raw: string): string {
  let s = t(raw);
  if (!s) return "";

  // 代表的な否定形 → 肯定形（自然に）
  // 「〜を失いたくない」→「〜を失わない」
  s = s.replace(/を失いたくない$/, "を失わない");

  // 「〜したくない」→「〜しない」
  s = s.replace(/したくない$/, "しない");

  // 「〜なりたくない」→「〜にならない」
  s = s.replace(/なりたくない$/, "にならない");

  // 「〜たくない」→「〜ない」（汎用）
  s = s.replace(/たくない$/, "ない");

  // 「〜したい」→「〜する」
  s = s.replace(/したい$/, "する");

  // 「〜たい」→ 終止形へ（五段/一段の雑だが強い変換）
  if (s.endsWith("たい")) {
    let stem = s.replace(/たい$/, ""); // 例: かせぎ / みまくり / たべ
    // 末尾が「い段ひらがな」なら「う段」に戻す（五段）
    const map: Record<string, string> = {
      "き": "く",
      "ぎ": "ぐ",
      "し": "す",
      "ち": "つ",
      "に": "ぬ",
      "び": "ぶ",
      "み": "む",
      "り": "る",
      "い": "う",
    };
    const last = stem.slice(-1);
    if (map[last]) {
      stem = stem.slice(0, -1) + map[last]; // かせぎ→かせぐ、みまくり→みまくる
      s = stem;
    } else {
      // 一段っぽい：たべ→たべる / み→みる 等
      s = stem + "る";
    }
  }


  // 末尾が名詞っぽい場合は補う（保険）
  // 例：「スピード感」→「スピード感を大事にする」
  if (!/る$|う$|す$|ない$|する$/.test(s)) {
    // 「〜を…」が既に入っているなら「〜を保つ」に寄せる
    if (s.includes("を")) return s;
    return `${s}を大事にする`;
  }

  return s;
}

