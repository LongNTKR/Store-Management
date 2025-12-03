import { useState } from 'react'
import { useProducts, useProductSearch, useDeleteProduct } from '../hooks/useProducts'
import { useDebounce } from '../hooks/useDebounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AddProductDialog } from '../components/products/AddProductDialog'
import { EditProductDialog } from '../components/products/EditProductDialog'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'
import { Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'

export function ProductsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)

    const debouncedSearch = useDebounce(searchQuery.trim(), 100)

    const { data: allProducts, isLoading: isLoadingAll } = useProducts()
    const {
        data: searchResults,
        isLoading: isSearchLoading,
    } = useProductSearch(debouncedSearch)
    const deleteProduct = useDeleteProduct()

    const products = debouncedSearch ? searchResults : allProducts
    const isLoading = debouncedSearch ? (isSearchLoading && !searchResults) : isLoadingAll

    const handleDelete = async (id: number) => {
        // Delete immediately without confirmation
        // User can restore from trash within 30 days
        try {
            const productName = products?.find(p => p.id === id)?.name || 'Sản phẩm'
            await deleteProduct.mutateAsync(id)
            toast.success(`✓ Đã xóa "${productName}". Có thể khôi phục trong Thùng rác.`)
        } catch (error) {
            toast.error('Lỗi khi xóa sản phẩm')
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

            {/* Products Grid */}
            {isLoading ? (
                <div className="text-center text-muted-foreground">Đang tải...</div>
            ) : !products || products.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
                    {searchQuery ? `Không tìm thấy sản phẩm '${searchQuery}'` : 'Chưa có sản phẩm nào'}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                        <Card key={product.id} className="transition-shadow hover:shadow-md">
                            <CardHeader>
                                <CardTitle>{product.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-green-600">
                                        💰 {formatCurrency(product.price)}
                                    </p>
                                    {product.import_price && product.import_price > 0 && (
                                        <>
                                            <p className="text-sm text-muted-foreground">
                                                📦 Giá nhập: {formatCurrency(product.import_price)}
                                            </p>
                                            {product.price > product.import_price && (
                                                <p className="text-xs text-blue-600">
                                                    📈 Lãi: {formatCurrency(product.price - product.import_price)}
                                                    ({(((product.price - product.import_price) / product.import_price) * 100).toFixed(1)}%)
                                                </p>
                                            )}
                                            {product.price < product.import_price && (
                                                <p className="text-xs text-red-600">
                                                    📉 Lỗ: -{formatCurrency(product.import_price - product.price)}
                                                    (-{(((product.import_price - product.price) / product.import_price) * 100).toFixed(1)}%)
                                                </p>
                                            )}
                                        </>
                                    )}
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
                                    onClick={() => setEditingProduct(product)}
                                >
                                    <Pencil className="mr-1 h-4 w-4" />
                                    Sửa
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleDelete(product.id)}
                                >
                                    <Trash2 className="mr-1 h-4 w-4" />
                                    Xóa
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
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
        </div>
    )
}
