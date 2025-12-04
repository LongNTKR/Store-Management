import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddCustomerDialog } from '@/components/customers/AddCustomerDialog'
import { EditCustomerDialog } from '@/components/customers/EditCustomerDialog'
import {
    useCustomers,
    useDeleteCustomer,
    useBulkDeleteCustomers,
} from '@/hooks/useCustomers'
import { useDebounce } from '@/hooks/useDebounce'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { Search, Trash2, UserRound, Pencil, Circle, CheckCircle2, Sparkles } from 'lucide-react'
import type { Customer } from '@/types'
import { SearchHighlight } from '@/components/shared/SearchHighlight'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function CustomersPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<{ id: number, name: string } | null>(null)
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([])
    const debouncedSearch = useDebounce(searchQuery.trim(), 300)

    const {
        data: customerPages,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useCustomers(debouncedSearch)
    const deleteCustomer = useDeleteCustomer()
    const bulkDeleteCustomers = useBulkDeleteCustomers()

    const customers = useMemo(
        () => customerPages?.pages.flatMap((page) => page.items) ?? [],
        [customerPages]
    )
    const totalCustomers = customerPages?.pages?.[0]?.total ?? 0
    const selectedCount = selectedCustomerIds.length
    const isSelectionMode = selectedCount > 0
    const isEmpty = !isLoading && customers.length === 0
    const loadMoreRef = useInfiniteScroll({
        hasMore: Boolean(hasNextPage),
        isLoading: isFetchingNextPage,
        onLoadMore: () => fetchNextPage(),
    })

    useEffect(() => {
        setSelectedCustomerIds((prev) => {
            if (prev.length === 0) return prev
            const visibleIds = new Set(customers.map((c) => c.id))
            const next = prev.filter((id) => visibleIds.has(id))
            return next.length === prev.length ? prev : next
        })
    }, [customers])

    const toggleCustomerSelection = (customerId: number) => {
        setSelectedCustomerIds((prev) =>
            prev.includes(customerId)
                ? prev.filter((id) => id !== customerId)
                : [...prev, customerId]
        )
    }

    const handleSelectAll = () => {
        if (customers.length === 0) return
        if (selectedCustomerIds.length === customers.length) {
            setSelectedCustomerIds([])
        } else {
            setSelectedCustomerIds(customers.map((customer) => customer.id))
        }
    }

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer)
        setShowEditDialog(true)
    }

    const handleDelete = (customer: Customer) => {
        setDeleteTarget({ id: customer.id, name: customer.name })
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return

        try {
            await deleteCustomer.mutateAsync(deleteTarget.id)
            toast.success(`✓ Đã chuyển "${deleteTarget.name}" vào Thùng rác`)
        } finally {
            setDeleteTarget(null)
        }
    }

    const handleBulkDelete = async () => {
        if (selectedCustomerIds.length === 0) return
        try {
            const count = selectedCustomerIds.length
            await bulkDeleteCustomers.mutateAsync(selectedCustomerIds)
            toast.success(`✓ Đã chuyển ${count} khách hàng vào Thùng rác`)
            setSelectedCustomerIds([])
        } catch {
            toast.error('Lỗi khi xóa khách hàng')
        }
    }

    return (
        <div>
            <h1 className="mb-6 flex items-center gap-3 text-3xl font-bold">
                <span className="inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                    <img alt="Customers Icon" className="h-16 w-16 object-contain drop-shadow-sm" src="/Image_d6ma5pd6ma5pd6ma.png" />
                </span>
                Quản Lý Khách Hàng
            </h1>

            <div className="mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="🔍 Tìm theo tên, SĐT, email (hỗ trợ không dấu)"
                        value={searchQuery}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={() => setShowAddDialog(true)}>➕ Thêm mới</Button>
            </div>

            {isLoading && customers.length === 0 ? (
                <div className="text-muted-foreground">Đang tải...</div>
            ) : isEmpty ? (
                <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
                    {searchQuery ? `Không tìm thấy khách hàng '${searchQuery}'` : 'Chưa có khách hàng nào'}
                </div>
            ) : (
                <>
                    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-gradient-to-r from-slate-50 via-white to-blue-50 px-4 py-3 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
                                <Sparkles className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm font-medium text-foreground">Chọn nhiều khách hàng</p>
                                <p className="text-xs text-muted-foreground">
                                    {isSelectionMode
                                        ? `Đã chọn ${selectedCount}/${customers.length} khách hàng`
                                        : 'Nhấn vào chấm tròn trên thẻ để chọn/bỏ chọn khách hàng'}
                                </p>
                            </div>
                        </div>
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                Hiển thị {customers.length}
                                {totalCustomers ? `/${totalCustomers}` : ''} khách hàng
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                                disabled={customers.length === 0}
                            >
                                {selectedCount === customers.length && customers.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </Button>
                            {isSelectionMode && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleteCustomers.isPending}
                                >
                                    {bulkDeleteCustomers.isPending ? 'Đang xóa...' : `Xóa ${selectedCount} khách hàng`}
                                </Button>
                            )}
                        </div>
                    </div>

                    <p className="mb-4 text-sm text-muted-foreground">
                        Tổng: {totalCustomers || customers.length} khách hàng • Đang hiển thị {customers.length}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        {customers.map((customer) => {
                            const isSelected = selectedCustomerIds.includes(customer.id)
                            return (
                                <Card
                                    key={customer.id}
                                    className={cn(
                                        "group relative transition-shadow hover:shadow-md",
                                        isSelected && "border-primary shadow-lg shadow-primary/10"
                                    )}
                                >
                                    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                                        <div className="flex-1">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <UserRound className="h-4 w-4 text-primary" />
                                                <SearchHighlight text={customer.name} query={searchQuery} />
                                            </CardTitle>
                                            {customer.phone && (
                                                <p className="text-sm text-muted-foreground">
                                                    📞 <SearchHighlight text={customer.phone} query={searchQuery} />
                                                </p>
                                            )}
                                            {customer.email && (
                                                <p className="text-sm text-muted-foreground">
                                                    📧 <SearchHighlight text={customer.email} query={searchQuery} />
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleCustomerSelection(customer.id)
                                                }}
                                                className={cn(
                                                    "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-150",
                                                    isSelected
                                                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
                                                        : "border-slate-200 bg-white text-slate-500 hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
                                                )}
                                                aria-pressed={isSelected}
                                                aria-label={isSelected ? "Bỏ chọn khách hàng" : "Chọn khách hàng"}
                                            >
                                                {isSelected ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                            </button>
                                            <div className="flex items-start gap-1 rounded-full bg-white/80 px-1.5 py-1 shadow-sm ring-1 ring-slate-200">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:text-primary"
                                                    onClick={() => handleEdit(customer)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(customer)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {customer.address && (
                                            <p className="text-sm text-muted-foreground">📍 {customer.address}</p>
                                        )}
                                        {customer.notes && (
                                            <p className="mt-2 text-sm text-muted-foreground">📝 {customer.notes}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                    {(hasNextPage || isFetchingNextPage) && (
                        <div
                            ref={loadMoreRef}
                            className="py-6 text-center text-sm text-muted-foreground"
                        >
                            {isFetchingNextPage ? 'Đang tải thêm...' : 'Kéo xuống để xem thêm khách hàng'}
                        </div>
                    )}
                </>
            )}

            <AddCustomerDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
            <EditCustomerDialog
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                customer={selectedCustomer}
            />

            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Xóa khách hàng?</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa khách hàng "{deleteTarget?.name}" không?
                            <br />
                            <br />
                            💡 Khách hàng sẽ được chuyển vào <strong>Thùng rác</strong> và có thể khôi phục lại trong vòng 30 ngày. Sau 30 ngày, khách hàng sẽ bị xóa vĩnh viễn.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={deleteCustomer.isPending}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteCustomer.isPending}
                        >
                            {deleteCustomer.isPending ? 'Đang xóa...' : 'Chuyển vào thùng rác'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
