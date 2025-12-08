import { useState } from "react"
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
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Invoice } from "@/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { paymentService } from "@/services/payments"
import { useInvoiceReturns } from "@/hooks/useInvoiceReturns"
import { CreateReturnDialog } from "./CreateReturnDialog"
import { Loader2, Package, FileText, AlertTriangle } from "lucide-react"
import { invoiceReturnService } from "@/services/invoiceReturns"
import { toast } from "sonner"

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
    const queryClient = useQueryClient()
    const [createReturnDialogOpen, setCreateReturnDialogOpen] = useState(false)
    const [downloadingReturn, setDownloadingReturn] = useState<number | null>(null)

    // Fetch payment allocations for this invoice
    const { data: paymentAllocations, isLoading: isLoadingPayments } = useQuery({
        queryKey: ['invoice-payments', invoice?.id],
        queryFn: () => paymentService.getInvoicePayments(invoice!.id),
        enabled: !!invoice?.id && open
    })

    // Fetch returns for this invoice
    const { data: invoiceReturns, isLoading: isLoadingReturns } = useInvoiceReturns(open ? invoice?.id || null : null)

    // Calculate total returned amount
    const totalReturnedAmount = invoiceReturns?.reduce((sum, ret) => sum + ret.refund_amount, 0) || 0

    // Handle PDF download
    const handleDownloadReturnPdf = async (returnId: number) => {
        setDownloadingReturn(returnId)
        try {
            const blob = await invoiceReturnService.generateReturnPdf(returnId)
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `return_${returnId}.pdf`
            link.click()
            URL.revokeObjectURL(url)
            toast.success('Đã tải phiếu hoàn trả PDF')

            // Invalidate queries to refresh return data with updated exported_at
            queryClient.invalidateQueries({ queryKey: ['invoice-returns'] })
            queryClient.invalidateQueries({ queryKey: ['customer-returns'] })
        } catch (error: any) {
            const errorMsg = error?.response?.data?.detail || 'Không thể tạo PDF'
            toast.error(errorMsg)
        } finally {
            setDownloadingReturn(null)
        }
    }

    if (!invoice) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Chi tiết hóa đơn: {invoice.invoice_number}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">Chi tiết</TabsTrigger>
                        <TabsTrigger value="payments">Thanh toán</TabsTrigger>
                        <TabsTrigger value="returns">Hoàn trả</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-6 py-4 h-[550px] overflow-y-auto">
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
                                    {invoice.exported_at ? (
                                        <p><span className="text-muted-foreground">Đã xuất:</span> {formatDate(invoice.exported_at, 'dd/MM/yyyy HH:mm')}</p>
                                    ) : (
                                        <p className="flex items-center gap-1 text-amber-600">
                                            <AlertTriangle className="h-3 w-3" />
                                            <span className="text-xs">Hóa đơn chưa xuất - Chưa tính vào công nợ</span>
                                        </p>
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
                    <TabsContent value="payments" className="space-y-4 py-4 h-[550px] overflow-y-auto">
                        <div className="space-y-4">
                            {/* Payment summary */}
                            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
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
                                    <p className="text-sm text-muted-foreground">Đã hoàn trả</p>
                                    <p className="text-lg font-semibold text-red-600">
                                        {formatCurrency(totalReturnedAmount)}
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

                    {/* Tab: Returns */}
                    <TabsContent value="returns" className="space-y-4 py-4 h-[550px] overflow-y-auto relative">
                        {!invoice.exported_at && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm bg-white/50">
                                <div className="bg-background border rounded-lg shadow-lg p-6 max-w-sm text-center space-y-3">
                                    <div className="mx-auto w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-semibold">Chưa xuất hóa đơn</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Bạn không thể sử dụng tính năng này khi chưa xuất hóa đơn (PDF hoặc Excel)
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className={!invoice.exported_at ? "opacity-30 pointer-events-none select-none filter blur-[1px]" : ""}>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-semibold">Lịch sử hoàn trả</h4>
                                <Button
                                    size="sm"
                                    onClick={() => setCreateReturnDialogOpen(true)}
                                    disabled={invoice.status === 'cancelled' || invoice.status === 'processing' || !invoice.exported_at}
                                >
                                    <Package className="h-4 w-4 mr-2" />
                                    Tạo hoàn trả mới
                                </Button>
                            </div>

                            {isLoadingReturns ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
                                </div>
                            ) : invoiceReturns && invoiceReturns.length > 0 ? (
                                <div className="space-y-4">
                                    {invoiceReturns.map((returnItem) => (
                                        <div key={returnItem.id} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{returnItem.return_number}</span>
                                                        {returnItem.is_full_return && (
                                                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                                                Hoàn trả toàn bộ
                                                            </span>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDownloadReturnPdf(returnItem.id)
                                                            }}
                                                            disabled={downloadingReturn === returnItem.id}
                                                        >
                                                            {downloadingReturn === returnItem.id ? (
                                                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                            ) : (
                                                                <FileText className="h-4 w-4 mr-1" />
                                                            )}
                                                            PDF
                                                        </Button>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDate(returnItem.created_at, 'dd/MM/yyyy HH:mm')}
                                                        {returnItem.created_by && ` • ${returnItem.created_by}`}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">Hoàn tiền</p>
                                                    <p className="text-lg font-semibold text-red-600">
                                                        {formatCurrency(returnItem.refund_amount)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-1 text-sm">
                                                <p>
                                                    <span className="font-medium">Lý do:</span> {returnItem.reason}
                                                </p>
                                                {returnItem.notes && (
                                                    <p className="text-muted-foreground">
                                                        <span className="font-medium">Ghi chú:</span> {returnItem.notes}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="border-t pt-3 space-y-2">
                                                <p className="text-sm font-medium">Sản phẩm hoàn trả:</p>
                                                <div className="space-y-1">
                                                    {returnItem.return_items.map((item) => (
                                                        <div key={item.id} className="flex justify-between text-sm pl-4">
                                                            <span>
                                                                • {item.product_name}: {item.quantity_returned} {item.unit}
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {formatCurrency(item.subtotal)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 rounded-lg border border-dashed">
                                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Chưa có hoàn trả nào cho hóa đơn này
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Create Return Dialog */}
                <CreateReturnDialog
                    invoiceId={invoice.id}
                    open={createReturnDialogOpen}
                    onOpenChange={setCreateReturnDialogOpen}
                />
            </DialogContent>
        </Dialog>
    )
}
