import api from './api'
import type { Customer, CustomerStats, PaginatedResponse } from '../types'

type PageParams = {
    limit?: number
    offset?: number
    search?: string
}

const DEFAULT_LIMIT = 24

export const customerService = {
    list: async ({ limit = DEFAULT_LIMIT, offset = 0, search }: PageParams = {}): Promise<PaginatedResponse<Customer>> => {
        const hasSearch = Boolean(search && search.trim())
        const endpoint = hasSearch ? '/api/customers/search' : '/api/customers'
        const response = await api.get(endpoint, {
            params: {
                limit,
                offset,
                ...(hasSearch ? { q: search } : {}),
            },
        })
        return response.data
    },

    getById: async (id: number): Promise<Customer> => {
        const response = await api.get(`/api/customers/${id}`)
        return response.data
    },

    search: async (query: string, limit = 15): Promise<Customer[]> => {
        const data = await customerService.list({ search: query, limit })
        return data.items
    },

    create: async (customer: Partial<Customer>): Promise<Customer> => {
        const response = await api.post('/api/customers', customer)
        return response.data
    },

    update: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
        const response = await api.put(`/api/customers/${id}`, customer)
        return response.data
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/api/customers/${id}`)
    },

    bulkDelete: async (ids: number[]): Promise<{ requested: number; deleted: number }> => {
        const payload = { ids: ids.map((id) => Number(id)).filter((id) => Number.isInteger(id)) }
        if (payload.ids.length === 0) {
            throw new Error('Không có khách hàng hợp lệ để xóa')
        }
        const response = await api.delete('/api/customers/bulk', {
            // send both body + query to satisfy any server parsing style
            data: payload,
            params: { ids: payload.ids },
            headers: { 'Content-Type': 'application/json' },
        })
        return response.data
    },

    getStats: async (id: number): Promise<CustomerStats> => {
        const response = await api.get(`/api/customers/${id}/stats`)
        return response.data
    },

    listTrash: async ({ limit = DEFAULT_LIMIT, offset = 0, search }: PageParams = {}): Promise<PaginatedResponse<Customer>> => {
        const hasSearch = Boolean(search && search.trim())
        const endpoint = hasSearch ? '/api/customers/trash/search' : '/api/customers/trash/list'
        const response = await api.get(endpoint, {
            params: {
                limit,
                offset,
                ...(hasSearch ? { q: search } : {}),
            },
        })
        return response.data
    },

    restore: async (id: number): Promise<void> => {
        await api.post(`/api/customers/${id}/restore`)
    },

    bulkRestore: async (ids: number[]): Promise<{ requested: number; restored: number }> => {
        const response = await api.post('/api/customers/restore/bulk', { ids })
        return response.data
    },

    permanentlyDelete: async (id: number): Promise<void> => {
        await api.delete(`/api/customers/${id}/permanent`)
    },
}
