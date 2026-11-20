import 'server-only';
import type { DB } from './types';
import { localDb } from './local';
import { supabaseDb } from './supabase';

/** Uses Supabase when its keys are set, otherwise the local JSON file. */
export const usingSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const db: DB = usingSupabase ? supabaseDb : localDb;
