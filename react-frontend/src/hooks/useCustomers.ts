import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerService } from '../services/customers'
import type { Customer } from '../types'

export function useCustomers() {
    return useQuery({
        queryKey: ['customers'],
        queryFn: customerService.getAll,
    })
}

export function useCustomerSearch(query: string) {
    return useQuery({
        queryKey: ['customers', 'search', query],
        queryFn: () => customerService.search(query),
        enabled: query.length > 0,
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

export function useDeleteCustomer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => customerService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
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
