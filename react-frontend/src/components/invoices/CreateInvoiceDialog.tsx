import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useCreateInvoice } from '../../hooks/useInvoices'
import { useCustomers } from '../../hooks/useCustomers'
import { useProductSearch } from '../../hooks/useProducts'
import type { Product, InvoiceItemCreate } from '../../types'
import { Trash2, Search, Plus } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'

interface LineItem {
    product: Product
    quantity: number
}

interface CreateInvoiceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateInvoiceDialog({ open, onOpenChange }: CreateInvoiceDialogProps) {
    // Customer type toggle
    const [customerType, setCustomerType] = useState<'registered' | 'walk-in'>('walk-in')

    // Customer info
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>()
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [customerAddress, setCustomerAddress] = useState('')

    // Product search
    const [productSearchQuery, setProductSearchQuery] = useState('')
    const debouncedSearchQuery = useDebounce(productSearchQuery, 300)

    // Line items
    const [lineItems, setLineItems] = useState<LineItem[]>([])

    // Invoice details
    const [discount, setDiscount] = useState(0)
    const [tax, setTax] = useState(0)
    const [paymentMethod, setPaymentMethod] = useState<string>('')
    const [status, setStatus] = useState<'pending' | 'paid'>('pending')
    const [notes, setNotes] = useState('')

    // Hooks
    const createInvoiceMutation = useCreateInvoice()
    const { data: customers = [] } = useCustomers()
    const { data: searchResults = [] } = useProductSearch(debouncedSearchQuery)

    // Update customer info when selecting registered customer
    useEffect(() => {
        if (customerType === 'registered' && selectedCustomerId) {
            const customer = customers.find(c => c.id === selectedCustomerId)
            if (customer) {
                setCustomerName(customer.name)
                setCustomerPhone(customer.phone || '')
                setCustomerAddress(customer.address || '')
            }
        }
    }, [selectedCustomerId, customers, customerType])

    // Calculate totals
    const subtotal = useMemo(() => {
        return lineItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    }, [lineItems])

    const total = useMemo(() => {
        return subtotal - discount + tax
    }, [subtotal, discount, tax])

    // Add product to line items
    const addProduct = (product: Product) => {
        const existingItem = lineItems.find(item => item.product.id === product.id)
        if (existingItem) {
            // Increase quantity if already exists
            setLineItems(items =>
                items.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            )
        } else {
            // Add new item
            setLineItems([...lineItems, { product, quantity: 1 }])
        }
        // Clear search after adding
        setProductSearchQuery('')
    }

    // Update quantity
    const updateQuantity = (productId: number, quantity: number) => {
        if (quantity <= 0) {
            removeProduct(productId)
        } else {
            setLineItems(items =>
                items.map(item =>
                    item.product.id === productId
                        ? { ...item, quantity }
                        : item
                )
            )
        }
    }

    // Remove product
    const removeProduct = (productId: number) => {
        setLineItems(items => items.filter(item => item.product.id !== productId))
    }

    // Reset form
    const resetForm = () => {
        setCustomerType('walk-in')
        setSelectedCustomerId(undefined)
        setCustomerName('')
        setCustomerPhone('')
        setCustomerAddress('')
        setProductSearchQuery('')
        setLineItems([])
        setDiscount(0)
        setTax(0)
        setPaymentMethod('')
        setStatus('pending')
        setNotes('')
    }

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (lineItems.length === 0) {
            alert('Vui lòng thêm ít nhất một sản phẩm')
            return
        }

        if (!customerName.trim()) {
            alert('Vui lòng nhập tên khách hàng')
            return
        }

        // Prepare invoice data
        const items: InvoiceItemCreate[] = lineItems.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity
        }))

        const invoiceData = {
            items,
            customer_id: customerType === 'registered' ? selectedCustomerId : undefined,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            discount,
            tax,
            payment_method: paymentMethod || undefined,
            notes: notes || undefined,
            status
        }

        try {
            await createInvoiceMutation.mutateAsync(invoiceData)
            resetForm()
            onOpenChange(false)
        } catch (error) {
            // Error is handled by the mutation's onError
            console.error('Error creating invoice:', error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tạo Hóa Đơn Mới</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Customer Type Toggle */}
                    <div className="space-y-2">
                        <Label>Loại khách hàng</Label>
                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant={customerType === 'walk-in' ? 'default' : 'outline'}
                                onClick={() => {
                                    setCustomerType('walk-in')
                                    setSelectedCustomerId(undefined)
                                    setCustomerName('')
                                    setCustomerPhone('')
                                    setCustomerAddress('')
                                }}
                            >
                                Khách vãng lai
                            </Button>
                            <Button
                                type="button"
                                variant={customerType === 'registered' ? 'default' : 'outline'}
                                onClick={() => setCustomerType('registered')}
                            >
                                Khách hàng đã đăng ký
                            </Button>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-4">
                        {customerType === 'registered' ? (
                            <div className="col-span-2">
                                <Label htmlFor="customer-select">Chọn khách hàng</Label>
                                <Select
                                    value={selectedCustomerId?.toString()}
                                    onValueChange={(value) => setSelectedCustomerId(Number(value))}
                                >
                                    <SelectTrigger id="customer-select">
                                        <SelectValue placeholder="Chọn khách hàng..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map(customer => (
                                            <SelectItem key={customer.id} value={customer.id.toString()}>
                                                {customer.name} - {customer.phone || 'Không có SĐT'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}

                        <div>
                            <Label htmlFor="customer-name">Tên khách hàng *</Label>
                            <Input
                                id="customer-name"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Nhập tên khách hàng"
                                disabled={customerType === 'registered' && !!selectedCustomerId}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="customer-phone">Số điện thoại</Label>
                            <Input
                                id="customer-phone"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="Nhập số điện thoại"
                                disabled={customerType === 'registered' && !!selectedCustomerId}
                            />
                        </div>

                        <div className="col-span-2">
                            <Label htmlFor="customer-address">Địa chỉ</Label>
                            <Input
                                id="customer-address"
                                value={customerAddress}
                                onChange={(e) => setCustomerAddress(e.target.value)}
                                placeholder="Nhập địa chỉ"
                                disabled={customerType === 'registered' && !!selectedCustomerId}
                            />
                        </div>
                    </div>

                    {/* Product Search */}
                    <div className="space-y-2">
                        <Label htmlFor="product-search">Tìm kiếm sản phẩm</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="product-search"
                                value={productSearchQuery}
                                onChange={(e) => setProductSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm theo tên sản phẩm..."
                                className="pl-10"
                            />
                        </div>

                        {/* Product Search Results Table */}
                        {productSearchQuery && searchResults.length > 0 && (
                            <div className="border rounded-lg max-h-60 overflow-y-auto">
                                <table className="w-full">
                                    <thead className="bg-muted sticky top-0">
                                        <tr>
                                            <th className="text-left p-2 text-sm font-medium">Sản phẩm</th>
                                            <th className="text-right p-2 text-sm font-medium">Giá</th>
                                            <th className="text-center p-2 text-sm font-medium">Đơn vị</th>
                                            <th className="text-center p-2 text-sm font-medium">Tồn kho</th>
                                            <th className="text-center p-2 text-sm font-medium"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {searchResults.map(product => (
                                            <tr
                                                key={product.id}
                                                className="border-t hover:bg-muted/50 cursor-pointer"
                                            >
                                                <td className="p-2 text-sm">{product.name}</td>
                                                <td className="p-2 text-sm text-right">
                                                    {product.price.toLocaleString('vi-VN')}đ
                                                </td>
                                                <td className="p-2 text-sm text-center">{product.unit}</td>
                                                <td className="p-2 text-sm text-center">{product.stock_quantity}</td>
                                                <td className="p-2 text-center">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => addProduct(product)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Line Items */}
                    {lineItems.length > 0 && (
                        <div className="space-y-2">
                            <Label>Sản phẩm trong hóa đơn</Label>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="text-left p-2 text-sm font-medium">Sản phẩm</th>
                                            <th className="text-right p-2 text-sm font-medium">Đơn giá</th>
                                            <th className="text-center p-2 text-sm font-medium">Số lượng</th>
                                            <th className="text-right p-2 text-sm font-medium">Thành tiền</th>
                                            <th className="text-center p-2 text-sm font-medium"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lineItems.map(item => (
                                            <tr key={item.product.id} className="border-t">
                                                <td className="p-2 text-sm">{item.product.name}</td>
                                                <td className="p-2 text-sm text-right">
                                                    {item.product.price.toLocaleString('vi-VN')}đ
                                                </td>
                                                <td className="p-2 text-center">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateQuantity(item.product.id, Number(e.target.value))}
                                                        className="w-20 text-center"
                                                    />
                                                </td>
                                                <td className="p-2 text-sm text-right font-medium">
                                                    {(item.product.price * item.quantity).toLocaleString('vi-VN')}đ
                                                </td>
                                                <td className="p-2 text-center">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => removeProduct(item.product.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Financial Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="discount">Giảm giá (VNĐ)</Label>
                            <Input
                                id="discount"
                                type="number"
                                min="0"
                                value={discount}
                                onChange={(e) => setDiscount(Number(e.target.value))}
                                placeholder="0"
                            />
                        </div>

                        <div>
                            <Label htmlFor="tax">Thuế (VNĐ)</Label>
                            <Input
                                id="tax"
                                type="number"
                                min="0"
                                value={tax}
                                onChange={(e) => setTax(Number(e.target.value))}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Payment & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="payment-method">Phương thức thanh toán</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger id="payment-method">
                                    <SelectValue placeholder="Chọn phương thức..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Tiền mặt</SelectItem>
                                    <SelectItem value="transfer">Chuyển khoản</SelectItem>
                                    <SelectItem value="card">Thẻ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="status">Trạng thái</Label>
                            <Select value={status} onValueChange={(value: 'pending' | 'paid') => setStatus(value)}>
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Chờ thanh toán</SelectItem>
                                    <SelectItem value="paid">Đã thanh toán</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <Label htmlFor="notes">Ghi chú</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Nhập ghi chú (tùy chọn)"
                            rows={3}
                        />
                    </div>

                    {/* Summary */}
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Tổng tiền hàng:</span>
                            <span className="font-medium">{subtotal.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Giảm giá:</span>
                            <span className="font-medium text-destructive">-{discount.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Thuế:</span>
                            <span className="font-medium">+{tax.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Tổng cộng:</span>
                            <span className="text-primary">{total.toLocaleString('vi-VN')}đ</span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                resetForm()
                                onOpenChange(false)
                            }}
                            disabled={createInvoiceMutation.isPending}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={createInvoiceMutation.isPending || lineItems.length === 0}
                        >
                            {createInvoiceMutation.isPending ? 'Đang tạo...' : 'Tạo Hóa Đơn'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
