import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where, type QueryConstraint } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { EVENT_ID } from './constants';

export interface WithId {
  id?: string;
}

export function useAdminCollection<T extends WithId>(collectionName: string, orderByField?: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const constraints: QueryConstraint[] = [where('eventId', '==', EVENT_ID)];
    if (orderByField) constraints.push(orderBy(orderByField));
    const q = query(collection(db, collectionName), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as T) })));
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, orderByField]);

  async function add(data: Omit<T, 'id' | 'eventId'>) {
    await addDoc(collection(db, collectionName), { ...data, eventId: EVENT_ID });
  }

  async function update(id: string, data: Partial<T>) {
    await updateDoc(doc(db, collectionName, id), data as Record<string, unknown>);
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, collectionName, id));
  }

  return { items, loading, error, add, update, remove };
}
