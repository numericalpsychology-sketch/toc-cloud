"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

type UserProfile = {
  handleName?: string;
};

export function SettingsClient() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [handleName, setHandleName] = useState("");
  const [initialHandleName, setInitialHandleName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // 未ログインならログインへ
  useEffect(() => {
    if (loading) return;
    if (!user?.uid) {
      router.push(`/login?returnTo=${encodeURIComponent("/settings")}`);
    }
  }, [loading, user, router]);

  // 現在のプロフィール取得
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!user?.uid) return;
      setErr("");
      setMsg("");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const current =
          snap.exists() && (snap.data() as UserProfile).handleName
            ? String((snap.data() as UserProfile).handleName)
            : (user.displayName?.trim() ? user.displayName.trim() : "");

        if (!alive) return;
        setHandleName(current);
        setInitialHandleName(current);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? String(e));
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.uid, user?.displayName]);

  if (loading || !user?.uid) {
    return <div style={{ padding: 24, color: "#111" }}>読み込み中…</div>;
  }

  const canSave = handleName.trim().length >= 2 && handleName.trim().length <= 20;

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
        <div style={{ fontWeight: 700 }}>設定</div>

        <Link
          href="/"
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
          ← 一覧へ
        </Link>
      </div>

      <div style={{ padding: 12, maxWidth: 720 }}>
        <div style={{ fontSize: 13, color: "#444", marginBottom: 12 }}>
          解決策（インジェクション）の投稿者名として表示されます。
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 12,
            background: "white",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>
            ハンドルネーム（2〜20文字）
          </div>

          <input
            value={handleName}
            onChange={(e) => {
              setHandleName(e.target.value);
              setMsg("");
              setErr("");
            }}
            placeholder="例：Tobi"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ccc",
              borderRadius: 10,
              color: "#111",
              background: "white",
              fontSize: 14,
            }}
          />

          <div style={{ fontSize: 12, color: "#444" }}>
            現在：<b style={{ color: "#111" }}>{initialHandleName || "未設定"}</b>
          </div>

          {err && <div style={{ color: "crimson", fontSize: 13 }}>エラー：{err}</div>}
          {msg && <div style={{ color: "#111", fontSize: 13, fontWeight: 700 }}>{msg}</div>}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              disabled={saving || !canSave}
              onClick={async () => {
                try {
                  setSaving(true);
                  setErr("");
                  setMsg("");

                  const v = handleName.trim();

                  await setDoc(
                    doc(db, "users", user.uid),
                    { handleName: v, updatedAt: serverTimestamp() },
                    { merge: true }
                  );

                  setInitialHandleName(v);
                  setMsg("保存しました");
                } catch (e: any) {
                  setErr(e?.message ?? String(e));
                } finally {
                  setSaving(false);
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #ccc",
                background: saving ? "#f5f5f5" : "white",
                color: "#111",
                fontWeight: 700,
                cursor: saving || !canSave ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "保存中…" : "保存"}
            </button>

            <button
              disabled={saving}
              onClick={() => {
                setHandleName(initialHandleName);
                setMsg("");
                setErr("");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #eee",
                background: "white",
                color: "#111",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              取消
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#444" }}>
            ※ 絵文字はOKですが、個人情報（本名/電話/メール）は避けてください。
          </div>
        </div>
      </div>
    </div>
  );
}



