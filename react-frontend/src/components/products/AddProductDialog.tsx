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
import { useUnits } from '@/hooks/useUnits'
import { productService } from '@/services/products'
import { toast } from 'sonner'
import { MAX_PRODUCT_IMAGES } from '@/constants/products'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UnitManagementDialog } from '@/components/units/UnitManagementDialog'
import { Settings } from 'lucide-react'

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
    unit_id: z.number().min(1, 'Vui lòng chọn đơn vị'),
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
    const { data: units = [] } = useUnits()

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            unit_id: 1, // Default to first unit (typically "cái")
        },
    })

    const selectedUnitId = watch('unit_id')
    const [showUnitManagement, setShowUnitManagement] = useState(false)

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
        <>
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
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="unit">Đơn vị</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowUnitManagement(true)}
                                        className="h-6 px-2 text-xs"
                                    >
                                        <Settings className="h-3 w-3 mr-1" />
                                        Quản lý
                                    </Button>
                                </div>
                                <Select
                                    value={selectedUnitId?.toString()}
                                    onValueChange={(value) => setValue('unit_id', parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn đơn vị" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map((unit) => (
                                            <SelectItem key={unit.id} value={unit.id.toString()}>
                                                {unit.display_name}
                                                {unit.allows_decimal && ' (số thập phân)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.unit_id && (
                                    <p className="text-sm text-red-500">{errors.unit_id.message}</p>
                                )}
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

            <UnitManagementDialog
                open={showUnitManagement}
                onOpenChange={setShowUnitManagement}
                onUnitSelect={(unitId) => {
                    setValue('unit_id', unitId)
                    setShowUnitManagement(false)
                }}
            />
        </>
    )
}
