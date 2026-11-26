import fs from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';

const TRANSIENT_STATUS = new Set([429, 502, 503, 504]);
const TRIES = 5;
const BASE_URL = 'https://dudidd-wq.github.io/chavruta-app/';

function isTransient(error) {
  const status = Number((/^HTTP (\d+)$/.exec(error?.message) || [])[1]);
  if (TRANSIENT_STATUS.has(status)) return true;
  const name = error?.name || '';
  const msg = error?.message || '';
  return name === 'TimeoutError' || name === 'AbortError' ||
    /timeout|network|ECONNRESET|ECONNREFUSED|ENOTFOUND|fetch failed|UND_ERR/i.test(msg);
}

async function fetchOk(url) {
  let last;
  for (let i = 0; i < TRIES; i++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(20000)});
      if (response.ok) return response;
      const error = Error('HTTP ' + response.status);
      if (!TRANSIENT_STATUS.has(response.status) || i === TRIES - 1) throw error;
      last = error;
    } catch (error) {
      if (!isTransient(error) || i === TRIES - 1) throw error;
      last = error;
    }
    await new Promise(resolve => setTimeout(resolve, 750 * 2 ** i));
  }
  throw last;
}

let manifest;
const live = process.argv[2] === '--live';
let text;
if (live) {
  const response = await fetchOk(BASE_URL + 'data/book-covers.js?audit=' + Date.now());
  text = await response.text();
} else {
  text = await fs.readFile(process.argv[2] || 'out/app/data/book-covers.js', 'utf8');
}
vm.runInNewContext(text, {window: {__D: (name, value) => { if (name === 'book-covers') manifest = value; }}}, {timeout: 3000});
if (manifest?.schema !== 1 || manifest.page !== 1) throw Error('Invalid cover manifest');
const entries = Object.entries(manifest.covers), failures = [];
let next = 0, bytes = 0;
await Promise.all(Array.from({length: 6}, async () => {
  while (next < entries.length) {
    const [id, asset] = entries[next++];
    const match = new RegExp('^data/book-covers/' + id + '-([a-f0-9]{16})\\.webp$').exec(asset);
    if (!/^(?:[0-9]{1,8}|c-[a-f0-9]{24})$/.test(id) || !match) throw Error('Invalid cover asset');
    try {
      const response = await fetchOk(new URL(asset, BASE_URL));
      const content = Buffer.from(await response.arrayBuffer());
      if (!(response.headers.get('content-type') || '').includes('image/webp') ||
          content.toString('ascii', 0, 4) !== 'RIFF' ||
          content.toString('ascii', 8, 12) !== 'WEBP') throw Error('Not a WebP image');
      if (crypto.createHash('sha256').update(content).digest('hex').slice(0, 16) !== match[1]) {
        throw Error('Image differs from manifest');
      }
      bytes += content.length;
    } catch (error) {
      failures.push({id, error: error.message});
    }
  }
}));
console.log(JSON.stringify({checked: entries.length, passed: entries.length - failures.length, bytes, failures}, null, 2));
if (failures.length) process.exitCode = 1;
