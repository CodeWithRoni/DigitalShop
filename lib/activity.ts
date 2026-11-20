import 'server-only';
import { q } from './db/pg';

export type Activity = { id: number; actor: string; action: string; entity: string | null; entity_id: string | null; details: string | null; created_at: string };

/** Never throws — logging must not break the action being logged. */
export async function logActivity(actor: string, action: string, entity?: string | null, entityId?: string | number | null, details?: string | null) {
  try {
    await q('insert into activity_log (actor, action, entity, entity_id, details) values ($1,$2,$3,$4,$5)',
      [actor, action, entity ?? null, entityId != null ? String(entityId) : null, details ? details.slice(0, 1000) : null]);
  } catch (e) {
    console.error('activity log failed', e);
  }
}

export async function listActivity(f: { actor?: string; entity?: string; entityId?: string; limit?: number; offset?: number } = {}) {
  const where: string[] = []; const params: unknown[] = [];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  if (f.actor) where.push(`actor = ${add(f.actor)}`);
  if (f.entity) where.push(`entity = ${add(f.entity)}`);
  if (f.entityId) where.push(`entity_id = ${add(f.entityId)}`);
  const w = where.length ? 'where ' + where.join(' and ') : '';
  const rows = await q<Activity>(`select * from activity_log ${w} order by id desc limit ${add(Math.min(f.limit || 100, 500))} offset ${add(f.offset || 0)}`, params);
  return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
}
