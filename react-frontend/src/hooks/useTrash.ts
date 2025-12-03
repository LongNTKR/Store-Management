import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import type { Product } from '../types'

/**
 * Hook to fetch deleted products (trash)
 */
export function useTrashProducts() {
    return useQuery<Product[]>({
        queryKey: ['trash'],
        queryFn: async () => {
            const response = await api.get('/api/products/trash')
            return response.data
        },
        staleTime: 1 * 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    })
}

/**
 * Hook to restore a product from trash
 */
export function useRestoreProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (productId: number) => {
            const response = await api.post(`/api/products/${productId}/restore`)
            return response.data as Product
        },
        onSuccess: () => {
            // Invalidate both trash and products queries
            queryClient.invalidateQueries({ queryKey: ['trash'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        },
    })
}

/**
 * Hook to permanently delete a product (cannot be undone!)
 */
export function usePermanentlyDeleteProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (productId: number) => {
            await api.delete(`/api/products/${productId}/permanent`)
        },
        onSuccess: () => {
            // Invalidate trash and products queries
            queryClient.invalidateQueries({ queryKey: ['trash'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        },
    })
}
