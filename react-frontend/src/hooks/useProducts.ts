import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productService } from '../services/products'
import type { Product } from '../types'

export const PRODUCT_PAGE_SIZE = 24

export function useProducts(searchQuery: string = '') {
    const trimmed = searchQuery.trim()

    return useInfiniteQuery({
        queryKey: ['products', trimmed],
        initialPageParam: 0,
        queryFn: ({ pageParam = 0 }) =>
            productService.list({
                limit: PRODUCT_PAGE_SIZE,
                offset: pageParam,
                search: trimmed || undefined,
            }),
        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_offset ?? undefined : undefined,
    })
}

export function useProductSearch(query: string) {
    const trimmedQuery = query.trim()

    return useQuery({
        queryKey: ['products', 'search', trimmedQuery],
        queryFn: () => productService.search(trimmedQuery, 15),
        enabled: trimmedQuery.length > 0,
        placeholderData: (previousData) => previousData,
    })
}

export function useAutocomplete(query: string) {
    const trimmedQuery = query.trim()

    return useQuery({
        queryKey: ['products', 'autocomplete', trimmedQuery],
        queryFn: () => productService.autocomplete(trimmedQuery),
        enabled: trimmedQuery.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes - autocomplete results can be cached longer
        placeholderData: (previousData) => previousData,
    })
}

export function useCreateProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (product: Partial<Product>) => productService.create(product),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        },
    })
}

export function useUpdateProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, product }: { id: number; product: Partial<Product> }) =>
            productService.update(id, product),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        },
    })
}

export function useDeleteProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => productService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['trash'] })
        },
    })
}

export function useBulkDeleteProducts() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (ids: number[]) => productService.bulkDelete(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['trash'] })
        },
    })
}
