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
    refunded_amount: number
    remaining_amount: number
    net_payment_amount?: number
    payment_status?: 'unpaid' | 'partial' | 'paid'
    // Returns tracking
    has_returns?: boolean
    total_returned_amount?: number  // Only refunded returns
    total_pending_return_amount?: number  // NEW: Pending returns not yet refunded
    net_amount?: number  // Actual net revenue (only refunded returns deducted)
    projected_net_amount?: number  // NEW: Projected net if all pending returns processed
    // Status
    status: 'pending' | 'paid' | 'cancelled' | 'processing'
    payment_method?: string
    notes?: string
    created_at: string
    updated_at: string
    exported_at?: string | null  // Track when invoice was first exported to PDF or Excel
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
    // Invoice counts by status
    total_invoices: number
    paid_invoices: number
    pending_invoices: number
    cancelled_invoices: number
    processing_invoices: number

    // Export status breakdown (paid + pending only, excluding cancelled/processing)
    exported_invoices: number  // Overall count of invoices with exported_at set
    non_exported_invoices: number  // Overall count of invoices without exported_at

    // Pending invoice export breakdown (pending only)
    pending_exported_invoices: number  // Count of pending invoices that are exported
    pending_non_exported_invoices: number  // Count of pending invoices that are not exported

    // Revenue totals (simplified - no breakdown by export status)
    total_revenue: number  // Sum of paid + pending invoice totals
    total_refunded: number  // Total value of refunded returns
    total_net_revenue: number  // Net revenue = total_revenue - total_refunded
    collected_amount: number  // Total amount collected (sum of paid_amount)
    outstanding_debt: number  // Total amount outstanding (sum of remaining_amount)

    // Legacy fields (keep for backward compatibility)
    pending_revenue: number  // Legacy: revenue from pending invoices only
    average_order_value: number
    total_debt: number  // Legacy alias for outstanding_debt

    // Debt tracking
    invoices_with_debt: number  // Count of invoices with remaining_amount > 0
    customers_with_debt: number  // Count of distinct customers with debt
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

export interface InvoiceReturnItem {
    id: number
    product_name: string
    product_price: number
    quantity_returned: number
    unit: string
    subtotal: number
}

export interface InvoiceReturn {
    id: number
    return_number: string
    invoice_id: number
    invoice_number?: string
    refund_payment_id: number | null
    reason: string
    refund_amount: number
    is_full_return: boolean
    status: 'pending_refund' | 'refunded'
    created_at: string
    created_by?: string
    notes?: string
    exported_at?: string | null
    return_items: InvoiceReturnItem[]
}
