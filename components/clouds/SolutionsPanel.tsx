"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { SolutionsRepo, type SolutionRow } from "@/lib/repositories/solutions.repo";

export function SolutionsPanel(props: { cloudId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const repo = new SolutionsRepo();

  const uid = user?.uid ?? null;


  const [items, setItems] = useState<SolutionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const rows = await repo.listByCloud(props.cloudId);
    setItems(rows);
    setLoading(false);
  };

  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const [likeState, setLikeState] = useState<Record<string, { liked: boolean; count: number }>>({});


  const sortedItems = [...items].sort((a, b) => {
    const aCount = likeState[a.id]?.count ?? (a as any).likesCount ?? 0;
    const bCount = likeState[b.id]?.count ?? (b as any).likesCount ?? 0;

    // 1) まず「ステキ数」降順
    if (bCount !== aCount) return bCount - aCount;

    // 2) 同数なら「自分がステキ」した方を上（任意）
    const aLiked = likeState[a.id]?.liked === true;
    const bLiked = likeState[b.id]?.liked === true;
    if (aLiked !== bLiked) return Number(bLiked) - Number(aLiked);

    // 3) それでも同じなら元の順序を維持
    return 0;
  });

  const FEATURED_THRESHOLD = 3; // ★ 注目になる最小ステキ数


  // ① データ取得（既存）
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.cloudId]);

  // ② 表示用 state 初期化（追加）
  useEffect(() => {
    const next: Record<string, { liked: boolean; count: number }> = {};
    for (const it of items) {
      next[it.id] = {
        liked: likeState[it.id]?.liked ?? false,
        count:
          typeof (it as any).likesCount === "number"
            ? (it as any).likesCount
            : (likeState[it.id]?.count ?? 0),
      };
    }
    setLikeState(next);
  }, [items]);

  async function toggleLike(solutionId: string) {
    if (!uid) {
      alert("ログインが必要です");
      return;
    }

    const likeDocRef = doc(
      db,
      "clouds",
      props.cloudId,
      "solutions",
      solutionId,
      "likes",
      uid
    );
    const solutionRef = doc(db, "clouds", props.cloudId, "solutions", solutionId);

    // optimistic UI
    setLikeState((prev) => {
      const cur = prev[solutionId] ?? { liked: false, count: 0 };
      const nextLiked = !cur.liked;
      const nextCount = Math.max(0, cur.count + (nextLiked ? 1 : -1));
      return { ...prev, [solutionId]: { liked: nextLiked, count: nextCount } };
    });

    try {
      await runTransaction(db, async (tx) => {
        const likeSnap = await tx.get(likeDocRef);
        const solSnap = await tx.get(solutionRef);

        const current =
          solSnap.exists() && typeof (solSnap.data() as any).likesCount === "number"
            ? (solSnap.data() as any).likesCount
            : 0;

        if (likeSnap.exists()) {
          // unlike
          tx.delete(likeDocRef);
          // update ではなく set(merge) にして "not-found" を回避
          tx.set(
            solutionRef,
            { likesCount: Math.max(0, current - 1) },
            { merge: true }
          );
        } else {
          // like
          tx.set(likeDocRef, { uid, createdAt: serverTimestamp() }, { merge: true });
          tx.set(solutionRef, { likesCount: current + 1 }, { merge: true });
        }
      });
    } catch (e: any) {
      // optimistic UI を巻き戻し
      setLikeState((prev) => {
        const cur = prev[solutionId] ?? { liked: false, count: 0 };
        const backLiked = !cur.liked;
        const backCount = Math.max(0, cur.count + (backLiked ? 1 : -1));
        return { ...prev, [solutionId]: { liked: backLiked, count: backCount } };
      });

      // ここが超重要：原因を見える化
      console.error("toggleLike failed:", e);
      const code = e?.code ? ` (${e.code})` : "";
      alert(`保存に失敗しました${code}`);
    }
  }


  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 800 }}>💡 解決策（みんなの投稿）</div>

      {/* 投稿 */}
      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>解決策を投稿</div>

        <textarea
          rows={3}
          style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例：両方の要望を満たす解決策（インジェクション）を1つ書いてください"
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            disabled={saving}
            onClick={async () => {
              if (!user?.uid) {
                router.push(`/login?returnTo=${encodeURIComponent(`/clouds/${props.cloudId}`)}`);
                return;
              }
              const v = text.trim();
              if (!v) return;

              setSaving(true);
              await repo.create(props.cloudId, user.uid, v);
              setText("");
              await load();
              setSaving(false);
            }}
            style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8 }}
          >
            投稿する
          </button>


        </div>
      </div>

      {/* 一覧 */}
      {loading ? (
        <div>読み込み中…</div>
      ) : items.length === 0 ? (
        <div style={{ opacity: 0.7 }}>まだ投稿がありません。</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>

          {sortedItems.map((it) => {
            const st = likeState[it.id] ?? { liked: false, count: (it as any).likesCount ?? 0 };
            const isLiked = st.liked;
            const isFeatured = st.count >= FEATURED_THRESHOLD;

            return (
              <div
                key={it.id}
                style={{
                  border: isFeatured
                    ? "2px solid #ffb300"
                    : isLiked
                      ? "2px solid #f0c"
                      : "1px solid #eee",
                  background: isFeatured
                    ? "linear-gradient(180deg, #fff9e6 0%, #ffffff 60%)"
                    : isLiked
                      ? "#fff5fb"
                      : "#fff",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 8,
                  boxShadow: isFeatured
                    ? "0 6px 18px rgba(255, 179, 0, 0.25)"
                    : isLiked
                      ? "0 4px 14px rgba(255, 0, 170, 0.12)"
                      : "none",
                }}
              >


                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    投稿者：{it.uid.slice(0, 6)}…
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isFeatured && (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "#ffb300",
                          color: "#5a3b00",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ⭐ 注目
                      </span>
                    )}

                    <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: "nowrap" }}>
                      {st.count} 件のステキ！
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleLike(it.id)}
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 999,
                        border: "1px solid #f0c",
                        background: isLiked ? "#ffe6f2" : "#fff",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isLiked ? "✨ ステキ！" : "＋ ステキ！"}
                    </button>
                  </div>

                </div>

                <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{it.text}</div>
              </div>
            );
          })}


        </div>
      )}
    </div>
  );
}
