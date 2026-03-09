const REMOTE_ORIGIN = "https://mito21-members-codex-da487265.base44.app";
const API_ORIGIN =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? REMOTE_ORIGIN
    : window.location.origin;
const FUNCTION_BASE = `${API_ORIGIN}/functions`;

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${FUNCTION_BASE}/${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export { FUNCTION_BASE, API_ORIGIN };
