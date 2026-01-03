import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

export class CloudBookmarksRepo {
  private ref(cloudId: string, uid: string) {
    return doc(db, "cloudBookmarks", `${cloudId}_${uid}`);
  }

  async getState(cloudId: string, uid: string): Promise<boolean> {
    const snap = await getDoc(this.ref(cloudId, uid));
    if (!snap.exists()) return false;
    return Boolean(snap.data().isBookmarked);
  }

  async toggle(cloudId: string, uid: string, current: boolean): Promise<boolean> {
    const r = this.ref(cloudId, uid);

    if (!current) {
      await setDoc(
        r,
        {
          cloudId,
          uid,
          isBookmarked: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    } else {
      await updateDoc(r, {
        isBookmarked: false,
        updatedAt: serverTimestamp(),
      });
      return false;
    }
  }
}
