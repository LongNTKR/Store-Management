import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useCustomers } from '@/hooks/useCustomers'
import { paymentService } from '@/services/payments'

import type { DebtSummary } from '@/types/payment'
import { Loader2 } from 'lucide-react'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    dateRange?: { start_date?: string; end_date?: string }
    onDebtorClick?: (id: number, name: string) => void
}

export function CustomersWithDebtDialog({ open, onOpenChange, onDebtorClick }: Props) {
    // Fetch all customers
    const { data: customerPages, isLoading: isLoadingCustomers } = useCustomers()

    const customers = useMemo(
        () => customerPages?.pages.flatMap((page) => page.items) ?? [],
        [customerPages]
    )

    const customerIds = useMemo(() => customers.map((c) => c.id), [customers])

    // Fetch debt summary for each customer
    const { data: debtMap, isFetching: isFetchingDebt } = useQuery({
        queryKey: ['customer-debts-dialog', customerIds],
        queryFn: async () => {
            const entries = await Promise.all(
                customerIds.map(async (id) => {
                    try {
                        const summary = await paymentService.getCustomerDebt(id)
                        return [id, summary] as const
                    } catch {
                        return [id, null] as const
                    }
                })
            )

            return Object.fromEntries(entries) as Record<number, DebtSummary | null>
        },
        enabled: open && customerIds.length > 0,
    })

    // Filter customers with debt and sort by debt amount (highest first)
    const customersWithDebt = useMemo(() => {
        if (!debtMap) return []

        return customers
            .map((customer) => ({
                ...customer,
                debt_summary: debtMap[customer.id],
            }))
            .filter((c) => c.debt_summary && c.debt_summary.total_debt > 0)
            .sort((a, b) => (b.debt_summary?.total_debt || 0) - (a.debt_summary?.total_debt || 0))
    }, [customers, debtMap])

    const isLoading = isLoadingCustomers || isFetchingDebt

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>👥</span> Khách Hàng Đang Nợ
                    </DialogTitle>
                    <DialogDescription>
                        Danh sách khách hàng có công nợ chưa thanh toán
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Đang tải dữ liệu...</span>
                    </div>
                ) : customersWithDebt.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="text-lg">🎉 Không có khách hàng nào đang nợ</p>
                        <p className="text-sm mt-2">Tất cả hóa đơn đã được thanh toán đầy đủ</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {customersWithDebt.map((customer) => (
                            <div
                                key={customer.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-lg">{customer.name}</p>
                                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                                        {customer.phone && (
                                            <span>📞 {customer.phone}</span>
                                        )}
                                        {customer.debt_summary && (
                                            <>
                                                <span>
                                                    {customer.debt_summary.unpaid_invoices} hóa đơn chưa thanh toán
                                                </span>
                                                {customer.debt_summary.partially_paid_invoices > 0 && (
                                                    <span className="text-amber-600">
                                                        {customer.debt_summary.partially_paid_invoices} hóa đơn thanh toán 1 phần
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right ml-4">
                                    <p className="text-xl font-bold text-rose-600">
                                        {formatCurrency(customer.debt_summary?.total_debt || 0)}
                                    </p>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="text-xs p-0 h-auto"
                                        onClick={() => {
                                            onDebtorClick?.(customer.id, customer.name)
                                            onOpenChange(false) // Close the "all debtors" dialog
                                        }}
                                    >
                                        Xem chi tiết →
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {customersWithDebt.length > 0 && (
                    <div className="pt-4 border-t mt-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                                Tổng cộng: <strong>{customersWithDebt.length}</strong> khách hàng
                            </span>
                            <span className="text-rose-600 font-semibold">
                                Tổng nợ:{' '}
                                {formatCurrency(
                                    customersWithDebt.reduce(
                                        (sum, c) => sum + (c.debt_summary?.total_debt || 0),
                                        0
                                    )
                                )}
                            </span>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
