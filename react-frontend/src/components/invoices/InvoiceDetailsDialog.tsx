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
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Invoice } from "@/types"

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
    if (!invoice) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Chi tiết hóa đơn: {invoice.invoice_number}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
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
                </div>
            </DialogContent>
        </Dialog>
    )
}
