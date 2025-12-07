import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceReturnService } from '../services/invoiceReturns';
import { toast } from 'sonner';
import type { InvoiceReturnCreate } from '../types/invoiceReturn';

/**
 * Hook to fetch all returns for an invoice
 */
export function useInvoiceReturns(invoiceId: number | null) {
  return useQuery({
    queryKey: ['invoice-returns', invoiceId],
    queryFn: () => invoiceReturnService.getInvoiceReturns(invoiceId!),
    enabled: !!invoiceId,
  });
}

/**
 * Hook to fetch available return quantities for an invoice
 */
export function useAvailableReturnQuantities(invoiceId: number | null) {
  return useQuery({
    queryKey: ['available-return-quantities', invoiceId],
    queryFn: () => invoiceReturnService.getAvailableQuantities(invoiceId!),
    enabled: !!invoiceId,
  });
}

/**
 * Hook to fetch a specific return by ID
 */
export function useInvoiceReturn(returnId: number | null) {
  return useQuery({
    queryKey: ['invoice-return', returnId],
    queryFn: () => invoiceReturnService.getById(returnId!),
    enabled: !!returnId,
  });
}

/**
 * Hook to create a new invoice return
 */
export function useCreateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: number; data: InvoiceReturnCreate }) =>
      invoiceReturnService.create(invoiceId, data),
    onSuccess: (_, variables) => {
      // Invalidate invoice returns list
      queryClient.invalidateQueries({ queryKey: ['invoice-returns', variables.invoiceId] });
      // Invalidate available quantities
      queryClient.invalidateQueries({ queryKey: ['available-return-quantities', variables.invoiceId] });
      // Invalidate invoices list (to update has_returns badge)
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Invalidate specific invoice detail
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      // Invalidate payment-related queries
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
      // Invalidate debt-related queries
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debt'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debt-detail'] });
      queryClient.invalidateQueries({ queryKey: ['all-customer-debts'] });
      queryClient.invalidateQueries({ queryKey: ['aging-analysis'] });
      // Invalidate products (for inventory update)
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Invalidate dashboard
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      toast.success('Hoàn trả hóa đơn thành công!');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || 'Không thể hoàn trả hóa đơn';
      toast.error(errorMessage);
    },
  });
}
