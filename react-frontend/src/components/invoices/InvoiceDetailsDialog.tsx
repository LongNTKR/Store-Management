import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Invoice } from "@/types"
import { useQuery } from "@tanstack/react-query"
import { paymentService } from "@/services/payments"
import { Loader2 } from "lucide-react"

const paymentMethodMap: Record<string, string> = {
    cash: 'Tiền mặt',
    transfer: 'Chuyển khoản',
    card: 'Thẻ',
}

interface InvoiceDetailsDialogProps {
    invoice: Invoice | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function InvoiceDetailsDialog({
    invoice,
    open,
    onOpenChange,
}: InvoiceDetailsDialogProps) {
    // Fetch payment allocations for this invoice
    const { data: paymentAllocations, isLoading: isLoadingPayments } = useQuery({
        queryKey: ['invoice-payments', invoice?.id],
        queryFn: () => paymentService.getInvoicePayments(invoice!.id),
        enabled: !!invoice?.id && open
    })

    if (!invoice) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Chi tiết hóa đơn: {invoice.invoice_number}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Chi tiết</TabsTrigger>
                        <TabsTrigger value="payments">Thanh toán</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-6 py-4">
                        {/* Customer Info */}
                        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                            <div>
                                <h3 className="font-semibold mb-2">Thông tin khách hàng</h3>
                                <div className="space-y-1 text-sm">
                                    <p><span className="text-muted-foreground">Tên:</span> {invoice.customer_name || 'Khách lẻ'}</p>
                                    {invoice.customer_phone && (
                                        <p><span className="text-muted-foreground">SĐT:</span> {invoice.customer_phone}</p>
                                    )}
                                    {invoice.customer_address && (
                                        <p><span className="text-muted-foreground">Địa chỉ:</span> {invoice.customer_address}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Thông tin đơn hàng</h3>
                                <div className="space-y-1 text-sm">
                                    <p><span className="text-muted-foreground">Ngày tạo:</span> {formatDate(invoice.created_at, 'dd/MM/yyyy HH:mm')}</p>
                                    <p><span className="text-muted-foreground">Trạng thái:</span>
                                        <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium 
                                        ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                                invoice.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                    invoice.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                            {invoice.status === 'paid' ? 'Đã thanh toán' :
                                                invoice.status === 'pending' ? 'Chưa thanh toán' :
                                                    invoice.status === 'processing' ? 'Chờ xử lý' : 'Đã hủy'}
                                        </span>
                                    </p>
                                    {invoice.payment_method && (
                                        <p><span className="text-muted-foreground">Thanh toán:</span> {paymentMethodMap[invoice.payment_method] || invoice.payment_method}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div>
                            <h3 className="font-semibold mb-3">Danh sách sản phẩm</h3>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">STT</TableHead>
                                            <TableHead>Sản phẩm</TableHead>
                                            <TableHead className="text-right">Đơn giá</TableHead>
                                            <TableHead className="text-center">SL</TableHead>
                                            <TableHead className="text-center">ĐVT</TableHead>
                                            <TableHead className="text-right">Thành tiền</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoice.items?.map((item, index) => (
                                            <TableRow key={item.id || index}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.product_price)}</TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-center">{item.unit}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="flex justify-end">
                            <div className="w-1/2 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tạm tính:</span>
                                    <span>{formatCurrency(invoice.subtotal)}</span>
                                </div>
                                {invoice.discount > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span>Giảm giá:</span>
                                        <span>-{formatCurrency(invoice.discount)}</span>
                                    </div>
                                )}
                                {invoice.tax > 0 && (
                                    <div className="flex justify-between text-sm text-amber-600">
                                        <span>Thuế:</span>
                                        <span>+{formatCurrency(invoice.tax)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                                    <span>Tổng cộng:</span>
                                    <span className="text-primary">{formatCurrency(invoice.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {invoice.notes && (
                            <div className="rounded-lg bg-muted/30 p-3 text-sm">
                                <span className="font-semibold text-muted-foreground">Ghi chú: </span>
                                {invoice.notes}
                            </div>
                        )}
                    </TabsContent>

                    {/* Tab: Payments */}
                    <TabsContent value="payments" className="space-y-4 py-4">
                        <div className="space-y-4">
                            {/* Payment summary */}
                            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div>
                                    <p className="text-sm text-muted-foreground">Tổng hóa đơn</p>
                                    <p className="text-lg font-semibold">{formatCurrency(invoice.total)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Đã thanh toán</p>
                                    <p className="text-lg font-semibold text-emerald-600">
                                        {formatCurrency(invoice.paid_amount || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Còn lại</p>
                                    <p className="text-lg font-semibold text-amber-600">
                                        {formatCurrency(invoice.remaining_amount || 0)}
                                    </p>
                                </div>
                            </div>

                            {/* Payment allocations timeline */}
                            <div className="space-y-2">
                                <h4 className="font-semibold">Lịch sử thanh toán:</h4>

                                {isLoadingPayments ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
                                    </div>
                                ) : paymentAllocations && paymentAllocations.length > 0 ? (
                                    <div className="space-y-2 border rounded-lg p-4">
                                        {paymentAllocations.map((allocation: import("@/types/payment").PaymentAllocation) => {
                                            const isRefund = allocation.amount < 0
                                            return (
                                                <div
                                                    key={allocation.id}
                                                    className={`flex items-start gap-3 p-3 border-l-2 ${isRefund ? 'border-red-500 bg-red-50' : 'border-primary/50 bg-muted/30'
                                                        } rounded-r`}
                                                >
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium">{allocation.payment_number}</span>
                                                            <span className={`font-semibold ${isRefund ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                {formatCurrency(allocation.amount)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <span>{formatDate(allocation.allocation_date, 'dd/MM/yyyy HH:mm')}</span>
                                                            {allocation.payment_method && (
                                                                <span>• {paymentMethodMap[allocation.payment_method] || allocation.payment_method}</span>
                                                            )}
                                                        </div>
                                                        {allocation.notes && (
                                                            <p className={`text-xs italic ${isRefund ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                                {allocation.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 rounded-lg border border-dashed">
                                        <p className="text-sm text-muted-foreground">
                                            Chưa có thanh toán nào cho hóa đơn này
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
