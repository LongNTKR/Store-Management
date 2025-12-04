import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '../services/invoices'
import { toast } from 'sonner'
import type { InvoiceCreate } from '../types'

export function useInvoices(status?: string, searchQuery?: string) {
    return useQuery({
        queryKey: ['invoices', status, searchQuery],
        queryFn: () => invoiceService.getAll(status, searchQuery),
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

export function useStatistics() {
    return useQuery({
        queryKey: ['statistics'],
        queryFn: invoiceService.getStatistics,
    })
}
