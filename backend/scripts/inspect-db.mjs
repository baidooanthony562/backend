// One-shot DB inspector. Connects via the same MONGO_URI the backend uses,
// lists every collection with a document count and a peek at the most recent
// record. Run with `node backend/scripts/inspect-db.mjs` from the repo root.
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI is not set. Run from a directory where backend/.env can be loaded.');
  process.exit(1);
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

await mongoose.connect(uri);
const db = mongoose.connection.db;

const stats = await db.stats();
console.log('─'.repeat(60));
console.log(`Database: ${db.databaseName}`);
console.log(`Collections: ${stats.collections}`);
console.log(`Documents:   ${stats.objects}`);
console.log(`Data size:   ${fmtBytes(stats.dataSize)}`);
console.log(`Storage:     ${fmtBytes(stats.storageSize)}`);
console.log(`Indexes:     ${stats.indexes} (${fmtBytes(stats.indexSize)})`);
console.log('─'.repeat(60));

const collections = await db.listCollections().toArray();
for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
  const col = db.collection(name);
  const count = await col.countDocuments();
  const last = await col.find({}).sort({ _id: -1 }).limit(1).next();
  const lastDate = last?._id?.getTimestamp?.()?.toISOString().slice(0, 19).replace('T', ' ') || '—';
  console.log(`${name.padEnd(22)} ${String(count).padStart(6)} docs   most recent: ${lastDate}`);

  // Show one sample to help see field shape, but trim huge fields (images,
  // long descriptions) so the terminal doesn't get flooded.
  if (last) {
    const sample = JSON.parse(JSON.stringify(last));
    for (const k of Object.keys(sample)) {
      if (typeof sample[k] === 'string' && sample[k].length > 80) {
        sample[k] = sample[k].slice(0, 60) + `… (${sample[k].length} chars)`;
      }
      if (Array.isArray(sample[k]) && sample[k].length > 3) {
        sample[k] = [...sample[k].slice(0, 2), `… +${sample[k].length - 2} more`];
      }
    }
    const keys = Object.keys(sample).filter((k) => k !== '_id' && k !== '__v').slice(0, 8);
    if (keys.length > 0) {
      console.log(`  ${keys.map((k) => `${k}=${JSON.stringify(sample[k])}`).join(', ').slice(0, 200)}`);
    }
  }
}

await mongoose.disconnect();
