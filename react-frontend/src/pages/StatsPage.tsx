import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStatistics } from '@/hooks/useInvoices'
import { useProducts } from '@/hooks/useProducts'
import { useCustomers } from '@/hooks/useCustomers'
import { formatCurrency } from '@/lib/utils'
import {
    Box, Users, FileText, BadgeDollarSign, FilterX, CalendarRange,
    CheckCircle2, Clock, XCircle, Settings, FileCheck, FileWarning,
    DollarSign, Wallet, TrendingUp, FileX, RefreshCcw, Receipt, UserCheck
} from 'lucide-react'

// New Components
import { StatCard } from '@/components/stats/StatCard'
import { RevenueChart } from '@/components/stats/RevenueChart'
import { PaymentStatusChart } from '@/components/stats/PaymentStatusChart'
import { InvoiceStatusChart } from '@/components/stats/InvoiceStatusChart'
import { PendingInvoiceBreakdownChart } from '@/components/stats/PendingInvoiceBreakdownChart'
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
    const { data: customerPages } = useCustomers()

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

            {/* NHÓM 1: Tổng quan hệ thống (compact) */}
            <div className="flex items-center gap-6 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                <h2 className="text-sm font-semibold text-slate-600">📊 Tổng quan:</h2>
                <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-slate-700">{totalProducts} Sản phẩm</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-slate-700">{totalCustomers} Khách hàng</span>
                </div>
                <div className="h-4 w-px bg-slate-300" />
                <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">
                        TB/đơn: {formatCurrency(stats?.average_order_value || 0)}
                    </span>
                </div>
            </div>

            {/* NHÓM 2: Phân tích doanh thu (MỞ RỘNG - quan trọng nhất) */}
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                        <BadgeDollarSign className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-900">💰 Phân tích doanh thu</h2>
                </div>

                {/* Revenue Summary Cards - Row 1: Gross metrics */}
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <div className="p-5 bg-white rounded-xl shadow-md border-2 border-emerald-300 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Tổng doanh thu</p>
                            <BadgeDollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-emerald-700 mb-1">{formatCurrency(stats?.total_revenue || 0)}</p>
                        <p className="text-xs text-slate-500">Hóa đơn đã xuất (đã TT + chờ TT)</p>
                    </div>
                    <div className="p-5 bg-white rounded-xl shadow-md border-2 border-red-200 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Đã hoàn trả</p>
                            <RefreshCcw className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-2xl font-bold text-red-600 mb-1">-{formatCurrency(stats?.total_refunded || 0)}</p>
                        <p className="text-xs text-slate-500">Giá trị hàng trả lại</p>
                    </div>
                    <div className="p-5 bg-white rounded-xl shadow-md border-2 border-purple-300 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Doanh thu ròng</p>
                            <DollarSign className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-purple-700 mb-1">{formatCurrency(stats?.total_net_revenue || 0)}</p>
                        <p className="text-xs text-slate-500">Sau khi trừ hoàn trả</p>
                    </div>
                </div>

                {/* Revenue Summary Cards - Row 2: Collection metrics */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div className="p-5 bg-white rounded-xl shadow-md border-2 border-green-300 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Đã thu về</p>
                            <Wallet className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-green-700 mb-1">{formatCurrency(stats?.collected_amount || 0)}</p>
                        <p className="text-xs text-slate-500">Số tiền đã nhận từ khách hàng</p>
                    </div>
                    <div className="p-5 bg-white rounded-xl shadow-md border-2 border-amber-300 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Còn nợ</p>
                            <TrendingUp className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-2xl font-bold text-amber-700 mb-1">{formatCurrency(stats?.outstanding_debt || 0)}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {stats?.invoices_with_debt || 0} hóa đơn
                            </span>
                            <span className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {stats?.customers_with_debt || 0} khách hàng
                            </span>
                        </div>
                    </div>
                    <div className="p-5 bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Tỷ lệ thu nợ</p>
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-700 mb-1">
                            {stats?.total_revenue && stats.total_revenue > 0
                                ? Math.round((stats.collected_amount || 0) / stats.total_revenue * 100)
                                : 0}%
                        </p>
                        <p className="text-xs text-slate-500">Đã thu / Tổng doanh thu</p>
                    </div>
                </div>

                {/* Revenue Charts - Integrated within Revenue Section */}
                <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7 items-start">
                    <div className="md:col-span-4 lg:col-span-5">
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
                    <div className="md:col-span-3 lg:col-span-2">
                        <TopDebtorsList
                            currentDateRange={dateRange}
                            onDebtorClick={handleDebtorClick}
                        />
                    </div>
                </div>
            </div>

            {/* NHÓM 3: Thống kê hóa đơn (compact) */}
            <div className="pt-6 border-t-2 border-slate-200">
                <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    🧾 Thống kê hóa đơn
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Invoice Status Chart */}
                    <InvoiceStatusChart
                        total={totalInvoices}
                        paid={stats?.paid_invoices || 0}
                        pending={stats?.pending_invoices || 0}
                        cancelled={stats?.cancelled_invoices || 0}
                        processing={stats?.processing_invoices || 0}
                    />
                    {/* Pending Invoice Breakdown Chart */}
                    <PendingInvoiceBreakdownChart
                        pendingExported={stats?.pending_exported_invoices || 0}
                        pendingNonExported={stats?.pending_non_exported_invoices || 0}
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
