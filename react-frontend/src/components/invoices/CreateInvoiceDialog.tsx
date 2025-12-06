import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { SearchHighlight } from '../shared/SearchHighlight'
import { useCreateInvoice, useUpdateInvoice } from '../../hooks/useInvoices'
import { useCustomers } from '../../hooks/useCustomers'
import { useProductSearch } from '../../hooks/useProducts'
import type { Product, InvoiceItemCreate, Invoice } from '../../types'
import { Trash2, Search, Plus, Check, X } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'
import { useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '../../services/invoices'
import { toast } from 'sonner'

interface LineItem {
    product: Product
    quantity: number
}

interface CreateInvoiceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode?: 'create' | 'edit'
    invoiceToEdit?: Invoice | null
}

export function CreateInvoiceDialog({
    open,
    onOpenChange,
    mode = 'create',
    invoiceToEdit,
}: CreateInvoiceDialogProps) {
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
    const [validationError, setValidationError] = useState<string | null>(null)
    const isEditMode = mode === 'edit' && !!invoiceToEdit

    // Hooks
    const createInvoiceMutation = useCreateInvoice()
    const updateInvoiceMutation = useUpdateInvoice()
    const queryClient = useQueryClient()
    const { data: customerPages } = useCustomers()
    const customers = useMemo(
        () => customerPages?.pages.flatMap((page) => page.items) ?? [],
        [customerPages]
    )
    const { data: searchResults = [] } = useProductSearch(debouncedSearchQuery)
    const isSubmitting = isEditMode ? updateInvoiceMutation.isPending : createInvoiceMutation.isPending
    const prevOpenRef = useRef(open)
    const isMountedRef = useRef(true)
    const searchDropdownRef = useRef<HTMLDivElement>(null)

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

    // Prefill form when editing a pending invoice
    useEffect(() => {
        if (isEditMode && invoiceToEdit && open) {
            setCustomerType(invoiceToEdit.customer_id ? 'registered' : 'walk-in')
            setSelectedCustomerId(invoiceToEdit.customer_id || undefined)
            setCustomerName(invoiceToEdit.customer_name || '')
            setCustomerPhone(invoiceToEdit.customer_phone || '')
            setCustomerAddress(invoiceToEdit.customer_address || '')
            setProductSearchQuery('')
            setDiscount(invoiceToEdit.discount || 0)
            setTax(invoiceToEdit.tax || 0)
            setPaymentMethod(invoiceToEdit.payment_method || '')
            setStatus(invoiceToEdit.status === 'paid' ? 'paid' : 'pending')
            setNotes(invoiceToEdit.notes || '')

            const mappedItems: LineItem[] = (invoiceToEdit.items || []).map((item) => ({
                product: {
                    id: item.product_id ?? -item.id,
                    name: item.product_name,
                    price: item.product_price,
                    unit: {
                        id: 0,
                        name: item.unit,
                        display_name: item.unit,
                        allows_decimal: true, // Assume decimal allowed for editing existing invoices
                        step_size: 0.01,
                        is_active: true,
                        is_system: false,
                        created_at: '',
                        updated_at: ''
                    },
                    stock_quantity: 0,
                    created_at: invoiceToEdit.created_at,
                    updated_at: invoiceToEdit.updated_at,
                    is_active: true,
                    is_new: false,
                    recently_updated_price: false,
                    recently_updated_import_price: false,
                    recently_updated_info: false,
                } as Product,
                quantity: item.quantity,
            }))
            setLineItems(mappedItems)
        }
    }, [isEditMode, invoiceToEdit, open, mode])

    // Calculate totals
    const subtotal = useMemo(() => {
        return lineItems.reduce((sum, item) => {
            // Guard: only add to sum if product has a valid price
            if (item.product.price) {
                return sum + (item.product.price * item.quantity)
            }
            return sum
        }, 0)
    }, [lineItems])

    const total = useMemo(() => {
        return subtotal - discount + tax
    }, [subtotal, discount, tax])

    const hasDraftData = useMemo(() => {
        return (
            lineItems.length > 0 ||
            customerName.trim() !== '' ||
            customerPhone.trim() !== '' ||
            customerAddress.trim() !== '' ||
            notes.trim() !== '' ||
            discount > 0 ||
            tax > 0 ||
            (paymentMethod || '').trim() !== ''
        )
    }, [lineItems, customerName, customerPhone, customerAddress, notes, discount, tax, paymentMethod])

    // Add product to line items
    const addProduct = (product: Product) => {
        // CRITICAL: Don't allow adding products without price to invoice
        if (!product.price || product.price <= 0) {
            toast.error(`Không thể thêm "${product.name}" vào hóa đơn: chưa có giá bán`)
            return
        }

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
    }

    // Update quantity
    const updateQuantity = (productId: number, quantity: number) => {
        // Enforce non-negative quantity
        const validQuantity = Math.max(0, quantity)

        setLineItems(items =>
            items.map(item =>
                item.product.id === productId
                    ? { ...item, quantity: validQuantity }
                    : item
            )
        )
    }

    // Remove product
    const removeProduct = (productId: number) => {
        setLineItems(items => items.filter(item => item.product.id !== productId))
    }

    // Reset form
    const resetForm = useCallback(() => {
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
    }, [])

    // Save unfinished form as a processing invoice when the dialog is closed unexpectedly
    const saveProcessingDraft = useCallback(() => {
        if (!hasDraftData || isSubmitting || isEditMode) return

        const items: InvoiceItemCreate[] = lineItems.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity
        }))

        // Fire-and-forget: không await, không block navigation
        invoiceService.create({
            items,
            customer_id: customerType === 'registered' ? selectedCustomerId : undefined,
            customer_name: customerName || undefined,
            customer_phone: customerPhone || undefined,
            customer_address: customerAddress || undefined,
            discount,
            tax,
            payment_method: paymentMethod || undefined,
            notes: notes || undefined,
            status: 'processing'
        })
            .then(() => {
                // Chỉ invalidate và show toast nếu component còn mounted
                if (isMountedRef.current) {
                    queryClient.invalidateQueries({ queryKey: ['invoices'] })
                    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
                    queryClient.invalidateQueries({ queryKey: ['statistics'] })
                    toast.info('Đã lưu hóa đơn chờ xử lý. Bạn có thể tiếp tục tạo sau.')
                }
            })
            .catch((error) => {
                if (isMountedRef.current) {
                    console.error('Không thể lưu hóa đơn chờ xử lý:', error)
                    toast.error('Không thể lưu hóa đơn chờ xử lý')
                }
            })
    }, [
        hasDraftData,
        isSubmitting,
        isEditMode,
        lineItems,
        customerType,
        selectedCustomerId,
        customerName,
        customerPhone,
        customerAddress,
        discount,
        tax,
        paymentMethod,
        notes,
        queryClient
    ])

    // Persist draft when user closes the dialog mid-creation
    useEffect(() => {
        // Chỉ xử lý khi dialog chuyển từ mở → đóng (prevOpenRef.current && !open)
        if (prevOpenRef.current && !open) {
            if (mode === 'create') {
                // Lưu draft cho mode create
                saveProcessingDraft()
            }
            // Reset form cho cả create và edit mode (chỉ khi transition)
            if (isMountedRef.current) {
                resetForm()
            }
        }

        prevOpenRef.current = open
    }, [open, mode, saveProcessingDraft, resetForm])

    // Cleanup: track mounted state
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
        }
    }, [])

    // Close product search dropdown when clicking outside or pressing ESC
    useEffect(() => {
        if (!productSearchQuery) return // Only add listeners when dropdown is visible

        const handleClickOutside = (event: MouseEvent) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
                setProductSearchQuery('')
            }
        }

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setProductSearchQuery('')
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEsc)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [productSearchQuery])

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (lineItems.length === 0) {
            setValidationError('Vui lòng thêm ít nhất một sản phẩm')
            return
        }

        // Check for 0 quantity
        const invalidItems = lineItems.filter(item => item.quantity <= 0)
        if (invalidItems.length > 0) {
            setValidationError(`Sản phẩm "${invalidItems[0].product.name}" có số lượng không hợp lệ (phải lớn hơn 0)`)
            return
        }

        // Only require customer name for registered customers
        if (customerType === 'registered' && !customerName.trim()) {
            setValidationError('Vui lòng chọn khách hàng từ danh sách')
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
            notes: notes || undefined
        }

        try {
            if (isEditMode && invoiceToEdit) {
                const statusPayload = invoiceToEdit.status === 'processing' ? status : undefined
                await updateInvoiceMutation.mutateAsync({
                    id: invoiceToEdit.id,
                    invoice: statusPayload ? { ...invoiceData, status: statusPayload } : invoiceData
                })
            } else {
                await createInvoiceMutation.mutateAsync({
                    ...invoiceData,
                    status
                })
                resetForm()
            }
            onOpenChange(false)
        } catch (error) {
            // Error is handled by the mutation's onError
            console.error('Error saving invoice:', error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Chỉnh sửa hóa đơn' : 'Tạo Hóa Đơn Mới'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
                        <div className="space-y-6">
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
                                    <Label htmlFor="customer-name">
                                        Tên khách hàng {customerType === 'registered' && '*'}
                                    </Label>
                                    <Input
                                        id="customer-name"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Nhập tên khách hàng"
                                        disabled={customerType === 'registered' && !!selectedCustomerId}
                                        required={customerType === 'registered'}
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
                            <div className={`grid gap-4 ${isEditMode ? 'grid-cols-1' : 'grid-cols-2'}`}>
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

                                {!isEditMode && (
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
                                )}
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
                        </div>

                        {/* Right column: search + cart */}
                        <div className="space-y-4">
                            <div ref={searchDropdownRef} className="relative rounded-lg border bg-background p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">Tìm & thêm sản phẩm</p>
                                        <p className="text-xs text-muted-foreground">Gõ tên sản phẩm và bấm + để đưa vào giỏ</p>
                                    </div>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="product-search"
                                        value={productSearchQuery}
                                        onChange={(e) => setProductSearchQuery(e.target.value)}
                                        placeholder="Tìm kiếm theo tên sản phẩm..."
                                        className="pl-10 pr-10"
                                    />
                                    {productSearchQuery ? (
                                        <button
                                            type="button"
                                            aria-label="Xóa tìm kiếm"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            onClick={() => setProductSearchQuery('')}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    ) : null}
                                </div>

                                {productSearchQuery ? (
                                    <div className="absolute left-0 right-0 mt-2 rounded-lg border bg-background shadow-lg max-h-80 overflow-y-auto z-20">
                                        {searchResults.length > 0 ? (
                                            <table className="w-full">
                                                <thead className="bg-muted sticky top-0">
                                                    <tr>
                                                        <th className="text-left p-2 text-xs font-medium">Sản phẩm</th>
                                                        <th className="text-right p-2 text-xs font-medium">Giá</th>
                                                        <th className="text-center p-2 text-xs font-medium">Tồn</th>
                                                        <th className="text-center p-2 text-xs font-medium"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {searchResults.map(product => {
                                                        const isSelected = lineItems.some(item => item.product.id === product.id)
                                                        return (
                                                            <tr
                                                                key={product.id}
                                                                className="border-t hover:bg-muted/60"
                                                            >
                                                                <td className="p-2 text-sm">
                                                                    {productSearchQuery.trim() ? (
                                                                        <SearchHighlight text={product.name} query={productSearchQuery} />
                                                                    ) : (
                                                                        product.name
                                                                    )}
                                                                </td>
                                                                <td className="p-2 text-sm text-right">
                                                                    {product.price ? product.price.toLocaleString('vi-VN') : '-'}đ
                                                                </td>
                                                                <td className="p-2 text-sm text-center">{product.stock_quantity}</td>
                                                                <td className="p-2 text-center">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant={isSelected ? 'secondary' : 'ghost'}
                                                                        onClick={() => addProduct(product)}
                                                                        disabled={!product.price || product.price <= 0}
                                                                        title={!product.price || product.price <= 0 ? 'Sản phẩm chưa có giá' : ''}
                                                                    >
                                                                        {isSelected ? (
                                                                            <Check className="h-4 w-4 text-green-600" />
                                                                        ) : (
                                                                            <Plus className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="p-4 text-sm text-center text-muted-foreground">
                                                Không tìm thấy sản phẩm phù hợp
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>

                            <div className="border rounded-lg p-4 space-y-3 bg-muted/40">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Giỏ hàng</p>
                                    <span className="text-xs text-muted-foreground">
                                        {lineItems.length} sản phẩm
                                    </span>
                                </div>

                                {lineItems.length > 0 ? (
                                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                                        {lineItems.map(item => (
                                            <div
                                                key={item.product.id}
                                                className={`rounded-lg border p-3 shadow-sm ${item.quantity <= 0
                                                    ? 'bg-destructive/10 border-destructive'
                                                    : 'bg-background'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-medium leading-tight">{item.product.name}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Đơn giá: {item.product.price ? item.product.price.toLocaleString('vi-VN') : '0'}đ
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => removeProduct(item.product.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between gap-3">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            min={item.product.unit.allows_decimal ? "0" : "1"}
                                                            step={item.product.unit.allows_decimal ? "any" : item.product.unit.step_size}
                                                            value={item.quantity}
                                                            onChange={(e) => updateQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                                                            className="w-24 text-center"
                                                        />
                                                        <span className="text-xs text-muted-foreground">
                                                            {item.product.unit.display_name}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-semibold">
                                                        {item.product.price ? (item.product.price * item.quantity).toLocaleString('vi-VN') : '0'}đ
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-md">
                                        Chưa có sản phẩm nào trong giỏ
                                    </div>
                                )}
                            </div>
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
                            disabled={isSubmitting}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || lineItems.length === 0}
                        >
                            {isSubmitting
                                ? isEditMode ? 'Đang lưu...' : 'Đang tạo...'
                                : isEditMode ? 'Lưu thay đổi' : 'Tạo Hóa Đơn'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>

            {/* Validation Alert Dialog */}
            <Dialog open={!!validationError} onOpenChange={(open) => !open && setValidationError(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-destructive">Thông báo</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                        <p className="text-sm text-foreground">
                            {validationError}
                        </p>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button type="button" variant="default" onClick={() => setValidationError(null)}>
                            Đã hiểu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    )
}
