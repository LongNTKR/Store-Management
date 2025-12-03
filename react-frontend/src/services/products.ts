import api from './api'
import type { Product } from '../types'

export const productService = {
    getAll: async (): Promise<Product[]> => {
        const response = await api.get('/api/products')
        return response.data
    },

    getById: async (id: number): Promise<Product> => {
        const response = await api.get(`/api/products/${id}`)
        return response.data
    },

    search: async (query: string): Promise<Product[]> => {
        const response = await api.get(`/api/products/search`, {
            params: { q: query }
        })
        return response.data
    },

    create: async (product: Partial<Product>): Promise<Product> => {
        const response = await api.post('/api/products', product)
        return response.data
    },

    update: async (id: number, product: Partial<Product>): Promise<Product> => {
        const response = await api.put(`/api/products/${id}`, product)
        return response.data
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/api/products/${id}`)
    },
}
