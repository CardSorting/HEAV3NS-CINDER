/** [LAYER: UI] */
export async function request<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    let response: Response;
    try {
      response = await fetch(path, { signal: controller.signal, ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
    } catch {
      throw new Error(body === undefined ? 'Unable to reach the server. Check your connection and try again.' : 'The server did not confirm this action. Check its result before retrying.');
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
    if (data === null) throw new Error(body === undefined ? 'The server returned an invalid response.' : 'The server response could not be verified. Check its result before retrying.');
    return data as T;
  } finally { window.clearTimeout(timer); }
}