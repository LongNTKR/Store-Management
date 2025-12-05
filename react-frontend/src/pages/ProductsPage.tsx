import { useEffect, useMemo, useRef, useState } from 'react'
import { useProducts, useDeleteProduct, useBulkDeleteProducts, useAutocomplete } from '../hooks/useProducts'
import { useDebounce } from '../hooks/useDebounce'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddProductDialog } from '../components/products/AddProductDialog'
import { EditProductDialog } from '../components/products/EditProductDialog'
import { ProductDetailsDialog } from '@/components/products/ProductDetailsDialog'
import { SearchHighlight } from '@/components/shared/SearchHighlight'
import { formatCurrency, getProductImageUrl, cn } from '@/lib/utils'
import type { Product } from '@/types'
import { Pencil, Trash2, Search, ImageOff, Circle, CheckCircle2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function ProductsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
    const [showAutocomplete, setShowAutocomplete] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(0)

    const searchInputRef = useRef<HTMLInputElement>(null)
    const autocompleteRef = useRef<HTMLDivElement>(null)

    const debouncedSearch = useDebounce(searchQuery.trim(), 100)
    const debouncedAutocomplete = useDebounce(searchQuery.trim(), 300)

    const {
        data: productPages,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useProducts(debouncedSearch)
    const { data: autocompleteResults } = useAutocomplete(debouncedAutocomplete)
    const deleteProduct = useDeleteProduct()
    const bulkDeleteProducts = useBulkDeleteProducts()

    const products = useMemo(
        () => productPages?.pages.flatMap((page) => page.items) ?? [],
        [productPages]
    )
    const totalProducts = productPages?.pages?.[0]?.total ?? 0
    const selectedCount = selectedProductIds.length
    const isSelectionMode = selectedCount > 0
    const isInitialLoading = isLoading && products.length === 0
    const isEmpty = !isLoading && products.length === 0
    const loadMoreRef = useInfiniteScroll({
        hasMore: Boolean(hasNextPage),
        isLoading: isFetchingNextPage,
        onLoadMore: () => fetchNextPage(),
    })

    useEffect(() => {
        setSelectedProductIds((prev) => {
            if (prev.length === 0) return prev
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

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)
        setShowAutocomplete(value.trim().length > 0)
        setHighlightedIndex(0)
    }

    const handleAutocompleteSelect = (product: Product) => {
        setSearchQuery(product.name)
        setShowAutocomplete(false)
        searchInputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showAutocomplete || !autocompleteResults || autocompleteResults.length === 0) {
            return
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setHighlightedIndex((prev) =>
                    prev < autocompleteResults.length - 1 ? prev + 1 : 0
                )
                break
            case 'ArrowUp':
                e.preventDefault()
                setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : autocompleteResults.length - 1
                )
                break
            case 'Enter':
                e.preventDefault()
                if (autocompleteResults[highlightedIndex]) {
                    handleAutocompleteSelect(autocompleteResults[highlightedIndex])
                }
                break
            case 'Escape':
                setShowAutocomplete(false)
                break
        }
    }

    // Close autocomplete when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                autocompleteRef.current &&
                !autocompleteRef.current.contains(event.target as Node) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(event.target as Node)
            ) {
                setShowAutocomplete(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Update autocomplete visibility based on query
    useEffect(() => {
        if (searchQuery.trim().length === 0) {
            setShowAutocomplete(false)
        }
    }, [searchQuery])

    return (
        <div>
            <h1 className="mb-6 flex items-center gap-3 text-3xl font-bold">
                <span className="inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                    <img alt="Product Management Icon" className="h-16 w-16 object-contain drop-shadow-sm" src="/Image_iasozuiasozuiaso.png" />
                </span>
                Quản Lý Sản Phẩm
            </h1>

            {/* Search and Add Button */}
            <div className="mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        placeholder="🔍 Tìm kiếm sản phẩm (hỗ trợ tìm kiếm không dấu)"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onKeyDown={handleKeyDown}
                        className="pl-10"
                        autoComplete="off"
                    />

                    {/* Autocomplete Dropdown */}
                    {showAutocomplete && autocompleteResults && autocompleteResults.length > 0 && (
                        <div
                            ref={autocompleteRef}
                            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-md border bg-popover shadow-lg"
                        >
                            <div className="p-2 text-xs text-muted-foreground border-b">
                                {autocompleteResults.length} gợi ý
                            </div>
                            {autocompleteResults.map((product, index) => (
                                <div
                                    key={product.id}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 p-3 hover:bg-accent",
                                        highlightedIndex === index && "bg-accent"
                                    )}
                                    onClick={() => handleAutocompleteSelect(product)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    {product.images?.[0] && (
                                        <img
                                            src={getProductImageUrl(product.images[0])}
                                            alt={product.name}
                                            className="h-10 w-10 rounded object-cover"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">
                                            <SearchHighlight text={product.name} query={searchQuery} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {product.price ? formatCurrency(product.price) : 'Chưa có giá'}
                                            {product.category && ` • ${product.category}`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                    ➕ Thêm mới
                </Button>
            </div>

            {products.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-gradient-to-r from-slate-50 via-white to-blue-50 px-4 py-3 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
                            <Sparkles className="h-4 w-4" />
                        </span>
                        <div>
                            <p className="text-sm font-medium text-foreground">Chọn nhiều sản phẩm</p>
                            <p className="text-xs text-muted-foreground">
                                {isSelectionMode
                                    ? `Đã chọn ${selectedCount}/${products.length} sản phẩm`
                                    : 'Nhấn vào chấm tròn trên thẻ để chọn/bỏ chọn sản phẩm'}
                            </p>
                        </div>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            Hiển thị {products.length}
                            {totalProducts ? `/${totalProducts}` : ''} sản phẩm
                        </span>
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
            {isInitialLoading ? (
                <div className="text-center text-muted-foreground">Đang tải...</div>
            ) : isEmpty ? (
                <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
                    {searchQuery ? `Không tìm thấy sản phẩm '${searchQuery}'` : 'Chưa có sản phẩm nào'}
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {products.map((product) => {
                            const isSelected = selectedProductIds.includes(product.id)
                            const coverImage = product.images?.[0]
                            return (
                                <Card
                                    key={product.id}
                                    className={cn(
                                        "group relative cursor-pointer transition-shadow hover:shadow-md",
                                        isSelected && "border-primary shadow-lg shadow-primary/10"
                                    )}
                                    onClick={() => handleCardClick(product)}
                                >
                                    <div className="h-40 w-full overflow-hidden rounded-t-lg border-b bg-muted">
                                        {coverImage ? (
                                            <img
                                                src={getProductImageUrl(coverImage)}
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
                                    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">
                                                {searchQuery.trim() ? (
                                                    <SearchHighlight text={product.name} query={searchQuery} />
                                                ) : (
                                                    product.name
                                                )}
                                            </CardTitle>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    toggleProductSelection(product.id)
                                                }}
                                                className={cn(
                                                    "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-150",
                                                    isSelected
                                                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
                                                        : "border-slate-200 bg-white text-slate-500 hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
                                                )}
                                                aria-pressed={isSelected}
                                                aria-label={isSelected ? "Bỏ chọn sản phẩm" : "Chọn sản phẩm"}
                                            >
                                                {isSelected ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                            </button>
                                            <div className="flex items-start gap-1 rounded-full bg-white/80 px-1.5 py-1 shadow-sm ring-1 ring-slate-200">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:text-primary"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        setEditingProduct(product)
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={async (event) => {
                                                        event.stopPropagation()
                                                        await handleDelete(product.id)
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="space-y-1">
                                            <p className="text-lg font-bold text-green-600">
                                                💰 {product.price ? formatCurrency(product.price) : 'Chưa có giá'}
                                            </p>
                                        </div>
                                        {product.category && (
                                            <p className="text-sm text-muted-foreground">
                                                📁 {searchQuery.trim() ? (
                                                    <SearchHighlight text={product.category} query={searchQuery} />
                                                ) : (
                                                    product.category
                                                )}
                                            </p>
                                        )}
                                        {product.unit && (
                                            <p className="text-sm text-muted-foreground">📦 Đơn vị: {product.unit}</p>
                                        )}
                                        {product.description && (
                                            <p className="line-clamp-2 text-sm text-muted-foreground">
                                                📝 {searchQuery.trim() ? (
                                                    <SearchHighlight text={product.description} query={searchQuery} />
                                                ) : (
                                                    product.description
                                                )}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                    {(hasNextPage || isFetchingNextPage) && (
                        <div
                            ref={loadMoreRef}
                            className="mt-6 flex items-center justify-center text-sm text-muted-foreground"
                        >
                            {isFetchingNextPage ? 'Đang tải thêm...' : 'Kéo xuống để tải thêm sản phẩm'}
                        </div>
                    )}
                </>
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
