import { db } from '../../db';
import { gamesCatalog, products } from '../../db/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { calculatePriceFromMargin } from './product-admin.service';

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function classifyDigiflazzProduct(item: Record<string, unknown>) {
  const brand = String(item.brand ?? '').trim();
  const type = String(item.type ?? item.product_type ?? '').trim();
  const name = String(item.product_name ?? item.desc ?? '').trim();
  const key = normalize(`${brand} ${type} ${name}`);
  const brandKey = normalize(brand);
  const pulsa = new Set(['telkomsel', 'xl', 'axis', 'indosat', 'tri', 'smartfren', 'by-u', 'byu']);
  const games = new Set(['mobile-legends', 'free-fire', 'mgcc', 'magic-chess', 'magic-chess-go-go']);
  const gameNameHints = ['magic-chess', 'mobile-legends', 'free-fire', 'honor-of-kings', 'genshin', 'pubg', 'valorant', 'clash-of-clans', 'clash-royale', 'arena-of-valor', 'call-of-duty'];
  const wallets = new Set(['dana', 'ovo', 'go-pay', 'gopay', 'shopee-pay', 'shopeepay']);
  const subCategory = type || 'Umum';

  if (brandKey === 'pln' || key.includes('token-listrik')) {
    return { category: 'PLN', groupName: 'PLN', subCategory: subCategory === 'Umum' ? 'Token' : subCategory };
  }

  if (pulsa.has(brandKey)) {
    // Cek apakah ada indikasi kata paket data / kuota / internet
    const isData = key.includes('data') || key.includes('kuota') || key.includes('internet') || key.includes('gb') || key.includes('unlimited') || key.includes('combo') || key.includes('flash') || key.includes('freedom');
    if (isData) {
      return {
        category: 'Data',
        groupName: `${brand} Data`,
        subCategory: subCategory === 'Umum' ? 'Paket Data' : subCategory,
      };
    }
    return {
      category: 'Pulsa',
      groupName: brand,
      subCategory: subCategory === 'Umum' ? 'Pulsa Reguler' : subCategory,
    };
  }

  if (games.has(brandKey) || normalize(type).includes('game') || gameNameHints.some((hint) => key.includes(hint))) {
    return { category: 'Game', groupName: brand || 'Game', subCategory };
  }

  if (wallets.has(brandKey)) {
    return { category: 'E-Wallet', groupName: brand, subCategory };
  }

  if (key.includes('voucher')) {
    return { category: 'Voucher', groupName: brand || 'Voucher', subCategory };
  }

  return { category: 'Other', groupName: brand || 'Other', subCategory };
}

export function mapDigiflazzProduct(item: Record<string, unknown>) {
  const classification = classifyDigiflazzProduct(item);
  const sku = String(item.buyer_sku_code ?? item.sku ?? '').trim();
  const brand = String(item.brand ?? '').trim();
  const gameKey = normalize(item.game_id ?? classification.groupName);
  const price = String(item.price ?? item.cost_price ?? '').trim();

  const buyerActive = item.buyer_product_status !== undefined ? Boolean(item.buyer_product_status) : true;
  const sellerActive = item.seller_product_status !== undefined ? Boolean(item.seller_product_status) : true;
  const rawStatus = String(item.status ?? '').trim().toLowerCase();
  const isStatusNormal = !rawStatus || rawStatus === 'normal' || rawStatus === 'available';

  const isAvailable = buyerActive && sellerActive && isStatusNormal;
  const supplierStatus = isAvailable ? 'available' : 'off';

  return {
    sku,
    brand: brand || null,
    gameKey,
    category: classification.category,
    groupName: classification.groupName,
    productType: classification.subCategory,
    denomination: String(item.product_name ?? item.desc ?? sku).trim(),
    costPrice: price,
    supplierStatus,
    valid: Boolean(sku && (brand || item.game_id) && gameKey && /^\d+(\.\d{1,2})?$/.test(price) && Number(price) >= 0),
  };
}
import { getActiveSupplier } from '../suppliers/supplierFactory';

export async function syncDigiflazzProducts() {
  const supplier = await getActiveSupplier();
  if (!supplier.getProducts) throw new Error('Active supplier does not support product sync');
  const incoming = await supplier.getProducts();
  if (!Array.isArray(incoming)) throw new Error('Digiflazz product response is invalid');
  const games = await db.query.gamesCatalog.findMany({ columns: { id: true, name: true, category: true } });
  const gameByKey = new Map(games.flatMap((game) => [[normalize(game.id), game], [normalize(game.name), game]]));
  let created = 0, updated = 0, unchanged = 0, failed = 0, gamesCreated = 0, groupsCreated = 0, groupsUpdated = 0;

  for (const raw of incoming) {
    const item = mapDigiflazzProduct(raw as Record<string, unknown>);
    if (!item.valid) { failed++; continue; }
    let game = gameByKey.get(item.gameKey);
    try {
      if (!game) {
        const [createdGame] = await db.insert(gamesCatalog).values({ id: item.gameKey, name: item.groupName, publisher: 'Digiflazz', category: item.category, thumbnailUrl: '/logo.webp', isActive: true }).onConflictDoNothing().returning({ id: gamesCatalog.id, name: gamesCatalog.name, category: gamesCatalog.category });
        game = createdGame ?? await db.query.gamesCatalog.findFirst({ where: eq(gamesCatalog.id, item.gameKey), columns: { id: true, name: true, category: true } });
        if (!game) { failed++; continue; }
        gameByKey.set(item.gameKey, game);
        gameByKey.set(normalize(game.name), game);
        if (createdGame) { gamesCreated++; groupsCreated++; }
      } else if (game.name !== item.groupName || game.category !== item.category) {
        await db.update(gamesCatalog).set({ name: item.groupName, category: item.category, updatedAt: new Date() }).where(eq(gamesCatalog.id, game.id));
        groupsUpdated++;
      }
      const existing = await db.query.products.findFirst({ where: and(eq(products.supplierCode, 'digiflazz'), eq(products.supplierProductCode, item.sku)) });
      const now = new Date();
      if (existing) {
        let newSellPrice = existing.sellPrice;
        if (existing.marginType && existing.marginValue && existing.basePrice !== item.costPrice) {
          try {
            newSellPrice = String(calculatePriceFromMargin(Number(item.costPrice), existing.marginType as 'fixed' | 'percentage', Number(existing.marginValue)));
          } catch {
            newSellPrice = existing.sellPrice;
          }
        }
        const changes: Record<string, any> = {
          gameId: game.id,
          denomination: item.denomination,
          basePrice: item.costPrice,
          sellPrice: newSellPrice,
          brand: item.brand,
          productType: item.productType,
          supplierStatus: item.supplierStatus,
          syncedAt: now,
          updatedAt: now,
        };
        // If supplier marked product off, deactivate it to keep customer safety
        if (item.supplierStatus === 'off' && existing.isActive) {
          changes.isActive = false;
        }
        const same = existing.gameId === game.id &&
          existing.denomination === item.denomination &&
          existing.basePrice === item.costPrice &&
          existing.sellPrice === newSellPrice &&
          existing.brand === item.brand &&
          existing.productType === item.productType &&
          existing.supplierStatus === item.supplierStatus &&
          (!changes.isActive || existing.isActive === changes.isActive);
        if (same) { unchanged++; continue; }
        await db.update(products).set(changes).where(eq(products.id, existing.id));
        updated++;
      } else {
        await db.insert(products).values({ gameId: game.id, sku: item.sku, denomination: item.denomination, basePrice: item.costPrice, sellPrice: item.costPrice, supplierCode: 'digiflazz', supplierProductCode: item.sku, brand: item.brand, productType: item.productType, supplierStatus: item.supplierStatus, isActive: false, syncedAt: now });
        created++;
      }
    } catch { failed++; }
  }
  // Reconcile deleted products: products in DB under digiflazz not present in incoming pricelist
  const incomingSkus = incoming
    .map((raw) => String((raw as any).buyer_sku_code ?? (raw as any).sku ?? '').trim())
    .filter(Boolean);

  let deleted = 0;
  // Empty valid pricelist means supplier removed every product. Non-array payload already rejected above.
  try {
      const missingProducts = await db
        .select({ id: products.id, sku: products.sku })
        .from(products)
        .where(
          and(
            eq(products.supplierCode, 'digiflazz'),
            notInArray(products.supplierProductCode, incomingSkus)
          )
        );

      if (missingProducts.length > 0) {
        const now = new Date();
        await db
          .update(products)
          .set({
            supplierStatus: 'deleted',
            isActive: false,
            updatedAt: now,
          })
          .where(
            and(
              eq(products.supplierCode, 'digiflazz'),
              notInArray(products.supplierProductCode, incomingSkus)
            )
          );
        deleted = missingProducts.length;
      }
  } catch {
    // Reconcile failure must not hide successful item updates.
  }

  return { created, updated, unchanged, failed, deleted, gamesCreated, groupsCreated, groupsUpdated, total: incoming.length };
}
