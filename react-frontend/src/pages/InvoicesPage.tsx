import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useInvoices, useUpdateInvoiceStatus } from '@/hooks/useInvoices'
import { useDebounce } from '@/hooks/useDebounce'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { formatCurrency, formatDate } from '@/lib/utils'
import { invoiceService } from '@/services/invoices'
import { FileDown, FileSpreadsheet, Loader2, Search, X, Eye, Pencil, CalendarRange } from 'lucide-react'
import type { Invoice } from '@/types'
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog'
import { SearchHighlight } from '@/components/shared/SearchHighlight'
import { CreateInvoiceDialog } from '@/components/invoices/CreateInvoiceDialog'

const statusStyles: Record<Invoice['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-gray-200 text-gray-700',
    processing: 'bg-blue-100 text-blue-800',
}

export function InvoicesPage() {
    const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [startDate, setStartDate] = useState<string>('') // applied filter
    const [endDate, setEndDate] = useState<string>('') // applied filter
    const [pendingStartDate, setPendingStartDate] = useState<string>('')
    const [pendingEndDate, setPendingEndDate] = useState<string>('')
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const yearOptions = useMemo(() => {
        const current = new Date().getFullYear()
        return Array.from({ length: 11 }, (_, i) => current - 5 + i)
    }, [])
    const [datePickerOpen, setDatePickerOpen] = useState<boolean>(false)
    const datePickerRef = useRef<HTMLDivElement | null>(null)
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
        setPendingStartDate('')
        setPendingEndDate('')
    }

    // Close date picker on outside click or ESC
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setDatePickerOpen(false)
            }
        }
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setDatePickerOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEsc)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [])

    const dateRangeLabel = useMemo(() => {
        if (!startDate && !endDate) return 'Chọn khoảng ngày'
        if (startDate && endDate) {
            return `${formatDate(startDate)} - ${formatDate(endDate)}`
        }
        if (startDate) return `Từ ${formatDate(startDate)}`
        return `Đến ${formatDate(endDate as string)}`
    }, [startDate, endDate])

    // Sync pending range with applied range when opening picker
    useEffect(() => {
        if (datePickerOpen) {
            setPendingStartDate(startDate)
            setPendingEndDate(endDate)
            const base = startDate ? new Date(startDate) : endDate ? new Date(endDate) : new Date()
            setCurrentMonth(new Date(base.getFullYear(), base.getMonth(), 1))
        }
    }, [datePickerOpen, startDate, endDate])

    const isSameDay = (a?: string, b?: string) => {
        if (!a || !b) return false
        return a === b
    }

    const isInPendingRange = (dateStr: string) => {
        if (!pendingStartDate || !pendingEndDate) return false
        return pendingStartDate <= dateStr && dateStr <= pendingEndDate
    }

    const handleDaySelect = (dateStr: string) => {
        if (!pendingStartDate || (pendingStartDate && pendingEndDate)) {
            setPendingStartDate(dateStr)
            setPendingEndDate('')
            return
        }

        if (dateStr < pendingStartDate) {
            setPendingEndDate(pendingStartDate)
            setPendingStartDate(dateStr)
            return
        }

        setPendingEndDate(dateStr)
    }

    const handleApplyDate = () => {
        setStartDate(pendingStartDate)
        setEndDate(pendingEndDate)
        setDatePickerOpen(false)
    }

    const handleMonthChange = (delta: number) => {
        setCurrentMonth((prev) => {
            const next = new Date(prev)
            next.setMonth(prev.getMonth() + delta)
            return next
        })
    }

    const handleMonthSelect = (monthIndex: number) => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), monthIndex, 1))
    }

    const handleYearSelect = (year: number) => {
        setCurrentMonth((prev) => new Date(year, prev.getMonth(), 1))
    }

    const toDateKey = (date: Date) => {
        const y = date.getFullYear()
        const m = `${date.getMonth() + 1}`.padStart(2, '0')
        const d = `${date.getDate()}`.padStart(2, '0')
        return `${y}-${m}-${d}`
    }

    const renderCalendarDays = () => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const startWeekday = firstDay.getDay() // 0 = Sunday
        const daysInMonth = new Date(year, month + 1, 0).getDate()

        const cells: ReactNode[] = []
        // leading blanks
        for (let i = 0; i < startWeekday; i++) {
            cells.push(<div key={`blank-${i}`} className="h-9" />)
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = toDateKey(new Date(year, month, day))
            const selectedStart = isSameDay(pendingStartDate, dateStr)
            const selectedEnd = isSameDay(pendingEndDate, dateStr)
            const inRange = isInPendingRange(dateStr)

            const baseClasses = "h-9 w-9 rounded-md text-sm flex items-center justify-center cursor-pointer transition"
            let stateClasses = "hover:bg-primary/10"
            if (selectedStart || selectedEnd) {
                stateClasses = "bg-primary text-primary-foreground hover:bg-primary"
            } else if (inRange) {
                stateClasses = "bg-primary/10 text-primary hover:bg-primary/20"
            }

            cells.push(
                <button
                    key={day}
                    className={`${baseClasses} ${stateClasses}`}
                    onClick={() => handleDaySelect(dateStr)}
                >
                    {day}
                </button>
            )
        }

        return cells
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

                    <div className="relative flex items-center gap-3" ref={datePickerRef}>
                        <span className="text-sm text-muted-foreground">Khoảng ngày:</span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="min-w-[220px] justify-between gap-2"
                            onClick={() => setDatePickerOpen((prev) => !prev)}
                        >
                            <span className="flex items-center gap-2 text-sm">
                                <CalendarRange className="h-4 w-4" />
                                {dateRangeLabel}
                            </span>
                        </Button>

                        {datePickerOpen && (
                            <div
                                className="absolute left-0 top-10 z-20 w-[360px] rounded-lg border bg-background p-4 shadow-lg"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleApplyDate()
                                    }
                                }}
                                tabIndex={-1}
                            >
                                <div className="flex items-center justify-between gap-2 pb-3">
                                    <Button variant="ghost" size="icon" onClick={() => handleMonthChange(-1)}>
                                        ‹
                                    </Button>
                                    <div className="flex items-center gap-2 text-sm">
                                        <select
                                            className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none"
                                            value={currentMonth.getMonth()}
                                            onChange={(e) => handleMonthSelect(Number(e.target.value))}
                                        >
                                            {[
                                                'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                                                'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
                                            ].map((label, idx) => (
                                                <option key={idx} value={idx}>{label}</option>
                                            ))}
                                        </select>
                                        <select
                                            className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none"
                                            value={currentMonth.getFullYear()}
                                            onChange={(e) => handleYearSelect(Number(e.target.value))}
                                        >
                                            {yearOptions.map((year) => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleMonthChange(1)}>
                                        ›
                                    </Button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                                    <span>Su</span>
                                    <span>Mo</span>
                                    <span>Tu</span>
                                    <span>We</span>
                                    <span>Th</span>
                                    <span>Fr</span>
                                    <span>Sa</span>
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {renderCalendarDays()}
                                </div>
                                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                    <div>Chọn ngày bắt đầu, sau đó ngày kết thúc. Enter hoặc bấm Áp dụng để lọc.</div>
                                    <div className="text-foreground font-medium">
                                        {pendingStartDate ? `Từ ${formatDate(pendingStartDate)}` : 'Chưa chọn ngày bắt đầu'}
                                        {pendingEndDate ? ` • Đến ${formatDate(pendingEndDate)}` : ''}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            clearDateFilters()
                                            setDatePickerOpen(false)
                                        }}
                                        disabled={!startDate && !endDate && !pendingStartDate && !pendingEndDate}
                                        className="text-muted-foreground hover:text-primary"
                                    >
                                        Xóa
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleApplyDate}
                                        disabled={!pendingStartDate && !pendingEndDate}
                                    >
                                        Áp dụng
                                    </Button>
                                </div>
                            </div>
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
                                        <SelectItem value="cancelled">Đã hủy</SelectItem>
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
                                <div className="text-right">
                                    <p className="text-lg font-bold text-primary">{formatCurrency(invoice.total)}</p>
                                    <p className="text-sm text-muted-foreground">Tạm tính: {formatCurrency(invoice.subtotal)}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingInvoice(invoice)
                                        }}
                                        disabled={['paid', 'cancelled'].includes(invoice.status)}
                                        title={['paid', 'cancelled'].includes(invoice.status) ? 'Chỉ chỉnh sửa hóa đơn chờ thanh toán hoặc chờ xử lý' : ''}
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
                                        disabled={invoice.status !== 'paid' || (!!downloading && downloading.id === invoice.id)}
                                        title={invoice.status !== 'paid' ? 'Chỉ có thể xuất hóa đơn đã thanh toán' : ''}
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
                                        disabled={invoice.status !== 'paid' || (!!downloading && downloading.id === invoice.id)}
                                        title={invoice.status !== 'paid' ? 'Chỉ có thể xuất hóa đơn đã thanh toán' : ''}
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
