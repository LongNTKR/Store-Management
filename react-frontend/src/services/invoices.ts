import api from './api'
import type { Invoice, InvoiceCreate, Statistics } from '../types'

export const invoiceService = {
    create: async (invoice: InvoiceCreate): Promise<Invoice> => {
        const response = await api.post('/api/invoices', invoice)
        return response.data
    },

    getAll: async (status?: string, searchQuery?: string): Promise<Invoice[]> => {
        const params: Record<string, string> = {}
        if (status) params.status = status
        if (searchQuery) {
            // Send the search query to all search fields on backend
            params.invoice_number = searchQuery
            params.customer_name = searchQuery
            params.customer_phone = searchQuery
        }

        const response = await api.get('/api/invoices', { params })
        return response.data
    },

    getById: async (id: number): Promise<Invoice> => {
        const response = await api.get(`/api/invoices/${id}`)
        return response.data
    },

    updateStatus: async (id: number, status: string): Promise<Invoice> => {
        const response = await api.put(`/api/invoices/${id}/status`, { status })
        return response.data
    },

    generatePdf: async (id: number): Promise<Blob> => {
        const response = await api.get(`/api/invoices/${id}/pdf`, {
            responseType: 'blob'
        })
        return response.data
    },

    generateExcel: async (id: number): Promise<Blob> => {
        const response = await api.get(`/api/invoices/${id}/excel`, {
            responseType: 'blob'
        })
        return response.data
    },

    getStatistics: async (): Promise<Statistics> => {
        const response = await api.get('/api/stats')
        return response.data
    },
}
