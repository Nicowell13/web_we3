import { getActiveSupplier } from './supplierFactory';
import type { TopUpProvider } from './topupProvider';

/** Mask customer name before returning it to public clients. */
export function maskPlnCustomerName(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') return '***';
  const clean = rawName.trim();
  if (clean.length === 0) return '***';
  if (clean.length <= 4) {
    if (clean.length === 1) return `${clean}***`;
    return `${clean.slice(0, 1)}***${clean.slice(-1)}`;
  }
  return `${clean.slice(0, 2)}***${clean.slice(-2)}`;
}

export function isValidPlnCustomerNo(customerNo: string): boolean {
  if (!customerNo) return false;
  const digitsOnly = customerNo.trim().replace(/\D/g, '');
  return digitsOnly.length >= 11 && digitsOnly.length <= 12;
}

export type PlnInquiryResult = {
  ok: boolean;
  customerNo: string;
  maskedName?: string;
  meterNo?: string;
  subscriberId?: string;
  segmentPower?: string;
  message?: string;
};

/** Run real Digiflazz PLN inquiry. No mock/fallback customer exists. */
export async function inquirePlnCustomer(customerNo: string, supplier?: TopUpProvider): Promise<PlnInquiryResult> {
  const cleanNo = (customerNo || '').trim().replace(/\D/g, '');
  if (!isValidPlnCustomerNo(cleanNo)) {
    return { ok: false, customerNo: cleanNo, message: 'Nomor ID Pelanggan / Meter PLN harus 11-12 digit angka.' };
  }

  try {
    const provider = supplier ?? await getActiveSupplier();
    if (!provider.inquirePln) throw new Error('Supplier aktif tidak mendukung inquiry PLN.');
    const data = await provider.inquirePln(cleanNo);
    const status = String(data?.status ?? '').toLowerCase();
    const rc = String(data?.rc ?? '');
    const returnedCustomerNo = String(data?.customer_no ?? '');
    const name = String(data?.name ?? '').trim();

    if (status !== 'sukses' || rc !== '00' || !name || returnedCustomerNo !== cleanNo) {
      return {
        ok: false,
        customerNo: cleanNo,
        message: String(data?.message || 'ID Pelanggan tidak terdaftar atau salah. Periksa kembali nomor meter Anda.'),
      };
    }

    return {
      ok: true,
      customerNo: cleanNo,
      maskedName: maskPlnCustomerName(name),
      meterNo: data?.meter_no ? String(data.meter_no) : undefined,
      subscriberId: data?.subscriber_id ? String(data.subscriber_id) : undefined,
      segmentPower: data?.segment_power ? String(data.segment_power) : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      customerNo: cleanNo,
      message: error instanceof Error ? error.message : 'Gagal memeriksa ID Pelanggan PLN.',
    };
  }
}
