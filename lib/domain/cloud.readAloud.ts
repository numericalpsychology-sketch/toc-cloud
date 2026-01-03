import { normalizeDesire } from "./cloud.normalize";

type Token = "A" | "B" | "C" | "D" | "Dprime";
export type LineKey = "1" | "2" | "3" | "4" | "5" | "6";

export type ReadAloudLine = {
  key: LineKey;
  text: string;
  speakText: string;
  highlightTokens: Token[];
};

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



export function buildReadAloudVM(input: {
  A: string;
  B_raw: string;
  C_raw: string;
  D: string;
  Dprime: string;
}): ReadAloudVM {
  const A = jp(input.A);
  const D = jp(input.D);
  const Dp = jp(input.Dprime);

  const Bn = addOnePauseIfLong(normalizeDesire(input.B_raw));
  const Cn = addOnePauseIfLong(normalizeDesire(input.C_raw));
  const Dn = addOnePauseIfLong(D);
  const Dpn = addOnePauseIfLong(Dp);

  const lines: ReadAloudLine[] = [
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
