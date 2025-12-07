import { useState, Fragment } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Payment } from '@/types/payment'

const paymentMethodMap: Record<string, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  card: 'Thẻ',
}

interface PaymentHistoryTableProps {
  payments: Payment[]
  onReverse?: (payment: Payment) => void
  showCustomer?: boolean
  isLoading?: boolean
}

export function PaymentHistoryTable({
  payments,
  onReverse,
  showCustomer = false,
  isLoading = false
}: PaymentHistoryTableProps) {
  const [expandedPaymentIds, setExpandedPaymentIds] = useState<Set<number>>(new Set())

  const toggleExpanded = (paymentId: number) => {
    const newExpanded = new Set(expandedPaymentIds)
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId)
    } else {
      newExpanded.add(paymentId)
    }
    setExpandedPaymentIds(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Đang tải lịch sử thanh toán...
      </div>
    )
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Chưa có thanh toán nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Desktop view - Table */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Mã thanh toán</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead>Phương thức</TableHead>
              {showCustomer && <TableHead>Khách hàng</TableHead>}
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const isExpanded = expandedPaymentIds.has(payment.id)
              const hasAllocations = payment.allocations && payment.allocations.length > 0

              const isReversed = payment.notes?.includes('[ĐÃ HỦY]')

              return (
                <Fragment key={payment.id}>
                  {/* Main payment row */}
                  <TableRow className={`group ${isReversed ? 'bg-muted/30' : ''}`}>
                    <TableCell>
                      {hasAllocations && (
                        <button
                          onClick={() => toggleExpanded(payment.id)}
                          className="p-1 hover:bg-muted rounded"
                          aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {payment.payment_number}
                        {isReversed && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                            Đã hoàn trả
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(payment.payment_date, 'dd/MM/yyyy')}</TableCell>
                    <TableCell className={`text-right font-medium ${isReversed ? 'text-muted-foreground line-through' : 'text-emerald-600'}`}>
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{paymentMethodMap[payment.payment_method] || payment.payment_method}</TableCell>
                    {showCustomer && <TableCell>{payment.customer_name}</TableCell>}
                    <TableCell className="text-right">
                      {onReverse && !isReversed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReverse(payment)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Hoàn trả
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded allocations row */}
                  {isExpanded && hasAllocations && (
                    <TableRow>
                      <TableCell colSpan={showCustomer ? 7 : 6} className="bg-muted/30 p-0">
                        <div className="px-12 py-3 space-y-1">
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Phân bổ thanh toán:
                          </p>
                          {payment.allocations.map((allocation) => (
                            <div
                              key={allocation.id}
                              className="flex items-center justify-between text-sm py-1 border-l-2 border-primary/50 pl-3"
                            >
                              <span className="text-muted-foreground">
                                → {allocation.invoice_number}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(allocation.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view - Cards */}
      <div className="md:hidden space-y-3">
        {payments.map((payment) => {
          const isExpanded = expandedPaymentIds.has(payment.id)
          const hasAllocations = payment.allocations && payment.allocations.length > 0

          return (
            <div
              key={payment.id}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              {/* Payment header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{payment.payment_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(payment.payment_date, 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {paymentMethodMap[payment.payment_method]}
                  </p>
                </div>
              </div>

              {/* Customer info (if showCustomer) */}
              {showCustomer && (
                <div className="pt-2 border-t">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Khách hàng: </span>
                    {payment.customer_name}
                  </p>
                </div>
              )}

              {/* Allocations toggle */}
              {hasAllocations && (
                <div className="pt-2 border-t">
                  <button
                    onClick={() => toggleExpanded(payment.id)}
                    className="flex items-center gap-2 text-sm font-medium w-full hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Phân bổ ({payment.allocations.length} hóa đơn)
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 pl-6">
                      {payment.allocations.map((allocation) => (
                        <div
                          key={allocation.id}
                          className="flex items-center justify-between text-sm border-l-2 border-primary/50 pl-3 py-1"
                        >
                          <span className="text-muted-foreground">
                            {allocation.invoice_number}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(allocation.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {onReverse && (
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReverse(payment)}
                    className="w-full"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Hoàn trả thanh toán
                  </Button>
                </div>
              )}

              {/* Notes */}
              {payment.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Ghi chú: </span>
                    {payment.notes}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
