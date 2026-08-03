import pg from 'pg';
const { Pool } = pg;
export const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
export async function query(text, params = []) { return db.query(text, params); }
