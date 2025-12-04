import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useInvoices, useUpdateInvoiceStatus } from '@/hooks/useInvoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import { invoiceService } from '@/services/invoices'
import { FileDown, FileSpreadsheet, Loader2, Search, X } from 'lucide-react'
import type { Invoice } from '@/types'
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog'
import { Eye } from 'lucide-react'

const statusStyles: Record<Invoice['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-gray-200 text-gray-700',
}

export function InvoicesPage() {
    const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const { data: invoices, isLoading } = useInvoices(
        statusFilter === 'all' ? undefined : statusFilter,
        searchQuery || undefined
    )
    const [downloading, setDownloading] = useState<{ id: number; type: 'pdf' | 'excel' } | null>(null)
    const updateStatusMutation = useUpdateInvoiceStatus()
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)

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

    const handleStatusUpdate = (invoiceId: number, newStatus: Invoice['status']) => {
        updateStatusMutation.mutate({ id: invoiceId, status: newStatus })
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="mb-4 flex items-center gap-3 text-3xl font-bold">
                    <span className="inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                        <img alt="Product Management Icon" className="h-16 w-16 object-contain drop-shadow-sm" src="/Image_3rudgh3rudgh3rud.png" />
                    </span>
                    Quản Lý Hóa Đơn
                </h1>

                {/* Search and Filter Row */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã hóa đơn, tên khách hàng, hoặc số điện thoại..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

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
                        <Card
                            key={invoice.id}
                            className="transition-all hover:shadow-md cursor-pointer hover:border-primary/50"
                            onClick={() => {
                                setSelectedInvoice(invoice)
                                setDetailsOpen(true)
                            }}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDate(invoice.created_at, 'dd/MM/yyyy HH:mm')}
                                    </p>
                                </div>
                                <Select
                                    value={invoice.status}
                                    onValueChange={(newStatus: Invoice['status']) => handleStatusUpdate(invoice.id, newStatus)}
                                    disabled={updateStatusMutation.isPending || invoice.status === 'paid' || invoice.status === 'cancelled'}
                                    onOpenChange={(open) => {
                                        // Prevent card click when interacting with select
                                        if (open) {
                                            // Optional: logic if needed when select opens
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        className={`w-48 ${statusStyles[invoice.status]}`}
                                        onClick={(e) => e.stopPropagation()} // Prevent card click
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Chưa thanh toán</SelectItem>
                                        <SelectItem value="paid">Đã thanh toán</SelectItem>
                                        <SelectItem value="cancelled">Đã hủy</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDownload(invoice.id, 'pdf')
                                        }}
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
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDownload(invoice.id, 'excel')
                                        }}
                                        disabled={!!downloading && downloading.id === invoice.id}
                                    >
                                        {downloading?.id === invoice.id && downloading.type === 'excel' ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        )}
                                        Excel
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-primary"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedInvoice(invoice)
                                            setDetailsOpen(true)
                                        }}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <InvoiceDetailsDialog
                invoice={selectedInvoice}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </div>
    )
}
