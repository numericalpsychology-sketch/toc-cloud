import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

export type CloudCreatePayload = {
  ownerUid: string;

  title: string;
  titleAuto: boolean;

  A: { text: string };
  B: { raw: string; normalized: string };
  C: { raw: string; normalized: string };
  D: { text: string };
  Dprime: { text: string };

  context?: string | null;
  reason_D_blocks_C?: string | null;
  reason_Dprime_blocks_B?: string | null;


  conflictType: "internal" | "external";
  tags: string[];

  visibility: "public" | "unlisted";
  status: "active";

  stats: { helpfulCount: number; bookmarkCount: number };

  createdAt: any; // serverTimestamp
  updatedAt: any; // serverTimestamp
};

export type CloudDoc = CloudCreatePayload;

export class CloudsRepo {
  constructor(private db: Firestore) { }

  async create(payload: Omit<CloudCreatePayload, "createdAt" | "updatedAt">) {
    const ref = collection(this.db, "clouds");
    const created = await addDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: created.id };
  }

  async getById(id: string): Promise<CloudDoc | null> {
    const ref = doc(this.db, "clouds", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as CloudDoc;
  }
}

