import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useQuery } from '@tanstack/react-query'
import { paymentService } from '@/services/payments'
import { useCustomers } from '@/hooks/useCustomers'
import { formatCurrency } from '@/lib/utils'
import { ArrowRight, User } from 'lucide-react'
import { CustomersWithDebtDialog } from './CustomersWithDebtDialog'

interface TopDebtorsListProps {
    currentDateRange: { start_date?: string; end_date?: string }
    onDebtorClick?: (id: number, name: string) => void
}

export function TopDebtorsList({ currentDateRange, onDebtorClick }: TopDebtorsListProps) {
    const [showAllDialog, setShowAllDialog] = useState(false)
    const { data: customerPages } = useCustomers()

    // We need to fetch debt for all customers to sort them
    // Ideally this should be an API endpoint returning sorted debtors, 
    // but for now we reuse the logic from CustomersWithDebtDialog
    // Limiting to fetching only if we have customers
    const customers = customerPages?.pages.flatMap((page) => page.items) ?? []
    const customerIds = customers.map((c) => c.id)

    const { data: debtMap } = useQuery({
        queryKey: ['customer-debts-top-list', customerIds],
        queryFn: async () => {
            // Limit concurrency or fetch in batches if needed, but for small scale this is fine
            if (customerIds.length === 0) return {}

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
            return Object.fromEntries(entries)
        },
        enabled: customerIds.length > 0,
        staleTime: 60000 // Cache for 1 minute
    })

    const topDebtors = customers
        .map((customer) => ({
            ...customer,
            debt_summary: debtMap?.[customer.id],
        }))
        .filter((c) => c.debt_summary && c.debt_summary.total_debt > 0)
        .sort((a, b) => (b.debt_summary?.total_debt || 0) - (a.debt_summary?.total_debt || 0))
        // Take top 5
        .slice(0, 5)

    return (
        <>
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">Khách nợ nhiều nhất</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-primary hover:text-primary/80 px-2 h-auto"
                            onClick={() => setShowAllDialog(true)}
                        >
                            Xem tất cả <ArrowRight className="ml-1 w-3 h-3" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <div className="space-y-4">
                        {topDebtors.length > 0 ? (
                            topDebtors.map((debtor) => (
                                <div
                                    key={debtor.id}
                                    className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors -mx-2"
                                    onClick={() => onDebtorClick?.(debtor.id, debtor.name)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-100 transition-colors">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{debtor.name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{debtor.phone || 'Không có sđt'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-rose-600">
                                            {formatCurrency(debtor.debt_summary?.total_debt || 0)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
                                <p className="text-sm">Không có dữ liệu nợ</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <CustomersWithDebtDialog
                open={showAllDialog}
                onOpenChange={setShowAllDialog}
                dateRange={currentDateRange}
                onDebtorClick={onDebtorClick}
            />
        </>
    )
}
