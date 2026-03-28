export async function apiRequest(method: string, url: string, data?: unknown): Promise<any> {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const fullUrl = url.startsWith("/") ? `${base}${url}` : url;
  const res = await fetch(fullUrl, {
    method,
    headers: data !== undefined ? { "Content-Type": "application/json" } : {},
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}
