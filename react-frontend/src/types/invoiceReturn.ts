/**
 * TypeScript types for invoice returns
 */

export interface InvoiceReturnItem {
  id: number;
  invoice_item_id: number;
  product_id: number | null;
  product_name: string;
  product_price: number;
  unit: string;
  quantity_returned: number;
  subtotal: number;
  restore_inventory: boolean;
}

export interface InvoiceReturn {
  id: number;
  return_number: string;
  invoice_id: number;
  invoice_number?: string;
  refund_payment_id: number | null;
  reason: string;
  refund_amount: number;
  is_full_return: boolean;
  created_at: string;
  created_by: string | null;
  notes: string | null;
  return_items: InvoiceReturnItem[];
}

export interface InvoiceReturnItemCreate {
  invoice_item_id: number;
  quantity_returned: number;
  restore_inventory: boolean;
}

export interface InvoiceReturnCreate {
  return_items: InvoiceReturnItemCreate[];
  reason: string;
  refund_amount?: number | null;
  create_refund_payment: boolean;
  payment_method?: string;
  notes?: string;
  created_by?: string;
}

export interface AvailableReturnQuantity {
  invoice_item_id: number;
  product_id: number | null;
  product_name: string;
  original_quantity: number;
  already_returned: number;
  available_for_return: number;
  unit: string;
  product_price: number;
}
