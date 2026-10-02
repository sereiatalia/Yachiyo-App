import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { query } from '../database/db.js';

let firestore = null;

function getBackupStore() {
  if (firestore) return firestore;
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) return null;
  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  firestore = getFirestore(app);
  return firestore;
}

export async function backupGuildToFirebase(guildId) {
  const store = getBackupStore();
  if (!store) return { skipped: true, reason: 'Firebase credentials are not configured.' };
  const tableNames = (await query(`SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='guild_id' GROUP BY table_name ORDER BY table_name`)).rows.map(row => row.table_name);
  const tables = {};
  for (const table of tableNames) tables[table] = (await query(`SELECT * FROM "${table.replace(/"/g, '""')}" WHERE guild_id=$1`, [guildId])).rows;
  const snapshot = { schemaVersion: 1, guildId, exportedAt: new Date().toISOString(), tables };
  await store.collection('yachiyo_backups').doc(guildId).collection('snapshots').doc(snapshot.exportedAt.replace(/[:.]/g, '-')).set(snapshot);
  await store.collection('yachiyo_backups').doc(guildId).set({ guildId, lastBackupAt: snapshot.exportedAt, tableCount: tableNames.length }, { merge: true });
  return { skipped: false, exportedAt: snapshot.exportedAt, tableCount: tableNames.length };
}

export async function listGuildBackups(guildId) {
  const store = getBackupStore();
  if (!store) return [];
  const snapshot = await store.collection('yachiyo_backups').doc(guildId).collection('snapshots').orderBy('exportedAt', 'desc').limit(30).get();
  return snapshot.docs.map(doc => ({ id: doc.id, exportedAt: doc.data().exportedAt, tableCount: Object.keys(doc.data().tables || {}).length }));
}

export async function getGuildBackup(guildId, snapshotId) {
  const store = getBackupStore();
  if (!store) return null;
  const doc = await store.collection('yachiyo_backups').doc(guildId).collection('snapshots').doc(snapshotId).get();
  return doc.exists ? doc.data() : null;
}

export function startFirebaseBackups(client, intervalMs = 15 * 60 * 1000) {
  const run = async () => {
    for (const guild of client.guilds.cache.values()) {
      await backupGuildToFirebase(guild.id).catch(error => console.error('[FIREBASE_BACKUP]', guild.id, error));
    }
  };
  run();
  return setInterval(run, intervalMs);
}

