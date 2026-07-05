import { enableIndexedDbPersistence, enableNetwork, disableNetwork, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { openDB, type IDBPDatabase } from 'idb';
import imageCompression from 'browser-image-compression';
import { db, storage } from './firebase';
import type { ScoreDoc, ScorePhotoDoc } from '../types';

const PING_URL = 'https://www.gstatic.com/generate_204';
const PING_INTERVAL = 4000;
const STABLE_THRESHOLD = 2;
const UNSTABLE_THRESHOLD = 2;
const SYNC_WINDOW_MS = 20000;

let pingTimer: number | undefined;
let syncTimer: number | undefined;
let stable = false;
let networkEnabled = false;
let goodPings = 0;
let badPings = 0;
let photoQueueTimer: number | undefined;
let dbPromise: Promise<IDBPDatabase<unknown>> | undefined;

const PHOTO_DB_NAME = 'judge-photo-outbox';
const PHOTO_DB_VERSION = 1;
const PHOTO_STORE = 'photos';
const MAX_PHOTOS = 2;

async function safeDisableNetwork() {
  try {
    await disableNetwork(db);
  } catch (error) {
    console.warn('Failed to disable Firestore network', error);
  }
  networkEnabled = false;
}

async function safeEnableNetwork() {
  try {
    await enableNetwork(db);
    networkEnabled = true;
  } catch (error) {
    console.warn('Failed to enable Firestore network', error);
  }
}

async function pingOnline(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.onLine) {
    return false;
  }

  try {
    await fetch(PING_URL, { method: 'HEAD', cache: 'no-store', mode: 'no-cors' });
    return true;
  } catch {
    return false;
  }
}

function scheduleSyncWindow() {
  if (syncTimer) {
    return;
  }

  safeEnableNetwork().then(() => {
    syncTimer = window.setTimeout(async () => {
      await safeDisableNetwork();
      syncTimer = undefined;
      if (stable) {
        scheduleSyncWindow();
      }
    }, SYNC_WINDOW_MS);
  });
}

async function handleConnectivity(online: boolean) {
  if (online) {
    badPings = 0;
    goodPings += 1;
    if (!stable && goodPings >= STABLE_THRESHOLD) {
      stable = true;
      scheduleSyncWindow();
    }
  } else {
    goodPings = 0;
    badPings += 1;
    if (stable && badPings >= UNSTABLE_THRESHOLD) {
      stable = false;
      if (syncTimer) {
        window.clearTimeout(syncTimer);
        syncTimer = undefined;
      }
      if (networkEnabled) {
        await safeDisableNetwork();
      }
    }
  }
}

function startPingLoop() {
  if (pingTimer) {
    return;
  }

  const tick = async () => {
    const online = await pingOnline();
    await handleConnectivity(online);
  };

  void tick();
  pingTimer = window.setInterval(() => {
    void tick();
  }, PING_INTERVAL);
}

function getPhotoDb() {
  if (!dbPromise) {
    dbPromise = openDB(PHOTO_DB_NAME, PHOTO_DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(PHOTO_STORE)) {
          database.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

async function persistPhotoOutbox(photo: ScorePhotoDoc) {
  const database = await getPhotoDb();
  await database.put(PHOTO_STORE, photo);
}

async function getQueuedPhotos() {
  const database = await getPhotoDb();
  return database.getAll(PHOTO_STORE) as Promise<ScorePhotoDoc[]>;
}

async function removeQueuedPhoto(id: string) {
  const database = await getPhotoDb();
  await database.delete(PHOTO_STORE, id);
}

async function ensureSyncStatus(score: ScoreDoc, syncStatus: ScoreDoc['syncStatus']) {
  const scoreId = score.id ?? `${score.judgeId}_${score.itemId}`;
  const scoreRef = doc(db, 'scores', scoreId);
  const snapshot = await getDoc(scoreRef);
  if (snapshot.exists()) {
    await updateDoc(scoreRef, { syncStatus, updatedAt: new Date().toISOString() });
  }
}

async function processPhotoQueue() {
  if (!stable || !networkEnabled) {
    return;
  }

  const photos = await getQueuedPhotos();
  const queuedPhotos = photos.filter((photo) => photo.status === 'queued' || photo.status === 'retry');
  for (const photo of queuedPhotos) {
    const photoRef = ref(storage, photo.storagePath);
    try {
      await updatePhotoStatus(photo.id, 'uploading');
      const file = new File([photo.blob], photo.id, { type: photo.mimeType });
      const compressed = await imageCompression(file, { maxWidthOrHeight: 1280, initialQuality: 0.7, useWebWorker: true });
      await uploadBytes(photoRef, compressed, { contentType: photo.mimeType });
      const url = await getDownloadURL(photoRef);
      const scoreRef = doc(db, 'scores', photo.scoreId);
      const scoreSnapshot = await getDoc(scoreRef);
      if (scoreSnapshot.exists()) {
        const scoreData = scoreSnapshot.data() as ScoreDoc;
        const nextPhotos = [...(scoreData.photos ?? []), { url, storagePath: photo.storagePath, w: 0, h: 0 }];
        await updateDoc(scoreRef, { photos: nextPhotos, syncStatus: 'synced', updatedAt: new Date().toISOString() });
      }
      await removeQueuedPhoto(photo.id);
      await updatePhotoStatus(photo.id, 'synced');
    } catch (error) {
      console.warn('Photo upload failed', error);
      await updatePhotoStatus(photo.id, 'retry');
    }
  }
}

async function updatePhotoStatus(id: string, status: ScorePhotoDoc['status']) {
  const database = await getPhotoDb();
  const existing = await database.get(PHOTO_STORE, id) as ScorePhotoDoc | undefined;
  if (existing) {
    await database.put(PHOTO_STORE, { ...existing, status, updatedAt: new Date().toISOString() });
  }
}

function schedulePhotoQueue() {
  if (photoQueueTimer) {
    return;
  }
  photoQueueTimer = window.setInterval(() => {
    void processPhotoQueue();
  }, 5000);
}

export async function initOfflineEngine() {
  try {
    await enableIndexedDbPersistence(db);
  } catch (error) {
    console.warn('Offline persistence not available', error);
  }

  if (typeof navigator !== 'undefined' && 'storage' in navigator && 'persist' in navigator.storage) {
    try {
      await navigator.storage.persist();
    } catch (error) {
      console.warn('Storage persistence request failed', error);
    }
  }

  await safeDisableNetwork();
  startPingLoop();
  schedulePhotoQueue();

  return () => {
    if (pingTimer) {
      window.clearInterval(pingTimer);
      pingTimer = undefined;
    }
    if (syncTimer) {
      window.clearTimeout(syncTimer);
      syncTimer = undefined;
    }
    if (photoQueueTimer) {
      window.clearInterval(photoQueueTimer);
      photoQueueTimer = undefined;
    }
    void safeDisableNetwork();
  };
}

export async function writeScoreDoc(score: ScoreDoc) {
  const scoreId = score.id ?? `${score.judgeId}_${score.itemId}`;
  const payload = {
    ...score,
    id: scoreId,
    deleted: false,
    updatedAt: score.updatedAt ?? new Date().toISOString(),
  };
  if (!payload.createdAt) {
    payload.createdAt = new Date().toISOString();
  }

  await setDoc(doc(db, 'scores', scoreId), payload);
  await ensureSyncStatus(payload, payload.syncStatus ?? 'saved');
}

export async function queuePhotoForScore(scoreId: string, file: File) {
  const compressed = await imageCompression(file, { maxWidthOrHeight: 1280, initialQuality: 0.7, useWebWorker: true });
  const photoId = `${scoreId}_${crypto.randomUUID()}`;
  const photo: ScorePhotoDoc = {
    id: photoId,
    scoreId,
    storagePath: `photos/${scoreId}/${photoId}.${compressed.type.split('/')[1] || 'jpg'}`,
    mimeType: compressed.type || 'image/jpeg',
    blob: compressed,
    status: 'queued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await persistPhotoOutbox(photo);
  const scoreRef = doc(db, 'scores', scoreId);
  await updateDoc(scoreRef, { syncStatus: 'queued', updatedAt: new Date().toISOString() });
  return photoId;
}

export async function getPhotoOutboxCount() {
  const database = await getPhotoDb();
  return database.count(PHOTO_STORE);
}

export async function getPhotoOutboxStatus(scoreId: string) {
  const database = await getPhotoDb();
  const photos = await database.getAll(PHOTO_STORE) as ScorePhotoDoc[];
  const matching = photos.filter((photo) => photo.scoreId === scoreId);
  if (matching.length === 0) {
    return 'synced' as const;
  }
  if (matching.some((photo) => photo.status === 'retry')) {
    return 'retry' as const;
  }
  if (matching.some((photo) => photo.status === 'uploading')) {
    return 'uploading' as const;
  }
  return 'queued' as const;
}
