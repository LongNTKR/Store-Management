import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStatistics } from '@/hooks/useInvoices'
import { useProducts } from '@/hooks/useProducts'
import { useCustomers } from '@/hooks/useCustomers'
import { formatCurrency } from '@/lib/utils'
import { Box, Users, FileText, BadgeDollarSign, FilterX, CalendarRange } from 'lucide-react'

// New Components
import { StatCard } from '@/components/stats/StatCard'
import { RevenueChart } from '@/components/stats/RevenueChart'
import { PaymentStatusChart } from '@/components/stats/PaymentStatusChart'
import { TopDebtorsList } from '@/components/stats/TopDebtorsList'
import { CustomerDebtDetailDialog } from '@/components/debt/CustomerDebtDetailDialog'

export function StatsPage() {
    const [dateRange, setDateRange] = useState<{ start_date?: string; end_date?: string }>({})

    // Dialog state for debt detail
    const [selectedDebtorId, setSelectedDebtorId] = useState<number | null>(null)
    const [selectedDebtorName, setSelectedDebtorName] = useState<string | undefined>()
    const [showDebtDialog, setShowDebtDialog] = useState(false)

    const { data: stats } = useStatistics(dateRange)
    const { data: productPages } = useProducts()
    const { data: customerPages} = useCustomers()

    const handleDebtorClick = (id: number, name: string) => {
        setSelectedDebtorId(id)
        setSelectedDebtorName(name)
        setShowDebtDialog(true)
    }

    const totalProducts = productPages?.pages?.[0]?.total || 0
    const totalCustomers = customerPages?.pages?.[0]?.total || 0
    // Fix: Only use stats data for invoices/revenue to ensure filters are respected
    // Do not fallback to global total (invoicePages.total) as it violates the date filter
    const totalInvoices = stats?.total_invoices || 0

    const handleClearFilter = () => {
        setDateRange({})
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                        Thống Kê & Báo Cáo
                    </h1>
                    <p className="mt-1 text-slate-500">
                        Tổng quan hiệu suất kinh doanh và tình hình tài chính.
                    </p>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 px-2 border-r pr-4">
                        <CalendarRange className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">Thời gian:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            className="h-8 w-[130px] border-none shadow-none focus-visible:ring-0 bg-transparent p-0 text-sm"
                            value={dateRange.start_date || ''}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                        />
                        <span className="text-slate-300">-</span>
                        <Input
                            type="date"
                            className="h-8 w-[130px] border-none shadow-none focus-visible:ring-0 bg-transparent p-0 text-sm"
                            value={dateRange.end_date || ''}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                    </div>
                    {(dateRange.start_date || dateRange.end_date) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 ml-1 rounded-full"
                            onClick={handleClearFilter}
                            title="Xóa bộ lọc"
                        >
                            <FilterX className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Doanh thu"
                    value={formatCurrency(stats?.total_revenue || 0)}
                    icon={BadgeDollarSign}
                    description="Tổng doanh thu trong kỳ"
                    variant="emerald"
                />
                <StatCard
                    title="Hóa đơn"
                    value={totalInvoices}
                    icon={FileText}
                    description="Đơn hàng đã tạo"
                    variant="blue"

                />
                <StatCard
                    title="Khách hàng"
                    value={totalCustomers}
                    icon={Users}
                    description="Tổng số khách hàng"
                    variant="indigo"
                />
                <StatCard
                    title="Sản phẩm"
                    value={totalProducts}
                    icon={Box}
                    description="Sản phẩm đang quản lý"
                    variant="amber"
                />
            </div>

            {/* Charts & Details Section */}
            <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7 items-start">
                {/* Visualizations - Takes up 5 columns */}
                <div className="md:col-span-4 lg:col-span-5 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <RevenueChart
                            collectedAmount={stats?.collected_amount || 0}
                            outstandingDebt={stats?.outstanding_debt || 0}
                        />
                        <PaymentStatusChart
                            paid={stats?.paid_invoices || 0}
                            pending={stats?.pending_invoices || 0}
                            cancelled={stats?.cancelled_invoices || 0}
                        />
                    </div>
                </div>

                {/* Top Debtors List - Takes up 2 columns */}
                <div className="md:col-span-3 lg:col-span-2">
                    <TopDebtorsList
                        currentDateRange={dateRange}
                        onDebtorClick={handleDebtorClick}
                    />
                </div>
            </div>

            {/* Customer Debt Detail Dialog */}
            <CustomerDebtDetailDialog
                customerId={selectedDebtorId}
                customerName={selectedDebtorName}
                open={showDebtDialog}
                onOpenChange={setShowDebtDialog}
            />
        </div>
    )
}
