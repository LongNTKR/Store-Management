import { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { Product } from '@/types'
import { formatCurrency, getProductImageUrl } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Eye, EyeOff, Info } from 'lucide-react'

interface ProductDetailsDialogProps {
    product: Product | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProductDetailsDialog({ product, open, onOpenChange }: ProductDetailsDialogProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [showImportPrice, setShowImportPrice] = useState(false)

    if (!product) {
        return null
    }

    const images = product.images || []
    const hasImages = images.length > 0
    const activeImage = hasImages ? getProductImageUrl(images[currentImageIndex]) : ''
    const profitAmount = product.import_price != null ? product.price - product.import_price : null
    const profitPercent =
        profitAmount !== null && product.import_price
            ? ((profitAmount / product.import_price) * 100).toFixed(1)
            : null
    const profitTooltip =
        profitAmount === null
            ? ''
            : profitAmount >= 0
                ? `Lãi: ${formatCurrency(profitAmount)}${profitPercent ? ` (${profitPercent}%)` : ''}`
                : `Lỗ: ${formatCurrency(Math.abs(profitAmount))}${profitPercent ? ` (${profitPercent}%)` : ''}`
    const isProfit = profitAmount !== null && profitAmount >= 0

    const showPrevImage = () => {
        if (images.length <= 1) return
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
    }

    const showNextImage = () => {
        if (images.length <= 1) return
        setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }

    useEffect(() => {
        setCurrentImageIndex(0)
        setShowImportPrice(false)
    }, [product?.id, open])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold">{product.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        {hasImages ? (
                            <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                                <img
                                    src={activeImage}
                                    alt={product.name}
                                    className="h-full w-full object-contain"
                                />
                                {images.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow"
                                            onClick={showPrevImage}
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow"
                                            onClick={showNextImage}
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
                                            {images.map((_, idx) => (
                                                <span
                                                    key={`${product.id}-dot-${idx}`}
                                                    className={`h-2 w-2 rounded-full ${idx === currentImageIndex ? 'bg-primary' : 'bg-muted-foreground/50'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                                Chưa có hình ảnh cho sản phẩm này.
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-semibold text-green-600">
                                💰 {formatCurrency(product.price)}
                            </p>
                            {profitAmount !== null && (
                                <span className="relative inline-flex items-center" aria-label="Xem lãi/lỗ">
                                    <span
                                        className="group relative cursor-help rounded-full border border-dashed border-muted-foreground/50 p-1"
                                    >
                                        <Info
                                            className={`h-4 w-4 ${isProfit ? 'text-green-600' : 'text-red-600'}`}
                                        />
                                        <span
                                            className={`pointer-events-none absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${isProfit ? 'text-green-600' : 'text-red-600'}`}
                                        >
                                            {profitTooltip}
                                        </span>
                                    </span>
                                </span>
                            )}
                        </div>
                        {product.import_price && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <p className="flex-1">
                                    📦 Giá nhập:{' '}
                                    <span className="font-semibold">
                                        {showImportPrice ? formatCurrency(product.import_price) : '******'}
                                    </span>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowImportPrice((prev) => !prev)}
                                    className="rounded-full border p-1 text-muted-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    aria-label={showImportPrice ? 'Ẩn giá nhập' : 'Hiện giá nhập'}
                                >
                                    {showImportPrice ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        )}
                        {product.category && (
                            <p className="text-sm text-muted-foreground">📁 Danh mục: {product.category}</p>
                        )}
                        {product.unit && (
                            <p className="text-sm text-muted-foreground">📦 Đơn vị: {product.unit}</p>
                        )}
                    </div>

                    {product.description && (
                        <div className="rounded-md bg-muted/50 p-3">
                            <p className="text-sm text-muted-foreground">📝 {product.description}</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
