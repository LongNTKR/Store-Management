import { useState } from 'react'
import { useTrashProducts, useRestoreProduct, usePermanentlyDeleteProduct } from '@/hooks/useTrash'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { Trash2, RotateCcw, Search, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function TrashPage() {
    const { data: trashedProducts = [], isLoading } = useTrashProducts()
    const restoreMutation = useRestoreProduct()
    const permanentDeleteMutation = usePermanentlyDeleteProduct()
    const [searchQuery, setSearchQuery] = useState('')

    // Filter by search query
    const filteredProducts = trashedProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleRestore = async (productId: number, productName: string) => {
        try {
            await restoreMutation.mutateAsync(productId)
            toast.success(`✓ Đã khôi phục "${productName}"`)
        } catch (error) {
            toast.error('Lỗi khi khôi phục sản phẩm')
        }
    }

    const handlePermanentDelete = async (productId: number, productName: string) => {
        const confirmed = window.confirm(
            `⚠️ Xóa vĩnh viễn "${productName}" không thể khôi phục!\n\nBạn chắc chắn?`
        )
        if (!confirmed) return

        try {
            await permanentDeleteMutation.mutateAsync(productId)
            toast.success(`✓ Đã xóa vĩnh viễn "${productName}"`)
        } catch (error) {
            toast.error('Lỗi khi xóa sản phẩm')
        }
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="mb-2 text-3xl font-bold">🗑️ Thùng Rác</h1>
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
                        const deletedAt = product.deleted_at ? new Date(product.deleted_at) : null
                        const deletedDaysAgo = deletedAt
                            ? Math.floor((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24))
                            : 0
                        const daysUntilPermanent = 30 - deletedDaysAgo

                        return (
                            <Card key={product.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="flex items-center justify-between gap-4 pt-6">
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
                                            onClick={() => handleRestore(product.id, product.name)}
                                            disabled={restoreMutation.isPending}
                                            className="gap-2"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Khôi phục
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handlePermanentDelete(product.id, product.name)}
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
        </div>
    )
}
