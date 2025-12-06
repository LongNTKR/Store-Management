import api from './api'
import type { Payment, PaymentCreate, DebtSummary, PaymentAllocation } from '../types/payment'

export const paymentService = {
  /**
   * Record a new payment with FIFO or manual allocation
   */
  recordPayment: async (data: PaymentCreate): Promise<Payment> => {
    const response = await api.post('/api/payments', data)
    return response.data
  },

  /**
   * Get payment details by ID
   */
  getPayment: async (id: number): Promise<Payment> => {
    const response = await api.get(`/api/payments/${id}`)
    return response.data
  },

  /**
   * Search payments with filters
   */
  searchPayments: async (params: {
    customer_id?: number
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }): Promise<Payment[]> => {
    const response = await api.get('/api/payments', { params })
    return response.data
  },

  /**
   * Get customer debt summary
   */
  getCustomerDebt: async (customerId: number): Promise<DebtSummary> => {
    const response = await api.get(`/api/customers/${customerId}/debt`)
    return response.data
  },

  /**
   * Reverse a payment (for corrections)
   */
  reversePayment: async (paymentId: number, reason: string): Promise<void> => {
    await api.delete(`/api/payments/${paymentId}/reverse`, {
      params: { reason }
    })
  },

  /**
   * Get payment allocations for an invoice
   */
  getInvoicePayments: async (invoiceId: number): Promise<PaymentAllocation[]> => {
    const response = await api.get(`/api/invoices/${invoiceId}/payments`)
    return response.data
  }
}
