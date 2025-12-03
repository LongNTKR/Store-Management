import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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

const productSchema = z.object({
    name: z.string().min(1, 'Vui lòng nhập tên sản phẩm'),
    price: z.number().positive('Giá bán phải lớn hơn 0'),
    import_price: z.union([
        z.number().positive('Giá nhập phải lớn hơn 0'),
        z.nan(),
        z.undefined()
    ]).optional(),
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

    const onSubmit = async (data: ProductFormData) => {
        try {
            await updateProduct.mutateAsync({
                id: product.id,
                product: {
                    ...data,
                    import_price: (data.import_price && !isNaN(data.import_price)) ? data.import_price : undefined,
                },
            })
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to update product:', error)
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
                                placeholder="0"
                                {...register('import_price', { valueAsNumber: true })}
                            />
                            {errors.import_price && (
                                <p className="text-sm text-destructive">{errors.import_price.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="price">Giá bán (VNĐ) *</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
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

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            ❌ Hủy
                        </Button>
                        <Button type="submit" disabled={updateProduct.isPending}>
                            💾 Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
