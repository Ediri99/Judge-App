import { enableIndexedDbPersistence, enableNetwork, disableNetwork, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ScoreDoc } from '../types';

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

  return () => {
    if (pingTimer) {
      window.clearInterval(pingTimer);
      pingTimer = undefined;
    }
    if (syncTimer) {
      window.clearTimeout(syncTimer);
      syncTimer = undefined;
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
}
