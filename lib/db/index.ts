import 'server-only';
import type { DB } from './types';
import { postgresDb } from './postgres';

export const usingDatabase = !!process.env.DATABASE_URL;
export const db: DB = postgresDb;
