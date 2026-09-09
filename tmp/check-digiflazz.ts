import * as dotenv from 'dotenv';
import { createHash } from 'crypto';
dotenv.config({ path: '.env.local' }); dotenv.config();
const username = process.env.DIGIFLAZZ_USERNAME || '';
const apiKey = process.env.DIGIFLAZZ_API_KEY || '';
const sign = createHash('md5').update(username + apiKey + 'pricelist').digest('hex');
const res = await fetch('https://api.digiflazz.com/v1/price-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cmd: 'prepaid', username, sign }) });
const json: any = await res.json();
console.log(JSON.stringify({ status: res.status, ok: res.ok, responseKeys: Object.keys(json || {}), dataType: Array.isArray(json?.data) ? 'array' : typeof json?.data, count: Array.isArray(json?.data) ? json.data.length : undefined, message: json?.data?.message || json?.message, rc: json?.data?.rc || json?.rc, nestedDataType: json?.data && !Array.isArray(json.data) ? typeof json.data.data : undefined }));
