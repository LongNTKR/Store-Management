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

    getStats: async (id: number): Promise<CustomerStats> => {
        const response = await api.get(`/api/customers/${id}/stats`)
        return response.data
    },
}
