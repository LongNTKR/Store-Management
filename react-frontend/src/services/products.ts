import api from './api'
import type { PaginatedResponse, Product } from '../types'

type PageParams = {
    limit?: number
    offset?: number
    search?: string
}

const DEFAULT_LIMIT = 24

export const productService = {
    list: async ({ limit = DEFAULT_LIMIT, offset = 0, search }: PageParams = {}): Promise<PaginatedResponse<Product>> => {
        const hasSearch = Boolean(search && search.trim())
        const endpoint = hasSearch ? '/api/products/search' : '/api/products'
        const response = await api.get(endpoint, {
            params: {
                limit,
                offset,
                ...(hasSearch ? { q: search } : {}),
            },
        })
        return response.data
    },

    listTrash: async ({ limit = DEFAULT_LIMIT, offset = 0, search }: PageParams = {}): Promise<PaginatedResponse<Product>> => {
        const hasSearch = Boolean(search && search.trim())
        const endpoint = hasSearch ? '/api/products/trash/search' : '/api/products/trash'
        const response = await api.get(endpoint, {
            params: {
                limit,
                offset,
                ...(hasSearch ? { q: search } : {}),
            },
        })
        return response.data
    },

    getById: async (id: number): Promise<Product> => {
        const response = await api.get(`/api/products/${id}`)
        return response.data
    },

    search: async (query: string, limit = 12): Promise<Product[]> => {
        const data = await productService.list({ search: query, limit, offset: 0 })
        return data.items
    },

    autocomplete: async (query: string): Promise<Product[]> => {
        const response = await api.get(`/api/products/autocomplete`, {
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

    uploadImages: async (id: number, files: File[]): Promise<Product> => {
        const formData = new FormData()
        files.forEach((file) => formData.append('files', file))

        const response = await api.post(`/api/products/${id}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })

        return response.data
    },

    deleteImage: async (id: number, path: string): Promise<Product> => {
        const response = await api.delete(`/api/products/${id}/images`, {
            data: { path },
        })
        return response.data
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/api/products/${id}`)
    },

    bulkDelete: async (ids: number[]): Promise<{ requested: number; deleted: number }> => {
        const response = await api.delete('/api/products/bulk', {
            data: { ids },
        })
        return response.data
    },

    bulkPermanentDelete: async (ids: number[]): Promise<{ requested: number; deleted: number }> => {
        const response = await api.delete('/api/products/permanent/bulk', {
            data: { ids },
        })
        return response.data
    },

    bulkRestore: async (ids: number[]): Promise<{ requested: number; restored: number }> => {
        const response = await api.post('/api/products/restore/bulk', {
            ids,
        })
        return response.data
    },
}
