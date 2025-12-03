import { useQuery } from '@tanstack/react-query'
import { invoiceService } from '../services/invoices'

export function useInvoices(status?: string) {
    return useQuery({
        queryKey: ['invoices', status],
        queryFn: () => invoiceService.getAll(status),
    })
}

export function useStatistics() {
    return useQuery({
        queryKey: ['statistics'],
        queryFn: invoiceService.getStatistics,
    })
}
