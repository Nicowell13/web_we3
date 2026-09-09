import { readFileSync, writeFileSync } from 'fs';

const PATH = 'src/modules/admin/product-admin.service.ts';
let src = readFileSync(PATH, 'utf8');

const OLD = `  if (supplierStatus) conditions.push(eq(products.supplierStatus, supplierStatus));`;
const NEW = `  conditions.push(eq(products.supplierStatus, supplierStatus || 'available'));`;

if (src.includes(OLD)) {
  src = src.replace(OLD, NEW);
  writeFileSync(PATH, src);
  console.log('patched');
} else if (src.includes(NEW)) {
  console.log('already_patched');
} else {
  // show existing line
  const hit = src.split('\n').find(l => l.includes('supplierStatus'));
  console.log('not_found|' + (hit ?? '').trim());
}
