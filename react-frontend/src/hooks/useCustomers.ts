import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customerService } from '../services/customers'
import type { Customer } from '../types'

const CUSTOMER_PAGE_SIZE = 20

export function useCustomers(searchQuery: string = '') {
    const trimmed = searchQuery.trim()

    return useInfiniteQuery({
        queryKey: ['customers', trimmed],
        initialPageParam: 0,
        queryFn: ({ pageParam = 0 }) =>
            customerService.list({
                limit: CUSTOMER_PAGE_SIZE,
                offset: pageParam,
                search: trimmed || undefined,
            }),
        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_offset ?? undefined : undefined,
    })
}

export function useCreateCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (customer: Partial<Customer>) => customerService.create(customer),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
    })
}

export function useUpdateCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Customer> }) =>
            customerService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
    })
}

export function useDeleteCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => customerService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            queryClient.invalidateQueries({ queryKey: ['trash-customers'] })
        },
    })
}

export function useCustomerStats(customerId: number) {
    return useQuery({
        queryKey: ['customers', customerId, 'stats'],
        queryFn: () => customerService.getStats(customerId),
        enabled: customerId > 0,
    })
}
