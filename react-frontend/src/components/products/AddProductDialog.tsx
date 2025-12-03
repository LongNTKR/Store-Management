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
import { useCreateProduct } from '@/hooks/useProducts'

const productSchema = z.object({
    name: z.string().min(1, 'Vui lòng nhập tên sản phẩm'),
    price: z.number().min(0, 'Giá phải lớn hơn 0'),
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

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            unit: 'cái',
            price: 0,
        },
    })

    const onSubmit = async (data: ProductFormData) => {
        try {
            await createProduct.mutateAsync({
                ...data,
                stock_quantity: 0,
                is_active: true,
            })
            reset()
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to create product:', error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>➕ Thêm Sản Phẩm Mới</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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

                        <div className="space-y-2">
                            <Label htmlFor="price">Giá (VNĐ) *</Label>
                            <Input
                                id="price"
                                type="number"
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
                        <Button type="submit" disabled={createProduct.isPending}>
                            💾 Lưu sản phẩm
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
