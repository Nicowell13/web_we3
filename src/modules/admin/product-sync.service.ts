import { db } from '../../db';
import { gamesCatalog, products } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function classifyDigiflazzProduct(item: Record<string, unknown>) {
  const brand = String(item.brand ?? '').trim();
  const type = String(item.type ?? item.product_type ?? '').trim();
  const name = String(item.product_name ?? item.desc ?? '').trim();
  const key = normalize(`${brand} ${type} ${name}`);
  const brandKey = normalize(brand);
  const pulsa = new Set(['telkomsel', 'xl', 'axis', 'indosat', 'tri', 'smartfren', 'by-u']);
  const games = new Set(['mobile-legends', 'free-fire']);
  const wallets = new Set(['dana', 'ovo', 'go-pay', 'gopay', 'shopee-pay', 'shopeepay']);
  const groupName = brand || 'Other';
  const subCategory = type || 'Umum';
  if (brandKey === 'pln' || key.includes('token-listrik')) return { category: 'PLN', groupName: 'PLN', subCategory: subCategory === 'Umum' ? 'Token' : subCategory };
  if (pulsa.has(brandKey)) return { category: 'Pulsa', groupName, subCategory };
  if (games.has(brandKey)) return { category: 'Game', groupName, subCategory };
  if (wallets.has(brandKey)) return { category: 'E-Wallet', groupName, subCategory };
  if (key.includes('voucher')) return { category: 'Voucher', groupName, subCategory };
  return { category: 'Other', groupName, subCategory };
}

export function mapDigiflazzProduct(item: Record<string, unknown>) {
  const classification = classifyDigiflazzProduct(item);
  const sku = String(item.buyer_sku_code ?? item.sku ?? '').trim();
  const brand = String(item.brand ?? '').trim();
  const gameKey = normalize(item.game_id ?? classification.groupName);
  const price = String(item.price ?? item.cost_price ?? '').trim();
  return {
    sku,
    brand: brand || null,
    gameKey,
    category: classification.category,
    groupName: classification.groupName,
    productType: classification.subCategory,
    denomination: String(item.product_name ?? item.desc ?? sku).trim(),
    costPrice: price,
    supplierStatus: String(item.status ?? 'available').trim() || 'available',
    valid: Boolean(sku && (brand || item.game_id) && gameKey && /^\d+(\.\d{1,2})?$/.test(price) && Number(price) >= 0),
  };
}
import { getActiveSupplier } from '../suppliers/supplierFactory';

export async function syncDigiflazzProducts() {
  const supplier = await getActiveSupplier();
  if (!supplier.getProducts) throw new Error('Active supplier does not support product sync');
  const incoming = await supplier.getProducts();
  if (!Array.isArray(incoming)) throw new Error('Digiflazz product response is invalid');
  const games = await db.query.gamesCatalog.findMany({ columns: { id: true, name: true } });
  const gameByKey = new Map(games.flatMap((game) => [[normalize(game.id), game], [normalize(game.name), game]]));
  let created = 0, updated = 0, unchanged = 0, failed = 0, gamesCreated = 0;

  for (const raw of incoming) {
    const item = mapDigiflazzProduct(raw as Record<string, unknown>);
    if (!item.valid) { failed++; continue; }
    let game = gameByKey.get(item.gameKey);
    try {
      if (!game) {
        const [createdGame] = await db.insert(gamesCatalog).values({ id: item.gameKey, name: item.groupName, publisher: 'Digiflazz', category: item.category, thumbnailUrl: '/logo.webp', isActive: true }).onConflictDoNothing().returning({ id: gamesCatalog.id, name: gamesCatalog.name });
        game = createdGame ?? await db.query.gamesCatalog.findFirst({ where: eq(gamesCatalog.id, item.gameKey), columns: { id: true, name: true } });
        if (!game) { failed++; continue; }
        gameByKey.set(item.gameKey, game);
        gameByKey.set(normalize(game.name), game);
        if (createdGame) gamesCreated++;
      } else {
        await db.update(gamesCatalog).set({ category: item.category, updatedAt: new Date() }).where(eq(gamesCatalog.id, game.id));
      }
      const existing = await db.query.products.findFirst({ where: and(eq(products.supplierCode, 'digiflazz'), eq(products.supplierProductCode, item.sku)) });
      const now = new Date();
      if (existing) {
        const changes = { gameId: game.id, denomination: item.denomination, basePrice: item.costPrice, brand: item.brand, productType: item.productType, supplierStatus: item.supplierStatus, syncedAt: now, updatedAt: now };
        const same = existing.gameId === game.id && existing.denomination === item.denomination && existing.basePrice === item.costPrice && existing.brand === item.brand && existing.productType === item.productType && existing.supplierStatus === item.supplierStatus;
        if (same) { unchanged++; continue; }
        await db.update(products).set(changes).where(eq(products.id, existing.id));
        updated++;
      } else {
        await db.insert(products).values({ gameId: game.id, sku: item.sku, denomination: item.denomination, basePrice: item.costPrice, sellPrice: item.costPrice, supplierCode: 'digiflazz', supplierProductCode: item.sku, brand: item.brand, productType: item.productType, supplierStatus: item.supplierStatus, isActive: false, syncedAt: now });
        created++;
      }
    } catch { failed++; }
  }
  return { created, updated, unchanged, failed, gamesCreated, total: incoming.length };
}
