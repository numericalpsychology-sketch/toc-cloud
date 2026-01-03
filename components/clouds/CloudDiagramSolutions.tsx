"use client";

import type { SolutionRow } from "@/lib/repositories/solutions.repo";
import { SolutionsList } from "@/components/clouds/SolutionsList";

export function CloudDiagramSolutions(props: {
  A: string;
  B: string;
  C: string;
  selectedSolution: SolutionRow | null;
}) {
  const Box = (label: string, text: string) => (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, background: "white" }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{label}</div>
      <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontWeight: 600 }}>{text || "（未入力）"}</div>
    </div>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 0.8fr) minmax(220px, 0.9fr) minmax(300px, 1.3fr)",
        gridTemplateRows: "auto auto auto",
        gap: 10,
        alignItems: "stretch",
      }}
    >
      {/* B（上段・中央列） */}
      <div style={{ gridColumn: 2, gridRow: 1 }}>
        {Box("B（要望）", props.B)}
      </div>

      {/* A（中段・左列）※中央寄せ */}
      <div style={{ gridColumn: 1, gridRow: 2, alignSelf: "center" }}>
        {Box("A（共通目標）", props.A)}
      </div>

      {/* C（下段・中央列） */}
      <div style={{ gridColumn: 2, gridRow: 3 }}>
        {Box("C（要望）", props.C)}
      </div>

      {/* インジェクション（中段・右列）※Aと同じ高さ＆中央寄せ */}
      <div
        style={{
          gridColumn: 3,
          gridRow: "1 / span 3",   // ★ B上端〜C下端に揃える
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 12,
          background: "white",
          display: "grid",
          alignContent: "start",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>インジェクション</div>
        <SolutionsList solution={props.selectedSolution} />
      </div>



    </div>

  );

}
