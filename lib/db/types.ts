import type { Category, Order, OrderItem, Package, Product } from '@/lib/types';

export type NewOrder = Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_items' | 'val_id' | 'bank_tran_id' | 'paid_at' | 'delivery_message' | 'admin_note' | 'payment_method'>;
export type NewOrderItem = Omit<OrderItem, 'id' | 'order_id'>;
export type OrderFilter = { status?: string; payment?: string; q?: string; limit?: number };
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
  updateOrder(id: number, patch: Partial<Order>): Promise<void>;
  stats(): Promise<Stats>;

  saveCategory(c: Partial<Category> & { name: string; slug: string }): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  saveProduct(p: Partial<Product> & { name: string; slug: string }): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  savePackage(p: Partial<Package> & { product_id: number; name: string; price: number }): Promise<Package>;
  deletePackage(id: number): Promise<void>;
}
