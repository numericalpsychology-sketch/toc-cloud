import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Compute delta from boolean toggle: false->true => +1, true->false => -1
 */
function diff(before?: boolean, after?: boolean): number {
  const b = Boolean(before);
  const a = Boolean(after);
  if (b === a) return 0;
  return a ? 1 : -1;
}

/**
 * Watch cloudRatings and update clouds.stats.helpfulCount
 */
export const onRatingWrite = onDocumentWritten(
  "cloudRatings/{ratingId}",
  async (event) => {
    const before = event.data?.before?.data() as any | undefined;
    const after = event.data?.after?.data() as any | undefined;

    const cloudId = after?.cloudId ?? before?.cloudId;
    if (!cloudId) return;

    const delta = diff(before?.isHelpful, after?.isHelpful);
    if (delta === 0) return;

    const ref = db.collection("clouds").doc(cloudId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;

      const current = Number(snap.data()?.stats?.helpfulCount ?? 0);
      const next = Math.max(0, current + delta);

      tx.update(ref, {
        "stats.helpfulCount": next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  }
);

