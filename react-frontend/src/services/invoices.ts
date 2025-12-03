import api from './api'
import type { Invoice, Statistics } from '../types'

export const invoiceService = {
    getAll: async (status?: string): Promise<Invoice[]> => {
        const response = await api.get('/api/invoices', {
            params: status ? { status } : {}
        })
        return response.data
    },

    getById: async (id: number): Promise<Invoice> => {
        const response = await api.get(`/api/invoices/${id}`)
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
