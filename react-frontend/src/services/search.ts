import api from './api'
import type { Product, ImportResult } from '../types'

export const searchService = {
    searchText: async (query: string): Promise<Product[]> => {
        const response = await api.post('/api/search/text', { query })
        return response.data
    },

    searchImage: async (imageFile: File): Promise<Array<{ product: Product; similarity: number }>> => {
        const formData = new FormData()
        formData.append('file', imageFile)

        const response = await api.post('/api/search/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        return response.data
    },

    importQuotation: async (file: File): Promise<ImportResult> => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await api.post('/api/import/quotation', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        return response.data
    },
}
