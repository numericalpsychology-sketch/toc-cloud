"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { CloudCard } from "./CloudCard";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";



type CloudRow = {
  id: string;
  title: string;
  A: string;
  helpfulCount: number;
  conflictType: "internal" | "external" | null;
  tags: string[];
};


type ConflictType = "all" | "internal" | "external";
type Tag =
  | "work"
  | "school"
  | "society"
  | "family"
  | "parenting"
  | "private"
  | "materials";

  const TAGS: { key: Tag; label: string }[] = [
  { key: "work", label: "仕事" },
  { key: "school", label: "学校" },
  { key: "society", label: "社会" },
  { key: "family", label: "家庭" },
  { key: "parenting", label: "子育て" },
  { key: "private", label: "プライベート" },
  { key: "materials", label: "教材" },
];


export function HomeClient() {
  const router = useRouter();
  const sp = useSearchParams();
  
  const initMode = (sp.get("mode") === "hot" ? "hot" : "new") as "new" | "hot";
  const initCT = (sp.get("ct") === "internal" || sp.get("ct") === "external" ? sp.get("ct") : "all") as ConflictType;

  const initTags = (sp.get("tags") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean) as Tag[];

  const [mode, setMode] = useState<"new" | "hot">(initMode);
  const [conflictType, setConflictType] = useState<ConflictType>(initCT);
  const [tags, setTags] = useState<Tag[]>(initTags);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const didInitRef = useRef(false);
  const initQ = sp.get("q") ?? "";
  const [q, setQ] = useState(initQ);


  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      const base = collection(db, "clouds");

      const clauses: any[] = [
        where("status", "==", "active"),
        where("visibility", "==", "public"),
      ];

      if (conflictType !== "all") {
        clauses.push(where("conflictType", "==", conflictType));
      }

      if (tags.length > 0) {
        clauses.push(where("tags", "array-contains-any", tags));
      }

      const q =
        mode === "new"
          ? query(base, ...clauses, orderBy("createdAt", "desc"), limit(30))
          : query(base, ...clauses, orderBy("stats.helpfulCount", "desc"), limit(30));

      const snap = await getDocs(q);
      if (!alive) return;

      const rows: CloudRow[] = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          title: data.title ?? "(no title)",
          A: data.A?.text ?? "",
          helpfulCount: data.stats?.helpfulCount ?? 0,
          conflictType: data.conflictType ?? null,
          tags: Array.isArray(data.tags) ? data.tags : [],
        };

      });

      setItems(rows);
      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [mode, conflictType, tags]);


  useEffect(() => {
    // 初回はURL→stateで初期化済みなので、replaceしない
    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }

    const params = new URLSearchParams();
    if (mode !== "new") params.set("mode", mode);
    if (conflictType !== "all") params.set("ct", conflictType);
    if (tags.length > 0) params.set("tags", tags.join(","));
    if (q.trim()) params.set("q", q.trim());

    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : `/`);
  }, [mode, conflictType, tags, q, router]);

const needle = q.trim().toLowerCase();
const filtered = items.filter((it) => {
  if (!needle) return true;
  const title = (it.title ?? "").toLowerCase();
  const a = (it.A ?? "").toLowerCase();
  return title.includes(needle) || a.includes(needle);
});

  return (
    <div style={{ padding: 24, display: "grid", gap: 12, maxWidth: 900 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>クラウド一覧</h1>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setMode("new")}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 8,
            background: mode === "new" ? "#eef" : "#fff",
          }}
        >
          新着
        </button>
        <button
          onClick={() => setMode("hot")}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 8,
            background: mode === "hot" ? "#eef" : "#fff",
          }}
        >
          人気
        </button>
      </div>

      {/* 絞り込みUI */}
<div style={{ display: "grid", gap: 10, marginTop: 8 }}>

<input
  value={q}
  onChange={(e) => setQ(e.target.value)}
  placeholder="検索（タイトル / A）"
  style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8, width: 320, maxWidth: "100%" }}
/>


  {/* 対立タイプ */}
  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
    <span style={{ fontSize: 12, opacity: 0.7 }}>対立タイプ:</span>

    <label>
      <input
        type="radio"
        name="ct"
        checked={conflictType === "all"}
        onChange={() => setConflictType("all")}
      />
      <span style={{ marginLeft: 6 }}>すべて</span>
    </label>

    <label>
      <input
        type="radio"
        name="ct"
        checked={conflictType === "internal"}
        onChange={() => setConflictType("internal")}
      />
      <span style={{ marginLeft: 6 }}>内部</span>
    </label>

    <label>
      <input
        type="radio"
        name="ct"
        checked={conflictType === "external"}
        onChange={() => setConflictType("external")}
      />
      <span style={{ marginLeft: 6 }}>外部</span>
    </label>

    <button
      onClick={() => {
        setConflictType("all");
        setTags([]);
        setQ("");
      }}
      style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 8 }}
    >
      フィルタ解除
    </button>
  </div>

  {/* テーマ（複数） */}
  <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>テーマ（複数選択）</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {TAGS.map((t) => {
        const checked = tags.includes(t.key);
        return (
          <label key={t.key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                const next = checked ? tags.filter((x) => x !== t.key) : [...tags, t.key];
                setTags(next);
              }}
            />
            {t.label}
          </label>
        );
      })}
    </div>
  </div>
</div>


{loading ? (
  <div>読み込み中…</div>
) : items.length === 0 ? (
  <div>まだ投稿がありません。</div>
) : filtered.length === 0 ? (
  <div style={{ opacity: 0.7 }}>条件に合うクラウドはありません。</div>
) : (
  <div style={{ display: "grid", gap: 10 }}>
    {filtered.map((it) => (
      <CloudCard
        key={it.id}
        id={it.id}
        title={it.title}
        A={it.A}
        helpfulCount={it.helpfulCount}
        conflictType={it.conflictType}
        tags={it.tags}
      />
    ))}
  </div>
)}




    </div>
  );
}
