import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { EVENT_ID } from './constants';
import type { ScoreDoc, Track } from '../../types';

export function useScores(track: Track) {
  const [scores, setScores] = useState<ScoreDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'scores'), where('eventId', '==', EVENT_ID), where('track', '==', track));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setScores(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as ScoreDoc) })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [track]);

  return { scores, loading };
}
