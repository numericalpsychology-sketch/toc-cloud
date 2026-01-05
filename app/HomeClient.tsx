"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

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
  { key: "family", label: "家族" },
  { key: "parenting", label: "子育て" },
  { key: "private", label: "プライベート" },
  { key: "kids", label: "子ども" },
  { key: "materials", label: "教材" },
];


type CloudRow = {
  id: string;
  title?: string;
  updatedAt?: any;

  conflictType?: ConflictType;
  tags?: Tag[];
};

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: active ? "1px solid #333" : "1px solid #ccc",
    background: active ? "#333" : "white",
    color: active ? "white" : "#111",
    fontSize: 12,
    cursor: "pointer",
  };
}

export default function HomeClient() {
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<CloudRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");

  const [conflictFilter, setConflictFilter] = useState<ConflictType | "all">("all");
  const [tagFilter, setTagFilter] = useState<Tag[]>([]);

  // ✅ ログインの有無に関わらず、一覧は取得する
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErr("");
        setItemsLoading(true);

        const q = query(collection(db, "clouds"), orderBy("updatedAt", "desc"));
        const snap = await getDocs(q);

        if (cancelled) return;

        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ?? String(e));
      } finally {
        if (cancelled) return;
        setItemsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // 初回に取得。必要なら再取得ボタンを付けてもOK

  const toggleTag = (t: Tag) => {
    setTagFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const filtered = useMemo(() => {
    let list = items;

    if (conflictFilter !== "all") {
      list = list.filter((c) => c.conflictType === conflictFilter);
    }

    if (tagFilter.length > 0) {
      list = list.filter((c) => (c.tags ?? []).some((t) => tagFilter.includes(t)));
    }

    return list;
  }, [items, conflictFilter, tagFilter]);

  return (
    <div style={{ background: "white", color: "#111", minHeight: "100vh" }}>
      {/* ヘッダー */}
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

        {user ? (
          <Link
            href="/create"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#f7f7ff",
              fontWeight: 600,
              textDecoration: "none",
              color: "#111",
            }}
          >
            ＋ 新規作成
          </Link>
        ) : (
          <Link
            href="/login"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              fontWeight: 600,
              textDecoration: "none",
              color: "#111",
            }}
          >
            ログインして投稿
          </Link>
        )}
      </div>

      <div
        style={{
          padding: "10px 12px",
          fontSize: 13,
          color: "#444",
          background: "#fafafa",
          borderBottom: "1px solid #eee",
        }}
      >
        TOC（制約理論）の対立解消ツール「クラウド」を、
        みんなで共有・改善するためのSNSです。
      </div>

      <div
        style={{
          padding: "10px 12px",
          fontSize: 13,
          background: "white",
          borderBottom: "1px solid #eee",
        }}
      >
        <a
          href="https://www.youtube.com/watch?v=RXauNpb8UJA"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#0b5cff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ▶ はじめての方へ：TOCクラウドの考え方を解説（動画）
        </a>
      </div>

      <div style={{ padding: 12 }}>
        {/* ログイン案内（閲覧はOK） */}
        {!authLoading && !user && (
          <div style={{ marginBottom: 10, fontSize: 13, color: "#444" }}>
            閲覧はログインなしでもできます。投稿・保存するには{" "}
            <Link href="/login" style={{ color: "#111", fontWeight: 700 }}>
              ログイン
            </Link>{" "}
            してください。
          </div>
        )}

        {itemsLoading ? (
          <div>読み込み中…</div>
        ) : err ? (
          <div style={{ color: "crimson" }}>一覧取得エラー: {err}</div>
        ) : (
          <>
            {/* フィルタUI */}
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>対立タイプ</div>

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
                <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>タグ</div>

                {TAGS.map((t) => (
                  <button key={t.key} onClick={() => toggleTag(t.key)} style={pillStyle(tagFilter.includes(t.key))}>
                    {t.label}
                  </button>
                ))}

                {tagFilter.length > 0 && (
                  <button onClick={() => setTagFilter([])} style={{ ...pillStyle(false), marginLeft: "auto" }}>
                    クリア
                  </button>
                )}
              </div>

              <div style={{ fontSize: 12, color: "#444" }}>
                {filtered.length}件 / 全{items.length}件
              </div>
            </div>

            {/* 一覧 */}
            {filtered.length === 0 ? (
              <div style={{ color: "#444" }}>条件に一致するクラウドがありません。</div>
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
                      color: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 800 }}>{c.title ?? "（無題のクラウド）"}</div>
                      <div style={{ fontSize: 12, color: "#444" }}>
                        {c.updatedAt?.toDate ? c.updatedAt.toDate().toLocaleString() : ""}
                      </div>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 13, color: "#111" }}>開く →</div>
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
