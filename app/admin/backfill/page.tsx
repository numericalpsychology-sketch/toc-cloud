"use client";

import { useState } from "react";
import { collection, doc, getDocs, query, updateDoc } from "firebase/firestore";
import { getCountFromServer, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

type CloudRow = { id: string };

export default function BackfillSolutionsCountPage() {
  const { user, loading } = useAuth();
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const pushLog = (s: string) => setLog((prev) => [...prev, s]);

  const run = async () => {
    if (!user) {
      pushLog("ログインしてください。");
      return;
    }

    setRunning(true);
    setDone(false);
    setLog([]);

    try {
      // 1) clouds 一覧取得
      const cloudsSnap = await getDocs(query(collection(db, "clouds")));
      const clouds: CloudRow[] = cloudsSnap.docs.map((d) => ({ id: d.id }));

      pushLog(`clouds: ${clouds.length}件`);

      let ok = 0;
      let ng = 0;

      for (let i = 0; i < clouds.length; i++) {
        const cloudId = clouds[i].id;

        try {
          // 2) solutions の件数を集計（全件読まない）
          const solutionsQ = query(
            collection(db, "solutions"),
            where("cloudId", "==", cloudId)
          );
          const countSnap = await getCountFromServer(solutionsQ);
          const count = countSnap.data().count;

          // 3) clouds/{cloudId}.stats.solutionsCount を更新
          await updateDoc(doc(db, "clouds", cloudId), {
            "stats.solutionsCount": count,
          });

          ok++;
          pushLog(`[OK] ${i + 1}/${clouds.length} ${cloudId} => ${count}`);
        } catch (e: any) {
          ng++;
          pushLog(`[NG] ${i + 1}/${clouds.length} ${cloudId} => ${e?.message ?? e}`);
        }
      }

      pushLog(`完了: OK=${ok}, NG=${ng}`);
      setDone(true);
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>loading...</div>;

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>Backfill: solutionsCount</h1>

      {!user ? (
        <div style={{ marginTop: 12 }}>
          <b>ログインが必要です。</b>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={run}
            disabled={running}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
              cursor: running ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {running ? "実行中..." : "Backfillを実行"}
          </button>
          {done && (
            <span style={{ marginLeft: 12, fontWeight: 800 }}>✅ Done</span>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 12,
          border: "1px solid #e5e5e5",
          background: "#fafafa",
          height: 420,
          overflow: "auto",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {log.length === 0 ? "ログがここに出ます" : log.join("\n")}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        ※終わったらこのページは削除推奨（安全のため）
      </div>
    </div>
  );
}
