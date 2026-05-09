export type OrderStatus =
  | "pendiente"
  | "preparando"
  | "listo"
  | "entregado";

export type PaymentMethod = "efectivo" | "tarjeta" | "bizum" | "otro";

export type UserRole = "owner" | "staff" | "superadmin";

export interface Bar {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  owner_email: string;
  logo_url: string | null;
  theme_color: string | null;
  cart_max_quantity: number;
  bar_day_cutoff_hour: number;
  old_order_threshold_min: number;
  created_at: string;
}

export interface Profile {
  id: string;
  bar_id: string | null;
  role: UserRole;
  full_name: string | null;
}

export interface Category {
  id: string;
  bar_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  bar_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  in_stock: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  category?: Category;
}

export interface Order {
  id: string;
  bar_id: string;
  table_number: number;
  session_id: string;
  sub_order_number: number;
  status: OrderStatus;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  ready_at: string | null;
  delivered_at: string | null;
  edit_count: number;
  notes: string | null;
  total: number;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

// Common shape for order joined with its items (used across hooks/actions)
export type OrderWithItems = Order & { order_items: OrderItem[] };

export interface AuditLogEntry {
  id: number;
  bar_id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface TableSession {
  sessionId: string;
  tableNumber: number;
  subOrders: Order[];
  totalAmount: number;
  oldestCreatedAt: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  notes: string | null;
}

export interface Table {
  id: string;
  bar_id: string;
  table_number: number;
  label: string | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

// Supabase Database type — Row/Insert/Update intersect with Record<string, unknown>
// so they satisfy GenericTable's constraint in @supabase/supabase-js.
type R = Record<string, unknown>;

export type Database = {
  public: {
    Tables: {
      bars: {
        Row: Bar & R;
        Insert: Omit<Bar, "id" | "created_at" | "cart_max_quantity" | "bar_day_cutoff_hour" | "old_order_threshold_min"> & Partial<Pick<Bar, "cart_max_quantity" | "bar_day_cutoff_hour" | "old_order_threshold_min">> & R;
        Update: Partial<Omit<Bar, "id" | "created_at">> & R;
        Relationships: [];
      };
      profiles: {
        Row: Profile & R;
        Insert: Profile & R;
        Update: Partial<Profile> & R;
        Relationships: [];
      };
      categories: {
        Row: Category & R;
        Insert: Omit<Category, "id" | "created_at"> & R;
        Update: Partial<Omit<Category, "id" | "created_at">> & R;
        Relationships: [];
      };
      products: {
        Row: Omit<Product, "category"> & R;
        Insert: Omit<Product, "id" | "created_at" | "category"> & R;
        Update: Partial<Omit<Product, "id" | "created_at" | "category">> & R;
        Relationships: [];
      };
      orders: {
        Row: Omit<Order, "order_items"> & R;
        Insert: Omit<Order, "id" | "created_at" | "updated_at" | "order_items" | "sub_order_number" | "paid_at" | "payment_method" | "ready_at" | "delivered_at" | "edit_count"> & Partial<Pick<Order, "sub_order_number" | "paid_at" | "payment_method" | "ready_at" | "delivered_at" | "edit_count">> & R;
        Update: Partial<Omit<Order, "id" | "created_at" | "order_items">> & R;
        Relationships: [];
      };
      order_items: {
        Row: OrderItem & R;
        Insert: Omit<OrderItem, "id"> & R;
        Update: Partial<Omit<OrderItem, "id">> & R;
        Relationships: [];
      };
      tables: {
        Row: Table & R;
        Insert: Omit<Table, "id"> & R;
        Update: Partial<Omit<Table, "id">> & R;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLogEntry & R;
        Insert: Omit<AuditLogEntry, "id" | "created_at"> & R;
        Update: Partial<Omit<AuditLogEntry, "id" | "created_at">> & R;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_order_atomic: {
        Args: {
          p_bar_id: string;
          p_table_number: number;
          p_items: unknown;
          p_notes: string | null;
        };
        Returns: {
          order_id: string;
          merged: boolean;
          session_id: string;
          sub_order_number: number;
        }[];
      };
      increment_order_edit_count: {
        Args: { p_order_id: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
