import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useInvoices, useUpdateInvoiceStatus } from '@/hooks/useInvoices'
import { useDebounce } from '@/hooks/useDebounce'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { formatCurrency, formatDate } from '@/lib/utils'
import { invoiceService } from '@/services/invoices'
import { FileDown, FileSpreadsheet, Loader2, Search, X, Eye, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Invoice } from '@/types'
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog'
import { SearchHighlight } from '@/components/shared/SearchHighlight'
import { CreateInvoiceDialog } from '@/components/invoices/CreateInvoiceDialog'
import { RecordPaymentDialog } from '@/components/payments/RecordPaymentDialog'

const statusStyles: Record<Invoice['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
    processing: 'bg-blue-100 text-blue-800',
}

export function InvoicesPage() {
    const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [startDate, setStartDate] = useState<string>('') // applied filter
    const [endDate, setEndDate] = useState<string>('') // applied filter
    const debouncedSearch = useDebounce(searchQuery.trim(), 300)

    const {
        data: invoicePages,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInvoices(
        statusFilter === 'all' ? undefined : statusFilter,
        debouncedSearch || undefined,
        startDate || undefined,
        endDate || undefined
    )
    const [downloading, setDownloading] = useState<{ id: number; type: 'pdf' | 'excel' } | null>(null)
    const updateStatusMutation = useUpdateInvoiceStatus()
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
    const queryClient = useQueryClient()
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const [paymentCustomerId, setPaymentCustomerId] = useState<number | null>(null)

    const filteredInvoices = useMemo(
        () => invoicePages?.pages.flatMap((page) => page.items) ?? [],
        [invoicePages]
    )
    const totalInvoices = invoicePages?.pages?.[0]?.total ?? 0
    const isEmpty = !isLoading && filteredInvoices.length === 0
    const isInitialLoading = isLoading && filteredInvoices.length === 0
    const loadMoreRef = useInfiniteScroll({
        hasMore: Boolean(hasNextPage),
        isLoading: isFetchingNextPage,
        onLoadMore: () => fetchNextPage(),
    })

    const clearDateFilters = () => {
        setStartDate('')
        setEndDate('')
    }

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

            // Invalidate queries to refresh invoice data with updated exported_at
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
        } catch (error: any) {
            console.error('Failed to download invoice:', error)
            // Show user-friendly error message
            if (error.response?.status === 400) {
                alert(error.response?.data?.detail || 'Không thể xuất hóa đơn này')
            } else {
                alert('Đã xảy ra lỗi khi tải xuống hóa đơn')
            }
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
                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                    <div className="relative flex-1 min-w-[260px] max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="🔍 Tìm theo mã HĐ, tên KH, SĐT (hỗ trợ không dấu)"
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
                                <SelectItem value="processing">Chờ xử lý</SelectItem>
                                <SelectItem value="paid">Đã thanh toán</SelectItem>
                                <SelectItem value="cancelled">Đã hủy</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Khoảng ngày:</span>
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9 w-[140px] bg-white"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-9 w-[140px] bg-white"
                            />
                        </div>
                        {(startDate || endDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearDateFilters}
                                className="h-9 px-2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="mr-1 h-3 w-3" />
                                Xóa
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {isInitialLoading ? (
                <div className="text-muted-foreground">Đang tải...</div>
            ) : isEmpty ? (
                <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
                    Chưa có hóa đơn nào
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Tổng: {totalInvoices || filteredInvoices.length} hóa đơn • Đang hiển thị {filteredInvoices.length}
                    </p>
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
                                    <CardTitle className="text-lg">
                                        <SearchHighlight text={invoice.invoice_number} query={searchQuery} />
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDate(invoice.created_at, 'dd/MM/yyyy HH:mm')}
                                    </p>
                                </div>
                                <Select
                                    value={invoice.status}
                                    onValueChange={(newStatus: Invoice['status']) => handleStatusUpdate(invoice.id, newStatus)}
                                    disabled={updateStatusMutation.isPending || ['paid', 'cancelled', 'processing'].includes(invoice.status)}
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
                                        <SelectItem value="processing" disabled>Chờ xử lý</SelectItem>
                                        <SelectItem value="pending">Chưa thanh toán</SelectItem>
                                        <SelectItem value="paid">Đã thanh toán</SelectItem>
                                        <SelectItem
                                            value="cancelled"
                                            disabled={invoice.paid_amount > 0}
                                            title={invoice.paid_amount > 0 ? 'Không thể hủy hóa đơn đã thanh toán. Vui lòng dùng tính năng Hoàn trả.' : undefined}
                                        >
                                            Đã hủy
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="font-semibold">
                                        <SearchHighlight text={invoice.customer_name || 'Khách lẻ'} query={searchQuery} />
                                    </p>
                                    {invoice.customer_phone && (
                                        <p className="text-sm text-muted-foreground">
                                            📞 <SearchHighlight text={invoice.customer_phone} query={searchQuery} />
                                        </p>
                                    )}
                                    {invoice.customer_address && (
                                        <p className="text-sm text-muted-foreground">📍 {invoice.customer_address}</p>
                                    )}
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-lg font-bold text-primary">{formatCurrency(invoice.total)}</p>
                                    <p className="text-sm text-muted-foreground">Tạm tính: {formatCurrency(invoice.subtotal)}</p>

                                    {/* Payment status display */}
                                    {invoice.paid_amount > 0 && (
                                        <>
                                            <p className="text-sm text-emerald-600">
                                                Đã trả: {formatCurrency(invoice.paid_amount)}
                                            </p>
                                            {invoice.remaining_amount > 0 && (
                                                <p className="text-sm font-semibold text-amber-600">
                                                    Còn nợ: {formatCurrency(invoice.remaining_amount)}
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {/* Payment status badge */}
                                    <div className="flex gap-1 justify-end flex-wrap">
                                        {invoice.payment_status === 'partial' && (
                                            <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                                Đã trả một phần
                                            </span>
                                        )}
                                        {invoice.has_returns && (
                                            <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 border border-red-300">
                                                Đã hoàn trả
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingInvoice(invoice)
                                        }}
                                        disabled={
                                            ['paid', 'cancelled'].includes(invoice.status) ||
                                            invoice.paid_amount > 0 ||
                                            invoice.exported_at !== null && invoice.exported_at !== undefined
                                        }
                                        title={
                                            invoice.exported_at
                                                ? `Không thể sửa hóa đơn đã xuất file (${formatDate(invoice.exported_at, 'dd/MM/yyyy HH:mm')})`
                                                : invoice.paid_amount > 0
                                                    ? 'Không thể sửa hóa đơn đã có thanh toán. Sử dụng tính năng Hoàn trả nếu cần điều chỉnh.'
                                                    : ['paid', 'cancelled'].includes(invoice.status)
                                                        ? 'Chỉ chỉnh sửa hóa đơn chờ thanh toán hoặc chờ xử lý'
                                                        : ''
                                        }
                                    >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Sửa
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDownload(invoice.id, 'pdf')
                                        }}
                                        disabled={!['pending', 'paid'].includes(invoice.status) || (!!downloading && downloading.id === invoice.id)}
                                        title={!['pending', 'paid'].includes(invoice.status) ? 'Chỉ có thể xuất hóa đơn chờ thanh toán hoặc đã thanh toán' : ''}
                                    >
                                        {downloading?.id === invoice.id && downloading.type === 'pdf' ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <FileDown className="mr-2 h-4 w-4" />
                                        )}
                                        PDF
                                    </Button>
                                    {invoice.remaining_amount > 0 && invoice.customer_id && invoice.status !== 'cancelled' && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setPaymentCustomerId(invoice.customer_id!)
                                                setPaymentDialogOpen(true)
                                            }}
                                        >
                                            Thu nợ
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDownload(invoice.id, 'excel')
                                        }}
                                        disabled={!['pending', 'paid'].includes(invoice.status) || (!!downloading && downloading.id === invoice.id)}
                                        title={!['pending', 'paid'].includes(invoice.status) ? 'Chỉ có thể xuất hóa đơn chờ thanh toán hoặc đã thanh toán' : ''}
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
                    {(hasNextPage || isFetchingNextPage) && (
                        <div
                            ref={loadMoreRef}
                            className="py-4 text-center text-sm text-muted-foreground"
                        >
                            {isFetchingNextPage ? 'Đang tải thêm...' : 'Kéo xuống để xem thêm hóa đơn'}
                        </div>
                    )}
                </div>
            )}

            <InvoiceDetailsDialog
                invoice={selectedInvoice}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />

            <RecordPaymentDialog
                open={paymentDialogOpen}
                onOpenChange={(open) => {
                    setPaymentDialogOpen(open)
                    if (!open) {
                        setPaymentCustomerId(null)
                    }
                }}
                customerId={paymentCustomerId || 0}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['invoices'] })
                }}
            />

            <CreateInvoiceDialog
                open={!!editingInvoice}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingInvoice(null)
                    }
                }}
                mode="edit"
                invoiceToEdit={editingInvoice}
            />
        </div>
    )
}
