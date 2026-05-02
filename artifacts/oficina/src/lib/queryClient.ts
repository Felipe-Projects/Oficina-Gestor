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
    let message = text || `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json?.error) message = json.error;
      else if (json?.message) message = json.message;
    } catch {
      // texto plano — mantém como está
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}
