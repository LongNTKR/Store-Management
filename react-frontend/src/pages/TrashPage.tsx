import { useEffect, useMemo, useState } from 'react'
import {
    useTrashProducts,
    useRestoreProduct,
    usePermanentlyDeleteProduct,
    useBulkPermanentlyDeleteProducts,
    useBulkRestoreProducts,
    useTrashCustomers,
    useRestoreCustomer,
    useBulkRestoreCustomers,
    usePermanentlyDeleteCustomer,
} from '@/hooks/useTrash'
import { useDebounce } from '@/hooks/useDebounce'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
import { SearchHighlight } from '@/components/shared/SearchHighlight'
import { Trash2, RotateCcw, Search, AlertCircle, Package, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
type TabType = 'products' | 'customers'

export function TrashPage() {
    const [activeTab, setActiveTab] = useState<TabType>('products')
    const [searchQuery, setSearchQuery] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<{ id: number, name: string, type: TabType } | null>(null)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [isBulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

    const debouncedSearch = useDebounce(searchQuery.trim(), 300)

    // Product queries
    const {
        data: trashProductPages,
        isLoading: isLoadingProducts,
        fetchNextPage: fetchNextProducts,
        hasNextPage: hasNextProducts,
        isFetchingNextPage: isFetchingNextProducts,
    } = useTrashProducts(debouncedSearch)

    const restoreProductMutation = useRestoreProduct()
    const permanentDeleteProductMutation = usePermanentlyDeleteProduct()
    const bulkPermanentDeleteProductsMutation = useBulkPermanentlyDeleteProducts()
    const bulkRestoreProductsMutation = useBulkRestoreProducts()
    const bulkRestoreCustomersMutation = useBulkRestoreCustomers()

    // Customer queries
    const {
        data: trashCustomerPages,
        isLoading: isLoadingCustomers,
        fetchNextPage: fetchNextCustomers,
        hasNextPage: hasNextCustomers,
        isFetchingNextPage: isFetchingNextCustomers,
    } = useTrashCustomers(debouncedSearch)

    const restoreCustomerMutation = useRestoreCustomer()
    const permanentDeleteCustomerMutation = usePermanentlyDeleteCustomer()

    const filteredProducts = useMemo(
        () => trashProductPages?.pages.flatMap((page) => page.items) ?? [],
        [trashProductPages]
    )
    const filteredCustomers = useMemo(
        () => trashCustomerPages?.pages.flatMap((page) => page.items) ?? [],
        [trashCustomerPages]
    )

    const totalTrashedProducts = trashProductPages?.pages?.[0]?.total ?? 0
    const totalTrashedCustomers = trashCustomerPages?.pages?.[0]?.total ?? 0

    const isLoading = activeTab === 'products' ? isLoadingProducts : isLoadingCustomers
    const items = activeTab === 'products' ? filteredProducts : filteredCustomers
    const totalItems = activeTab === 'products' ? totalTrashedProducts : totalTrashedCustomers
    const isEmpty = !isLoading && items.length === 0

    const loadMoreRef = useInfiniteScroll({
        hasMore: activeTab === 'products' ? Boolean(hasNextProducts) : Boolean(hasNextCustomers),
        isLoading: activeTab === 'products' ? isFetchingNextProducts : isFetchingNextCustomers,
        onLoadMore: () => activeTab === 'products' ? fetchNextProducts() : fetchNextCustomers(),
    })

    const selectedCount = selectedIds.length
    const isSelectionMode = selectedCount > 0

    // Reset selection when switching tabs or search
    useEffect(() => {
        setSelectedIds([])
    }, [activeTab, debouncedSearch])

    useEffect(() => {
        setSelectedIds((prev) => {
            if (prev.length === 0) return prev
            const visibleIds = new Set(items.map((item) => item.id))
            const next = prev.filter((id) => visibleIds.has(id))
            return next.length === prev.length ? prev : next
        })
    }, [items])

    useEffect(() => {
        if (!isSelectionMode) {
            setBulkDeleteDialogOpen(false)
        }
    }, [isSelectionMode])

    const handleRestore = async (itemId: number, itemName: string, type: TabType) => {
        try {
            if (type === 'products') {
                await restoreProductMutation.mutateAsync(itemId)
            } else {
                await restoreCustomerMutation.mutateAsync(itemId)
            }
            toast.success(`✓ Đã khôi phục "${itemName}"`)
            setSelectedIds((prev) => prev.filter((id) => id !== itemId))
        } catch {
            toast.error(`Lỗi khi khôi phục ${type === 'products' ? 'sản phẩm' : 'khách hàng'}`)
        }
    }

    const handlePermanentDelete = async () => {
        if (!deleteTarget) return
        const { id, name, type } = deleteTarget

        try {
            if (type === 'products') {
                await permanentDeleteProductMutation.mutateAsync(id)
            } else {
                await permanentDeleteCustomerMutation.mutateAsync(id)
            }
            toast.success(`✓ Đã xóa vĩnh viễn "${name}"`)
            setSelectedIds((prev) => prev.filter((itemId) => itemId !== id))
        } catch {
            toast.error(`Lỗi khi xóa ${type === 'products' ? 'sản phẩm' : 'khách hàng'}`)
        } finally {
            setDeleteTarget(null)
        }
    }

    const toggleSelected = (itemId: number) => {
        setSelectedIds((prev) =>
            prev.includes(itemId)
                ? prev.filter((id) => id !== itemId)
                : [...prev, itemId]
        )
    }

    const handleSelectAll = () => {
        if (items.length === 0) return
        if (selectedIds.length === items.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(items.map((item) => item.id))
        }
    }

    const handleBulkRestore = async () => {
        if (selectedIds.length === 0) return

        try {
            const count = selectedIds.length
            if (activeTab === 'products') {
                await bulkRestoreProductsMutation.mutateAsync(selectedIds)
            } else {
                await bulkRestoreCustomersMutation.mutateAsync(selectedIds)
            }
            toast.success(`✓ Đã khôi phục ${count} ${activeTab === 'products' ? 'sản phẩm' : 'khách hàng'}`)
            setSelectedIds([])
        } catch {
            toast.error(`Lỗi khi khôi phục ${activeTab === 'products' ? 'sản phẩm' : 'khách hàng'}`)
        }
    }

    const handleBulkPermanentDelete = async () => {
        if (selectedIds.length === 0) return

        try {
            const count = selectedIds.length
            if (activeTab === 'products') {
                await bulkPermanentDeleteProductsMutation.mutateAsync(selectedIds)
            } else {
                // Delete customers one by one (no bulk endpoint yet)
                await Promise.all(selectedIds.map(id => permanentDeleteCustomerMutation.mutateAsync(id)))
            }
            toast.success(`✓ Đã xóa vĩnh viễn ${count} ${activeTab === 'products' ? 'sản phẩm' : 'khách hàng'}`)
            setSelectedIds([])
        } catch {
            toast.error(`Lỗi khi xóa ${activeTab === 'products' ? 'sản phẩm' : 'khách hàng'}`)
        } finally {
            setBulkDeleteDialogOpen(false)
        }
    }

    const msInDay = 1000 * 60 * 60 * 24
    const currentDate = new Date()

    return (
        <div>
            <div className="mb-6">
                <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold">
                    <span className="inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                        <img alt="Trash Icon" className="h-16 w-16 object-contain drop-shadow-sm" src="/Image_yapzehyapzehyapz.png" />
                    </span>
                    Thùng Rác
                </h1>
                <p className="text-muted-foreground">
                    Sản phẩm và khách hàng bị xóa sẽ được xóa vĩnh viễn sau 30 ngày
                </p>
            </div>

            {/* Tab Selector */}
            <div className="mb-6 flex gap-2">
                <Button
                    variant={activeTab === 'products' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('products')}
                    className="gap-2"
                >
                    <Package className="h-4 w-4" />
                    Sản phẩm ({totalTrashedProducts})
                </Button>
                <Button
                    variant={activeTab === 'customers' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('customers')}
                    className="gap-2"
                >
                    <UserRound className="h-4 w-4" />
                    Khách hàng ({totalTrashedCustomers})
                </Button>
            </div>

            {/* Warning Banner */}
            {items.length > 0 && (
                <Card className="mb-6 border-yellow-200 bg-yellow-50">
                    <CardContent className="flex gap-3 pt-6">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                            <p className="font-semibold">Lưu ý:</p>
                            <p>{activeTab === 'products' ? 'Sản phẩm' : 'Khách hàng'} sẽ bị xóa vĩnh viễn nếu không được khôi phục trong 30 ngày</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="mb-6 flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={`🔍 Tìm kiếm ${activeTab === 'products' ? 'sản phẩm' : 'khách hàng'} trong thùng rác (hỗ trợ tìm kiếm không dấu)`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {items.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
                    {isSelectionMode ? (
                        <span className="font-medium text-foreground">
                            Đã chọn {selectedCount}/{items.length} {activeTab === 'products' ? 'sản phẩm' : 'khách hàng'}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">
                            Chọn nhiều {activeTab === 'products' ? 'sản phẩm' : 'khách hàng'} để xóa vĩnh viễn nhanh hơn
                        </span>
                    )}
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            Hiển thị {items.length}
                            {totalItems ? `/${totalItems}` : ''} {activeTab === 'products' ? 'sản phẩm' : 'khách hàng'}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            disabled={items.length === 0}
                        >
                            {selectedCount === items.length && items.length > 0
                                ? 'Bỏ chọn tất cả'
                                : 'Chọn tất cả'}
                        </Button>
                        {isSelectionMode && activeTab === 'products' && (
                            <>
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={handleBulkRestore}
                                    disabled={bulkRestoreProductsMutation.isPending}
                                >
                                    {bulkRestoreProductsMutation.isPending
                                        ? 'Đang khôi phục...'
                                        : `Khôi phục ${selectedCount} sản phẩm`}
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setBulkDeleteDialogOpen(true)}
                                    disabled={bulkPermanentDeleteProductsMutation.isPending}
                                >
                                    {bulkPermanentDeleteProductsMutation.isPending
                                        ? 'Đang xóa...'
                                        : `Xóa vĩnh viễn ${selectedCount} sản phẩm`}
                                </Button>
                            </>
                        )}
                        {isSelectionMode && activeTab === 'customers' && (
                            <>
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={handleBulkRestore}
                                    disabled={restoreCustomerMutation.isPending}
                                >
                                    {restoreCustomerMutation.isPending
                                        ? 'Đang khôi phục...'
                                        : `Khôi phục ${selectedCount} khách hàng`}
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setBulkDeleteDialogOpen(true)}
                                    disabled={permanentDeleteCustomerMutation.isPending}
                                >
                                    {permanentDeleteCustomerMutation.isPending
                                        ? 'Đang xóa...'
                                        : `Xóa vĩnh viễn ${selectedCount} khách hàng`}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && isEmpty && (
                <Card>
                    <CardContent className="pt-12 pb-12 text-center">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-lg font-semibold mb-1">Thùng rác trống</p>
                        <p className="text-muted-foreground">
                            Không có {activeTab === 'products' ? 'sản phẩm' : 'khách hàng'} bị xóa
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Products List */}
            {!isLoading && activeTab === 'products' && filteredProducts.length > 0 && (
                <div className="space-y-3">
                    {filteredProducts.map((product) => {
                        const isSelected = selectedIds.includes(product.id)
                        const deletedAt = product.deleted_at ? new Date(product.deleted_at) : null
                        const deletedDaysAgo = deletedAt
                            ? Math.floor((currentDate.getTime() - deletedAt.getTime()) / msInDay)
                            : 0
                        const daysUntilPermanent = 30 - deletedDaysAgo

                        return (
                            <Card
                                key={product.id}
                                className={cn(
                                    "relative transition-shadow hover:shadow-md cursor-pointer",
                                    isSelected && "border-destructive bg-destructive/5 shadow-lg"
                                )}
                                onClick={() => toggleSelected(product.id)}
                            >
                                <CardContent className="flex items-center justify-between gap-4 pt-6">
                                    <div className="absolute right-4 top-4 z-10 rounded bg-background/80 p-1 shadow">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 cursor-pointer"
                                            checked={isSelected}
                                            onChange={(event) => {
                                                event.stopPropagation()
                                                toggleSelected(product.id)
                                            }}
                                            onClick={(event) => event.stopPropagation()}
                                            aria-label="Chọn sản phẩm để xóa"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">
                                            {searchQuery.trim() ? (
                                                <SearchHighlight text={product.name} query={searchQuery} />
                                            ) : (
                                                product.name
                                            )}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {product.category && (
                                                <>
                                                    📦{' '}
                                                    {searchQuery.trim() ? (
                                                        <SearchHighlight text={product.category} query={searchQuery} />
                                                    ) : (
                                                        product.category
                                                    )}
                                                    {' • '}
                                                </>
                                            )}
                                            Giá: {product.price ? formatCurrency(product.price) : 'Chưa có giá'}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            🗑️ Xóa {deletedDaysAgo} ngày trước
                                            {daysUntilPermanent > 0 && (
                                                <span className="ml-2 font-semibold">
                                                    (Còn {daysUntilPermanent} ngày)
                                                </span>
                                            )}
                                            {daysUntilPermanent <= 0 && (
                                                <span className="ml-2 text-red-600 font-semibold">
                                                    (Sắp bị xóa vĩnh viễn)
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                handleRestore(product.id, product.name, 'products')
                                            }}
                                            disabled={restoreProductMutation.isPending}
                                            className="gap-2"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Khôi phục
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                setDeleteTarget({ id: product.id, name: product.name, type: 'products' })
                                            }}
                                            disabled={permanentDeleteProductMutation.isPending}
                                            className="gap-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Xóa vĩnh viễn
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Customers List */}
            {!isLoading && activeTab === 'customers' && filteredCustomers.length > 0 && (
                <div className="space-y-3">
                    {filteredCustomers.map((customer) => {
                        const isSelected = selectedIds.includes(customer.id)
                        const deletedAt = customer.deleted_at ? new Date(customer.deleted_at) : null
                        const deletedDaysAgo = deletedAt
                            ? Math.floor((currentDate.getTime() - deletedAt.getTime()) / msInDay)
                            : 0
                        const daysUntilPermanent = 30 - deletedDaysAgo

                        return (
                            <Card
                                key={customer.id}
                                className={cn(
                                    "relative transition-shadow hover:shadow-md cursor-pointer",
                                    isSelected && "border-destructive bg-destructive/5 shadow-lg"
                                )}
                                onClick={() => toggleSelected(customer.id)}
                            >
                                <CardContent className="flex items-center justify-between gap-4 pt-6">
                                    <div className="absolute right-4 top-4 z-10 rounded bg-background/80 p-1 shadow">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 cursor-pointer"
                                            checked={isSelected}
                                            onChange={(event) => {
                                                event.stopPropagation()
                                                toggleSelected(customer.id)
                                            }}
                                            onClick={(event) => event.stopPropagation()}
                                            aria-label="Chọn khách hàng để xóa"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">
                                            {searchQuery.trim() ? (
                                                <SearchHighlight text={customer.name} query={searchQuery} />
                                            ) : (
                                                customer.name
                                            )}
                                        </p>
                                        {customer.phone && (
                                            <p className="text-sm text-muted-foreground">
                                                📞 {searchQuery.trim() ? (
                                                    <SearchHighlight text={customer.phone} query={searchQuery} />
                                                ) : (
                                                    customer.phone
                                                )}
                                            </p>
                                        )}
                                        {customer.email && (
                                            <p className="text-sm text-muted-foreground">
                                                📧 {searchQuery.trim() ? (
                                                    <SearchHighlight text={customer.email} query={searchQuery} />
                                                ) : (
                                                    customer.email
                                                )}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">
                                            🗑️ Xóa {deletedDaysAgo} ngày trước
                                            {daysUntilPermanent > 0 && (
                                                <span className="ml-2 font-semibold">
                                                    (Còn {daysUntilPermanent} ngày)
                                                </span>
                                            )}
                                            {daysUntilPermanent <= 0 && (
                                                <span className="ml-2 text-red-600 font-semibold">
                                                    (Sắp bị xóa vĩnh viễn)
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                handleRestore(customer.id, customer.name, 'customers')
                                            }}
                                            disabled={restoreCustomerMutation.isPending}
                                            className="gap-2"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Khôi phục
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                setDeleteTarget({ id: customer.id, name: customer.name, type: 'customers' })
                                            }}
                                            disabled={permanentDeleteCustomerMutation.isPending}
                                            className="gap-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Xóa vĩnh viễn
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Loading State */}
            {isLoading && items.length === 0 && (
                <div className="text-center py-12">
                    <div className="animate-spin text-2xl mb-3">⏳</div>
                    <p className="text-muted-foreground">Đang tải...</p>
                </div>
            )}

            {((activeTab === 'products' && (hasNextProducts || isFetchingNextProducts)) ||
                (activeTab === 'customers' && (hasNextCustomers || isFetchingNextCustomers))) && (
                    <div
                        ref={loadMoreRef}
                        className="py-6 text-center text-sm text-muted-foreground"
                    >
                        {(activeTab === 'products' ? isFetchingNextProducts : isFetchingNextCustomers)
                            ? 'Đang tải thêm...'
                            : `Kéo xuống để xem thêm ${activeTab === 'products' ? 'sản phẩm' : 'khách hàng'} đã xóa`}
                    </div>
                )}

            {/* Bulk Delete Dialog */}
            <Dialog
                open={isBulkDeleteDialogOpen}
                onOpenChange={(open) => setBulkDeleteDialogOpen(open && isSelectionMode)}
            >
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Xóa vĩnh viễn {selectedCount} {activeTab === 'products' ? 'sản phẩm' : 'khách hàng'}?</DialogTitle>
                        <DialogDescription>
                            ⚠️ Các {activeTab === 'products' ? 'sản phẩm' : 'khách hàng'} được chọn sẽ bị xóa vĩnh viễn và không thể khôi phục lại.
                            Bạn có chắc chắn muốn tiếp tục?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkDeleteDialogOpen(false)}
                            disabled={
                                activeTab === 'products'
                                    ? bulkPermanentDeleteProductsMutation.isPending
                                    : permanentDeleteCustomerMutation.isPending
                            }
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleBulkPermanentDelete}
                            disabled={
                                activeTab === 'products'
                                    ? bulkPermanentDeleteProductsMutation.isPending
                                    : permanentDeleteCustomerMutation.isPending
                            }
                        >
                            {(activeTab === 'products'
                                ? bulkPermanentDeleteProductsMutation.isPending
                                : permanentDeleteCustomerMutation.isPending)
                                ? 'Đang xóa...'
                                : `Xóa vĩnh viễn ${selectedCount} ${activeTab === 'products' ? 'sản phẩm' : 'khách hàng'}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Single Delete Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Xóa vĩnh viễn {deleteTarget?.type === 'products' ? 'sản phẩm' : 'khách hàng'}?</DialogTitle>
                        <DialogDescription>
                            ⚠️ Xóa vĩnh viễn "{deleteTarget?.name}" sẽ không thể khôi phục. Bạn có chắc chắn?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={
                                deleteTarget?.type === 'products'
                                    ? permanentDeleteProductMutation.isPending
                                    : permanentDeleteCustomerMutation.isPending
                            }
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handlePermanentDelete}
                            disabled={
                                deleteTarget?.type === 'products'
                                    ? permanentDeleteProductMutation.isPending
                                    : permanentDeleteCustomerMutation.isPending
                            }
                        >
                            {(deleteTarget?.type === 'products'
                                ? permanentDeleteProductMutation.isPending
                                : permanentDeleteCustomerMutation.isPending)
                                ? 'Đang xóa...'
                                : 'Xóa vĩnh viễn'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
