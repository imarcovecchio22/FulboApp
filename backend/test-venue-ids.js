#!/usr/bin/env node
// Fetches __NEXT_DATA__ SSR from venue pages to get their IDs
const https = require('https');

const PERMALINKS = [
  'el-anden-caba',
  'distrito-futbol-constitucion',
  'el-predio-ciudad-deportiva-caba',
  'complejo-enjoy-palermo',
];

function get(url) {
  return new Promise((resolve, reject) => {
    const opts = { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' } };
    https.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function getVenueData(permalink) {
  const url = `https://atcsports.io/venues/${permalink}`;
  const res = await get(url);
  if (res.status !== 200) return { error: `HTTP ${res.status}` };

  const match = res.body.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!match) return { error: 'no NEXT_DATA' };

  try {
    const data = JSON.parse(match[1]);
    const str = JSON.stringify(data);

    // Find club/venue data in pageProps
    const props = data?.props?.pageProps;
    const club = props?.club || props?.venue || props?.place || props?.data || props?.sportclub;
    if (club?.id) {
      return {
        id: String(club.id),
        name: club.name,
        sport_ids: club.sport_ids,
        address: club.location?.name,
      };
    }

    // Last resort: regex scan
    const re = new RegExp('"id":"(\\d+)"[\\s\\S]{0,50}"permalink":"' + permalink + '"');
    const re2 = new RegExp('"permalink":"' + permalink + '"[\\s\\S]{0,50}"id":"(\\d+)"');
    const m = str.match(re) || str.match(re2);
    if (m) return { id: m[1] };

    // Dump first bit of pageProps for inspection
    return { error: 'ID not found', propsKeys: Object.keys(props || {}) };
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  for (const p of PERMALINKS) {
    process.stdout.write(`${p}: `);
    try {
      const info = await getVenueData(p);
      console.log(JSON.stringify(info));
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
}

main();
