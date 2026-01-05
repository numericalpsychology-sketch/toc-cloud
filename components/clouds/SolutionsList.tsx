"use client";

import type { SolutionRow } from "@/lib/repositories/solutions.repo";

export function SolutionsList(props: { solution: SolutionRow | null }) {
  if (!props.solution) {
    return (
      <div style={{ fontSize: 13, color: "#444" }}>
        インジェクションはまだありません。
      </div>
    );
  }

  return (
    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#111", fontWeight: 600 }}>
      {props.solution.text}
    </div>
  );
}

