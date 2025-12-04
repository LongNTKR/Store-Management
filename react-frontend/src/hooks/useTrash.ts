import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { productService } from '@/services/products'
import { customerService } from '@/services/customers'
import type { Product, Customer } from '../types'

const TRASH_PAGE_SIZE = 24

/**
 * Hook to fetch deleted products (trash) with infinite scroll support.
 */
export function useTrashProducts(searchQuery: string = '') {
    const trimmed = searchQuery.trim()

    return useInfiniteQuery({
        queryKey: ['trash', trimmed],
        initialPageParam: 0,
        queryFn: ({ pageParam = 0 }) =>
            productService.listTrash({
                limit: TRASH_PAGE_SIZE,
                offset: pageParam,
                search: trimmed || undefined,
            }),
        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_offset ?? undefined : undefined,
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

export function useBulkPermanentlyDeleteProducts() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (ids: number[]) => productService.bulkPermanentDelete(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        },
    })
}

export function useBulkRestoreProducts() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (ids: number[]) => productService.bulkRestore(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] })
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        },
    })
}

/**
 * Hook to fetch deleted customers (trash) with infinite scroll support.
 */
export function useTrashCustomers(searchQuery: string = '') {
    const trimmed = searchQuery.trim()

    return useInfiniteQuery({
        queryKey: ['trash-customers', trimmed],
        initialPageParam: 0,
        queryFn: ({ pageParam = 0 }) =>
            customerService.listTrash({
                limit: TRASH_PAGE_SIZE,
                offset: pageParam,
                search: trimmed || undefined,
            }),
        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_offset ?? undefined : undefined,
    })
}

/**
 * Hook to restore a customer from trash
 */
export function useRestoreCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (customerId: number) => {
            await customerService.restore(customerId)
        },
        onSuccess: () => {
            // Invalidate both trash and customers queries
            queryClient.invalidateQueries({ queryKey: ['trash-customers'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
    })
}

/**
 * Hook to permanently delete a customer (cannot be undone!)
 */
export function usePermanentlyDeleteCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (customerId: number) => {
            await customerService.permanentlyDelete(customerId)
        },
        onSuccess: () => {
            // Invalidate trash and customers queries
            queryClient.invalidateQueries({ queryKey: ['trash-customers'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
    })
}
