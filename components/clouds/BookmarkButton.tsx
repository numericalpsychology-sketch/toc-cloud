"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CloudBookmarksRepo } from "@/lib/repositories/cloudBookmarks.repo";
import { useRouter } from "next/navigation";

export function BookmarkButton(props: { cloudId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const repo = new CloudBookmarksRepo();

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    repo.getState(props.cloudId, user.uid).then((v) => {
      setIsBookmarked(v);
      setLoading(false);
    });
  }, [user?.uid, props.cloudId]);

  return (
    <button
      disabled={loading}
      onClick={async () => {
        if (!user?.uid) {
          router.push(`/login?returnTo=${encodeURIComponent(`/clouds/${props.cloudId}`)}`);
          return;
        }
        const next = await repo.toggle(props.cloudId, user.uid, isBookmarked);
        setIsBookmarked(next);
      }}
      style={{
        padding: "8px 12px",
        border: "1px solid #ccc",
        borderRadius: 8,
        background: isBookmarked ? "#efe" : "#fff",
      }}
    >
      🔖 保存{isBookmarked ? "（済）" : ""}
    </button>
  );
}
