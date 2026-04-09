#!/usr/bin/env node
const https = require('https');

const MORE_PERMALINKS = [
  'club-atletico-san-isidro-caba',
  'sport-palace',
  'la-espiga',
  'complejo-caballito',
  'estadio-social',
  'cancha-tucuman',
  'club-defensores-de-belgrano',
  'barracas-central',
  'almagro-sport',
  'club-ferro-carril-oeste',
  'complejo-deportivo-pinamar',
  'futbol-5-palermo',
  'canchas-palermo',
  'futbol-palermo',
  'parque-centenario-canchas',
  'play-futbol',
  'sport-village',
  'complejo-sport',
  'club-social',
  'f5-caba',
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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
  if (res.status !== 200) return null;

  const match = res.body.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!match) return null;

  try {
    const data = JSON.parse(match[1]);
    const props = data?.props?.pageProps;
    const club = props?.club || props?.venue || props?.place || props?.data || props?.sportclub;
    if (club?.id && club?.sport_ids) {
      return { id: String(club.id), name: club.name, sport_ids: club.sport_ids, address: club.location?.name };
    }
  } catch { }
  return null;
}

async function main() {
  for (const p of MORE_PERMALINKS) {
    try {
      const info = await getVenueData(p);
      if (info && info.sport_ids?.includes('2')) {
        console.log(`FOUND: ${p} => ${JSON.stringify(info)}`);
      }
    } catch { }
  }
  console.log('Done');
}

main();
