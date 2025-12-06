/**
 * Payment-related TypeScript types
 */

import { Invoice } from './invoice'

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
  total_debt: number
  total_invoices: number
  unpaid_invoices: number
  partially_paid_invoices: number
  overdue_debt: number
  overdue_invoices: number
  invoices: Invoice[]
}
