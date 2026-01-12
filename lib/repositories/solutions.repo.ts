import { db } from "@/lib/firebase/firestore";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  updateDoc,
  increment,
} from "firebase/firestore";

import { addDoc } from "firebase/firestore";


export type SolutionRow = {
  id: string;
  cloudId: string;
  uid: string;
  text: string;
  createdAt?: any;
  updatedAt?: any;
};


export class SolutionsRepo {
  private col() {
    return collection(db, "solutions");
  }

  private docRef(cloudId: string, uid: string) {
    return doc(db, "solutions", `${cloudId}_${uid}`);
  }

  private cloudRef(cloudId: string) {
    return doc(db, "clouds", cloudId);
  }

  async create(cloudId: string, uid: string, text: string) {
    await addDoc(this.col(), {
      cloudId,
      uid,
      text,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(this.cloudRef(cloudId), {
      "stats.solutionsCount": increment(1),
      updatedAt: serverTimestamp(),
    });
  }


  async upsert(cloudId: string, uid: string, text: string) {
    const ref = this.docRef(cloudId, uid);
    const snap = await getDoc(ref);
    const isNew = !snap.exists();

    await setDoc(
      ref,
      {
        cloudId,
        uid,
        text,
        createdAt: snap.exists() ? snap.data().createdAt ?? serverTimestamp() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (isNew) {
      await updateDoc(this.cloudRef(cloudId), {
        "stats.solutionsCount": increment(1),
        updatedAt: serverTimestamp(),
      });
    }
  }


  async listByCloud(cloudId: string): Promise<SolutionRow[]> {
    // uid順でなく新しい順にしたいので updatedAt を使う
    const q = query(
      this.col(),
      where("cloudId", "==", cloudId),
      orderBy("updatedAt", "desc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data: any = d.data();
      return {
        id: d.id,
        cloudId: data.cloudId,
        uid: data.uid,
        text: data.text ?? "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  }
}
