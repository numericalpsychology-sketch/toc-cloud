import Link from "next/link";
import { CloudDetailClient } from "@/components/clouds/CloudDetailClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
        <Link
          href="/"
          style={{
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        >
          ← トップへ戻る
        </Link>

        <Link
          href="/create"
          style={{
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#f7f7ff",
            fontWeight: 600,
          }}
        >
          ＋ 新規作成
        </Link>
      </div>

      <div style={{ padding: 12 }}>
        <CloudDetailClient cloudId={id} />
      </div>
    </div>
  );
}

