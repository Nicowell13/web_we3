import { env } from 'process';

/**
 * Minimal Digiflazz client.
 * Uses environment variables:
 *   DIGIFLAZZ_BASE_URL - base URL of Digiflazz API (e.g. https://api.digiflazz.com)
 *   DIGIFLAZZ_API_KEY   - public key
 *   DIGIFLAZZ_API_SECRET - secret key
 */
export async function digiflazzRequest(endpoint: string, payload: any) {
  const baseUrl = env.DIGIFLAZZ_BASE_URL;
  const apiKey = env.DIGIFLAZZ_API_KEY;
  const apiSecret = env.DIGIFLAZZ_API_SECRET;
  if (!baseUrl || !apiKey || !apiSecret) {
    throw new Error('Digiflazz credentials not configured');
  }

  const url = `${baseUrl}${endpoint}`;
  const body = JSON.stringify({ ...payload, apiKey, signature: apiSecret });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Digiflazz error ${res.status}: ${err}`);
  }
  return await res.json();
}
