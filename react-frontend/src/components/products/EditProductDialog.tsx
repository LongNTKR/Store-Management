import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateProduct } from '@/hooks/useProducts'
import type { Product } from '@/types'
import { productService } from '@/services/products'
import { toast } from 'sonner'
import { getProductImageUrl } from '@/lib/utils'
import { MAX_PRODUCT_IMAGES } from '@/constants/products'

const productSchema = z.object({
    name: z.string().min(1, 'Vui lòng nhập tên sản phẩm'),
    price: z.number().positive('Giá bán phải lớn hơn 0').optional(),
    import_price: z.number().positive('Giá nhập phải lớn hơn 0').optional(),
    category: z.string().optional(),
    unit: z.string(),
    description: z.string().optional(),
})

type ProductFormData = z.infer<typeof productSchema>


interface EditProductDialogProps {
    product: Product
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditProductDialog({ product, open, onOpenChange }: EditProductDialogProps) {
    const updateProduct = useUpdateProduct()
    const queryClient = useQueryClient()
    const [existingImages, setExistingImages] = useState<string[]>(product.images || [])
    const [newImages, setNewImages] = useState<File[]>([])
    const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([])
    const [isImageUploading, setIsImageUploading] = useState(false)
    const [removingImage, setRemovingImage] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: product.name,
            price: product.price,
            import_price: product.import_price || undefined,
            category: product.category || '',
            unit: product.unit,
            description: product.description || '',
        },
    })

    useEffect(() => {
        setExistingImages(product.images || [])
    }, [product])

    useEffect(() => {
        const urls = newImages.map((file) => URL.createObjectURL(file))
        setNewPreviewUrls(urls)

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url))
        }
    }, [newImages])

    useEffect(() => {
        if (!open) {
            setNewImages([])
            setNewPreviewUrls([])
            setRemovingImage(null)
        }
    }, [open])

    const handleExistingImageDelete = async (path: string) => {
        try {
            setRemovingImage(path)
            await productService.deleteImage(product.id, path)
            setExistingImages((prev) => prev.filter((img) => img !== path))
            await queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Đã xóa ảnh khỏi sản phẩm.')
        } catch (error) {
            console.error('Failed to delete product image:', error)
            toast.error('Không thể xóa ảnh, vui lòng thử lại.')
        } finally {
            setRemovingImage(null)
        }
    }

    const handleNewImagesSelection = (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files) return

        const incoming = Array.from(files).filter((file) => {
            if (!file.type.startsWith('image/')) {
                toast.error(`Tệp "${file.name}" không phải hình ảnh hợp lệ.`)
                return false
            }
            return true
        })

        setNewImages((prev) => {
            const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - (existingImages.length + prev.length))

            if (remainingSlots === 0) {
                toast.error(`Đã đạt giới hạn ${MAX_PRODUCT_IMAGES} ảnh cho sản phẩm này.`)
                return prev
            }

            if (incoming.length > remainingSlots) {
                toast.error(`Bạn chỉ có thể thêm ${remainingSlots} ảnh nữa.`)
            }

            const filesToAdd = incoming.slice(0, remainingSlots)
            return [...prev, ...filesToAdd]
        })

        event.target.value = ''
    }

    const handleRemoveNewImage = (index: number) => {
        setNewImages((prev) => prev.filter((_, idx) => idx !== index))
    }

    const onSubmit = async (data: ProductFormData) => {
        try {
            if (newImages.length > 0) {
                setIsImageUploading(true)
            }

            // Only send fields that have actually changed
            const changes: Partial<ProductFormData> = {}

            // Check each field individually
            if (data.name !== product.name) {
                changes.name = data.name
            }

            // Handle price - only include if changed
            const newPrice = (data.price && !isNaN(data.price)) ? data.price : undefined
            if (newPrice !== product.price) {
                changes.price = newPrice
            }

            // Handle import_price - only include if changed
            const newImportPrice = (data.import_price && !isNaN(data.import_price)) ? data.import_price : undefined
            if (newImportPrice !== product.import_price) {
                changes.import_price = newImportPrice
            }

            // Handle category - treat empty string as null for comparison
            const newCategory = data.category?.trim() || undefined
            const oldCategory = product.category || undefined
            if (newCategory !== oldCategory) {
                changes.category = newCategory
            }

            // Handle unit - only if changed
            if (data.unit !== product.unit) {
                changes.unit = data.unit
            }

            // Handle description - treat empty string as null for comparison
            const newDescription = data.description?.trim() || undefined
            const oldDescription = product.description || undefined
            if (newDescription !== oldDescription) {
                changes.description = newDescription
            }

            // Only call update if there are actual changes
            if (Object.keys(changes).length > 0) {
                await updateProduct.mutateAsync({
                    id: product.id,
                    product: changes,
                })
            }

            if (newImages.length > 0) {
                await productService.uploadImages(product.id, newImages)
            }

            await queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Đã cập nhật sản phẩm.')
            setNewImages([])
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to update product:', error)
            toast.error('Không thể cập nhật sản phẩm.')
        } finally {
            setIsImageUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>✏️ Chỉnh Sửa Sản Phẩm</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Tên sản phẩm *</Label>
                        <Input
                            id="name"
                            placeholder="Ví dụ: Coca Cola"
                            {...register('name')}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="import_price">Giá nhập (VNĐ)</Label>
                            <Input
                                id="import_price"
                                type="number"
                                step="0.01"
                                placeholder="Để trống nếu chưa có giá"
                                {...register('import_price', {
                                    setValueAs: (v) => v === '' || v === null ? undefined : parseFloat(v)
                                })}
                            />
                            {errors.import_price && (
                                <p className="text-sm text-destructive">{errors.import_price.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="price">Giá bán (VNĐ)</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                placeholder="Để trống nếu chưa có giá"
                                {...register('price', {
                                    setValueAs: (v) => v === '' || v === null ? undefined : parseFloat(v)
                                })}
                            />
                            {errors.price && (
                                <p className="text-sm text-destructive">{errors.price.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Danh mục</Label>
                            <Input
                                id="category"
                                placeholder="Ví dụ: Đồ uống"
                                {...register('category')}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unit">Đơn vị</Label>
                            <Input id="unit" {...register('unit')} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Mô tả</Label>
                        <Textarea
                            id="description"
                            placeholder="Mô tả sản phẩm..."
                            {...register('description')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Hình ảnh hiện tại</Label>
                        {existingImages.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Chưa có ảnh nào cho sản phẩm này.</p>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {existingImages.map((image) => (
                                    <div key={image} className="relative rounded border p-1">
                                        <img
                                            src={getProductImageUrl(image)}
                                            alt="Ảnh sản phẩm"
                                            className="h-20 w-full rounded object-cover"
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white/90 text-xs text-destructive"
                                            onClick={() => handleExistingImageDelete(image)}
                                            disabled={removingImage === image || updateProduct.isPending}
                                        >
                                            {removingImage === image ? '…' : '✕'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Tối đa {MAX_PRODUCT_IMAGES} ảnh/sản phẩm. Bạn có thể xóa ảnh cũ trước khi thêm ảnh mới.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="new-images">Thêm ảnh mới</Label>
                        <Input
                            id="new-images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleNewImagesSelection}
                        />
                        {newPreviewUrls.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                {newPreviewUrls.map((url, index) => (
                                    <div key={url} className="relative rounded border p-1">
                                        <img
                                            src={url}
                                            alt={`Ảnh mới ${index + 1}`}
                                            className="h-20 w-full rounded object-cover"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-1 top-1 rounded bg-white/80 px-1 text-xs text-destructive"
                                            onClick={() => handleRemoveNewImage(index)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            ❌ Hủy
                        </Button>
                        <Button type="submit" disabled={updateProduct.isPending || isImageUploading}>
                            💾 Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
