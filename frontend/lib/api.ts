/**
 * Next.js calls use paths like `/api/settings/...`. The env base must be the API **origin**
 * only (e.g. `http://localhost:8000`). If someone sets `.../api`, we strip it so we never
 * request `/api/api/...` (FastAPI returns `{"detail":"Not Found"}`).
 */
function resolveApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    "http://localhost:8000";
  let base = raw.replace(/\/+$/, "");
  if (base.toLowerCase().endsWith("/api")) {
    base = base.slice(0, -4).replace(/\/+$/, "");
  }
  return base || "http://localhost:8000";
}

const API_BASE = resolveApiBase();

export function apiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: init?.cache ?? "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

/** SWR default fetcher — keys are `/api/...` paths. */
export function swrFetcher<T>(key: string): Promise<T> {
  return apiJson<T>(key);
}
