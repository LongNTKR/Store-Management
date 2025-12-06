/**
 * Debt report service for API calls
 */

import api from './api'
import type { AgingAnalysisResponse } from '@/types/debtReport'

export const debtReportService = {
  /**
   * Download debt report PDF for customer
   */
  downloadDebtPdf: async (customerId: number): Promise<Blob> => {
    const response = await api.get(`/api/debt-reports/${customerId}/pdf`, {
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * Download debt report Excel for customer
   */
  downloadDebtExcel: async (customerId: number): Promise<Blob> => {
    const response = await api.get(`/api/debt-reports/${customerId}/excel`, {
      responseType: 'blob'
    })
    return response.data
  },

  /**
   * Get aging analysis for customer or all customers
   * @param customerId - Optional customer ID. If null/undefined, returns analysis for all customers
   */
  getAgingAnalysis: async (customerId?: number | null): Promise<AgingAnalysisResponse> => {
    const response = await api.get('/api/debt-reports/aging-analysis', {
      params: customerId ? { customer_id: customerId } : {}
    })
    return response.data
  }
}
