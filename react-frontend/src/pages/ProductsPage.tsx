import { useEffect, useState } from 'react'
import { useProducts, useProductSearch, useDeleteProduct, useBulkDeleteProducts } from '../hooks/useProducts'
import { useDebounce } from '../hooks/useDebounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AddProductDialog } from '../components/products/AddProductDialog'
import { EditProductDialog } from '../components/products/EditProductDialog'
import { ProductDetailsDialog } from '@/components/products/ProductDetailsDialog'
import { formatCurrency, getProductImageUrl, cn } from '@/lib/utils'
import type { Product } from '@/types'
import { Pencil, Trash2, Search, ImageOff } from 'lucide-react'
import { toast } from 'sonner'

export function ProductsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])

    const debouncedSearch = useDebounce(searchQuery.trim(), 100)

    const { data: allProducts, isLoading: isLoadingAll } = useProducts()
    const {
        data: searchResults,
        isLoading: isSearchLoading,
    } = useProductSearch(debouncedSearch)
    const deleteProduct = useDeleteProduct()
    const bulkDeleteProducts = useBulkDeleteProducts()

    const products = debouncedSearch ? searchResults : allProducts
    const isLoading = debouncedSearch ? (isSearchLoading && !searchResults) : isLoadingAll
    const selectedCount = selectedProductIds.length
    const isSelectionMode = selectedCount > 0

    useEffect(() => {
        if (!products) {
            setSelectedProductIds((prev) => (prev.length > 0 ? [] : prev))
            return
        }
        setSelectedProductIds((prev) => {
            const visibleIds = new Set(products.map((p) => p.id))
            const next = prev.filter((id) => visibleIds.has(id))
            return next.length === prev.length ? prev : next
        })
    }, [products])

    const handleDelete = async (id: number) => {
        // Delete immediately without confirmation
        // User can restore from trash within 30 days
        try {
            const productName = products?.find(p => p.id === id)?.name || 'Sản phẩm'
            await deleteProduct.mutateAsync(id)
            toast.success(`✓ Đã xóa "${productName}". Có thể khôi phục trong Thùng rác.`)
            setSelectedProductIds((prev) => prev.filter((selectedId) => selectedId !== id))
        } catch {
            toast.error('Lỗi khi xóa sản phẩm')
        }
    }

    const toggleProductSelection = (productId: number) => {
        setSelectedProductIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId]
        )
    }

    const handleSelectAll = () => {
        if (!products || products.length === 0) return
        if (selectedProductIds.length === products.length) {
            setSelectedProductIds([])
        } else {
            setSelectedProductIds(products.map((product) => product.id))
        }
    }

    const handleBulkDelete = async () => {
        if (selectedProductIds.length === 0) return
        try {
            const count = selectedProductIds.length
            await bulkDeleteProducts.mutateAsync(selectedProductIds)
            toast.success(`✓ Đã chuyển ${count} sản phẩm vào Thùng rác`)
            setSelectedProductIds([])
        } catch {
            toast.error('Lỗi khi xóa sản phẩm')
        }
    }

    const handleCardClick = (product: Product) => {
        if (isSelectionMode) {
            toggleProductSelection(product.id)
        } else {
            setSelectedProduct(product)
        }
    }

    return (
        <div>
            <h1 className="mb-6 text-3xl font-bold">📦 Quản Lý Sản Phẩm</h1>

            {/* Search and Add Button */}
            <div className="mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="🔍 Tìm kiếm sản phẩm"
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                    ➕ Thêm mới
                </Button>
            </div>

            {products && products.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
                    {isSelectionMode ? (
                        <span className="font-medium text-foreground">
                            Đã chọn {selectedCount}/{products.length} sản phẩm
                        </span>
                    ) : (
                        <span className="text-muted-foreground">
                            Bật các ô chọn để xóa nhiều sản phẩm cùng lúc
                        </span>
                    )}
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            disabled={products.length === 0}
                        >
                            {selectedCount === products.length && products.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </Button>
                        {isSelectionMode && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                disabled={bulkDeleteProducts.isPending}
                            >
                                {bulkDeleteProducts.isPending ? 'Đang xóa...' : `Xóa ${selectedCount} sản phẩm`}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Products Grid */}
            {isLoading ? (
                <div className="text-center text-muted-foreground">Đang tải...</div>
            ) : !products || products.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
                    {searchQuery ? `Không tìm thấy sản phẩm '${searchQuery}'` : 'Chưa có sản phẩm nào'}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => {
                        const isSelected = selectedProductIds.includes(product.id)
                        const hasImage = !!product.images && product.images.length > 0
                        return (
                            <Card
                                key={product.id}
                                className={cn(
                                    "group relative cursor-pointer transition-shadow hover:shadow-md",
                                    isSelected && "border-primary shadow-lg"
                                )}
                                onClick={() => handleCardClick(product)}
                            >
                                <div className="absolute right-3 top-3 z-10 rounded-lg bg-background/80 p-1.5 shadow">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 cursor-pointer"
                                        checked={isSelected}
                                        onChange={(event) => {
                                            event.stopPropagation()
                                            toggleProductSelection(product.id)
                                        }}
                                        onClick={(event) => event.stopPropagation()}
                                        aria-label="Chọn sản phẩm"
                                    />
                                </div>
                                <div className="h-40 w-full overflow-hidden rounded-t-lg border-b bg-muted">
                                    {hasImage ? (
                                        <img
                                            src={getProductImageUrl(product.images[0])}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-50 to-slate-100 text-muted-foreground">
                                            <ImageOff className="h-6 w-6" />
                                            <span className="text-sm font-medium">Chưa có ảnh</span>
                                        </div>
                                    )}
                                </div>
                                <CardHeader>
                                    <CardTitle>{product.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="space-y-1">
                                        <p className="text-lg font-bold text-green-600">
                                            💰 {formatCurrency(product.price)}
                                        </p>
                                    </div>
                                    {product.category && (
                                        <p className="text-sm text-muted-foreground">📁 {product.category}</p>
                                    )}
                                    {product.unit && (
                                        <p className="text-sm text-muted-foreground">📦 Đơn vị: {product.unit}</p>
                                    )}
                                    {product.description && (
                                        <p className="line-clamp-2 text-sm text-muted-foreground">
                                            📝 {product.description}
                                        </p>
                                    )}
                                </CardContent>
                                <CardFooter className="gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            setEditingProduct(product)
                                        }}
                                    >
                                        <Pencil className="mr-1 h-4 w-4" />
                                        Sửa
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="flex-1"
                                        onClick={async (event) => {
                                            event.stopPropagation()
                                            await handleDelete(product.id)
                                        }}
                                    >
                                        <Trash2 className="mr-1 h-4 w-4" />
                                        Xóa
                                    </Button>
                                </CardFooter>
                        </Card>
                    )})}
                </div>
            )}

            {/* Dialogs */}
            <AddProductDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
            {editingProduct && (
                <EditProductDialog
                    product={editingProduct}
                    open={!!editingProduct}
                    onOpenChange={(open) => !open && setEditingProduct(null)}
                />
            )}
            <ProductDetailsDialog
                key={selectedProduct?.id ?? 'no-product'}
                product={selectedProduct}
                open={!!selectedProduct}
                onOpenChange={(open) => !open && setSelectedProduct(null)}
            />
        </div>
    )
}
