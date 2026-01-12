import { normalizeDesire } from "./cloud.normalize";

type Token = "A" | "B" | "C" | "D" | "Dprime";
export type LineKey = "1" | "2" | "3" | "4" | "5" | "6";

export type ReadAloudLine = {
  key: LineKey;
  text: string;
  speakText: string;
  highlightTokens: Token[];
};

export type ReadAloudMode = "adult" | "kids";

export type ReadAloudVM = {
  lines: ReadAloudLine[];
};

const jp = (s: string) => (s ?? "").trim();

const SAFE_BREAK_MIN = 20;
const hasPunctuation = (s: string) => /[、。]/.test(s);

function addOnePauseIfLong(s: string): string {
  const t = jp(s);
  if (!t) return t;
  if (t.length <= SAFE_BREAK_MIN) return t;
  if (hasPunctuation(t)) return t;

  const candidates = ["ために", "ので", "から", "けど", "が", "と", "や", "または", "および"];
  const start = Math.floor(t.length * 0.35);
  const end = Math.floor(t.length * 0.7);

  let bestIdx = -1;
  let bestLen = 0;

  for (const c of candidates) {
    const idx = t.indexOf(c);
    if (idx === -1) continue;
    if (idx < start || idx > end) continue;
    if (c.length > bestLen) {
      bestLen = c.length;
      bestIdx = idx + c.length;
    }
  }

  const cut = bestIdx !== -1 ? bestIdx : Math.floor(t.length / 2);
  return t.slice(0, cut) + "、" + t.slice(cut);
}

function tidy(s: string): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

function looksLikeVerbPhrase(s: string): boolean {
  const t = (s ?? "").trim();

  // 代表的な動詞語尾（五段を含めて広めに）
  if (/(する|しない|できる|なる|ある|いる|ない|れる|られる|ている|た|ます|です)$/.test(t)) return true;

  // 五段の終止形：…う/く/ぐ/す/つ/ぬ/ぶ/む/る
  if (/[うくぐすつぬぶむる]$/.test(t)) return true;

  return false;
}




function normalizeForTameNiha(left: string): string {
  let x = tidy(left).replace(/\s+$/, "");
  if (!x) return x;

  // すでに「ため」「ために」「ためには」まで書いていたら、そのまま使う
  if (x.includes("ためには")) return x.replace(/、?$/, "");
  if (x.includes("ために")) return x.replace(/、?$/, "");
  if (x.includes("のため")) return x.replace(/、?$/, "");

  // 末尾の助詞を落とす（「幸せな人生を」→「幸せな人生」）
  x = x.replace(/[をがにへでと]$/, "");

  return x;
}

function joinTameNiha(left: string): string {
  const x = normalizeForTameNiha(left);
  if (!x) return "ためには、";

  // 動詞句なら「の」を付けない / 名詞なら「の」を補う
  const prefix = looksLikeVerbPhrase(x) ? x : `${x}の`;

  return `${prefix}ためには、`;
}



export function buildReadAloudVM(
  input: {
    A: string;
    B_raw: string;
    C_raw: string;
    D: string;
    Dprime: string;
  },
  mode: ReadAloudMode = "adult"
): ReadAloudVM {

  const A = jp(input.A);
  const D = jp(input.D);
  const Dp = jp(input.Dprime);

  const Bn = addOnePauseIfLong(normalizeDesire(input.B_raw));
  const Cn = addOnePauseIfLong(normalizeDesire(input.C_raw));
  const Dn = addOnePauseIfLong(D);
  const Dpn = addOnePauseIfLong(Dp);

  // ===== kids向け：言い回しの不自然さを防ぐヘルパ =====

  // 「〜したい」を自然に作る（B向け）
  const wantKids = (phrase: string) => {
    const s = (phrase ?? "").trim();
    if (!s) return "やりたい";

    // すでに「〜たい」ならそのまま
    if (s.endsWith("たい")) return s;

    // 「〜する」→「〜したい」
    if (s.endsWith("する")) return s.slice(0, -2) + "したい";

    // それ以外は「〜ことをしたい」に逃がす
    // 例：小腹をみたす → 小腹をみたすことをしたい
    return s + "ことをしたい";
  };

  // 「〜するなら」を自然に作る（B/C向け）
  const ifKids = (phrase: string) => {
    const s = (phrase ?? "").trim();
    if (!s) return "そうするなら";

    // すでに条件っぽい終わり方なら、そのまま「なら」
    if (s.endsWith("ない") || s.endsWith("たい") || s.endsWith("れる") || s.endsWith("られる")) {
      return s + "なら";
    }

    // 「〜する」なら、そのまま
    if (s.endsWith("する")) return s + "なら";

    // 「〜を◯◯」「〜に◯◯」などの動詞句っぽいものは、そのまま「なら」
    // 例：小腹を満たす / ナッツをとる / 先に片付ける
    const looksVerbPhrase =
      s.includes("を") || s.includes("に") || s.endsWith("る") || s.endsWith("す") || s.endsWith("く") || s.endsWith("ぐ") || s.endsWith("む") || s.endsWith("ぶ") || s.endsWith("ぬ") || s.endsWith("つ");

    if (looksVerbPhrase) return s + "なら";

    // 名詞っぽい場合だけ「〜するなら」
    // 例：勉強 → 勉強するなら
    return s + "するなら";
  };

  // 「〜のがよさそう」を自然に作る（D/D'向け）
  const goodKids = (phrase: string) => {
    const s = (phrase ?? "").trim();
    if (!s) return "それのがよさそう";

    // 状態・否定・意志、または「〜する」はそのまま「のがよさそう」
    if (s.endsWith("ない") || s.endsWith("たい") || s.endsWith("する")) return s + "のがよさそう";

    // 動詞句っぽいものは「のがよさそう」
    const looksVerbPhrase =
      s.includes("を") || s.includes("に") || s.endsWith("る") || s.endsWith("す") || s.endsWith("く") || s.endsWith("ぐ") || s.endsWith("む") || s.endsWith("ぶ") || s.endsWith("ぬ") || s.endsWith("つ");

    if (looksVerbPhrase) return s + "のがよさそう";

    // 名詞っぽい場合だけ「〜するのがよさそう」
    return s + "するのがよさそう";
  };

  // 「〜すると/〜をすると」を自然に作る（D/D'向け）
  const whenKids = (phrase: string) => {
    const s = (phrase ?? "").trim();
    if (!s) return "そうすると";

    // すでに「〜すると」系ならそのまま
    if (s.endsWith("すると") || s.endsWith("するとき") || s.endsWith("したら")) return s;

    // 動詞句・否定（ナッツをとる / ナッツをとらない / 早起きする 等）は「〜と」
    // 例：ナッツをとる → ナッツをとると
    //     ナッツをとらない → ナッツをとらないと
    const looksVerbPhrase =
      s.includes("を") ||
      s.includes("に") ||
      s.endsWith("る") ||
      s.endsWith("す") ||
      s.endsWith("く") ||
      s.endsWith("ぐ") ||
      s.endsWith("む") ||
      s.endsWith("ぶ") ||
      s.endsWith("ぬ") ||
      s.endsWith("つ") ||
      s.endsWith("ない") ||
      s.endsWith("する");

    if (looksVerbPhrase) return s + "と";

    // 名詞っぽい場合は「〜をすると」
    // 例：節約 → 節約をすると
    return s + "をすると";
  };

  const lines: ReadAloudLine[] =
    mode === "kids"
      ? [
        // key1: AB（AのためにBをしたい）
        {
          key: "1",
          text: `${joinTameNiha(A)}${wantKids(Bn)}。`,
          speakText: `${joinTameNiha(A)}${wantKids(Bn)}。`,
          highlightTokens: ["A", "B"],
        },

        // key2: BD（BをするならDがよさそう）
        {
          key: "2",
          text: `そして、${ifKids(Bn)}、${goodKids(Dn)}。`,
          speakText: `そして、${ifKids(Bn)}、${goodKids(Dn)}。`,
          highlightTokens: ["B", "D"],
        },

        // key3: AC（AのためにはCも大事）
        {
          key: "3",
          text: `もうひとつ、${joinTameNiha(A)}${Cn} も だいじ。`,
          speakText: `もうひとつ、${joinTameNiha(A)}${Cn}、も、だいじ。`,
          highlightTokens: ["A", "C"],
        },

        // key4: CD'（CならD'がよさそう）
        {
          key: "4",
          text: `だから、${ifKids(Cn)}、${goodKids(Dpn)}。`,
          speakText: `だから、${ifKids(Cn)}、${goodKids(Dpn)}。`,
          highlightTokens: ["C", "Dprime"],
        },

        // key5: DC（DだとCがうまくいかない）
        {
          key: "5",
          text: `${whenKids(Dn)}、${Cn} が うまく いかなくなる。`,
          speakText: `${whenKids(Dn)}、${Cn}、が、うまく、いかなくなる。`,
          highlightTokens: ["D", "C"],
        },

        // key6: D'B（D'だとBがうまくいかない）
        {
          key: "6",
          text: `${whenKids(Dpn)}、${Bn} が うまく いかなくなる。`,
          speakText: `${whenKids(Dpn)}、${Bn}、が、うまく、いかなくなる。`,
          highlightTokens: ["Dprime", "B"],
        },
      ]
      : [
        {
          key: "1",
          text: `${joinTameNiha(A)}${Bn}必要がある。`,
          speakText: `${joinTameNiha(A)}${Bn}、必要がある。`,
          highlightTokens: ["A", "B"],
        },
        {
          key: "2",
          text: `${joinTameNiha(Bn)}${Dn}べきだと感じる。`,
          speakText: `${joinTameNiha(Bn)}${Dn}、べきだと、感じる。`,
          highlightTokens: ["B", "D"],
        },
        {
          key: "3",
          text: `${joinTameNiha(A)}${Cn}必要がある。`,
          speakText: `${joinTameNiha(A)}${Cn}、必要がある。`,
          highlightTokens: ["A", "C"],
        },
        {
          key: "4",
          text: `${joinTameNiha(Cn)}${Dpn}べきだと感じる。`,
          speakText: `${joinTameNiha(Cn)}${Dpn}、べきだと、感じる。`,
          highlightTokens: ["C", "Dprime"],
        },
        {
          key: "5",
          text: `${Dn}と、${Cn}のが難しい。`,
          speakText: `${Dn}、と、${Cn}、のが、難しい。`,
          highlightTokens: ["D", "C"],
        },
        {
          key: "6",
          text: `${Dpn}と、${Bn}のが難しい。`,
          speakText: `${Dpn}、と、${Bn}、のが、難しい。`,
          highlightTokens: ["Dprime", "B"],
        },
      ];


  return { lines };
}
