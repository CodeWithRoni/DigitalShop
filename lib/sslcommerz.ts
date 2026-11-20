// SSLCommerz v4 integration (server only).
// Docs: https://developer.sslcommerz.com/doc/v4/
const LIVE = process.env.SSLCZ_IS_LIVE === 'true';
const BASE = LIVE ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';
const STORE_ID = process.env.SSLCZ_STORE_ID || '';
const STORE_PASS = process.env.SSLCZ_STORE_PASSWORD || '';

export type InitParams = {
  tran_id: string; total_amount: number; success_url: string; fail_url: string;
  cancel_url: string; ipn_url: string; cus_name: string; cus_email: string;
  cus_phone: string; product_name: string; value_a?: string;
};

export async function initPayment(p: InitParams): Promise<{ url: string } | { error: string }> {
  if (!STORE_ID || !STORE_PASS) return { error: 'Payment gateway is not configured' };
  const body = new URLSearchParams({
    store_id: STORE_ID,
    store_passwd: STORE_PASS,
    total_amount: p.total_amount.toFixed(2),
    currency: 'BDT',
    tran_id: p.tran_id,
    success_url: p.success_url,
    fail_url: p.fail_url,
    cancel_url: p.cancel_url,
    ipn_url: p.ipn_url,
    cus_name: p.cus_name,
    cus_email: p.cus_email,
    cus_add1: 'Bangladesh',
    cus_city: 'Dhaka',
    cus_country: 'Bangladesh',
    cus_phone: p.cus_phone,
    shipping_method: 'NO',
    num_of_item: '1',
    product_name: p.product_name.slice(0, 250),
    product_category: 'Digital',
    product_profile: 'non-physical-goods',
    value_a: p.value_a || '',
  });
  const res = await fetch(`${BASE}/gwprocess/v4/api.php`, { method: 'POST', body, cache: 'no-store' });
  const json = await res.json().catch(() => null);
  if (json?.status === 'SUCCESS' && json.GatewayPageURL) return { url: json.GatewayPageURL };
  return { error: json?.failedreason || 'Could not start payment' };
}

export type Validation = {
  status: string; tran_id: string; val_id: string; amount: string; currency: string;
  card_type?: string; bank_tran_id?: string; risk_level?: string;
};

/** Always verify with SSLCommerz server — never trust the POSTed status alone. */
export async function validatePayment(val_id: string): Promise<Validation | null> {
  const url = `${BASE}/validator/api/validationserverAPI.php?` + new URLSearchParams({
    val_id, store_id: STORE_ID, store_passwd: STORE_PASS, format: 'json',
  });
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as Validation | null;
}
