export interface Product {
    id: number
    name: string
    price: number
    description?: string
    category?: string
    unit: string
    stock_quantity: number
    image_paths?: string
    created_at: string
    updated_at: string
    is_active: boolean
    images?: string[]
}

export interface Customer {
    id: number
    name: string
    phone?: string
    email?: string
    address?: string
    notes?: string
    created_at: string
    updated_at: string
    is_active: boolean
}

export interface Invoice {
    id: number
    invoice_number: string
    customer_id?: number
    customer_name?: string
    customer_phone?: string
    customer_address?: string
    subtotal: number
    discount: number
    tax: number
    total: number
    status: 'pending' | 'paid' | 'cancelled'
    payment_method?: string
    notes?: string
    created_at: string
    updated_at: string
}

export interface InvoiceItem {
    id: number
    invoice_id: number
    product_id?: number
    product_name: string
    product_price: number
    quantity: number
    unit: string
    subtotal: number
}

export interface Statistics {
    total_invoices: number
    total_revenue: number
    paid_invoices: number
    pending_invoices: number
    cancelled_invoices: number
    pending_revenue: number
    average_order_value: number
}

export interface CustomerStats {
    total_spent: number
    total_orders: number
}

export interface ImportResult {
    updated: number
    added: number
    errors: string[]
}
