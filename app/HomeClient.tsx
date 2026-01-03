"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../lib/firebase/firestore";
import { useAuth } from "@/hooks/useAuth"; // ←既に使っている想定


type ConflictType = "internal" | "external";
type Tag =
  | "work"
  | "school"
  | "society"
  | "family"
  | "parenting"
  | "private"
  | "kids"
  | "materials";

const TAGS: { key: Tag; label: string }[] = [
  { key: "work", label: "仕事" },
  { key: "school", label: "学校" },
  { key: "society", label: "社会" },
  { key: "family", label: "家庭" },
  { key: "parenting", label: "子育て" },
  { key: "private", label: "プライベート" },
  { key: "kids", label: "子ども" },      // ←ここ修正
  { key: "materials", label: "教材" },
];

type CloudRow = {
  id: string;
  title?: string;
  updatedAt?: any;

  conflictType?: ConflictType;
  tags?: Tag[];
};



export default function HomeClient() {
  const [conflictFilter, setConflictFilter] = useState<ConflictType | "all">("all");
  const [tagFilter, setTagFilter] = useState<Tag[]>([]);
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CloudRow[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setItems([]);
      return;
    }

    (async () => {
      try {
        setErr("");
        // ★ここが要調整ポイント：
        // 保存時に ownerUid ではなく userId など別名なら合わせてください
        const q = query(
          collection(db, "clouds"),
          where("ownerUid", "==", user.uid),
          orderBy("updatedAt", "desc")
        );
        const snap = await getDocs(q);
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, [user, loading]);

  const toggleTag = (t: Tag) => {
    setTagFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const filtered = useMemo(() => {
    let list = items;

    if (conflictFilter !== "all") {
      list = list.filter((c) => c.conflictType === conflictFilter);
    }

    if (tagFilter.length > 0) {
      list = list.filter((c) => {
        const tags = Array.isArray(c.tags) ? c.tags : [];
        // OR条件：どれか1つでも含む
        return tagFilter.some((t) => tags.includes(t));
      });
    }

    return list;
  }, [items, conflictFilter, tagFilter]);

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid #ddd",
    background: active ? "#f0f0ff" : "white",
    fontWeight: 700,
  });


  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "white",
          borderBottom: "1px solid #eee",
          padding: "10px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 700 }}>TOCクラウド</div>
        <Link
          href="/create"
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#f7f7ff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ＋ 新規作成
        </Link>
      </div>

      <div style={{ padding: 12 }}>
        {loading ? (
          <div>読み込み中…</div>
        ) : !user ? (
          <div>
            保存したクラウドを見るには <Link href="/login">ログイン</Link> してください。
          </div>
        ) : err ? (
          <div style={{ color: "crimson" }}>一覧取得エラー: {err}</div>
        ) : (
          <>
            {/* フィルタUI */}
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#666", fontWeight: 700 }}>対立タイプ</div>

                <button onClick={() => setConflictFilter("all")} style={pillStyle(conflictFilter === "all")}>
                  すべて
                </button>
                <button onClick={() => setConflictFilter("internal")} style={pillStyle(conflictFilter === "internal")}>
                  内部対立
                </button>
                <button onClick={() => setConflictFilter("external")} style={pillStyle(conflictFilter === "external")}>
                  外部対立
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#666", fontWeight: 700 }}>タグ</div>

                {TAGS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => toggleTag(t.key)}
                    style={pillStyle(tagFilter.includes(t.key))}
                  >
                    {t.label}
                  </button>
                ))}

                {tagFilter.length > 0 && (
                  <button onClick={() => setTagFilter([])} style={{ ...pillStyle(false), marginLeft: "auto" }}>
                    クリア
                  </button>
                )}
              </div>

              <div style={{ fontSize: 12, color: "#666" }}>
                {filtered.length}件 / 全{items.length}件
              </div>
            </div>

            {/* 一覧 */}
            {filtered.length === 0 ? (
              <div style={{ color: "#666" }}>条件に一致するクラウドがありません。</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filtered.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clouds/${c.id}`}
                    style={{
                      display: "block",
                      border: "1px solid #e5e5e5",
                      borderRadius: 12,
                      padding: 12,
                      textDecoration: "none",
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 800 }}>{c.title ?? "（無題のクラウド）"}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {c.updatedAt?.toDate ? c.updatedAt.toDate().toLocaleString() : ""}
                      </div>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 13, color: "#333" }}>開く →</div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
