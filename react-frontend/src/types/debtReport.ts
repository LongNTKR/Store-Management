/**
 * Debt report related TypeScript types
 */

export interface AgingBucketInvoice {
  id: number
  invoice_number: string
  created_at: string
  total: number
  paid_amount: number
  remaining_amount: number
}

export interface AgingBucket {
  bucket_label: string  // "0-30 ngày", "30-60 ngày"
  bucket_key: string    // "0-30", "30-60", "60-90", "90+"
  invoice_count: number
  total_amount: number
  invoices: AgingBucketInvoice[]
}

export interface AgingAnalysisResponse {
  customer_id?: number | null
  customer_name?: string | null
  buckets: AgingBucket[]
  total_debt: number
  total_invoices: number
  generated_at: string
}
