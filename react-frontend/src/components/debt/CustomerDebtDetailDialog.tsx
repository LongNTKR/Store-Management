import { useState } from 'react'
import { Download, FileText, Loader2, AlertCircle, Filter, X } from 'lucide-react'
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
import { toast } from 'sonner'
import type { Payment } from '@/types/payment'

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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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

            <TabsContent value="overview" className="space-y-4">
              {isLoadingDebt ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : debtSummary ? (
                <>
                  {/* Stats cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="rounded-lg border p-4 space-y-1">
                      <p className="text-sm text-muted-foreground">Tổng tiền hàng</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(debtSummary.total_revenue)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-4 space-y-1">
                      <p className="text-sm text-muted-foreground">Tổng nợ</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {formatCurrency(debtSummary.total_debt)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-4 space-y-1">
                      <p className="text-sm text-muted-foreground">Hóa đơn chưa thanh toán đủ</p>
                      <p className="text-2xl font-bold">
                        {debtSummary.total_invoices}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {debtSummary.unpaid_invoices} chưa TT • {debtSummary.partially_paid_invoices} TT một phần
                      </p>
                    </div>
                    <div className="rounded-lg border p-4 space-y-1">
                      <p className="text-sm text-muted-foreground">Quá hạn (&gt;30 ngày)</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(debtSummary.overdue_debt)}
                      </p>
                      {debtSummary.overdue_invoices > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          <span>{debtSummary.overdue_invoices} hóa đơn quá hạn</span>
                        </div>
                      )}
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
            <TabsContent value="invoices" className="space-y-4">
              <InvoiceTabContent customerId={customerId} />
            </TabsContent>

            {/* Tab 3: Payment History */}
            <TabsContent value="payments" className="space-y-4">
              <PaymentHistoryTable
                payments={payments}
                onReverse={handleReversePayment}
                isLoading={isLoadingPayments}
              />
            </TabsContent>

            {/* Tab 4: Aging Analysis */}
            <TabsContent value="aging" className="space-y-4">
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

  // Safe check if Response is paginated or direct array, usually it's PaginatedResponse with items
  const invoices = invoicesResponse?.items || []

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

  return (
    <div className="space-y-4">
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

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : invoices.length > 0 ? (
        <div className="rounded-md border max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
              <TableRow>
                <TableHead>Số hóa đơn</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead className="text-right">Đã thanh toán</TableHead>
                <TableHead className="text-right">Còn lại</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{formatDate(invoice.created_at, 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {formatCurrency(invoice.paid_amount || 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-amber-600">
                    {formatCurrency(invoice.remaining_amount || 0)}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
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
    </div>
  )
}
