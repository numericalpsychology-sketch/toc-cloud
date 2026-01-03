export type AiComment = { severity: "warn" | "crit"; text: string };

/**
 * 最終安全弁の postFilter
 * - TOCクラウドとして「絶対に言ってはいけない」誤爆文言を機械的に除去
 * - 「〜すべきだと感じる」を“要望表現”と誤判定したコメントをピンポイントで除去
 */
export function postFilter(
  comments: Record<string, AiComment[]>,
  lines: Array<{ key: string; text: string }>
): Record<string, AiComment[]> {
  // 100%誤り（ジレンマ正常を問題扱い／DとD'対立を問題扱い）
  const banned = [
    "矛盾する可能性",
    "矛盾する",
    "満たされない",
    "満たせない",
    "DとD’は明確に対立",
    "DとD'は明確に対立",
    "対立しているので",
  ];

  // 「行動が明確」なら、"要望表現" 指摘は誤爆として除去するための判定
  const isClearlyAction = (text: string) => {
    const t = (text ?? "").trim();

    // 「する/しない」を含む、または政策・実施系の動詞があるなら行動とみなす
    const actionish =
      /する|しない|実施|導入|廃止|禁止|許可|無償|有償|増税|減税|拡充|削減|支給|停止|開始|継続/.test(
        t
      );

    // 「べき」は“規範的な行動方針”としてD/D'に許容する
    const normativeAction =
      /すべき|べきだ|べきではない|べきじゃない|すべきではない|すべきでない|と感じる/.test(t);

    return actionish || normativeAction;
  };

  const lineMap: Record<string, string> = Object.fromEntries(
    (lines ?? []).map((l) => [String(l.key), String(l.text ?? "")])
  );

  const out: Record<string, AiComment[]> = {};

  for (const k of Object.keys(comments ?? {})) {
    const arr = Array.isArray(comments[k]) ? comments[k] : [];
    const lineText = lineMap[k] ?? "";

    out[k] = arr.filter((c) => {
      const text = (c?.text ?? "").trim();
      if (!text) return false;

      // 1) banned を含むなら無条件で除去
      if (banned.some((w) => text.includes(w))) return false;

      // 2) 「要望表現（〜すべきだと感じる）になっている」系の誤爆を除去
      //    ただし、その行自体が行動として明確な場合だけ
      const mentionsDesireExpression =
        text.includes("要望表現") ||
        text.includes("要望の表現") ||
        text.includes("要望になっている") ||
        text.includes("〜すべきだと感じる") ||
        text.includes("すべきだと感じる");

      if (mentionsDesireExpression && isClearlyAction(lineText)) return false;

      return true;
    });
  }

  return out;
}
