import api from './api'
import type { Invoice, InvoiceCreate, InvoiceUpdate, PaginatedResponse, Statistics } from '../types'

type InvoiceListParams = {
    status?: string
    searchQuery?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
}

export const invoiceService = {
    create: async (invoice: InvoiceCreate): Promise<Invoice> => {
        const response = await api.post('/api/invoices', invoice)
        return response.data
    },

    update: async (id: number, invoice: InvoiceUpdate): Promise<Invoice> => {
        const response = await api.put(`/api/invoices/${id}`, invoice)
        return response.data
    },

    list: async ({
        status,
        searchQuery,
        startDate,
        endDate,
        limit = 20,
        offset = 0,
    }: InvoiceListParams = {}): Promise<PaginatedResponse<Invoice>> => {
        const params: Record<string, string | number> = { limit, offset }
        if (status) params.status = status
        if (searchQuery) {
            params.invoice_number = searchQuery
            params.customer_name = searchQuery
            params.customer_phone = searchQuery
        }
        if (startDate) params.start_date = startDate
        if (endDate) params.end_date = endDate

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
