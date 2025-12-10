import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentService } from '@/services/payments'
import { toast } from 'sonner'
import type { Payment } from '@/types/payment'

const paymentMethodMap: Record<string, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  card: 'Thẻ',
}

interface ReversePaymentDialogProps {
  payment: Payment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReversePaymentDialog({
  payment,
  open,
  onOpenChange,
  onSuccess
}: ReversePaymentDialogProps) {
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()

  // Reset reason when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setReason('')
    }
  }, [open])

  const reverseMutation = useMutation({
    mutationFn: (data: { paymentId: number, reason: string }) =>
      paymentService.reversePayment(data.paymentId, data.reason),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['customer-debt'] })
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] })
      queryClient.invalidateQueries({ queryKey: ['all-customer-debts'] })
      queryClient.invalidateQueries({ queryKey: ['customer-payment-history'] })
      queryClient.invalidateQueries({ queryKey: ['aging-analysis'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['customer-debt-detail'] })
      // Additional invalidations for cross-screen sync
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['statistics'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })

      toast.success('Đã hoàn trả thanh toán thành công')
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail
      toast.error(detail || 'Không thể hoàn trả thanh toán')
    }
  })

  const handleReverse = async () => {
    if (!payment) return

    if (!reason || reason.trim().length === 0) {
      toast.error('Vui lòng nhập lý do hoàn trả')
      return
    }

    if (reason.trim().length < 3) {
      toast.error('Lý do hoàn trả phải có ít nhất 3 ký tự')
      return
    }

    await reverseMutation.mutateAsync({
      paymentId: payment.id,
      reason: reason.trim()
    })
  }

  if (!payment) return null

  const hasAllocations = payment.allocations && payment.allocations.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hoàn trả thanh toán?</DialogTitle>
          <DialogDescription>
            Thao tác này sẽ hoàn trả thanh toán và cập nhật lại trạng thái công nợ của các hóa đơn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment details */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mã thanh toán:</span>
              <span className="font-medium">{payment.payment_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Số tiền:</span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(payment.amount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ngày:</span>
              <span className="font-medium">
                {formatDate(payment.payment_date, 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Phương thức:</span>
              <span className="font-medium">
                {paymentMethodMap[payment.payment_method]}
              </span>
            </div>
          </div>

          {/* Allocations to be reversed */}
          {hasAllocations && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Phân bổ sẽ bị hoàn trả:
              </p>
              <div className="space-y-1 rounded-lg border p-3">
                {payment.allocations.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span className="text-muted-foreground">
                      • {allocation.invoice_number}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(allocation.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">Lưu ý quan trọng:</p>
              <p>
                Các hóa đơn trên sẽ quay về trạng thái nợ. Số tiền đã thanh toán sẽ được trừ đi
                và công nợ sẽ được cập nhật lại.
              </p>
            </div>
          </div>

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Lý do hoàn trả <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do hoàn trả (ví dụ: Nhập nhầm số tiền, Yêu cầu của khách hàng)"
              className="w-full"
              disabled={reverseMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !reverseMutation.isPending) {
                  handleReverse()
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Lý do này sẽ được lưu vào ghi chú để đối chiếu sau này
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reverseMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleReverse}
            disabled={reverseMutation.isPending || !reason.trim()}
          >
            {reverseMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang hoàn trả...
              </>
            ) : (
              'Xác nhận hoàn trả'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
