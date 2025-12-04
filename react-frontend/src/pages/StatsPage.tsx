import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStatistics, useInvoices } from '@/hooks/useInvoices'
import { useProducts } from '@/hooks/useProducts'
import { useCustomers } from '@/hooks/useCustomers'
import { formatCurrency } from '@/lib/utils'

export function StatsPage() {
    const { data: stats } = useStatistics()
    const { data: products } = useProducts()
    const { data: customers } = useCustomers()
    const { data: invoices } = useInvoices()

    const paymentTotals = [
        { label: 'Đã thanh toán', value: stats?.paid_invoices || 0, color: 'bg-emerald-500' },
        { label: 'Chưa thanh toán', value: stats?.pending_invoices || 0, color: 'bg-amber-500' },
        { label: 'Đã hủy', value: stats?.cancelled_invoices || 0, color: 'bg-slate-400' },
    ]

    const totalPayments = paymentTotals.reduce((sum, item) => sum + item.value, 0) || 1

    return (
        <div className="space-y-6">
            <div>
                <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold">
                    <span className="inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                        <img alt="Product Management Icon" className="h-16 w-16 object-contain drop-shadow-sm" src="/Image_dtv8tsdtv8tsdtv8.png" />
                    </span>
                    Thống Kê & Báo Cáo
                </h1>
                <p className="text-muted-foreground">Tổng quan hệ thống: sản phẩm, khách hàng, hóa đơn, doanh thu.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle>📦 Sản phẩm</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{products?.length || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>👥 Khách hàng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{customers?.length || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>🧾 Hóa đơn</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats?.total_invoices || invoices?.length || 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>💰 Doanh thu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-primary">
                            {formatCurrency(stats?.total_revenue || 0)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>💳 Trạng Thái Thanh Toán</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {paymentTotals.map((item) => {
                            const percent = Math.round((item.value / totalPayments) * 100)
                            return (
                                <div key={item.label}>
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <span>{item.label}</span>
                                        <span className="font-medium text-foreground">{item.value} ({percent}%)</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted">
                                        <div
                                            className={`h-full rounded-full ${item.color}`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>📈 Thông Số Chính</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                            <span>Đơn hàng trung bình</span>
                            <span className="font-semibold text-foreground">
                                {formatCurrency(stats?.average_order_value || 0)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Doanh thu chờ xử lý</span>
                            <span className="font-semibold text-foreground">
                                {formatCurrency(stats?.pending_revenue || 0)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Tỷ lệ hoàn thành</span>
                            <span className="font-semibold text-foreground">
                                {stats && stats.total_invoices > 0
                                    ? `${Math.round((stats.paid_invoices / stats.total_invoices) * 100)}%`
                                    : '0%'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
