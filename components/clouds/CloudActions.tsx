"use client";

import { useEffect, useState } from "react";
import { CloudRatingsRepo } from "@/lib/repositories/cloudRatings.repo";
import { useAuth } from "@/hooks/useAuth";

export function CloudActions(props: {
  cloudId: string;
  initialCount: number;
}) {
  const { user } = useAuth();
  const [isHelpful, setIsHelpful] = useState(false);
  const [count, setCount] = useState(props.initialCount);
  const [loading, setLoading] = useState(true);

  const repo = new CloudRatingsRepo();

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    repo.getState(props.cloudId, user.uid).then((v) => {
      setIsHelpful(v);
      setLoading(false);
    });
  }, [user?.uid, props.cloudId]);

  if (!user?.uid) return null; // 未ログインは表示しない（v1）

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <button
        disabled={loading}
        onClick={async () => {
          const next = await repo.toggle(props.cloudId, user.uid, isHelpful);
          setIsHelpful(next);
        }}
        style={{
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: 8,
          background: isHelpful ? "#eef" : "#fff",
        }}
      >
        👍 役にたった
      </button>

      <div style={{ fontSize: 14, opacity: 0.7 }}>{count}</div>
    </div>
  );
}
