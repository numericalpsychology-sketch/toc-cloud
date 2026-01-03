const trim = (s: string) => (s ?? "").trim();

const TITLE_MAX = 24;
const SUFFIX = "の対立";
const SEP = "/";

const COMMON_TAIL_PHRASES = [
  "ことに軸足を置く",
  "ことを優先する",
  "ことを最優先する",
  "ことを重視する",
  "ことを大事にする",
  "ことを最大化する",
  "ことを最小化する",
  "方針をとる",
  "の方針でいく",
];

function stripKnownTailPhrase(s: string): string {
  let x = trim(s);
  for (const p of COMMON_TAIL_PHRASES) {
    if (x.endsWith(p)) {
      x = trim(x.slice(0, -p.length));
      break;
    }
  }
  return x;
}

// 文字単位の共通末尾削除（日本語でも効く）
function stripCommonSuffix(a: string, b: string): { a: string; b: string } {
  let x = trim(a);
  let y = trim(b);

  while (x.length > 0 && y.length > 0) {
    if (x[x.length - 1] !== y[y.length - 1]) break;
    x = x.slice(0, -1);
    y = y.slice(0, -1);
  }
  return { a: trim(x), b: trim(y) };
}

// 少しだけ整形（やりすぎない）
function normalizeLabel(s: string): string {
  let x = trim(s);
  x = x.replace(/^できるだけ/, "");
  x = x.replace(/^優先的に/, "");
  x = x.replace(/^とにかく/, "");
  x = x.replace(/を$/, "");
  x = x.replace(/する$/, ""); // 「〜する」を名詞句に寄せたい時に効く
  return trim(x);
}

function truncate(s: string, max: number): string {
  const x = trim(s);
  if (x.length <= max) return x;
  if (max <= 1) return "…";
  return x.slice(0, max - 1) + "…";
}

/**
 * タイトル全体を24文字以内に収めるための割り当て
 */
function buildTitleWithin24(leftRaw: string, rightRaw: string): string {
  const fixed = SEP.length + SUFFIX.length; // "/" + "の対立"
  const budget = TITLE_MAX - fixed; // 左右合計の予算
  if (budget <= 2) {
    return `${truncate(leftRaw, 1)}${SEP}${truncate(rightRaw, 1)}${SUFFIX}`;
  }

  let left = trim(leftRaw);
  let right = trim(rightRaw);

  // 基本は半分ずつ
  let leftMax = Math.floor(budget / 2);
  let rightMax = budget - leftMax;

  // 片方が短いならもう片方に回す
  const leftLen = left.length;
  const rightLen = right.length;

  if (leftLen < leftMax) {
    const extra = leftMax - leftLen;
    rightMax += extra;
    leftMax = leftLen; // 実長に合わせる
  } else if (rightLen < rightMax) {
    const extra = rightMax - rightLen;
    leftMax += extra;
    rightMax = rightLen;
  }

  left = truncate(left, leftMax);
  right = truncate(right, rightMax);

  return `${left}${SEP}${right}${SUFFIX}`;
}

function diffLabels(D: string, Dp: string): { left: string; right: string } {
  const d1 = normalizeLabel(stripKnownTailPhrase(D));
  const d2 = normalizeLabel(stripKnownTailPhrase(Dp));

  const stripped = stripCommonSuffix(d1, d2);

  const left = stripped.a || d1;
  const right = stripped.b || d2;

  return { left, right };
}

export function generateCloudTitle(args: {
  A: string;
  B_normalized: string;
  C_normalized: string;
  D: string;
  Dprime: string;
}): { title: string; titleAuto: boolean } {
  const D = trim(args.D);
  const Dp = trim(args.Dprime);

  if (D && Dp) {
    const { left, right } = diffLabels(D, Dp);
    return { title: buildTitleWithin24(left, right), titleAuto: true };
  }

  const A = trim(args.A);
  if (A) {
    // Aだけでも24に収める
    return { title: truncate(`${A}をめぐる対立`, TITLE_MAX), titleAuto: true };
  }

  return { title: "新しいクラウド", titleAuto: true };
}
