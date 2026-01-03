"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase/firestore";
import { CloudsRepo } from "@/lib/repositories/clouds.repo";
import { normalizeDesire } from "@/lib/domain/cloud.normalize";
import { generateCloudTitle } from "@/lib/domain/cloud.title";
import { buildReadAloudVM } from "@/lib/domain/cloud.readAloud";
import { CloudDiagramLR } from "@/components/clouds/CloudDiagramLR";
import { ReadAloudPanel } from "@/components/create/ReadAloudPanel";

type ConflictType = "internal" | "external";
type Tag =
  | "work"
  | "school"
  | "society"
  | "family"
  | "parenting"
  | "private"
  | "kids"
  | "materials";

const TAGS: { key: Tag; label: string }[] = [
  { key: "work", label: "仕事" },
  { key: "school", label: "学校" },
  { key: "society", label: "社会" },
  { key: "family", label: "家庭" },
  { key: "parenting", label: "子育て" },
  { key: "private", label: "プライベート" },
  { key: "kids", label: "子ども" },
  { key: "materials", label: "教材" },
];

type Draft = {
  A: string;
  B_raw: string;
  C_raw: string;
  D: string;
  Dprime: string;
  conflictType: ConflictType;
  tags: Tag[];
  context?: string;
  reason_D_blocks_C?: string;
  reason_Dprime_blocks_B?: string;

};

export function CreateWizard() {
  const router = useRouter();
  const { user } = useAuth();

  const [draft, setDraft] = useState<Draft>({
    A: "",
    B_raw: "",
    C_raw: "",
    D: "",
    Dprime: "",
    conflictType: "internal",
    tags: [],
    context: "",
    reason_D_blocks_C: "",
    reason_Dprime_blocks_B: "",

  });

  const Bn = useMemo(() => normalizeDesire(draft.B_raw), [draft.B_raw]);
  const Cn = useMemo(() => normalizeDesire(draft.C_raw), [draft.C_raw]);

  const titleResult = useMemo(() => {
    return generateCloudTitle({
      A: draft.A,
      B_normalized: Bn,
      C_normalized: Cn,
      D: draft.D,
      Dprime: draft.Dprime,
    });
  }, [draft.A, draft.D, draft.Dprime, Bn, Cn]);

  const readAloud = useMemo(() => {
    return buildReadAloudVM({
      A: draft.A,
      B_raw: draft.B_raw,
      C_raw: draft.C_raw,
      D: draft.D,
      Dprime: draft.Dprime,
    });
  }, [draft]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 14, maxWidth: 980 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>タイトル（自動生成）</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{titleResult.title}</div>
        </div>

        <button
          style={{ padding: "10px 14px", border: "1px solid #ccc", borderRadius: 10 }}
          onClick={async () => {
            if (!user?.uid) {
              router.push(`/login?returnTo=${encodeURIComponent("/create")}`);
              return;
            }

            if (!draft.A.trim() || !draft.B_raw.trim() || !draft.C_raw.trim() || !draft.D.trim() || !draft.Dprime.trim()) {
              alert("A/B/C/D/D’ を入力してください");
              return;
            }

            const repo = new CloudsRepo(db);

            const created = await repo.create({
              ownerUid: user.uid,
              title: titleResult.title,
              titleAuto: true,

              A: { text: draft.A.trim() },
              B: { raw: draft.B_raw.trim(), normalized: Bn },
              C: { raw: draft.C_raw.trim(), normalized: Cn },
              D: { text: draft.D.trim() },
              Dprime: { text: draft.Dprime.trim() },
              context: (draft.context ?? "").trim() || null,
              reason_D_blocks_C: (draft.reason_D_blocks_C ?? "").trim() || null,
              reason_Dprime_blocks_B: (draft.reason_Dprime_blocks_B ?? "").trim() || null,


              conflictType: draft.conflictType,
              tags: draft.tags,

              visibility: "public",
              status: "active",
              stats: { helpfulCount: 0, bookmarkCount: 0 },
            });

            router.push(`/clouds/${created.id}`);
          }}
        >
          投稿する
        </button>
      </div>

      {/* メタ */}
      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>対立タイプ：</div>
          <label>
            <input
              type="radio"
              name="ct"
              checked={draft.conflictType === "internal"}
              onChange={() => setDraft({ ...draft, conflictType: "internal" })}
            />
            <span style={{ marginLeft: 6 }}>内部対立</span>
          </label>
          <label>
            <input
              type="radio"
              name="ct"
              checked={draft.conflictType === "external"}
              onChange={() => setDraft({ ...draft, conflictType: "external" })}
            />
            <span style={{ marginLeft: 6 }}>外部対立</span>
          </label>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>テーマ（複数）</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {TAGS.map((t) => {
              const checked = draft.tags.includes(t.key);
              return (
                <label key={t.key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? draft.tags.filter((x) => x !== t.key)
                        : [...draft.tags, t.key];
                      setDraft({ ...draft, tags: next });
                    }}
                  />
                  {t.label}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* 入力 */}
      <div style={{ display: "grid", gap: 10 }}>
        {[
          ["A（共通目標）", "A"],
          ["B（要望）", "B_raw"],
          ["C（要望）", "C_raw"],
          ["D（行動）", "D"],
          ["D’（行動）", "Dprime"],
        ].map(([label, key]) => (
          <label key={key as string} style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
            <textarea
              rows={2}
              style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
              value={(draft as any)[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value } as any)}
            />
          </label>
        ))}
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>背景説明（任意）</div>
          <textarea
            rows={3}
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
            value={draft.context ?? ""}
            onChange={(e) => setDraft({ ...draft, context: e.target.value })}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>DをするとCが難しい理由（任意）</div>
          <textarea
            rows={2}
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
            value={draft.reason_D_blocks_C ?? ""}
            onChange={(e) => setDraft({ ...draft, reason_D_blocks_C: e.target.value })}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>D’をするとBが難しい理由（任意）</div>
          <textarea
            rows={2}
            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
            value={draft.reason_Dprime_blocks_B ?? ""}
            onChange={(e) => setDraft({ ...draft, reason_Dprime_blocks_B: e.target.value })}
          />
        </label>

      </div>

      {/* 図 */}
      <CloudDiagramLR
        A={draft.A.trim()}
        B={draft.B_raw.trim()}
        C={draft.C_raw.trim()}
        D={draft.D.trim()}
        Dprime={draft.Dprime.trim()}
      />

      {/* 読み上げ */}
      <ReadAloudPanel
        lines={readAloud.lines as any}
        context={{
          A: draft.A,
          B: draft.B_raw,
          C: draft.C_raw,
          D: draft.D,
          Dprime: draft.Dprime,
        }}
      />

    </div>
  );
}
