'use client';

import { useSyncExternalStore, useCallback } from 'react';

const WISHLIST_STORAGE_KEY = 'pb2_wishlist';

// Cached snapshot in memory to maintain reference stability for useSyncExternalStore
let memoryWishlist: string[] = [];
let memoryWishlistRaw: string | null = null;
const listeners = new Set<() => void>();

function readStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY) || '[]';
    if (raw !== memoryWishlistRaw) {
      memoryWishlistRaw = raw;
      const parsed = JSON.parse(raw);
      memoryWishlist = Array.isArray(parsed) ? parsed : [];
    }
    return memoryWishlist;
  } catch {
    return [];
  }
}

export function getStoredWishlist(): string[] {
  return readStorage();
}

function getSnapshot(): string[] {
  return readStorage();
}

const SERVER_SNAPSHOT: string[] = [];

function getServerSnapshot(): string[] {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void) {
  listeners.add(callback);

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === WISHLIST_STORAGE_KEY) {
      memoryWishlistRaw = null; // force reload on external storage event
      callback();
    }
  };

  const handleCustomEvent = () => {
    callback();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('wishlist-updated', handleCustomEvent);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('wishlist-updated', handleCustomEvent);
    }
  };
}

export function saveWishlist(items: string[]) {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.stringify(items);
    memoryWishlistRaw = raw;
    memoryWishlist = items;
    localStorage.setItem(WISHLIST_STORAGE_KEY, raw);

    // Notify all useSyncExternalStore subscribers cleanly
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error notifying wishlist subscriber:', err);
      }
    });

    // Notify other tabs or non-React listeners asynchronously
    window.dispatchEvent(new Event('wishlist-updated'));
  } catch (err) {
    console.error('Failed to save wishlist:', err);
  }
}

export function useWishlist() {
  const wishlist = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isWishlisted = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist]
  );

  const toggleWishlist = useCallback(
    (productId: string) => {
      const current = readStorage();
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      saveWishlist(next);
    },
    []
  );

  return {
    wishlist,
    isWishlisted,
    toggleWishlist,
    wishlistCount: wishlist.length,
  };
}
