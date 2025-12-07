export interface Unit {
    id: number
    name: string
    display_name: string
    allows_decimal: boolean
    step_size: number
    is_active: boolean
    is_system: boolean
    created_at: string
    updated_at: string
}

export interface UnitCreate {
    name: string
    display_name: string
    allows_decimal: boolean
    step_size: number
}

export interface UnitUpdate {
    name?: string
    display_name?: string
    allows_decimal?: boolean
    step_size?: number
    is_active?: boolean
}

export interface Product {
    id: number
    name: string
    price?: number  // Optional - only name is required
    import_price?: number
    description?: string
    category?: string
    unit: Unit  // Changed from string to nested Unit object
    stock_quantity: number
    image_paths?: string | null
    created_at: string
    updated_at: string
    is_active: boolean
    deleted_at?: string | null
    images?: string[]
    is_new: boolean
    recently_updated_price: boolean
    recently_updated_import_price: boolean
    recently_updated_info: boolean
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
    // Payment tracking
    paid_amount: number
    remaining_amount: number
    payment_status?: 'unpaid' | 'partial' | 'paid'
    // Returns tracking
    has_returns?: boolean
    total_returned_amount?: number
    net_amount?: number
    // Status
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
    total_revenue: number  // Now includes paid + pending
    paid_invoices: number
    pending_invoices: number
    cancelled_invoices: number
    pending_revenue: number
    average_order_value: number

    // Enhanced debt tracking
    collected_amount: number  // Money actually collected
    outstanding_debt: number  // Money still owed
    total_debt: number  // Legacy field
    invoices_with_debt: number
    customers_with_debt: number  // Count of customers in debt
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
