import { useState, type ChangeEvent } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrency } from '@/lib/utils'
import { searchService } from '@/services/search'
import type { Product } from '@/types'
import { ImageIcon, Loader2, Search as SearchIcon } from 'lucide-react'

export function SearchPage() {
    const [textQuery, setTextQuery] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imageResults, setImageResults] = useState<Array<{ product: Product; similarity: number }> | null>(null)

    const debouncedQuery = useDebounce(textQuery, 300)

    const textSearch = useQuery({
        queryKey: ['search', 'text', debouncedQuery],
        queryFn: () => searchService.searchText(debouncedQuery),
        enabled: debouncedQuery.length > 0,
    })

    const imageSearch = useMutation({
        mutationFn: (file: File) => searchService.searchImage(file),
        onSuccess: (data) => setImageResults(data),
    })

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        setImageFile(e.target.files?.[0] || null)
        setImageResults(null)
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="mb-2 text-3xl font-bold">🔍 Tìm Kiếm AI</h1>
                <p className="text-muted-foreground">Tìm theo tên hoặc hình ảnh sản phẩm.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>📝 Tìm Theo Tên</CardTitle>
                    <p className="text-sm text-muted-foreground">Nhập tên sản phẩm, hệ thống sẽ tìm kiếm tức thì.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Ví dụ: Coca Cola"
                            value={textQuery}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setTextQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {debouncedQuery.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Bắt đầu nhập để tìm kiếm.</p>
                    ) : textSearch.isLoading ? (
                        <p className="text-sm text-muted-foreground">Đang tìm kiếm...</p>
                    ) : textSearch.data && textSearch.data.length > 0 ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">Tìm thấy {textSearch.data.length} kết quả</p>
                            {textSearch.data.map((product) => (
                                <div key={product.id} className="rounded-lg border bg-card p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{product.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {product.category ? `📁 ${product.category}` : 'Không có danh mục'}
                                            </p>
                                        </div>
                                        <p className="text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
                                    </div>
                                    {product.description && (
                                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                            📝 {product.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Không tìm thấy sản phẩm với từ khóa "{debouncedQuery}"
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>📷 Tìm Theo Hình Ảnh</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Tải ảnh sản phẩm, hệ thống sẽ gợi ý các sản phẩm tương tự.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <Input type="file" accept=".jpg,.jpeg,.png" onChange={handleImageChange} />
                        <Button
                            onClick={() => imageFile && imageSearch.mutate(imageFile)}
                            disabled={!imageFile || imageSearch.isPending}
                            className="w-full md:w-auto"
                        >
                            {imageSearch.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ImageIcon className="mr-2 h-4 w-4" />
                            )}
                            Tìm kiếm tương tự
                        </Button>
                    </div>
                    {imageFile && (
                        <p className="text-sm text-muted-foreground">
                            Đã chọn: <span className="font-medium text-foreground">{imageFile.name}</span>
                        </p>
                    )}

                    {imageResults && imageResults.length > 0 ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">Kết quả tương tự</p>
                            {imageResults.map((result) => (
                                <div key={result.product.id} className="rounded-lg border bg-card p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{result.product.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Độ tương đồng: {(result.similarity * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                        <p className="text-lg font-bold text-primary">
                                            {formatCurrency(result.product.price)}
                                        </p>
                                    </div>
                                    {result.product.description && (
                                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                            📝 {result.product.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : imageResults && imageResults.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Không tìm thấy sản phẩm tương tự.</p>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    )
}
