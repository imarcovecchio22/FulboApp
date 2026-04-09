#!/usr/bin/env node
/**
 * Quick e2e test: calls the backend /fields endpoint and prints results
 */
const http = require('http');

const DATE = '2026-04-12';
const TIME = '20:00';

http.get(`http://localhost:3001/fields?date=${DATE}&time=${TIME}`, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Source:', json.source);
    console.log('Venues:', json.venues?.length);
    (json.venues || []).forEach(v => {
      console.log(`\n  ${v.name} (${v.location})`);
      console.log(`  Dirección: ${v.address}`);
      (v.availableSlots || []).forEach(s => {
        console.log(`  ${s.startTime}–${s.endTime}: ${s.available ? 'disponible' : 'ocupado'} ${s.price || ''}`);
      });
    });
  });
}).on('error', e => console.error('Error:', e.message));
