export interface Product {
    id: number
    name: string
    price: number
    import_price?: number
    description?: string
    category?: string
    unit: string
    stock_quantity: number
    image_paths?: string | null
    created_at: string
    updated_at: string
    is_active: boolean
    deleted_at?: string | null
    images?: string[]
}

export interface PaginatedResponse<T> {
    items: T[]
    total: number
    has_more: boolean
    next_offset?: number | null
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
    deleted_at?: string | null
}

export interface InvoiceItemCreate {
    product_id: number
    quantity: number
}

export interface InvoiceCreate {
    items: InvoiceItemCreate[]
    customer_id?: number
    customer_name?: string
    customer_phone?: string
    customer_address?: string
    discount: number
    tax: number
    payment_method?: string
    notes?: string
    status: 'pending' | 'paid' | 'cancelled' | 'processing'
}

export interface InvoiceUpdate {
    items: InvoiceItemCreate[]
    customer_id?: number
    customer_name?: string
    customer_phone?: string
    customer_address?: string
    discount: number
    tax: number
    payment_method?: string
    notes?: string
    status?: 'pending' | 'paid' | 'cancelled' | 'processing'
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
    status: 'pending' | 'paid' | 'cancelled' | 'processing'
    payment_method?: string
    notes?: string
    created_at: string
    updated_at: string
    items: InvoiceItem[]
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
    skipped: number
    errors: string[]
}
