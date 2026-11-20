import 'server-only';
import { q } from './db/pg';
import type { Order } from './types';

export type Template = { id: number; name: string; body: string; product_id: number | null; product_name?: string | null };

export async function listTemplates() {
  return q<Template>('select t.*, p.name as product_name from message_templates t left join products p on p.id = t.product_id order by p.name nulls first, t.name');
}

export const TEMPLATE_VARS = ['{name}', '{order}', '{product}', '{package}', '{info}', '{shop}'] as const;

/** Fill {placeholders} with this order's details. */
export function fillTemplate(body: string, o: Order, shop: string) {
  const first = o.order_items?.[0];
  return body
    .replaceAll('{name}', o.customer_name)
    .replaceAll('{order}', o.code)
    .replaceAll('{product}', first?.product_name || '')
    .replaceAll('{package}', first?.package_name || '')
    .replaceAll('{info}', first?.delivery_info || '')
    .replaceAll('{shop}', shop);
}
