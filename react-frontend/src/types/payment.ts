/**
 * Payment-related TypeScript types
 */

import type { Invoice } from './index'

export interface PaymentAllocation {
  id: number
  payment_id: number
  invoice_id: number
  invoice_number: string
  payment_number?: string
  amount: number
  allocation_date: string
  payment_method?: string
  notes?: string
}

export interface Payment {
  id: number
  payment_number: string
  customer_id: number
  customer_name: string
  amount: number
  payment_method: 'cash' | 'transfer' | 'card'
  payment_date: string
  notes?: string
  created_at: string
  created_by?: string
  allocations: PaymentAllocation[]
}

export interface PaymentCreate {
  customer_id: number
  amount: number
  payment_method: string
  invoice_ids?: number[]
  manual_allocations?: Record<number, number>
  notes?: string
  payment_date?: string
  created_by?: string
}

export interface DebtSummary {
  total_debt: number  // Outstanding amount customer owes
  total_revenue: number  // Gross revenue (original invoice totals before returns)
  total_refunded: number  // Total VALUE of returned goods (not cash settlements)
  total_net_revenue: number  // Net revenue = total_revenue - total_refunded (actual earned revenue)
  total_invoices: number  // Number of invoices with outstanding balance
  unpaid_invoices: number  // Invoices with no payment yet
  partially_paid_invoices: number  // Invoices with partial payment
  overdue_debt: number  // Amount overdue (>30 days)
  overdue_invoices: number  // Count of overdue invoices
  invoices: Invoice[]
}
