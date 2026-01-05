"use client";

import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase/firestore";
import { CloudActions } from "../../components/clouds/CloudActions";
import { BookmarkButton } from "../../components/clouds/BookmarkButton";
import { SolutionsPanel } from "@/components/clouds/SolutionsPanel";
import { CloudDiagramLR } from "@/components/clouds/CloudDiagramLR";
import { CloudDiagramSolutions } from "@/components/clouds/CloudDiagramSolutions";
import { useEffect, useMemo, useState } from "react";
import { SolutionsRepo, type SolutionRow } from "@/lib/repositories/solutions.repo";
import { useAuth } from "@/hooks/useAuth";

type CloudDoc = any;

export function CloudDetailClient({ cloudId }: { cloudId: string }) {
  const [data, setData] = useState<CloudDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const ref = doc(db, "clouds", cloudId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setData(null);
          setLoading(false);
          return;
        }
        setData(snap.data());
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setData({ __error: String(err) });
      }
    );
    return () => unsub();
  }, [cloudId]);

  const solRepo = new SolutionsRepo();
  const [solutions, setSolutions] = useState<SolutionRow[]>([]);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await solRepo.listByCloud(cloudId);
      if (!alive) return;
      setSolutions(rows);
      setSelectedSolutionId(rows[0]?.id ?? "");
    })();
    return () => {
      alive = false;
    };
  }, [cloudId]);

  const selectedSolution = useMemo(
    () => solutions.find((x) => x.id === selectedSolutionId) ?? null,
    [solutions, selectedSolutionId]
  );

  if (loading) return <div style={{ padding: 24, color: "#111" }}>読み込み中…</div>;
  if (!data) return <div style={{ padding: 24, color: "#111" }}>見つかりませんでした。</div>;

  return (
    <div
      style={{
        padding: 24,
        display: "grid",
        gap: 12,
        maxWidth: 900,
        background: "white",
        color: "#111",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>{data.title}</h1>

      {!user && (
        <div style={{ fontSize: 12, color: "#444" }}>
          ※ ブックマーク・解決策の投稿・評価には
          <Link href="/login" style={{ marginLeft: 4, fontWeight: 700, color: "#111" }}>
            ログイン
          </Link>
          が必要です
        </div>
      )}

      {/* 操作 */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "white",
            color: "#111",
            fontWeight: 600,
          }}
          onClick={async () => {
            const url = window.location.href;
            if (navigator.share) {
              try {
                await navigator.share({ title: data.title ?? "クラウド", url });
                return;
              } catch { }
            }
            await navigator.clipboard.writeText(url);
            alert("URLをコピーしました");
          }}
        >
          🔗 共有
        </button>

        {user ? (
          <>
            <BookmarkButton cloudId={cloudId} />
            <CloudActions cloudId={cloudId} initialCount={data.stats?.helpfulCount ?? 0} />
          </>
        ) : (
          <div
            style={{
              fontSize: 12,
              color: "#444",
              padding: "6px 10px",
              border: "1px solid #eee",
              borderRadius: 8,
              background: "#fafafa",
            }}
          >
            ブックマーク・評価・解決策の投稿は
            <Link href="/login" style={{ marginLeft: 6, fontWeight: 700, color: "#111" }}>
              ログイン
            </Link>
            が必要です
          </div>
        )}
      </div>

      {/* 背景 */}
      {data.context && (
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>背景</div>
          <div style={{ whiteSpace: "pre-wrap", color: "#111" }}>{data.context}</div>
        </div>
      )}

      <div style={{ fontWeight: 800 }}>① クラウド（A/B/C/D/D’）</div>
      <CloudDiagramLR
        key={"lr-" + cloudId}
        A={data.A?.text ?? ""}
        B={data.B?.raw ?? ""}
        C={data.C?.raw ?? ""}
        D={data.D?.text ?? ""}
        Dprime={data.Dprime?.text ?? ""}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 800 }}>② クラウド＋インジェクション</div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedSolutionId}
            onChange={(e) => setSelectedSolutionId(e.target.value)}
            style={{
              padding: "6px 10px",
              border: "1px solid #ccc",
              borderRadius: 8,
              color: "#111",
            }}
            disabled={solutions.length === 0}
          >
            {solutions.map((it, idx) => (
              <option key={it.id} value={it.id}>
                {idx + 1}件目
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              if (solutions.length === 0) return;
              const i = solutions.findIndex((x) => x.id === selectedSolutionId);
              setSelectedSolutionId(solutions[(i - 1 + solutions.length) % solutions.length].id);
            }}
            style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 8 }}
            disabled={solutions.length === 0}
          >
            ←前
          </button>

          <button
            onClick={() => {
              if (solutions.length === 0) return;
              const i = solutions.findIndex((x) => x.id === selectedSolutionId);
              setSelectedSolutionId(solutions[(i + 1) % solutions.length].id);
            }}
            style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 8 }}
            disabled={solutions.length === 0}
          >
            次→
          </button>

          <div style={{ fontSize: 12, color: "#444" }}>{solutions.length}件</div>
        </div>
      </div>

      <CloudDiagramSolutions
        A={data.A?.text ?? ""}
        B={data.B?.raw ?? ""}
        C={data.C?.raw ?? ""}
        selectedSolution={selectedSolution}
      />

      {(data.reason_D_blocks_C || data.reason_Dprime_blocks_B) && (
        <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, color: "#444", marginBottom: 6 }}>理由（任意）</div>
          {data.reason_D_blocks_C && (
            <div style={{ margi
