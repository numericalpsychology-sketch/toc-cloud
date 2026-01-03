"use client";

export function CloudDiagramLR(props: {
  A: string;
  B: string;
  C: string;
  D: string;
  Dprime: string;
}) {
  const Box = (label: string, text: string) => (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, background: "white" }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{label}</div>
      <div style={{ whiteSpace: "pre-wrap", fontWeight: 600 }}>{text || "（未入力）"}</div>
    </div>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 760, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "center" }}>
        {/* A */}
        <div>{Box("A（共通目標）", props.A)}</div>

        {/* B/C */}
        <div style={{ display: "grid", gap: 10 }}>
          {Box("B（要望）", props.B)}
          {Box("C（要望）", props.C)}
        </div>

        {/* D/D' */}
        <div style={{ display: "grid", gap: 10 }}>
          {Box("D（行動）", props.D)}
          {Box("D’（行動）", props.Dprime)}
        </div>
      </div>
    </div>
  );
}
