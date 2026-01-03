import OpenAI from "openai";
import { postFilter } from "./postFilter";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type LineKey = "1" | "2" | "3" | "4";
type AiComment = { severity: "warn" | "crit"; text: string };


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { A, B, C, D, Dprime, lines } = body as {
      A: string;
      B: string;
      C: string;
      D: string;
      Dprime: string;
      lines: Array<{ key: LineKey; text: string }>;
    };

    // 入力をちゃんとモデルに渡す（ここが今のroute.tsの決定的な不足）
    const input = `
あなたは「TOCクラウド（Evaporating Cloud）」の構造チェック専用アシスタントです。
目的は、TOCクラウドの構造が「明らかに不自然な場合のみ」短い指摘コメントを返すことです。
改善提案、一般論、推測、教育的説明は不要です。

【TOCクラウド定義】
- A：共通の目標
- B / C：両立したい要望（どちらも満たしたい）
- D / D'：対立する行動（同時に実行できない）

【絶対にコメントしてはいけないこと（誤爆禁止）】
- 「Dを選ぶとCが満たされない／矛盾する」ことはジレンマとして正常。指摘禁止。
- 「D'を選ぶとBが満たされない／矛盾する」ことも正常。指摘禁止。
- 「DとD'が対立している」こと自体も正常。指摘禁止。
- 上記に類する “矛盾・対立” の指摘は一切しない。

【コメントしてよいのは次の“構造崩れ”のみ】
1. B / C が「要望」ではなく「行動」になっている（例：〜する/しない）
【表現ゆれの扱い（重要）】
- D / D' は「〜すべきだ」「〜すべきだと感じる」「〜するべきではない」などの規範表現を含んでもよい。
  これらは“行動方針”なので、要望表現として誤判定してはいけない。
- 「要望」扱いしてよいのは、具体的な行動がなく状態や願望だけ（例：〜でありたい、〜になってほしい 等）の場合のみ。
2. D / D' が「行動」ではなく「要望」になっている（例：〜したい/〜でありたい）
3. D と D' が対立しておらず、両立できてしまう（同方向・言い換え等）
4. D が B を満たす行動に見えない、または D' が C を満たす行動に見えない
5. B と C が実質同じ、または論理的に同時成立不可能（要望の設定ミス）

【重要度(severity)の運用（うるさくしない）】
- crit: 1〜5に「確実に」該当（根拠が明確）
- warn: 1〜3に「形として明確に見える」場合だけ（迷うなら無コメント）
- 4〜5は、確実に言えないなら無コメント（warn禁止）

【最重要ルール】
- 少しでも迷う場合はコメントしない（空配列）。
- “可能性”“かもしれない”でコメントを作らない。

【出力ルール】
- JSONのみで出力する
- 形式：{ "comments": { "1": [{severity,text}], "2": [...], "3": [...], "4": [...] } }
- 問題がない行は必ず空配列にする
- 各行のコメントは最大2件まで
- textは日本語で15〜40文字程度


【入力】
A: ${A}
B: ${B}
C: ${C}
D: ${D}
D': ${Dprime}

行（keyとtext）:
${(lines ?? []).map((l) => `${l.key}: ${l.text}`).join("\n")}
`.trim();

    const resp = await client.responses.create({
      model: "gpt-5-mini",
      reasoning: { effort: "minimal" },
      input,
      store: false,
      text: {
        format: {
          type: "json_schema",
          strict: true,
          name: "ai_assist",
          schema: {
            type: "object",
            properties: {
              comments: {
                type: "object",
                properties: {
                  "1": {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string", enum: ["warn", "crit"] },
                        text: { type: "string" },
                      },
                      required: ["severity", "text"],
                      additionalProperties: false,
                    },
                  },
                  "2": {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string", enum: ["warn", "crit"] },
                        text: { type: "string" },
                      },
                      required: ["severity", "text"],
                      additionalProperties: false,
                    },
                  },
                  "3": {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string", enum: ["warn", "crit"] },
                        text: { type: "string" },
                      },
                      required: ["severity", "text"],
                      additionalProperties: false,
                    },
                  },
                  "4": {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string", enum: ["warn", "crit"] },
                        text: { type: "string" },
                      },
                      required: ["severity", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["1", "2", "3", "4"],
                additionalProperties: false,
              },
            },
            required: ["comments"],
            additionalProperties: false,
          },
        },
      },
    });

    const fallback = {
      comments: { "1": [], "2": [], "3": [], "4": [] } as Record<LineKey, AiComment[]>,
    };

    const out =
      (resp.output_parsed as any) ??
      (() => {
        try {
          return JSON.parse(resp.output_text ?? "");
        } catch {
          return fallback;
        }
      })();

    out.comments = postFilter(out.comments, lines);

    return new Response(JSON.stringify(out), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
