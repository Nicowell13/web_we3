Parent: #30
Depends on: #48, #49, #50, #55

## Goal
When Digiflazz sync pulls a new brand/group/subcategory, create or update the catalog group automatically so admin and public catalog show it without manual setup.

Example:
- Existing Game groups: Free Fire, Mobile Legends
- Digiflazz later returns product brand/group: MGCC
- Sync should automatically create `games_catalog` row for MGCC, classify it as `Game`, attach products to it, and make it appear in admin/public category filters.

## Current behavior to verify
Sync already creates catalog rows for some new brands. Need harden the behavior so every new category/group from Digiflazz is handled consistently across all supported categories:
- Game
- Pulsa
- PLN
- E-Wallet
- Voucher
- Other

## Plan
1. Audit current `syncDigiflazzProducts()` catalog upsert logic.
2. Define canonical group key from Digiflazz item:
   - Prefer normalized `brand` for group name.
   - Slug/id from normalized brand + category-safe slug.
   - Avoid duplicates from casing/spacing variants.
3. Use `classifyDigiflazzProduct(item)` output as category source.
4. On every sync item:
   - Find existing `games_catalog` by canonical id.
   - Create missing catalog group automatically.
   - Update category/name for existing group if classifier improves it.
   - Attach product `gameId` to that group.
5. Preserve admin-owned product fields:
   - `sellPrice`
   - `marginType`
   - `marginValue`
   - `isActive`
6. Add sync result metrics:
   - `groupsCreated`
   - `groupsUpdated`
   - keep existing product counts.
7. Ensure admin `/old-school` and public `/catalog` filters pick up new group after sync without hardcoded category list where possible.
8. Add tests:
   - New Digiflazz brand creates catalog group.
   - Existing group with different casing is reused, not duplicated.
   - New Game group appears under Game category.
   - New Pulsa/provider group appears under Pulsa category.
   - Existing admin prices remain preserved.

## Acceptance
- New Digiflazz subcategory/group appears automatically after sync.
- Example MGCC appears under Game when Digiflazz returns MGCC products.
- No duplicate groups from casing/spacing variants.
- Admin and public catalog filters show the new group.
- Sync result reports group creation/update counts.
- No new dependency.
- No supplier credentials, signatures, or raw sensitive request data logged/exposed.
- `bun test` passes.
- `bun run build` passes.
