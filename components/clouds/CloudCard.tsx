"use client";

import Link from "next/link";

const TAG_LABEL: Record<string, string> = {
  work: "仕事",
  school: "学校",
  society: "社会",
  family: "家庭",
  parenting: "子育て",
  private: "プライベート",
  materials: "教材",
};

export function CloudCard(props: {
  id: string;
  title: string;
  A: string;
  helpfulCount: number;
  conflictType: "internal" | "external" | null;
  tags: string[];
}) {

  return (
    <Link
      href={`/clouds/${props.id}`}
      style={{
        display: "block",
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 12,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ fontWeight: 700 }}>{props.title}</div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
        {props.conflictType
        ? props.conflictType === "internal"
        ? "内部対立"
        : "外部対立"
        : "未分類"}
       {props.tags.length > 0 && (
       <>
       {" · "}
       {props.tags.map(t => TAG_LABEL[t] ?? t).join(" / ")}
       </>
       )}
      </div>

      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
        A：{props.A}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
        👍 役にたった：{props.helpfulCount}
      </div>
    </Link>
  );
}
