import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  type QueryConstraint,
  type DocumentData,
  type DocumentSnapshot,
  type QuerySnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

export abstract class BaseFirestoreService<T extends DocumentData> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  // Get collection reference
  protected getCollectionRef() {
    return collection(db, this.collectionName);
  }

  // Get document reference
  protected getDocRef(id: string) {
    return doc(db, this.collectionName, id);
  }

  // Create new document
  async create(data: Omit<T, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getCollectionRef(), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  }

  // Get document by ID
  async getById(id: string): Promise<T | null> {
    const docSnap = await getDoc(this.getDocRef(id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as unknown as T;
    }
    return null;
  }

  // Get all documents
  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.getCollectionRef(), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as unknown as T));
  }

  // Update document
  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<void> {
    await updateDoc(this.getDocRef(id), {
      ...data,
      updatedAt: new Date(),
    });
  }

  // Delete document
  async delete(id: string): Promise<void> {
    await deleteDoc(this.getDocRef(id));
  }

  // Real-time subscription to all documents
  onSnapshot(
    callback: (data: T[]) => void,
    constraints: QueryConstraint[] = []
  ): Unsubscribe {
    const q = query(this.getCollectionRef(), ...constraints);
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as T));
      callback(data);
    });
  }

  // Real-time subscription to single document
  onSnapshotById(id: string, callback: (data: T | null) => void): Unsubscribe {
    return onSnapshot(this.getDocRef(id), (doc: DocumentSnapshot) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as unknown as T);
      } else {
        callback(null);
      }
    });
  }

  // Query helpers
  protected createQuery(constraints: QueryConstraint[]) {
    return query(this.getCollectionRef(), ...constraints);
  }

  // Common query methods
  async findByField(field: string, value: any): Promise<T[]> {
    return this.getAll([where(field, '==', value)]);
  }

  async findWithPagination(pageSize: number, constraints: QueryConstraint[] = []): Promise<T[]> {
    return this.getAll([...constraints, limit(pageSize)]);
  }

  async findSorted(field: string, direction: 'asc' | 'desc' = 'asc'): Promise<T[]> {
    return this.getAll([orderBy(field, direction)]);
  }
}