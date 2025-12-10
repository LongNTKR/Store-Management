import { useState, useMemo } from 'react'
import { Download, FileText, Loader2, AlertCircle, Filter, X, CornerDownRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { paymentService } from '@/services/payments'
import { invoiceService } from '@/services/invoices'
import { debtReportService } from '@/services/debtReports'
import { PaymentHistoryTable } from '@/components/payments/PaymentHistoryTable'
import { ReversePaymentDialog } from '@/components/payments/ReversePaymentDialog'
import { AgingAnalysis } from '@/components/debt/AgingAnalysis'
import { InvoiceDetailsDialog } from '@/components/invoices/InvoiceDetailsDialog'
import { toast } from 'sonner'
import type { Payment } from '@/types/payment'
import type { Invoice } from '@/types'

interface CustomerDebtDetailDialogProps {
  customerId: number | null
  customerName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDebtDetailDialog({
  customerId,
  customerName,
  open,
  onOpenChange
}: CustomerDebtDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [reversePayment, setReversePayment] = useState<Payment | null>(null)
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)


  // Fetch debt summary
  const { data: debtSummary, isLoading: isLoadingDebt } = useQuery({
    queryKey: ['customer-debt-detail', customerId],
    queryFn: () => paymentService.getCustomerDebt(customerId!),
    enabled: open && !!customerId
  })

  // Fetch payment history
  const { data: paymentsResponse, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['customer-payment-history', customerId],
    queryFn: () => paymentService.searchPayments({ customer_id: customerId! }),
    enabled: open && !!customerId
  })

  const payments = paymentsResponse || []

  const handleReversePayment = (payment: Payment) => {
    setReversePayment(payment)
    setReverseDialogOpen(true)
  }

  const handleExportPdf = async () => {
    if (!customerId) return

    try {
      setExporting('pdf')
      const blob = await debtReportService.downloadDebtPdf(customerId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Cong-no-${customerName?.replace(/\s+/g, '-') || customerId}-${formatDate(new Date(), 'yyyyMMdd')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Đã xuất báo cáo PDF thành công')
    } catch (error: any) {
      console.error('Error exporting PDF:', error)
      toast.error(error?.response?.data?.detail || 'Không thể xuất báo cáo PDF')
    } finally {
      setExporting(null)
    }
  }

  const handleExportExcel = async () => {
    if (!customerId) return

    try {
      setExporting('excel')
      const blob = await debtReportService.downloadDebtExcel(customerId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Cong-no-${customerName?.replace(/\s+/g, '-') || customerId}-${formatDate(new Date(), 'yyyyMMdd')}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Đã xuất báo cáo Excel thành công')
    } catch (error: any) {
      console.error('Error exporting Excel:', error)
      toast.error(error?.response?.data?.detail || 'Không thể xuất báo cáo Excel')
    } finally {
      setExporting(null)
    }
  }

  if (!customerId) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Công nợ khách hàng: {customerName || `ID ${customerId}`}
            </DialogTitle>
            <DialogDescription>
              Xem chi tiết công nợ, hóa đơn, lịch sử thanh toán và phân tích tuổi nợ
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="invoices">Hóa đơn</TabsTrigger>
              <TabsTrigger value="payments">Lịch sử TT</TabsTrigger>
              <TabsTrigger value="aging">Phân tích tuổi nợ</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 py-4 h-[550px] overflow-y-auto">
              {isLoadingDebt ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : debtSummary ? (
                <>
                  {/* Enhanced Debt Summary Container */}
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    {/* Row 1: Secondary Metrics (Text-based summary) */}
                    <div className="grid grid-cols-3 gap-6 pb-4 border-b">
                      {/* Total Revenue (Original) */}
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Tổng tiền hàng (gốc)</p>
                        <p className="text-xl font-semibold text-blue-600">
                          {formatCurrency(debtSummary.total_revenue)}
                        </p>
                      </div>

                      {/* Unpaid Invoices */}
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Hóa đơn chưa thanh toán đủ</p>
                        <p className="text-xl font-semibold">
                          {debtSummary.total_invoices}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {debtSummary.unpaid_invoices} chưa TT • {debtSummary.partially_paid_invoices} TT một phần
                        </p>
                      </div>

                      {/* Overdue */}
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Quá hạn (&gt;30 ngày)</p>
                        <div className="flex items-end gap-2">
                          <p className="text-xl font-semibold text-red-600">
                            {formatCurrency(debtSummary.overdue_debt)}
                          </p>
                          {debtSummary.overdue_invoices > 0 && (
                            <div className="flex items-center gap-1 text-xs text-red-600 mb-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>{debtSummary.overdue_invoices} hóa đơn</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Primary Metrics (Highlighted Cards) */}
                    <div className="grid grid-cols-3 gap-6">
                      {/* Net Revenue */}
                      <div className="rounded-lg border-2 border-purple-300 bg-background p-4 shadow-sm space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">💎 Doanh thu thực tế</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(debtSummary.total_net_revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Doanh thu sau khi trừ hoàn trả
                        </p>
                      </div>

                      {/* Total Debt */}
                      <div className={`rounded-lg border-2 ${debtSummary.total_debt > 0 ? 'border-amber-300' : 'border-emerald-300'} bg-background p-4 shadow-sm space-y-2`}>
                        <p className="text-sm font-medium text-muted-foreground">📊 Tổng nợ hiện tại</p>
                        <p className={`text-2xl font-bold ${debtSummary.total_debt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {formatCurrency(debtSummary.total_debt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {debtSummary.total_debt > 0 ? 'Còn phải thu' : '✓ Không có nợ'}
                        </p>
                      </div>

                      {/* Total Refunded */}
                      <div className="rounded-lg border-2 border-red-300 bg-background p-4 shadow-sm space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">💸 Tiền đã hoàn</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(debtSummary.total_refunded)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Hoàn trả + Trả hàng
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Export buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleExportPdf}
                      disabled={exporting !== null}
                    >
                      {exporting === 'pdf' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang xuất...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Xuất PDF
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportExcel}
                      disabled={exporting !== null}
                    >
                      {exporting === 'excel' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang xuất...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Xuất Excel
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Quick summary of recent invoices */}
                  {debtSummary.invoices && debtSummary.invoices.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Hóa đơn mới nhất:</h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Số hóa đơn</TableHead>
                              <TableHead>Ngày</TableHead>
                              <TableHead className="text-right">Tổng tiền</TableHead>
                              <TableHead className="text-right">Còn lại</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {debtSummary.invoices.slice(0, 5).map((invoice) => (
                              <TableRow key={invoice.id}>
                                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                                <TableCell>{formatDate(invoice.created_at, 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                                <TableCell className="text-right font-semibold text-amber-600">
                                  {formatCurrency(invoice.remaining_amount || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {debtSummary.invoices.length > 5 && (
                        <p className="text-xs text-center text-muted-foreground">
                          Và {debtSummary.invoices.length - 5} hóa đơn khác. Xem tab "Hóa đơn" để biết chi tiết.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Không có dữ liệu công nợ
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Invoices */}
            <TabsContent value="invoices" className="space-y-4 py-4 h-[550px]">
              <InvoiceTabContent customerId={customerId} />
            </TabsContent>

            {/* Tab 3: Payment History */}
            <TabsContent value="payments" className="space-y-4 py-4 h-[550px] overflow-y-auto">
              <PaymentHistoryTable
                payments={payments}
                onReverse={handleReversePayment}
                isLoading={isLoadingPayments}
              />
            </TabsContent>

            {/* Tab 4: Aging Analysis */}
            <TabsContent value="aging" className="space-y-4 py-4 h-[550px] overflow-y-auto">
              <AgingAnalysis customerId={customerId} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Reverse Payment Dialog */}
      <ReversePaymentDialog
        payment={reversePayment}
        open={reverseDialogOpen}
        onOpenChange={setReverseDialogOpen}
        onSuccess={() => {
          setReversePayment(null)
        }}
      />
    </>
  )
}

function InvoiceTabContent({ customerId }: { customerId: number }) {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceDetailsOpen, setInvoiceDetailsOpen] = useState(false)

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setInvoiceDetailsOpen(true)
  }

  const { data: invoicesResponse, isLoading } = useQuery({
    queryKey: ['customer-invoices', customerId, startDate, endDate, selectedStatuses],
    queryFn: () => invoiceService.list({
      customerId,
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: 100 // Load more for detail view
    }),
    enabled: !!customerId
  })

  const { data: returns, isLoading: isLoadingReturns } = useQuery({
    queryKey: ['customer-returns', customerId],
    queryFn: () => invoiceService.getReturnsByCustomer(customerId),
    enabled: !!customerId
  })

  const invoicesList = invoicesResponse?.items || []
  const returnsList = returns || []

  // Group returns by invoice_id
  const { returnsByInvoiceId, orphanReturns } = useMemo(() => {
    const groups: Record<number, typeof returnsList> = {}
    const invoiceIds = new Set(invoicesList.map(i => i.id))
    const orphans: typeof returnsList = []

    returnsList.forEach(ret => {
      // If the parent invoice is in the current visible list, group it
      if (invoiceIds.has(ret.invoice_id)) {
        if (!groups[ret.invoice_id]) groups[ret.invoice_id] = []
        groups[ret.invoice_id].push(ret)
      } else {
        // Otherwise treat as independent row (orphan)
        orphans.push(ret)
      }
    })
    return { returnsByInvoiceId: groups, orphanReturns: orphans }
  }, [invoicesList, returnsList])

  // Combine invoices and orphan returns for the main list
  const displayList = useMemo(() => {
    return [
      ...invoicesList.map(inv => ({ ...inv, type: 'invoice' as const, date: new Date(inv.created_at) })),
      ...orphanReturns.map(ret => ({ ...ret, type: 'return' as const, date: new Date(ret.created_at) }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [invoicesList, orphanReturns])

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  const statusOptions = [
    { value: 'processing', label: 'Chờ xử lý', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { value: 'pending', label: 'Chờ thanh toán', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    { value: 'paid', label: 'Đã thanh toán', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { value: 'cancelled', label: 'Đã hủy', color: 'bg-red-100 text-red-800 border-red-200' },
  ]

  // Render return row helper
  const renderReturnRow = (item: any, isNested: boolean = false) => (
    <TableRow key={`return-${item.id}`} className={isNested ? "bg-red-50/20" : "bg-red-50/30"}>
      <TableCell className="font-medium">
        <div className={`flex items-center gap-2 ${isNested ? "pl-8" : ""}`}>
          {isNested && <CornerDownRight className="h-4 w-4 text-slate-400" />}
          {item.return_number}
        </div>
      </TableCell>
      <TableCell>{formatDate(item.created_at, 'dd/MM/yyyy')}</TableCell>
      <TableCell className="text-right text-red-600 font-medium">
        -{formatCurrency(item.refund_amount)}
      </TableCell>
      <TableCell className="text-right text-red-600">
        {item.status === 'refunded' ? `-${formatCurrency(item.refund_amount)}` : '-'}
      </TableCell>
      <TableCell className="text-right text-slate-400">
        -
      </TableCell>
      <TableCell className="text-right text-slate-400">
        -
      </TableCell>
      <TableCell>
        {item.status === 'refunded' ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
            Đã hoàn tiền
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
            Chưa hoàn tiền
          </span>
        )}
      </TableCell>
      <TableCell>
        {('exported_at' in item && item.exported_at) ? (
          <span className="text-xs text-emerald-600" title={formatDate(item.exported_at as string, 'dd/MM/yyyy HH:mm')}>
            ✓ Đã xuất
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
            Chưa xuất
          </span>
        )}
      </TableCell>
    </TableRow>
  )

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-md border p-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Bộ lọc:</span>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 w-[140px] bg-white"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 w-[140px] bg-white"
          />
        </div>

        <div className="h-4 w-px bg-slate-200 mx-2" />

        <div className="flex flex-wrap gap-2">
          {statusOptions.map(option => {
            const isSelected = selectedStatuses.includes(option.value)
            return (
              <Badge
                key={option.value}
                variant="outline"
                className={`cursor-pointer transition-all hover:opacity-80 ${isSelected
                  ? option.color + ' ring-2 ring-offset-1 ring-slate-300'
                  : 'opacity-50 grayscale bg-white'
                  }`}
                onClick={() => toggleStatus(option.value)}
              >
                {option.label}
              </Badge>
            )
          })}
        </div>

        {(startDate || endDate || selectedStatuses.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate('')
              setEndDate('')
              setSelectedStatuses([])
            }}
            className="h-8 px-2 ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {isLoading || isLoadingReturns ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : displayList.length > 0 ? (
        <div className="rounded-md border flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
              <TableRow>
                <TableHead>Số phiếu</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead className="text-right">Đã TT/hoàn</TableHead>
                <TableHead className="text-right">Còn lại</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Trạng thái xuất</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayList.map((item) => {
                if (item.type === 'return') {
                  // Render Orphan Return Row
                  return renderReturnRow(item, false)
                }

                // Render Invoice Row
                const invoice = item as Invoice
                const childrenReturns = returnsByInvoiceId[invoice.id]

                // CHECK UNRESOLVED STATE
                // 1. Invoice is not fully processed (not paid and not cancelled)
                // 2. OR Invoice has pending returns (not refunded)
                const isInvoiceIncomplete = invoice.status !== 'paid' && invoice.status !== 'cancelled'
                const hasPendingReturns = childrenReturns && childrenReturns.some(r => r.status !== 'refunded')
                const isUnresolved = isInvoiceIncomplete || hasPendingReturns

                // Determine warning message
                let warningMessage = ''
                if (isInvoiceIncomplete) warningMessage = 'Hóa đơn chưa hoàn tất thanh toán'
                else if (hasPendingReturns) warningMessage = 'Có yêu cầu hoàn trả chưa xử lý xong'

                return (
                  <>
                    <TableRow
                      key={`invoice-${invoice.id}`}
                      className={`cursor-pointer transition-colors ${isUnresolved ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-muted/50'}`}
                      onClick={() => handleInvoiceClick(invoice)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {invoice.invoice_number}
                          {isUnresolved && (
                            <span className="relative inline-flex items-center">
                              <span className="group relative cursor-help rounded-full border border-dashed border-amber-400 p-0.5">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                                <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                                  {warningMessage}
                                </span>
                              </span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.created_at, 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {formatCurrency(invoice.paid_amount || 0)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-600">
                        {formatCurrency(invoice.remaining_amount || 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-600">
                        {formatCurrency(invoice.net_amount !== undefined ? invoice.net_amount : (invoice.total - (invoice.total_returned_amount || 0)))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {invoice.status === 'paid' ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
                              Đã thanh toán
                            </span>
                          ) : invoice.status === 'processing' ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                              Đang xử lý
                            </span>
                          ) : invoice.status === 'cancelled' ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                              Đã hủy
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                              Chờ thanh toán
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.exported_at ? (
                          <span className="text-xs text-emerald-600" title={formatDate(invoice.exported_at, 'dd/MM/yyyy HH:mm')}>
                            ✓ Đã xuất
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                            Chưa xuất
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                    {/* Render Children Returns */}
                    {childrenReturns && childrenReturns.map(ret => renderReturnRow(ret, true))}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground font-medium">Không tìm thấy hóa đơn nào</p>
          <p className="text-xs text-muted-foreground mt-1">
            Thử thay đổi bộ lọc hoặc chọn khoảng thời gian khác
          </p>
        </div>
      )}

      {/* Invoice Details Dialog */}
      <InvoiceDetailsDialog
        invoice={selectedInvoice}
        open={invoiceDetailsOpen}
        onOpenChange={setInvoiceDetailsOpen}
      />
    </div>
  )
}
