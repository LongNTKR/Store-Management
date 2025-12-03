import api from './api'
import type { Customer, CustomerStats } from '../types'

export const customerService = {
    getAll: async (): Promise<Customer[]> => {
        const response = await api.get('/api/customers')
        return response.data
    },

    getById: async (id: number): Promise<Customer> => {
        const response = await api.get(`/api/customers/${id}`)
        return response.data
    },

    search: async (query: string): Promise<Customer[]> => {
        const response = await api.get(`/api/customers/search`, {
            params: { q: query }
        })
        return response.data
    },

    create: async (customer: Partial<Customer>): Promise<Customer> => {
        const response = await api.post('/api/customers', customer)
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
