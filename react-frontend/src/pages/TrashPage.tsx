import { useEffect, useState } from 'react'
import {
    useTrashProducts,
    useRestoreProduct,
    usePermanentlyDeleteProduct,
    useBulkPermanentlyDeleteProducts,
    useBulkRestoreProducts,
} from '@/hooks/useTrash'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
import { Trash2, RotateCcw, Search, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

export function TrashPage() {
    const { data: trashedProducts = [], isLoading } = useTrashProducts()
    const restoreMutation = useRestoreProduct()
    const permanentDeleteMutation = usePermanentlyDeleteProduct()
    const bulkPermanentDeleteMutation = useBulkPermanentlyDeleteProducts()
    const bulkRestoreMutation = useBulkRestoreProducts()
    const [searchQuery, setSearchQuery] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<{ id: number, name: string } | null>(null)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [isBulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

    // Filter by search query
    const filteredProducts = trashedProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const selectedCount = selectedIds.length
    const isSelectionMode = selectedCount > 0

    useEffect(() => {
        setSelectedIds((prev) => {
            if (prev.length === 0) return prev
            const visibleIds = new Set(filteredProducts.map((product) => product.id))
            const next = prev.filter((id) => visibleIds.has(id))
            return next.length === prev.length ? prev : next
        })
    }, [filteredProducts])

    useEffect(() => {
        if (!isSelectionMode) {
            setBulkDeleteDialogOpen(false)
        }
    }, [isSelectionMode])

    const handleRestore = async (productId: number, productName: string) => {
        try {
            await restoreMutation.mutateAsync(productId)
            toast.success(`✓ Đã khôi phục "${productName}"`)
            setSelectedIds((prev) => prev.filter((id) => id !== productId))
        } catch {
            toast.error('Lỗi khi khôi phục sản phẩm')
        }
    }

    const handlePermanentDelete = async () => {
        if (!deleteTarget) return
        const targetId = deleteTarget.id
        const targetName = deleteTarget.name

        try {
            await permanentDeleteMutation.mutateAsync(targetId)
            toast.success(`✓ Đã xóa vĩnh viễn "${targetName}"`)
            setSelectedIds((prev) => prev.filter((id) => id !== targetId))
        } catch {
            toast.error('Lỗi khi xóa sản phẩm')
        } finally {
            setDeleteTarget(null)
        }
    }

    const toggleSelected = (productId: number) => {
        setSelectedIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId]
        )
    }

    const handleSelectAll = () => {
        if (filteredProducts.length === 0) return
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredProducts.map((product) => product.id))
        }
    }

    const handleBulkRestore = async () => {
        if (selectedIds.length === 0) return

        try {
            const count = selectedIds.length
            await bulkRestoreMutation.mutateAsync(selectedIds)
            toast.success(`✓ Đã khôi phục ${count} sản phẩm`)
            setSelectedIds([])
        } catch {
            toast.error('Lỗi khi khôi phục sản phẩm')
        }
    }

    const handleBulkPermanentDelete = async () => {
        if (selectedIds.length === 0) return

        try {
            const count = selectedIds.length
            await bulkPermanentDeleteMutation.mutateAsync(selectedIds)
            toast.success(`✓ Đã xóa vĩnh viễn ${count} sản phẩm`)
            setSelectedIds([])
        } catch {
            toast.error('Lỗi khi xóa sản phẩm')
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
                    Sản phẩm bị xóa sẽ được xóa vĩnh viễn sau 30 ngày
                </p>
            </div>

            {/* Warning Banner */}
            {filteredProducts.length > 0 && (
                <Card className="mb-6 border-yellow-200 bg-yellow-50">
                    <CardContent className="flex gap-3 pt-6">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                            <p className="font-semibold">Lưu ý:</p>
                            <p>Sản phẩm sẽ bị xóa vĩnh viễn nếu không được khôi phục trong 30 ngày</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="mb-6 flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm trong thùng rác..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {filteredProducts.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
                    {isSelectionMode ? (
                        <span className="font-medium text-foreground">
                            Đã chọn {selectedCount}/{filteredProducts.length} sản phẩm
                        </span>
                    ) : (
                        <span className="text-muted-foreground">
                            Chọn nhiều sản phẩm để xóa vĩnh viễn nhanh hơn
                        </span>
                    )}
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            disabled={filteredProducts.length === 0}
                        >
                            {selectedCount === filteredProducts.length && filteredProducts.length > 0
                                ? 'Bỏ chọn tất cả'
                                : 'Chọn tất cả'}
                        </Button>
                        {isSelectionMode && (
                            <>
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={handleBulkRestore}
                                    disabled={bulkRestoreMutation.isPending}
                                >
                                    {bulkRestoreMutation.isPending
                                        ? 'Đang khôi phục...'
                                        : `Khôi phục ${selectedCount} sản phẩm`}
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setBulkDeleteDialogOpen(true)}
                                    disabled={bulkPermanentDeleteMutation.isPending}
                                >
                                    {bulkPermanentDeleteMutation.isPending
                                        ? 'Đang xóa...'
                                        : `Xóa vĩnh viễn ${selectedCount} sản phẩm`}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredProducts.length === 0 && (
                <Card>
                    <CardContent className="pt-12 pb-12 text-center">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-lg font-semibold mb-1">Thùng rác trống</p>
                        <p className="text-muted-foreground">
                            Không có sản phẩm bị xóa
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Trash List */}
            {!isLoading && filteredProducts.length > 0 && (
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
                                        <p className="font-semibold truncate">{product.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {product.category && `📦 ${product.category} • `}
                                            Giá: {formatCurrency(product.price)}
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

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                handleRestore(product.id, product.name)
                                            }}
                                            disabled={restoreMutation.isPending}
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
                                                setDeleteTarget({ id: product.id, name: product.name })
                                            }}
                                            disabled={permanentDeleteMutation.isPending}
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
            {isLoading && (
                <div className="text-center py-12">
                    <div className="animate-spin text-2xl mb-3">⏳</div>
                    <p className="text-muted-foreground">Đang tải...</p>
                </div>
            )}

            <Dialog
                open={isBulkDeleteDialogOpen}
                onOpenChange={(open) => setBulkDeleteDialogOpen(open && isSelectionMode)}
            >
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Xóa vĩnh viễn {selectedCount} sản phẩm?</DialogTitle>
                        <DialogDescription>
                            ⚠️ Các sản phẩm được chọn sẽ bị xóa vĩnh viễn và không thể khôi phục lại.
                            Bạn có chắc chắn muốn tiếp tục?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkDeleteDialogOpen(false)}
                            disabled={bulkPermanentDeleteMutation.isPending}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleBulkPermanentDelete}
                            disabled={bulkPermanentDeleteMutation.isPending}
                        >
                            {bulkPermanentDeleteMutation.isPending
                                ? 'Đang xóa...'
                                : `Xóa vĩnh viễn ${selectedCount} sản phẩm`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Xóa vĩnh viễn sản phẩm?</DialogTitle>
                        <DialogDescription>
                            ⚠️ Xóa vĩnh viễn "{deleteTarget?.name}" sẽ không thể khôi phục. Bạn có chắc chắn?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={permanentDeleteMutation.isPending}>
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handlePermanentDelete}
                            disabled={permanentDeleteMutation.isPending}
                        >
                            {permanentDeleteMutation.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
