import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Simple in-memory cache shared across all hook instances.
 * Key → { data, ts, promise }
 */
const _cache = new Map();
const CACHE_TTL = 30_000; // 30 seconds

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) {
    _cache.delete(key);
    return undefined;
  }
  return entry;
}

function cacheSet(key, data) {
  _cache.set(key, { data, ts: Date.now(), promise: null });
}

/** Deduplicate in-flight requests: if same key is already loading, reuse promise */
function cacheGetInflight(key) {
  const entry = _cache.get(key);
  if (entry?.promise) return entry.promise;
  return null;
}

function cacheSetInflight(key, promise) {
  const existing = _cache.get(key);
  if (existing) {
    existing.promise = promise;
  } else {
    _cache.set(key, { data: null, ts: 0, promise });
  }
}

export function invalidateCache(prefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
}

export function clearCache() {
  _cache.clear();
}

/**
 * Rate-limit aware fetcher with retry.
 * Retries up to `maxRetries` times on 429 / rate-limit errors, waiting `retryDelay` ms between attempts.
 */
async function fetchWithRetry(fn, { signal, maxRetries = 3, retryDelay = 2000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = (err?.message || "").toLowerCase();
      const isRateLimit = msg.includes("rate limit") || msg.includes("429") || msg.includes("too many");
      if (!isRateLimit || attempt === maxRetries) throw err;
      // Wait before retry
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, retryDelay * (attempt + 1));
        if (signal) {
          signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
        }
      });
    }
  }
  throw lastError;
}

/**
 * useDataCache – fetch data with caching, deduplication, abort, and rate-limit retry.
 *
 * @param {string} cacheKey  Unique key for this data (e.g. "members:approved")
 * @param {() => Promise<T>} fetcher  Async function that returns data
 * @param {object} [options]
 * @param {boolean} [options.enabled=true]  Whether to fetch
 * @param {any[]}  [options.deps=[]]  Extra dependencies that trigger refetch
 * @returns {{ data: T|null, loading: boolean, error: string, refresh: () => void }}
 */
export default function useDataCache(cacheKey, fetcher, options = {}) {
  const { enabled = true, deps = [] } = options;
  const [data, setData] = useState(() => {
    const cached = cacheGet(cacheKey);
    return cached ? cached.data : null;
  });
  const [loading, setLoading] = useState(() => {
    return enabled && !cacheGet(cacheKey);
  });
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async (force = false) => {
    if (!enabled) return;

    // Check cache first (unless forced)
    if (!force) {
      const cached = cacheGet(cacheKey);
      if (cached) {
        setData(cached.data);
        setLoading(false);
        setError("");
        return;
      }
    }

    // Check inflight dedup
    const inflight = cacheGetInflight(cacheKey);
    if (inflight && !force) {
      try {
        const result = await inflight;
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
          setError("");
        }
        return;
      } catch {
        // If inflight failed, proceed with new fetch
      }
    }

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    const promise = fetchWithRetry(fetcher, { signal: controller.signal })
      .then((result) => {
        cacheSet(cacheKey, result);
        if (mountedRef.current && !controller.signal.aborted) {
          setData(result);
          setLoading(false);
        }
        return result;
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        if (mountedRef.current) {
          const msg = (err?.message || "").toLowerCase();
          const isRateLimit = msg.includes("rate limit") || msg.includes("429") || msg.includes("too many");
          setError(isRateLimit
            ? "リクエスト制限に達しました。しばらく待ってから再読み込みしてください。"
            : (err?.message || "データの取得に失敗しました。")
          );
          setLoading(false);
        }
      });

    if (!force) cacheSetInflight(cacheKey, promise);
  }, [cacheKey, enabled, fetcher]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    doFetch();
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, [cacheKey, enabled, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => doFetch(true), [doFetch]);

  return { data, loading, error, refresh };
}

/**
 * useMultiCache – fetch multiple entities in a single Promise.all with caching per key.
 *
 * @param {Array<{ key: string, fetcher: () => Promise }>} entries
 * @param {object} [options]
 * @returns {{ data: object|null, loading: boolean, error: string, refresh: () => void }}
 */
export function useMultiCache(entries, options = {}) {
  const { enabled = true, deps = [] } = options;
  const keys = entries.map((e) => e.key).join("|");

  const [data, setData] = useState(() => {
    const allCached = entries.every((e) => cacheGet(e.key));
    if (allCached) {
      const result = {};
      entries.forEach((e) => { result[e.key] = cacheGet(e.key).data; });
      return result;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => enabled && !data);
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async (force = false) => {
    if (!enabled) return;

    // Check all cached
    if (!force) {
      const allCached = entries.every((e) => cacheGet(e.key));
      if (allCached) {
        const result = {};
        entries.forEach((e) => { result[e.key] = cacheGet(e.key).data; });
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
          setError("");
        }
        return;
      }
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const results = await Promise.all(
        entries.map((e) => {
          // Use cache if available and not forced
          if (!force) {
            const cached = cacheGet(e.key);
            if (cached) return Promise.resolve(cached.data);
          }
          return fetchWithRetry(e.fetcher, { signal: controller.signal });
        })
      );

      if (controller.signal.aborted) return;

      const result = {};
      entries.forEach((e, i) => {
        cacheSet(e.key, results[i]);
        result[e.key] = results[i];
      });

      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (mountedRef.current) {
        const msg = (err?.message || "").toLowerCase();
        const isRateLimit = msg.includes("rate limit") || msg.includes("429") || msg.includes("too many");
        setError(isRateLimit
          ? "リクエスト制限に達しました。しばらく待ってから再読み込みしてください。"
          : (err?.message || "データの取得に失敗しました。")
        );
        setLoading(false);
      }
    }
  }, [keys, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    doFetch();
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, [keys, enabled, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => doFetch(true), [doFetch]);

  return { data, loading, error, refresh };
}
