import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

export class CloudRatingsRepo {
  private ref(cloudId: string, uid: string) {
    return doc(db, "cloudRatings", `${cloudId}_${uid}`);
  }

  async getState(cloudId: string, uid: string): Promise<boolean> {
    const snap = await getDoc(this.ref(cloudId, uid));
    if (!snap.exists()) return false;
    return Boolean(snap.data().isHelpful);
  }

  async toggle(cloudId: string, uid: string, current: boolean): Promise<boolean> {
    const r = this.ref(cloudId, uid);

    if (!current) {
      // OFF → ON（作成 or 更新）
      await setDoc(
        r,
        {
          cloudId,
          uid,
          isHelpful: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    } else {
      // ON → OFF
      await updateDoc(r, {
        isHelpful: false,
        updatedAt: serverTimestamp(),
      });
      return false;
    }
  }
}
