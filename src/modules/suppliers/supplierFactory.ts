import { db } from '../../db';
import { systemConfigs } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { DigiflazzAdapter } from '../../integrations/digiflazz/adapter';
import type { TopUpProvider } from './topupProvider';

const CONFIG_KEY = 'ACTIVE_SUPPLIER';

/**
 * Returns the active TopUpProvider based on system_configs.ACTIVE_SUPPLIER.
 * Falls back to 'digiflazz' if not set or DB unavailable.
 *
 * Add new suppliers here:
 *   case 'voltras': return new VoltrasAdapter(...);
 */
export async function getActiveSupplier(): Promise<TopUpProvider> {
  let activeSupplier = 'digiflazz';

  try {
    const row = await db.query.systemConfigs.findFirst({
      where: eq(systemConfigs.key, CONFIG_KEY),
    });
    if (row?.isActive && row.value) activeSupplier = row.value;
  } catch {
    // DB unreachable — use default
  }

  return resolveSupplier(activeSupplier);
}

export function resolveSupplier(name: string): TopUpProvider {
  switch (name) {
    case 'digiflazz':
      return new DigiflazzAdapter(
        process.env.DIGIFLAZZ_USERNAME ?? '',
        process.env.DIGIFLAZZ_API_KEY ?? ''
      );

    default:
      throw new Error(`Unknown supplier: ${name}. Register it in supplierFactory.ts`);
  }
}
