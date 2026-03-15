import { createClient } from "@base44/sdk";

const REMOTE_ORIGIN = "https://mito21-members-codex-da487265.base44.app";
const API_ORIGIN =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? REMOTE_ORIGIN
    : window.location.origin;
const FUNCTION_BASE = `${API_ORIGIN}/functions`;

const APP_ID = "69ad0dadda7f546dda487265";

// Restore token from localStorage on page load
const _savedToken = typeof window !== "undefined"
  ? (localStorage.getItem("base44_token") || null)
  : null;

// SDK client — pass saved token so SDK sets Authorization header immediately
const _base44 = createClient({ appId: APP_ID, token: _savedToken });

// ── Rate-limit retry wrapper ──
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

function isRateLimitError(err) {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("rate limit") || msg.includes("429") || msg.includes("too many");
}

async function withRetry(fn, retries = 0) {
  try {
    return await fn();
  } catch (err) {
    if (isRateLimitError(err) && retries < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY * (retries + 1)));
      return withRetry(fn, retries + 1);
    }
    if (isRateLimitError(err)) {
      throw new Error("リクエスト制限に達しました。しばらく待ってから再読み込みしてください。");
    }
    throw err;
  }
}

// ── In-memory cache for SDK reads ──
const _readCache = new Map();
const READ_CACHE_TTL = 30_000; // 30s

function readCacheKey(entity, method, args) {
  return `${entity}:${method}:${JSON.stringify(args)}`;
}

function readCacheGet(key) {
  const entry = _readCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > READ_CACHE_TTL) { _readCache.delete(key); return undefined; }
  return entry.data;
}

function readCacheSet(key, data) {
  _readCache.set(key, { data, ts: Date.now() });
}

// In-flight dedup: prevent duplicate concurrent requests for same key
const _inflight = new Map();

async function cachedFetch(key, fn) {
  // Check cache
  const cached = readCacheGet(key);
  if (cached !== undefined) return cached;

  // Dedup in-flight
  if (_inflight.has(key)) return _inflight.get(key);

  const promise = withRetry(fn).then((result) => {
    readCacheSet(key, result);
    _inflight.delete(key);
    return result;
  }).catch((err) => {
    _inflight.delete(key);
    throw err;
  });

  _inflight.set(key, promise);
  return promise;
}

// ── Wrap base44 entities with cache + retry ──
function wrapEntity(entityName, entity) {
  return {
    list(...args) {
      const key = readCacheKey(entityName, "list", args);
      return cachedFetch(key, () => entity.list(...args));
    },
    filter(...args) {
      const key = readCacheKey(entityName, "filter", args);
      return cachedFetch(key, () => entity.filter(...args));
    },
    get(...args) {
      const key = readCacheKey(entityName, "get", args);
      return cachedFetch(key, () => entity.get(...args));
    },
    // Write methods: no cache, just retry
    create: (...args) => withRetry(() => entity.create(...args)),
    update: (...args) => withRetry(() => entity.update(...args)),
    delete: (...args) => withRetry(() => entity.delete(...args)),
  };
}

const entityCache = {};
const base44 = {
  entities: new Proxy({}, {
    get(_, entityName) {
      if (!entityCache[entityName]) {
        entityCache[entityName] = wrapEntity(entityName, _base44.entities[entityName]);
      }
      return entityCache[entityName];
    },
  }),
  // Expose SDK functions module (authenticated calls)
  functions: _base44.functions,
  // Expose integrations module (file uploads, etc.)
  integrations: _base44.integrations,
};

// Invalidate read cache (call after writes)
export function invalidateReadCache(entityName) {
  for (const key of _readCache.keys()) {
    if (!entityName || key.startsWith(entityName + ":")) _readCache.delete(key);
  }
}

// Backend function call via SDK (authenticated, with rate-limit retry)
export async function apiRequest(functionName, options = {}) {
  let body = {};
  if (options.body) {
    body = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
  }
  return withRetry(() => _base44.functions.invoke(functionName, body));
}

// Simple in-memory cache with TTL (legacy, for manual usage)
const _cache = new Map();
const CACHE_TTL = 30_000;

export function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return undefined; }
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
  _readCache.clear();
}

// Expose raw SDK auth methods
const auth = _base44.auth;

export { base44, auth, FUNCTION_BASE, API_ORIGIN };
