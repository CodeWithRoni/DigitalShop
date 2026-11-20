import type { Category, Order, OrderItem, Package, Product } from '@/lib/types';

export type NewOrder = Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_items' | 'val_id' | 'bank_tran_id' | 'paid_at' | 'delivery_message' | 'admin_note' | 'payment_method' | 'auto_delivered'>;
export type NewOrderItem = Omit<OrderItem, 'id' | 'order_id'>;
export type OrderFilter = {
  status?: string; payment?: string; q?: string; phone?: string;
  /** Inclusive dates in Asia/Dhaka, format YYYY-MM-DD */
  from?: string; to?: string;
  limit?: number; offset?: number;
};
export type OrderPage = { orders: Order[]; total: number };
export type DailyPoint = { date: string; orders: number; paidOrders: number; revenue: number };
export type PeriodTotals = { orders: number; paidOrders: number; revenue: number; aov: number; customers: number };
export type Analytics = {
  days: number;
  daily: DailyPoint[];
  current: PeriodTotals;
  previous: PeriodTotals;
  statusCounts: Record<string, number>;
  topProducts: { name: string; units: number; revenue: number }[];
};
export type Customer = {
  phone: string; name: string; email: string | null;
  orders: number; paidOrders: number; spent: number; firstOrder: string; lastOrder: string;
};
export type Stats = {
  totalOrders: number; paidOrders: number; revenue: number; pending: number; processing: number;
  todayOrders: number; todayRevenue: number;
};

export interface DB {
  listCategories(): Promise<Category[]>;
  listProducts(opts?: { includeInactive?: boolean }): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getProductById(id: number): Promise<Product | null>;
  getPackagesByIds(ids: number[]): Promise<(Package & { product: Product })[]>;

  createOrder(order: NewOrder, items: NewOrderItem[]): Promise<Order>;
  getOrderByCode(code: string): Promise<Order | null>;
  getOrderByTranId(tranId: string): Promise<Order | null>;
  getOrderById(id: number): Promise<Order | null>;
  listOrders(f?: OrderFilter): Promise<Order[]>;
  listOrdersPage(f?: OrderFilter): Promise<OrderPage>;
  countByStatus(): Promise<Record<string, number>>;
  analytics(days: number): Promise<Analytics>;
  listCustomers(q?: string): Promise<Customer[]>;
  updateOrder(id: number, patch: Partial<Order>): Promise<void>;
  stats(): Promise<Stats>;

  saveCategory(c: Partial<Category> & { name: string; slug: string }): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  saveProduct(p: Partial<Product> & { name: string; slug: string }): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  savePackage(p: Partial<Package> & { product_id: number; name: string; price: number }): Promise<Package>;
  deletePackage(id: number): Promise<void>;
}
