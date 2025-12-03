import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '../services/products'
import type { Product } from '../types'

export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: productService.getAll,
    })
}

export function useProductSearch(query: string) {
    return useQuery({
        queryKey: ['products', 'search', query],
        queryFn: () => productService.search(query),
        enabled: query.length > 0,
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
        },
    })
}
