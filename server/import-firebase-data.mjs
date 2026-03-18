import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const SOURCE_BASE = (process.env.SOURCE_DATABASE_URL || 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app').replace(/\/+$/, '');

async function importFirebaseData() {
  const sourceUrl = `${SOURCE_BASE}/.json`;
  console.log(`Fetching source data from ${sourceUrl}`);

  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Source fetch failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(payload || {}, null, 2), 'utf8');

  console.log(`Imported data into ${DATA_FILE}`);
}

importFirebaseData().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});