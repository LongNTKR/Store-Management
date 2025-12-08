import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { paymentService } from '@/services/payments'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaymentCreate } from '@/types/payment'
import { formatCurrency } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: number
  onSuccess?: () => void
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  customerId,
  onSuccess
}: RecordPaymentDialogProps) {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash')
  const [manualAllocations, setManualAllocations] = useState<Record<number, number>>({})

  const queryClient = useQueryClient()
  const parsedAmount = parseFloat(amount) || 0

  useEffect(() => {
    if (!open) {
      setManualAllocations({})
      setMode('auto')
      setAmount('')
    }
  }, [open, customerId])

  const { data: debtSummary, isLoading } = useQuery({
    queryKey: ['customer-debt', customerId],
    queryFn: () => paymentService.getCustomerDebt(customerId),
    enabled: open && customerId > 0
  })

  const outstandingInvoices = useMemo(() => {
    return (debtSummary?.invoices || []).filter(invoice =>
      invoice.status !== 'processing' && !!invoice.exported_at
    )
  }, [debtSummary])

  const allocationPreview = useMemo(() => {
    if (mode === 'manual') return manualAllocations

    let remaining = parsedAmount
    const allocations: Record<number, number> = {}

    for (const invoice of outstandingInvoices) {
      const invoiceRemaining = invoice.remaining_amount ?? 0
      if (remaining <= 0 || invoiceRemaining <= 0) break
      const allocAmount = Math.min(remaining, invoiceRemaining)
      if (allocAmount > 0) {
        allocations[invoice.id] = allocAmount
      }
      remaining -= allocAmount
    }

    return allocations
  }, [mode, parsedAmount, outstandingInvoices, manualAllocations])

  const totalManual = useMemo(
    () => Object.values(manualAllocations).reduce((sum, value) => sum + (value || 0), 0),
    [manualAllocations]
  )

  const isAllocationMatch = mode === 'manual' && parsedAmount > 0 ? Math.abs(totalManual - parsedAmount) < 1 : true

  const recordPaymentMutation = useMutation({
    mutationFn: (data: PaymentCreate) => paymentService.recordPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-debt'] })
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['customer-debt-detail'] })
      queryClient.invalidateQueries({ queryKey: ['all-customer-debts'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] })
      queryClient.invalidateQueries({ queryKey: ['customer-payment-history'] })
      queryClient.invalidateQueries({ queryKey: ['aging-analysis'] })
      toast.success('Ghi nhận thanh toán thành công')
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail
      toast.error(detail || 'Không thể ghi nhận thanh toán')
    }
  })

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error('Chưa chọn khách hàng')
      return
    }

    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ')
      return
    }

    if (mode === 'manual' && !isAllocationMatch) {
      toast.error('Tổng phân bổ không khớp với số tiền thanh toán')
      return
    }

    const cleanedManualAllocations =
      mode === 'manual'
        ? Object.fromEntries(
          Object.entries(manualAllocations)
            .map(([invoiceId, value]) => [Number(invoiceId), value || 0])
            .filter(([, value]) => value > 0)
        )
        : undefined

    const payload: PaymentCreate = {
      customer_id: customerId,
      amount: parsedAmount,
      payment_method: paymentMethod,
      manual_allocations: cleanedManualAllocations,
      notes:
        paymentMethod === 'cash'
          ? 'Thanh toán tiền mặt'
          : paymentMethod === 'transfer'
            ? 'Chuyển khoản'
            : 'Thẻ'
    }

    await recordPaymentMutation.mutateAsync(payload)
  }

  const disableSubmit =
    parsedAmount <= 0 ||
    recordPaymentMutation.isPending ||
    outstandingInvoices.length === 0 ||
    (mode === 'manual' && !isAllocationMatch)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ghi nhận thanh toán</DialogTitle>
          <DialogDescription>
            Ghi nhận khoản thanh toán từ khách hàng và phân bổ cho các hóa đơn
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải công nợ khách hàng...
          </div>
        ) : (
          <div className="space-y-4">
            {debtSummary && (
              <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                <p className="text-lg font-bold text-amber-900">
                  Tổng nợ: {formatCurrency(debtSummary.total_debt)}
                </p>
                <p className="text-sm text-amber-700">
                  {debtSummary.total_invoices} hóa đơn chưa thanh toán đủ
                </p>
                {debtSummary.overdue_invoices > 0 && (
                  <p className="text-sm text-red-600 font-medium">
                    Có {debtSummary.overdue_invoices} hóa đơn quá hạn ({'>'}30 ngày)
                  </p>
                )}
              </div>
            )}

            {!debtSummary || outstandingInvoices.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Khách hàng không có công nợ nào.
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">Số tiền thanh toán</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (isNaN(val)) {
                        setAmount(e.target.value)
                        return
                      }

                      const maxDebt = debtSummary?.total_debt || 0
                      const clampedVal = Math.min(Math.max(0, val), maxDebt)
                      setAmount(clampedVal.toString())
                    }}
                    placeholder="Nhập số tiền"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Phương thức thanh toán</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  >
                    <option value="cash">Tiền mặt</option>
                    <option value="transfer">Chuyển khoản</option>
                    <option value="card">Thẻ</option>
                  </select>
                </div>

                <Tabs value={mode} onValueChange={(v) => setMode(v as 'auto' | 'manual')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="auto">FIFO tự động</TabsTrigger>
                    <TabsTrigger value="manual">Chọn thủ công</TabsTrigger>
                  </TabsList>

                  <TabsContent value="auto" className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Hệ thống sẽ tự động phân bổ theo thứ tự hóa đơn cũ nhất.
                    </p>

                    <div className="border rounded-md p-3">
                      <p className="font-semibold mb-2">Preview phân bổ:</p>
                      {Object.keys(allocationPreview).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nhập số tiền để xem phân bổ.</p>
                      ) : (
                        Object.entries(allocationPreview).map(([invoiceId, allocAmount]) => {
                          const invoice = outstandingInvoices.find((inv) => inv.id === Number(invoiceId))
                          return (
                            <div key={invoiceId} className="flex justify-between text-sm py-1">
                              <span>{invoice?.invoice_number}</span>
                              <span className="font-medium text-emerald-600">
                                {formatCurrency(allocAmount)}
                                {allocAmount >= (invoice?.remaining_amount || 0) && ' (đủ)'}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="manual" className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Nhập số tiền thanh toán cho từng hóa đơn.
                    </p>

                    {outstandingInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center gap-2">
                        <span className="flex-1 text-sm">{invoice.invoice_number}</span>
                        <span className="text-sm text-muted-foreground">
                          Nợ: {formatCurrency(invoice.remaining_amount || 0)}
                        </span>
                        <Input
                          type="number"
                          className="w-32"
                          value={manualAllocations[invoice.id] ?? ''}
                          onChange={(e) => {
                            let val = parseFloat(e.target.value)
                            if (isNaN(val)) val = 0

                            const maxRowDebt = invoice.remaining_amount || 0
                            // Clamp value between 0 and remaining debt
                            const clampedVal = Math.min(Math.max(0, val), maxRowDebt)

                            setManualAllocations((prev) => ({
                              ...prev,
                              [invoice.id]: clampedVal
                            }))
                          }}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    ))}

                  </TabsContent>

                  {mode === 'manual' && parsedAmount > 0 && !isAllocationMatch && (
                    <div className="mt-2 p-2 bg-red-50 text-red-600 text-sm rounded border border-red-200">
                      Tổng phân bổ: <strong>{formatCurrency(totalManual)}</strong>
                      <br />
                      {totalManual > parsedAmount
                        ? `Đang vượt quá: ${formatCurrency(totalManual - parsedAmount)}`
                        : `Còn thiếu: ${formatCurrency(parsedAmount - totalManual)}`
                      }
                    </div>
                  )}
                </Tabs>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleSubmit} disabled={disableSubmit}>
                    {recordPaymentMutation.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang lưu...
                      </span>
                    ) : (
                      'Ghi nhận thanh toán'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
