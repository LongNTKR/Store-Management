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
