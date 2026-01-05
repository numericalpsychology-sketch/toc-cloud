"use client";

export function CloudDiagramLR(props: {
  A: string;
  B: string;
  C: string;
  D: string;
  Dprime: string;
}) {
  const Label: React.CSSProperties = {
    fontSize: 12,
    color: "#444",
    fontWeight: 700,
    marginBottom: 6,
  };

  const Body: React.CSSProperties = {
    whiteSpace: "pre-wrap",
    fontWeight: 600,
    color: "#111",
  };

  const Box = (label: string, text: string) => (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 12,
        background: "white",
        color: "#111",
      }}
    >
      <div style={Label}>{label}</div>
      <div style={Body}>{text || "（未入力）"}</div>
    </div>
  );

  return (
    <div style={{ overflowX: "auto", color: "#111" }}>
      <div
        style={{
          minWidth: 760,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          alignItems: "center",
        }}
      >
        {/* A */}
        <div>{Box("A（共通目標）", props.A)}</div>

        {/* B / C */}
        <div style={{ display: "grid", gap: 10 }}>
          {Box("B（要望）", props.B)}
          {Box("C（要望）", props.C)}
        </div>

        {/* D / D’ */}
        <div style={{ display: "grid", gap: 10 }}>
          {Box("D（行動）", props.D)}
          {Box("D’（行動）", props.Dprime)}
        </div>
      </div>
    </div>
  );
}
