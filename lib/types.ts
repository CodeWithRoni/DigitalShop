export type Category = { id: number; slug: string; name: string; description: string | null; sort_order: number };
export type Package = { id: number; product_id: number; name: string; price: number; is_active: boolean; sort_order: number; stock_managed?: boolean; stock_available?: number };
export type Product = {
  id: number; category_id: number | null; slug: string; name: string;
  short_description: string | null; description: string | null; image_url: string | null;
  delivery_label: string; delivery_hint: string | null;
  is_active: boolean; is_featured: boolean; sort_order: number;
  packages?: Package[]; categories?: Category | null;
};
export type OrderStatus = 'pending' | 'processing' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';
export type OrderItem = {
  id: number; order_id: number; product_id: number | null; package_id: number | null;
  product_name: string; package_name: string; unit_price: number; quantity: number; delivery_info: string | null;
};
export type Order = {
  id: number; code: string; customer_name: string; customer_phone: string; customer_email: string | null;
  note: string | null; total: number; status: OrderStatus; payment_status: PaymentStatus;
  payment_method: string | null; tran_id: string | null; val_id: string | null; bank_tran_id: string | null;
  paid_at: string | null; delivery_message: string | null; admin_note: string | null;
  subtotal: number | null; discount: number; coupon_code: string | null; auto_delivered: boolean;
  created_at: string; updated_at: string; order_items?: OrderItem[];
};
export type CartItem = {
  productId: number; packageId: number; productName: string; packageName: string;
  slug: string; image: string | null; price: number; quantity: number;
  deliveryLabel: string; deliveryInfo: string;
};

export type ProductPayload = {
  id?: number; name: string; slug?: string; category_id: number | null;
  short_description?: string; description?: string; image_url?: string;
  delivery_label?: string; delivery_hint?: string;
  is_active: boolean; is_featured: boolean; sort_order?: number;
  packages: { id?: number; name: string; price: number | string; is_active: boolean }[];
};
