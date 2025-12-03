import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import type { Product, Customer, Invoice } from '../types'

interface DashboardStats {
    total_products: number
    total_customers: number
    total_invoices: number
    paid_invoices: number
    pending_invoices: number
    cancelled_invoices: number
    total_revenue: number
    pending_revenue: number
    average_order_value: number
}

interface DashboardData {
    stats: DashboardStats
    recent_products: Product[]
    recent_customers: Customer[]
    recent_invoices: Invoice[]
}

/**
 * Unified dashboard hook - fetches all dashboard data in a single API call
 * Replaces multiple separate queries to reduce network overhead
 */
export function useDashboard() {
    return useQuery<DashboardData>({
        queryKey: ['dashboard'],
        queryFn: async () => {
            const response = await api.get('/api/dashboard')
            return response.data
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    })
}
