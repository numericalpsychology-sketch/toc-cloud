"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const raw = sp.get("returnTo");
  const returnTo = raw && raw.startsWith("/") ? raw : "/create";

  const { user, loading, loginWithGoogle, logout } = useAuth();

  if (loading) {
    return <div style={{ padding: 24 }}>読み込み中…</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>ログイン</h1>

      {!user ? (
        <button
          style={{ marginTop: 16, padding: "10px 14px", border: "1px solid #ccc", borderRadius: 8 }}
          onClick={async () => {
            await loginWithGoogle();
            router.push(returnTo);
          }}
        >
          Googleでログイン
        </button>
      ) : (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>ログイン中：{user.email}</div>
          <button
            style={{ padding: "10px 14px", border: "1px solid #ccc", borderRadius: 8 }}
            onClick={logout}
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}

