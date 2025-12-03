import { useStatistics, useInvoices } from '../hooks/useInvoices'
import { useProducts } from '../hooks/useProducts'
import { useCustomers } from '../hooks/useCustomers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Package, Users, FileText, DollarSign, Upload, PlusCircle, FilePlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Invoice } from '@/types'

export function HomePage() {
    const { data: stats } = useStatistics()
    const { data: products } = useProducts()
    const { data: customers } = useCustomers()
    const { data: invoices } = useInvoices()
    const navigate = useNavigate()

    const metrics = [
        {
            title: '📦 Sản phẩm',
            value: products?.length || 0,
            icon: Package,
        },
        {
            title: '👥 Khách hàng',
            value: customers?.length || 0,
            icon: Users,
        },
        {
            title: '🧾 Hóa đơn',
            value: invoices?.length || 0,
            icon: FileText,
        },
        {
            title: '💰 Doanh thu',
            value: formatCurrency(stats?.total_revenue || 0),
            icon: DollarSign,
        },
    ]

    const statusLabels: Record<Invoice['status'], string> = {
        pending: 'Chưa thanh toán',
        paid: 'Đã thanh toán',
        cancelled: 'Đã hủy',
    }

    return (
        <div>
            <div className="mb-6 text-center">
                <h1 className="mb-2 text-4xl font-bold">🏪 Hệ Thống Quản Lý Bán Hàng</h1>
                <p className="text-muted-foreground">Cửa Hàng Gia Đình | v1.0.0</p>
            </div>

            {/* Quick Stats */}
            <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => (
                    <Card key={metric.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                            <metric.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metric.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <hr className="my-8" />

            {/* Recent Invoices */}
            <h2 className="mb-4 text-2xl font-bold">📋 Hóa Đơn Gần Đây</h2>
            {!invoices || invoices.length === 0 ? (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        Chưa có hóa đơn nào
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {invoices.slice(0, 5).map((invoice) => (
                        <Card key={invoice.id} className="transition-shadow hover:shadow-md">
                            <CardContent className="flex items-center justify-between gap-4 pt-6">
                                <div>
                                    <p className="font-semibold">{invoice.invoice_number}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {invoice.customer_name || 'Khách lẻ'} • {formatDate(invoice.created_at, 'dd/MM/yyyy')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">{formatCurrency(invoice.total)}</p>
                                    <p className="text-xs font-semibold text-primary">
                                        {statusLabels[invoice.status]}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Quick actions */}
            <hr className="my-8" />
            <h2 className="mb-3 text-2xl font-bold">⚡ Hành Động Nhanh</h2>
            <div className="grid gap-3 md:grid-cols-3">
                <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/products')}>
                    <PlusCircle className="h-4 w-4" /> Thêm sản phẩm
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/import')}>
                    <Upload className="h-4 w-4" /> Nhập báo giá
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => navigate('/invoices')}>
                    <FilePlus className="h-4 w-4" /> Xem hóa đơn
                </Button>
            </div>
        </div>
    )
}
