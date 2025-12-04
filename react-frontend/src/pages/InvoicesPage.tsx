import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useInvoices } from '@/hooks/useInvoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import { invoiceService } from '@/services/invoices'
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react'
import type { Invoice } from '@/types'

const statusLabels: Record<Invoice['status'], string> = {
    pending: 'Chưa thanh toán',
    paid: 'Đã thanh toán',
    cancelled: 'Đã hủy',
}

const statusStyles: Record<Invoice['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-gray-200 text-gray-700',
}

export function InvoicesPage() {
    const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all')
    const { data: invoices, isLoading } = useInvoices(statusFilter === 'all' ? undefined : statusFilter)
    const [downloading, setDownloading] = useState<{ id: number; type: 'pdf' | 'excel' } | null>(null)

    const filteredInvoices = useMemo(() => invoices || [], [invoices])

    const handleDownload = async (invoiceId: number, type: 'pdf' | 'excel') => {
        try {
            setDownloading({ id: invoiceId, type })
            const blob =
                type === 'pdf'
                    ? await invoiceService.generatePdf(invoiceId)
                    : await invoiceService.generateExcel(invoiceId)

            const url = URL.createObjectURL(new Blob([blob]))
            const link = document.createElement('a')
            link.href = url
            link.download = type === 'pdf' ? `invoice_${invoiceId}.pdf` : `invoice_${invoiceId}.xlsx`
            link.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Failed to download invoice:', error)
        } finally {
            setDownloading(null)
        }
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="flex items-center gap-3 text-3xl font-bold">
                    <span className="inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                        <img alt="Product Management Icon" className="h-16 w-16 object-contain drop-shadow-sm" src="/Image_3rudgh3rudgh3rud.png" />
                    </span>
                    Quản Lý Hóa Đơn
                </h1>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Lọc trạng thái:</span>
                    <Select value={statusFilter} onValueChange={(value: 'all' | Invoice['status']) => setStatusFilter(value)}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="pending">Chưa thanh toán</SelectItem>
                            <SelectItem value="paid">Đã thanh toán</SelectItem>
                            <SelectItem value="cancelled">Đã hủy</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-muted-foreground">Đang tải...</div>
            ) : filteredInvoices.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
                    Chưa có hóa đơn nào
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Tổng: {filteredInvoices.length} hóa đơn</p>
                    {filteredInvoices.map((invoice) => (
                        <Card key={invoice.id} className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDate(invoice.created_at, 'dd/MM/yyyy HH:mm')}
                                    </p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[invoice.status]}`}>
                                    {statusLabels[invoice.status]}
                                </span>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="font-semibold">{invoice.customer_name || 'Khách lẻ'}</p>
                                    {invoice.customer_phone && (
                                        <p className="text-sm text-muted-foreground">📞 {invoice.customer_phone}</p>
                                    )}
                                    {invoice.customer_address && (
                                        <p className="text-sm text-muted-foreground">📍 {invoice.customer_address}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-primary">{formatCurrency(invoice.total)}</p>
                                    <p className="text-sm text-muted-foreground">Tạm tính: {formatCurrency(invoice.subtotal)}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownload(invoice.id, 'pdf')}
                                        disabled={!!downloading && downloading.id === invoice.id}
                                    >
                                        {downloading?.id === invoice.id && downloading.type === 'pdf' ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <FileDown className="mr-2 h-4 w-4" />
                                        )}
                                        PDF
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownload(invoice.id, 'excel')}
                                        disabled={!!downloading && downloading.id === invoice.id}
                                    >
                                        {downloading?.id === invoice.id && downloading.type === 'excel' ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        )}
                                        Excel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
