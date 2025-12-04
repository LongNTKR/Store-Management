import { useDashboard } from '../hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Package, Users, FileText, DollarSign, Upload, PlusCircle, FilePlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Invoice } from '@/types'

export function HomePage() {
    const { data: dashboard } = useDashboard()
    const navigate = useNavigate()

    // Extract data from unified dashboard response
    const stats = dashboard?.stats
    const invoices = dashboard?.recent_invoices

    const metrics = [
        {
            title: '📦 Sản phẩm',
            value: stats?.total_products || 0,
            icon: Package,
        },
        {
            title: '👥 Khách hàng',
            value: stats?.total_customers || 0,
            icon: Users,
        },
        {
            title: '🧾 Hóa đơn',
            value: stats?.total_invoices || 0,
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
                <h1 className="mb-2 flex items-center justify-center gap-4 text-4xl font-bold">
                    <span className="inline-flex flex-shrink-0 items-center justify-center h-[7.5rem] w-[7.5rem]">
                        <img src="/Image_bqzqd5bqzqd5bqzq.png" alt="Store Icon" className="h-24 w-24 object-contain drop-shadow-sm" />
                    </span>
                    Voi Store
                </h1>
            </div>

            {/* Quick Stats */}
            <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => (
                    <Card key={metric.title}>
                        <CardHeader className=" flex flex-row items-center justify-between gap-2">
                            <CardTitle className="">{metric.title}</CardTitle>
                            <metric.icon className="text-muted-foreground !mt-0" />
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
