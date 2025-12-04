import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '../services/invoices'
import { toast } from 'sonner'
import type { InvoiceCreate, InvoiceUpdate } from '../types'

const INVOICE_PAGE_SIZE = 15

export function useInvoices(status?: string, searchQuery?: string, startDate?: string, endDate?: string) {
    const trimmedSearch = (searchQuery || '').trim()

    return useInfiniteQuery({
        queryKey: ['invoices', status, trimmedSearch, startDate, endDate],
        initialPageParam: 0,
        queryFn: ({ pageParam = 0 }) =>
            invoiceService.list({
                status,
                searchQuery: trimmedSearch || undefined,
                startDate,
                endDate,
                limit: INVOICE_PAGE_SIZE,
                offset: pageParam,
            }),
        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_offset ?? undefined : undefined,
    })
}

export function useCreateInvoice() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (invoice: InvoiceCreate) => invoiceService.create(invoice),
        onSuccess: () => {
            // Invalidate and refetch invoices list
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            // Invalidate statistics
            queryClient.invalidateQueries({ queryKey: ['statistics'] })
            // Invalidate dashboard data
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })

            toast.success('Tạo hóa đơn thành công!')
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.detail || 'Không thể tạo hóa đơn'
            toast.error(errorMessage)
        }
    })
}

export function useUpdateInvoiceStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            invoiceService.updateStatus(id, status),
        onSuccess: () => {
            // Invalidate invoices list
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            // Invalidate dashboard data to sync HomePage
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })

            toast.success('Cập nhật trạng thái thành công!')
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.detail || 'Không thể cập nhật trạng thái hóa đơn'
            toast.error(errorMessage)
        }
    })
}

export function useUpdateInvoice() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, invoice }: { id: number; invoice: InvoiceUpdate }) =>
            invoiceService.update(id, invoice),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
            queryClient.invalidateQueries({ queryKey: ['statistics'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            toast.success('Cập nhật hóa đơn thành công!')
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.detail || 'Không thể cập nhật hóa đơn'
            toast.error(errorMessage)
        }
    })
}

export function useStatistics() {
    return useQuery({
        queryKey: ['statistics'],
        queryFn: invoiceService.getStatistics,
    })
}
