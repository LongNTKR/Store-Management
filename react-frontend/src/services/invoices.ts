import api from './api'
import type { Invoice, InvoiceCreate, InvoiceUpdate, PaginatedResponse, Statistics } from '../types'

type InvoiceListParams = {
    customerId?: number
    status?: string | string[]
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
        customerId,
        status,
        searchQuery,
        startDate,
        endDate,
        limit = 20,
        offset = 0,
    }: InvoiceListParams = {}): Promise<PaginatedResponse<Invoice>> => {
        const params: Record<string, string | number | string[]> = { limit, offset }
        if (customerId) params.customer_id = customerId
        if (status) params.status = status
        if (searchQuery) {
            params.invoice_number = searchQuery
            params.customer_name = searchQuery
            params.customer_phone = searchQuery
        }
        if (startDate) params.start_date = startDate
        if (endDate) params.end_date = endDate

        // Use 'paramsSerializer' or handle array manually if axios doesn't handle repeated keys for arrays by default in the way backend expects (FastAPI handles repeated keys).
        // Axios default handles arrays as 'status[]=...' which FastAPI doesn't like by default (it wants 'status=...&status=...').
        // However, we can use qs or just let axios handle it and see.
        // Actually, simple way for custom serialization if needed:
        const response = await api.get('/api/invoices', {
            params,
            paramsSerializer: (params) => {
                const searchParams = new URLSearchParams()
                Object.entries(params).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        value.forEach(v => searchParams.append(key, v.toString()))
                    } else if (value !== undefined && value !== null) {
                        searchParams.append(key, value.toString())
                    }
                })
                return searchParams.toString()
            }
        })
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

    getStatistics: async (params?: { start_date?: string; end_date?: string }): Promise<Statistics> => {
        const response = await api.get('/api/stats', { params })
        return response.data
    },
}
