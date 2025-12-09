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
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Invoice } from "@/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { paymentService } from "@/services/payments"
import { useInvoiceReturns } from "@/hooks/useInvoiceReturns"
import { CreateReturnDialog } from "./CreateReturnDialog"

import { Loader2, Package, FileText, AlertTriangle } from "lucide-react"
import { invoiceReturnService } from "@/services/invoiceReturns"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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

import { invoiceService } from "@/services/invoices"

// ... imports remain the same

export function InvoiceDetailsDialog({
    invoice: initialInvoice,
    open,
    onOpenChange,
}: InvoiceDetailsDialogProps) {
    const queryClient = useQueryClient()
    const [createReturnDialogOpen, setCreateReturnDialogOpen] = useState(false)


    const [downloadingReturn, setDownloadingReturn] = useState<number | null>(null)
    const [updatingReturnStatus, setUpdatingReturnStatus] = useState<number | null>(null)
    const [refundMethods, setRefundMethods] = useState<Record<number, string>>({})

    // Fetch fresh invoice data to ensure live updates (e.g. status, payments)
    const { data: fetchedInvoice } = useQuery({
        queryKey: ['invoices', initialInvoice?.id],
        queryFn: () => invoiceService.getById(initialInvoice!.id),
        enabled: !!initialInvoice?.id && open,
        initialData: initialInvoice
    })

    // Use fetched invoice if available, otherwise initial
    const invoice = fetchedInvoice || initialInvoice

    // Fetch payment allocations for this invoice
    const { data: paymentAllocations, isLoading: isLoadingPayments } = useQuery({
        queryKey: ['invoice-payments', invoice?.id],
        queryFn: () => paymentService.getInvoicePayments(invoice!.id),
        enabled: !!invoice?.id && open
    })

    // Fetch returns for this invoice
    const { data: invoiceReturns, isLoading: isLoadingReturns } = useInvoiceReturns(open ? invoice?.id || null : null)



    // Handle PDF download
    const handleDownloadReturnPdf = async (returnId: number) => {
        setDownloadingReturn(returnId)
        try {
            const blob = await invoiceReturnService.generateReturnPdf(returnId)

            // Create download link
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `return_${returnId}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            toast.success('Đã tải xuống PDF')
        } catch (error: any) {
            const errorMsg = error?.response?.data?.detail || 'Không thể tải PDF'
            toast.error(errorMsg)
        } finally {
            setDownloadingReturn(null)
        }
    }

    // Handle status update
    // Handle status update
    const handleUpdateReturnStatus = async (
        returnId: number,
        newStatus: 'pending_refund' | 'refunded',
        paymentMethod: string = 'cash'
    ) => {
        setUpdatingReturnStatus(returnId)
        try {
            await invoiceReturnService.updateStatus(returnId, {
                status: newStatus,
                payment_method: newStatus === 'refunded' ? paymentMethod : undefined
            })

            toast.success(
                newStatus === 'refunded'
                    ? 'Đã xác nhận hoàn tiền'
                    : 'Đã chuyển về chưa hoàn tiền'
            )

            // Force refetch invoice details and payments immediately
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ['invoices', initialInvoice?.id] }),
                queryClient.refetchQueries({ queryKey: ['invoice-payments', initialInvoice?.id] }),
                queryClient.invalidateQueries({ queryKey: ['invoice-returns'] }),
                queryClient.invalidateQueries({ queryKey: ['customer-returns'] }),
                queryClient.invalidateQueries({ queryKey: ['invoices'] }),
                queryClient.invalidateQueries({ queryKey: ['customer-invoices'] })
            ])

        } catch (error: any) {
            const errorMsg = error?.response?.data?.detail || 'Không thể cập nhật trạng thái'
            toast.error(errorMsg)
        } finally {
            setUpdatingReturnStatus(null)
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
                                        {invoice.items?.map((item, index: number) => (
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
                            {/* Enhanced Payment Summary */}
                            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                                {/* Row 1: Basic amounts */}
                                <div className="grid grid-cols-3 gap-4 pb-4 border-b">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tổng hóa đơn</p>
                                        <p className="text-lg font-semibold">{formatCurrency(invoice.total)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tiền khách trả</p>
                                        <p className="text-lg font-semibold text-emerald-600">
                                            {formatCurrency(invoice.paid_amount || 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Tiền đã hoàn lại</p>
                                        <p className="text-lg font-semibold text-orange-600">
                                            {formatCurrency(invoice.refunded_amount || 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Row 2: Net position (highlighted) */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Net Cash Flow */}
                                    <div className="bg-background p-4 rounded-lg border-2 border-primary/30 shadow-sm">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                            💰 Thanh toán ròng
                                        </p>
                                        <p className={`text-2xl font-bold ${(invoice.net_payment_amount || (invoice.paid_amount - (invoice.refunded_amount || 0))) > 0
                                            ? 'text-emerald-600'
                                            : (invoice.net_payment_amount || (invoice.paid_amount - (invoice.refunded_amount || 0))) < 0
                                                ? 'text-red-600'
                                                : 'text-gray-600'
                                            }`}>
                                            {formatCurrency(
                                                invoice.net_payment_amount !== undefined
                                                    ? invoice.net_payment_amount
                                                    : (invoice.paid_amount - (invoice.refunded_amount || 0))
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Khách trả - Đã hoàn
                                        </p>
                                    </div>

                                    {/* Remaining Amount */}
                                    <div className="bg-background p-4 rounded-lg border-2 border-primary/30 shadow-sm">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                            {invoice.remaining_amount >= 0 ? '📊 Còn nợ' : '⚠️ Shop nợ khách'}
                                        </p>
                                        <p className={`text-2xl font-bold ${invoice.remaining_amount > 0
                                            ? 'text-amber-600'
                                            : invoice.remaining_amount < 0
                                                ? 'text-red-600'
                                                : 'text-emerald-600'
                                            }`}>
                                            {invoice.remaining_amount >= 0
                                                ? formatCurrency(invoice.remaining_amount || 0)
                                                : `−${formatCurrency(Math.abs(invoice.remaining_amount))}`
                                            }
                                        </p>
                                        {invoice.remaining_amount < 0 && (
                                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                                                <AlertTriangle className="h-3 w-3" />
                                                Cần trả lại tiền cho khách
                                            </p>
                                        )}
                                        {invoice.remaining_amount === 0 && (
                                            <p className="text-xs text-emerald-600 mt-1">
                                                ✓ Đã thanh toán đủ
                                            </p>
                                        )}
                                    </div>
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
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold">{returnItem.return_number}</span>

                                                        {/* Status Badge */}
                                                        <Badge
                                                            variant={returnItem.status === 'refunded' ? 'default' : 'secondary'}
                                                            className={
                                                                returnItem.status === 'refunded'
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : 'bg-amber-100 text-amber-800'
                                                            }
                                                        >
                                                            {returnItem.status === 'refunded' ? 'Đã hoàn tiền' : 'Chưa hoàn tiền'}
                                                        </Badge>

                                                        {returnItem.is_full_return && (
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                                                Hoàn trả toàn bộ
                                                            </Badge>
                                                        )}

                                                        {/* Status Change Button - Only show if NOT refunded */}
                                                        {returnItem.status !== 'refunded' && (
                                                            <>
                                                                <Select
                                                                    value={refundMethods[returnItem.id] || 'cash'}
                                                                    onValueChange={(val) => setRefundMethods(prev => ({ ...prev, [returnItem.id]: val }))}
                                                                >
                                                                    <SelectTrigger className="w-[130px] h-9">
                                                                        <SelectValue placeholder="Phương thức" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="cash">Tiền mặt</SelectItem>
                                                                        <SelectItem value="transfer">Chuyển khoản</SelectItem>
                                                                        <SelectItem value="card">Thẻ</SelectItem>
                                                                    </SelectContent>
                                                                </Select>

                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleUpdateReturnStatus(
                                                                            returnItem.id,
                                                                            'refunded',
                                                                            refundMethods[returnItem.id] || 'cash'
                                                                        )
                                                                    }}
                                                                    disabled={updatingReturnStatus === returnItem.id}
                                                                >
                                                                    {updatingReturnStatus === returnItem.id ? (
                                                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                    ) : null}
                                                                    Xác nhận
                                                                </Button>
                                                            </>
                                                        )}

                                                        {/* PDF Button */}
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

                                                {/* Suggested Refund Amount for Pending Returns */}
                                                {returnItem.status === 'pending_refund' && (
                                                    <div className="mt-2 bg-blue-50 p-2 rounded border border-blue-100 flex items-start gap-2">
                                                        <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                                                        <div className="text-sm">
                                                            <p className="font-semibold text-blue-700">Gợi ý xử lý:</p>
                                                            {(() => {
                                                                // Calculate projected remaining if this return is processed
                                                                // invoice.remaining_amount currently allows for this credit if it hasn't been applied?
                                                                // No, if pending, remaining_amount does NOT include this credit yet.
                                                                const projectedRemaining = invoice.remaining_amount - returnItem.refund_amount

                                                                if (projectedRemaining < 0) {
                                                                    const settlementNeeded = Math.abs(projectedRemaining)
                                                                    return (
                                                                        <span>
                                                                            Shop cần hoàn lại tiền mặt cho khách: <span className="font-bold text-red-600">{formatCurrency(settlementNeeded)}</span>
                                                                        </span>
                                                                    )
                                                                } else {
                                                                    return (
                                                                        <span>
                                                                            Khấu trừ vào nợ. Khách vẫn còn nợ: <span className="font-bold text-amber-600">{formatCurrency(projectedRemaining)}</span>. Không cần chi tiền mặt.
                                                                        </span>
                                                                    )
                                                                }
                                                            })()}
                                                        </div>
                                                    </div>
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
