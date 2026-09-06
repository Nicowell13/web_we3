import { createHash } from 'crypto';
import { TopUpProvider } from '../../modules/suppliers/topupProvider';

const BASE_URL = 'https://api.digiflazz.com/v1';

function makeSignature(username: string, apiKey: string, ref: string) {
  return createHash('md5').update(username + apiKey + ref).digest('hex');
}

async function post(endpoint: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json() as { data: any };
    const data = json.data ?? json;
    if (!res.ok || data?.status === 'Gagal') {
      throw new Error(data?.message || `Digiflazz request failed (${res.status})`);
    }
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Digiflazz request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export class DigiflazzAdapter implements TopUpProvider {
  private username: string;
  private apiKey: string;

  constructor(username: string, apiKey: string) {
    this.username = username.trim();
    this.apiKey = apiKey.trim();
  }

  async checkBalance() {
    const sign = makeSignature(this.username, this.apiKey, 'depo');
    return post('/cek-saldo', {
      cmd: 'deposit',
      username: this.username,
      sign,
    });
  }

  async inquireAccount(targetId: string) {
    // Digiflazz does not have a generic inquire — return targetId as-is
    return { targetId, supported: false };
  }

  async inquirePln(customerNo: string) {
    const username = (process.env.DIGIFLAZZ_PLN_USERNAME || this.username).trim();
    const apiKey = (process.env.DIGIFLAZZ_PLN_API_KEY || this.apiKey).trim();
    const sign = makeSignature(username, apiKey, customerNo);
    return post('/inquiry-pln', {
      username,
      customer_no: customerNo,
      sign,
    });
  }

  async createOrder(productSku: string, targetId: string, _amount?: number, orderRef?: string) {
    const refId = orderRef ?? `WETRI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const sign = makeSignature(this.username, this.apiKey, refId);
    return post('/transaction', {
      username: this.username,
      buyer_sku_code: productSku,
      customer_no: targetId,
      ref_id: refId,
      sign,
      testing: process.env.DIGIFLAZZ_ENV === 'dev',
    });
  }

  async getProducts() {
    const sign = makeSignature(this.username, this.apiKey, 'pricelist');
    const products = await post('/price-list', {
      cmd: 'prepaid',
      username: this.username,
      sign,
    });
    if (!Array.isArray(products)) throw new Error(products?.message || 'Digiflazz price list response is invalid');
    return products;
  }

  async checkOrderStatus(orderRef: string) {
    const sign = makeSignature(this.username, this.apiKey, orderRef);
    return post('/transaction', {
      username: this.username,
      ref_id: orderRef,
      sign,
    });
  }
}
