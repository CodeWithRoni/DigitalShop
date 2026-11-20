import 'server-only';
import type { DB } from './types';
import { localDb } from './local';
import { postgresDb } from './postgres';

/** Uses Neon/Postgres when DATABASE_URL is set, otherwise the local JSON demo file. */
export const usingDatabase = !!process.env.DATABASE_URL;
export const db: DB = usingDatabase ? postgresDb : localDb;
