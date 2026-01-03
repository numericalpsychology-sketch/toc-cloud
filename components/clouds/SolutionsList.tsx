"use client";

import type { SolutionRow } from "@/lib/repositories/solutions.repo";

export function SolutionsList(props: { solution: SolutionRow | null }) {
  if (!props.solution) {
    return <div style={{ opacity: 0.7 }}>インジェクションはまだありません。</div>;
  }
  return <div style={{ whiteSpace: "pre-wrap" }}>{props.solution.text}</div>;
}


