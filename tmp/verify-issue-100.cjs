(async () => {
  const base = 'https://wetri.shop';
  for (const path of ['/api/health', '/api/v1/old-school/ping']) {
    const response = await fetch(base + path);
    console.log(path, response.status, await response.text());
    if (path === '/api/health' && !response.ok) throw Error('Health failed');
  }
  for (const action of ['target', 'repay']) {
    const response = await fetch(`${base}/api/v1/old-school/orders/VERIFY-NONEXISTENT/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    console.log(action, response.status, await response.text());
    if (![401, 403].includes(response.status)) throw Error('Auth gate failed');
  }
  const response = await fetch(base + '/old-school');
  const html = await response.text();
  console.log('/old-school', response.status);
  const paths = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(match => match[1]);
  let found = false;
  for (const path of paths) {
    const asset = await fetch(new URL(path, base));
    const text = await asset.text();
    if (text.includes('Koreksi Nomor HP')) {
      console.log('UI asset', path, asset.status, 'dialog=', text.includes('target-correction-title'), 'save=', text.includes('Simpan Nomor'));
      found = asset.ok && text.includes('target-correction-title') && text.includes('Simpan Nomor');
    }
  }
  if (!found) throw Error('New UI asset not found');
})().catch(error => { console.error(error.message); process.exit(1); });
