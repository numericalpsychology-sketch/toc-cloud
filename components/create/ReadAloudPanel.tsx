"use client";

import { useEffect, useState } from "react";

type Line = { key: string; text: string; speakText: string };

export function ReadAloudPanel(props: {
  lines: Line[];
  onFocusKey?: (key: string) => void;
  context?: { A: string; B: string; C: string; D: string; Dprime: string };
}) {

  const [mounted, setMounted] = useState(false);
  const [lastKey, setLastKey] = useState<string>("");


  useEffect(() => setMounted(true), []);

  const [supported] = useState(
    typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window
  );
  const [currentKey, setCurrentKey] = useState<string | null>(null);

  type AiComment = { severity: "warn" | "crit"; text: string };

  // ★ AIアシストのコメント（keyごとに複数）
  const [comments, setComments] = useState<Record<string, AiComment[]>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const hasAnyComment = Object.values(comments).some(
    (arr) => Array.isArray(arr) && arr.some((c) => (c?.text ?? "").trim().length > 0)
  );


  if (!mounted) return null;

  const speak = (line: Line) => {
    if (!supported) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(line.speakText || line.text);
    u.lang = "ja-JP";
    u.rate = 0.9;
    u.pitch = 0.9;

    u.onstart = () => {
      setCurrentKey(line.key);
      props.onFocusKey?.(line.key);
    };
    u.onend = () => setCurrentKey(null);

    window.speechSynthesis.speak(u);
  };

  const speakAll = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    let i = 0;

    const next = () => {
      if (i >= props.lines.length) {
        setCurrentKey(null);
        return;
      }
      const line = props.lines[i++];
      const u = new SpeechSynthesisUtterance(line.speakText || line.text);
      u.lang = "ja-JP";
      u.rate = 0.9;
      u.pitch = 0.9;

      u.onstart = () => {
        setCurrentKey(line.key);
        props.onFocusKey?.(line.key);
      };
      u.onend = next;

      window.speechSynthesis.speak(u);
    };
    next();
  };

  // ---------------------------
  // AIアシスト（改善版：チェック1〜9の土台）
  // ---------------------------
  const GENERAL_WORDS = ["人は", "みんな", "あらゆる", "男は", "女は", "いつも", "誰でも", "全部", "必ず", "絶対"];
  const ABSTRACT_WORDS_BC = ["成功", "成長", "価値", "最適", "改善", "重要", "効率", "品質", "満足", "信頼", "関係"];

  const normalize = (s: string) => (s ?? "").replace(/\s+/g, "").trim();

  // 語幹（stem）を取る：否定や代表的な語尾を落として比較しやすくする
  function stem(s: string): string {
    let t = normalize(s);
    // 否定の代表
    t = t.replace(/しない$/, "");
    t = t.replace(/さない$/, ""); // あまやかさない → あまやか
    t = t.replace(/ない$/, "");
    // 動詞の代表語尾を軽く落とす
    t = t.replace(/する$/, "");
    t = t.replace(/す$/, "");   // あまやかす → あまやか
    t = t.replace(/る$/, "");
    return t;
  }

  function hasNeg(s: string): boolean {
    const t = normalize(s);
    return /ない$/.test(t) || /しない$/.test(t) || /さない$/.test(t);
  }

  // (1) DとD’が対立しているか（否定ペア or 明確な反対語パターン）
  function isObviousConflict(D: string, Dp: string): boolean {
    const d1 = normalize(D);
    const d2 = normalize(Dp);

    // する/しない、す/さない、〜ない のペア（語幹一致）
    if (stem(d1) && stem(d1) === stem(d2) && hasNeg(d1) !== hasNeg(d2)) return true;

    // 「〜に注力する」同士は資源競合で対立しやすい（オブジェクトが違えば対立扱い）
    const x = normalize(D);
    const y = normalize(Dp);
    if (x.includes("注力する") && y.includes("注力する")) {
      const objX = x.replace(/に?注力する$/, "");
      const objY = y.replace(/に?注力する$/, "");
      if (objX && objY && objX !== objY) return true;
    }



    // 「先に〜」×「先に〜」は同時にできない可能性が高い
    if (D.includes("先に") && Dp.includes("先に")) return true;

    // 優先/軸足は競合しやすい
    if (/(優先|軸足)/.test(D) && /(優先|軸足)/.test(Dp)) return true;

    // 方向・進む止まる系（最低限）
    if ((D.includes("右") && Dp.includes("左")) || (D.includes("左") && Dp.includes("右"))) return true;
    if ((D.includes("進") && Dp.includes("止")) || (D.includes("止") && Dp.includes("進"))) return true;

    return false;
  }

  // B/C が「一般的すぎる」か
  function isTooGeneral(s: string): boolean {
    return GENERAL_WORDS.some((w) => (s ?? "").includes(w));
  }

  // B/C が「抽象的すぎる」か（Aは除外）
  function isTooAbstractBC(s: string): boolean {
    return ABSTRACT_WORDS_BC.some((w) => (s ?? "").includes(w));
  }

  // B/Cが要望っぽいか
  function looksLikeDesireState(s: string): boolean {
    const t = normalize(s);
    if (!t) return false;

    // 「〜が高まる/下がる」系は状態（要望）として扱う
    if (/が(高まる|高くなる|上がる|増える|良くなる)$/.test(t)) return true;

    // 「期待/評判/信頼/満足/品質/ブランド… を高める」などは要望として扱う
    const nouns = ["期待", "評判", "信頼", "満足", "品質", "ブランド", "認知", "価値", "人気", "好感", "売上", "利益"];
    const verbs = ["高める", "上げる", "増やす", "改善する", "伸ばす", "守る", "保つ"];

    if (nouns.some(n => t.includes(n)) && verbs.some(v => t.endsWith(v))) return true;

    // 「規律を覚えさせる」など “させる” は起こしたい状態寄り（行動扱いしない）
    if (t.endsWith("させる")) return true;

    return false;
  }

  function looksLikePositiveState(s: string): boolean {
    const t = normalize(s);
    return /(ふやさない|増やさない|守る|防ぐ|得る|保つ|実現する|確保する|減らす|高まる|高める)/.test(t);
  }


  // B/C が「行動っぽい」か（雑に“動詞っぽい終わり”を見る）
  function looksLikeAction(s: string): boolean {
    const t = normalize(s);
    if (!t) return false;

    // 要望として認めるものは行動扱いしない
    if (looksLikeDesireState(s)) return false;

    // 行動っぽい終わり
    return /(する|しない|ます|る|す|ない)$/.test(t);
  }


  // (2) BとCが “行動の対立” になっていないか（例：引っ越す/引っ越さない）
  function isNegPair(x: string, y: string): boolean {
    const X = normalize(x);
    const Y = normalize(y);
    const sX = stem(X);
    const sY = stem(Y);
    return !!sX && sX === sY && hasNeg(X) !== hasNeg(Y);

  }

  // (6)(7)(8)(9) “本当にそう？” の出し方：うるさくしないため条件付き
  function shouldQuestionLink(left: string, right: string): boolean {
    // B/Cが一般的すぎる or 抽象的すぎる or 行動っぽいときだけ疑義を挟む
    if (isTooGeneral(right) || isTooAbstractBC(right) || looksLikeAction(right)) return true;
    return false;
  }

  const assist = async () => {
    const ctx = props.context; // ← ★ ここで1回だけ宣言
    if (!ctx) {
      setAiError("AIアシスト用データが渡っていません（context未設定）");
      return;
    }

    // 空入力では呼ばない（高速化）
    if (!ctx.A?.trim() || !ctx.B?.trim() || !ctx.C?.trim() || !ctx.D?.trim() || !ctx.Dprime?.trim()) {
      setAiError("A/B/C/D/D’ をある程度入力してからAIアシストを使ってください");
      return;
    }

    // キャッシュキー（文字列のみ）
    const key = [
      ctx.A ?? "",
      ctx.B ?? "",
      ctx.C ?? "",
      ctx.D ?? "",
      ctx.Dprime ?? "",
    ].join("||");

    // すでに同じ内容で実行済みなら何もしない（即時）
    if (key === lastKey) return;
    setLastKey(key);

    setAiLoading(true);
    setAiError(null);

    try {
      const payload = {
        A: ctx.A,
        B: ctx.B,
        C: ctx.C,
        D: ctx.D,
        Dprime: ctx.Dprime,
        lines: props.lines.slice(0, 4).map((l) => ({ key: l.key, text: l.text })),
      };

      const res = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiError(data?.error ? String(data.error) : "AIアシストでエラー");
        return;
      }

      function normalizeComments(raw: any): Record<string, AiComment[]> {
        const out: Record<string, AiComment[]> = {};
        const obj = raw && typeof raw === "object" ? raw : {};
        for (const k of Object.keys(obj)) {
          const arr = Array.isArray(obj[k]) ? obj[k] : [];
          out[k] = arr
            .map((x: any) => {
              // 新形式 {severity,text}
              if (x && typeof x === "object" && typeof x.text === "string") {
                const sev = x.severity === "crit" ? "crit" : "warn";
                return { severity: sev, text: x.text };
              }
              // 旧形式 string
              if (typeof x === "string") {
                return { severity: "warn", text: x };
              }
              return null;
            })
            .filter(Boolean) as AiComment[];
        }
        return out;
      }

      setComments(normalizeComments(data.comments));

    } catch (e: any) {
      setAiError(String(e?.message ?? e));
    } finally {
      setAiLoading(false);
    }
  };



  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700 }}>🔊 読み上げ（音＋文字）</div>

        <button onClick={speakAll} style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 8 }}>
          ▶ すべて再生
        </button>
        <button
          onClick={() => window.speechSynthesis.cancel()}
          style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 8 }}
        >
          ⏹ 停止
        </button>

        {/* ★ AIアシスト */}
        <button
          onClick={assist}
          disabled={aiLoading}
          style={{
            padding: "6px 10px",
            border: "1px solid #ccf",
            borderRadius: 8,
            background: "#f6f6ff",
            opacity: aiLoading ? 0.6 : 1,
          }}
        >
          🤖 AIアシスト{aiLoading ? "…" : ""}
        </button>
        {aiError && (
          <div style={{ marginTop: 6, color: "#c00", fontSize: 12, whiteSpace: "pre-wrap" }}>
            {aiError}
          </div>
        )}


        {!supported && <div style={{ fontSize: 12, opacity: 0.7 }}>※このブラウザでは読み上げ非対応</div>}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {props.lines.map((l) => (
          <div
            key={l.key}
            style={{
              border: "1px solid #eee",
              borderRadius: 10,
              padding: 10,
              background: currentKey === l.key ? "rgba(0,0,0,0.04)" : "white",
            }}
            onClick={() => props.onFocusKey?.(l.key)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ whiteSpace: "pre-wrap" }}>{l.text}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speak(l);
                }}
                style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: 8 }}
              >
                ▶
              </button>
            </div>

            {/* ★ コメント（重要度アイコン） */}
            {comments[l.key] && comments[l.key].length > 0 && (
              <div style={{ marginTop: 8, display: "grid", gap: 4, fontSize: 12 }}>
                {comments[l.key].map((c, idx) => {
                  const icon = c.severity === "crit" ? "⛔" : "⚠️";
                  const color = c.severity === "crit" ? "#b00020" : "#c00";
                  return (
                    <div key={idx} style={{ display: "flex", gap: 6, color }}>
                      <span aria-hidden>{icon}</span>
                      <span>{c.text}</span>
                    </div>
                  );
                })}
              </div>
            )}


          </div>
        ))}
      </div>

      {/* AIチェック結果：問題なし */}
      {!aiLoading && !aiError && Object.keys(comments).length > 0 && !hasAnyComment && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            borderRadius: 8,
            background: "#eefaf0",
            color: "#1b5e20",
            fontSize: 12,
          }}
        >
          ✅ OK：明らかな問題は見つかりませんでした
        </div>
      )}


      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
        ※AIアシストは「おかしい可能性」を指摘します。違和感があれば直してみてください。
      </div>
    </div>
  );
}
