import api from './api';
import type {
  InvoiceReturn,
  InvoiceReturnCreate,
  AvailableReturnQuantity
} from '../types/invoiceReturn';

export const invoiceReturnService = {
  /**
   * Create a new invoice return
   */
  create: async (invoiceId: number, data: InvoiceReturnCreate): Promise<InvoiceReturn> => {
    const response = await api.post(`/api/invoices/${invoiceId}/returns`, data);
    return response.data;
  },

  /**
   * Get all returns for an invoice
   */
  getInvoiceReturns: async (invoiceId: number): Promise<InvoiceReturn[]> => {
    const response = await api.get(`/api/invoices/${invoiceId}/returns`);
    return response.data;
  },

  /**
   * Get a specific return by ID
   */
  getById: async (returnId: number): Promise<InvoiceReturn> => {
    const response = await api.get(`/api/returns/${returnId}`);
    return response.data;
  },

  /**
   * Get available return quantities for invoice items
   */
  getAvailableQuantities: async (invoiceId: number): Promise<AvailableReturnQuantity[]> => {
    const response = await api.get(`/api/invoices/${invoiceId}/available-return-quantities`);
    return response.data;
  },

  /**
   * Generate PDF for invoice return
   */
  generateReturnPdf: async (returnId: number): Promise<Blob> => {
    const response = await api.get(`/api/returns/${returnId}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
