import { createClient } from "@base44/sdk";

const REMOTE_ORIGIN = "https://mito21-members-codex-da487265.base44.app";
const API_ORIGIN =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? REMOTE_ORIGIN
    : window.location.origin;
const FUNCTION_BASE = `${API_ORIGIN}/functions`;

// SDK client for direct entity access (fast reads)
const base44 = createClient({ appId: "69ad0dadda7f546dda487265" });

// Legacy function call for write operations
export async function apiRequest(path, options = {}) {
  const response = await fetch(`${FUNCTION_BASE}/${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

// Simple in-memory cache with TTL
const _cache = new Map();
const CACHE_TTL = 30_000; // 30 seconds

export function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) {
    _cache.delete(key);
    return undefined;
  }
  return entry.data;
}

export function cacheSet(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}

export function cacheInvalidate(prefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
}

export function cacheClear() {
  _cache.clear();
}

export { base44, FUNCTION_BASE, API_ORIGIN };
