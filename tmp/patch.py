import re
p='src/modules/admin/product-admin.service.ts'
s=open(p,encoding='utf-8').read()
old="  if (supplierStatus) conditions.push(eq(products.supplierStatus, supplierStatus));"
new="  conditions.push(eq(products.supplierStatus, supplierStatus || 'available'));"
hits=[l.strip() for l in s.splitlines() if 'supplierStatus' in l]
if old in s:
    open(p,'w',encoding='utf-8').write(s.replace(old,new))
    print('patched')
elif new in s:
    print('already_patched')
else:
    print('not_found|'+repr(hits[:3]))
