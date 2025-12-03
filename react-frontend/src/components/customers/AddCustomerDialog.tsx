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
import { useCreateCustomer } from '@/hooks/useCustomers'

const customerSchema = z.object({
    name: z.string().min(1, 'Vui lòng nhập tên khách hàng'),
    phone: z.string().optional(),
    email: z.string().email('Email không hợp lệ').optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

interface AddCustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AddCustomerDialog({ open, onOpenChange }: AddCustomerDialogProps) {
    const createCustomer = useCreateCustomer()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
    })

    const onSubmit = async (data: CustomerFormData) => {
        try {
            await createCustomer.mutateAsync(data)
            reset()
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to create customer:', error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>➕ Thêm Khách Hàng Mới</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên khách hàng *</Label>
                            <Input id="name" placeholder="Ví dụ: Nguyễn Văn A" {...register('name')} />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Số điện thoại</Label>
                            <Input id="phone" placeholder="0912..." {...register('phone')} />
                            {errors.phone && (
                                <p className="text-sm text-destructive">{errors.phone.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="example@gmail.com" {...register('email')} />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Địa chỉ</Label>
                            <Input id="address" placeholder="Địa chỉ khách hàng" {...register('address')} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Ghi chú</Label>
                        <Textarea id="notes" placeholder="Thông tin thêm..." {...register('notes')} />
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            ❌ Hủy
                        </Button>
                        <Button type="submit" disabled={createCustomer.isPending}>
                            💾 Lưu khách hàng
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
