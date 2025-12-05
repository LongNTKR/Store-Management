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
import { useCreateProduct } from '@/hooks/useProducts'
import { productService } from '@/services/products'
import { toast } from 'sonner'
import { MAX_PRODUCT_IMAGES } from '@/constants/products'

const productSchema = z.object({
    name: z.string().min(1, 'Vui lòng nhập tên sản phẩm'),
    price: z.union([
        z.number().positive('Giá bán phải lớn hơn 0'),
        z.nan(),
        z.undefined()
    ]).optional(),
    import_price: z.union([
        z.number().positive('Giá nhập phải lớn hơn 0'),
        z.nan(),
        z.undefined()
    ]).optional(),
    category: z.string().optional(),
    unit: z.string().min(1, 'Vui lòng nhập đơn vị'),
    description: z.string().optional(),
})

type ProductFormData = z.infer<typeof productSchema>

interface AddProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
    const createProduct = useCreateProduct()
    const queryClient = useQueryClient()
    const [selectedImages, setSelectedImages] = useState<File[]>([])
    const [previewUrls, setPreviewUrls] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            unit: 'cái',
        },
    })

    useEffect(() => {
        const urls = selectedImages.map((file) => URL.createObjectURL(file))
        setPreviewUrls(urls)

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url))
        }
    }, [selectedImages])

    useEffect(() => {
        if (!open) {
            setSelectedImages([])
            setPreviewUrls([])
        }
    }, [open])

    const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files) return

        const incoming = Array.from(files).filter((file) => {
            if (!file.type.startsWith('image/')) {
                toast.error(`Tệp "${file.name}" không phải hình ảnh hợp lệ.`)
                return false
            }
            return true
        })

        setSelectedImages((prev) => {
            const availableSlots = Math.max(0, MAX_PRODUCT_IMAGES - prev.length)
            if (availableSlots === 0) {
                toast.error(`Mỗi sản phẩm chỉ được tối đa ${MAX_PRODUCT_IMAGES} ảnh.`)
                return prev
            }

            if (incoming.length > availableSlots) {
                toast.error(`Bạn chỉ có thể chọn thêm ${availableSlots} ảnh nữa.`)
            }

            const filesToAdd = incoming.slice(0, availableSlots)
            return [...prev, ...filesToAdd]
        })

        event.target.value = ''
    }

    const handleRemoveImage = (index: number) => {
        setSelectedImages((prev) => prev.filter((_, idx) => idx !== index))
    }

    const onSubmit = async (data: ProductFormData) => {
        try {
            setIsSubmitting(true)
            const createdProduct = await createProduct.mutateAsync({
                ...data,
                price: (data.price && !isNaN(data.price)) ? data.price : undefined,
                import_price: (data.import_price && !isNaN(data.import_price)) ? data.import_price : undefined,
                stock_quantity: 0,
                is_active: true,
            })

            if (selectedImages.length > 0) {
                await productService.uploadImages(createdProduct.id, selectedImages)
            }

            await queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('✓ Đã thêm sản phẩm mới.')
            reset()
            setSelectedImages([])
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to create product:', error)
            toast.error('Không thể tạo sản phẩm, vui lòng thử lại.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>➕ Thêm Sản Phẩm Mới</DialogTitle>
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
                                placeholder="0"
                                {...register('import_price', { valueAsNumber: true })}
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
                                placeholder="0"
                                {...register('price', { valueAsNumber: true })}
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
                            <Label htmlFor="unit">Đơn vị *</Label>
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
                        <Label htmlFor="images">Hình ảnh (tối đa {MAX_PRODUCT_IMAGES})</Label>
                        <Input
                            id="images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelection}
                        />
                        {previewUrls.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                {previewUrls.map((url, index) => (
                                    <div key={url} className="relative rounded border p-1">
                                        <img
                                            src={url}
                                            alt={`Ảnh xem trước ${index + 1}`}
                                            className="h-20 w-full rounded object-cover"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-1 top-1 rounded bg-white/80 px-1 text-xs text-destructive"
                                            onClick={() => handleRemoveImage(index)}
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
                        <Button type="submit" disabled={createProduct.isPending || isSubmitting}>
                            💾 Lưu sản phẩm
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
