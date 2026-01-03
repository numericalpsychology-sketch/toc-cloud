// app/HomeClient.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function HomeClient() {
  const searchParams = useSearchParams();
  // 使うなら例：const foo = searchParams.get("foo");

  return (
    <div>
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
        <div style={{ fontWeight: 700 }}>TOCクラウド</div>
        <Link
          href="/create"
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#f7f7ff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ＋ 新規作成
        </Link>
      </div>

      <div style={{ padding: 12 }}>
        {/* ここに「ホームの中身」を入れる */}
        <div style={{ color: "#666" }}>
          ここにクラウド一覧などのコンテンツを表示します。
        </div>
      </div>
    </div>
  );
}
