import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit } from '@/hooks/useUnits'
import type { Unit, UnitCreate, UnitUpdate } from '@/types'
import { Trash2, Edit2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface UnitManagementDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onUnitSelect?: (unitId: number) => void
}

export function UnitManagementDialog({ open, onOpenChange, onUnitSelect }: UnitManagementDialogProps) {
    const { data: units = [], isLoading } = useUnits()
    const createUnit = useCreateUnit()
    const updateUnit = useUpdateUnit()
    const deleteUnit = useDeleteUnit()

    const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        display_name: '',
        allows_decimal: false,
        step_size: 1.0
    })

    const resetForm = () => {
        setFormData({
            name: '',
            display_name: '',
            allows_decimal: false,
            step_size: 1.0
        })
        setEditingUnit(null)
        setMode('list')
    }

    const handleCreate = async () => {
        if (!formData.name || !formData.display_name) {
            toast.error('Vui lòng nhập tên và tên hiển thị')
            return
        }

        const unitData: UnitCreate = {
            name: formData.name.toLowerCase(),
            display_name: formData.display_name,
            allows_decimal: formData.allows_decimal,
            step_size: formData.step_size
        }

        createUnit.mutate(unitData, {
            onSuccess: () => {
                resetForm()
            }
        })
    }

    const handleUpdate = async () => {
        if (!editingUnit) return

        const unitData: UnitUpdate = {
            name: formData.name !== editingUnit.name ? formData.name.toLowerCase() : undefined,
            display_name: formData.display_name !== editingUnit.display_name ? formData.display_name : undefined,
            allows_decimal: formData.allows_decimal !== editingUnit.allows_decimal ? formData.allows_decimal : undefined,
            step_size: formData.step_size !== editingUnit.step_size ? formData.step_size : undefined
        }

        // Only send fields that changed
        const hasChanges = Object.values(unitData).some(v => v !== undefined)
        if (!hasChanges) {
            toast.info('Không có thay đổi nào')
            resetForm()
            return
        }

        updateUnit.mutate({ id: editingUnit.id, data: unitData }, {
            onSuccess: () => {
                resetForm()
            }
        })
    }

    const handleDelete = async (unit: Unit) => {
        if (unit.is_system) {
            toast.error('Không thể xóa đơn vị hệ thống')
            return
        }

        if (confirm(`Bạn có chắc muốn xóa đơn vị "${unit.display_name}"?`)) {
            deleteUnit.mutate(unit.id)
        }
    }

    const handleEdit = (unit: Unit) => {
        setEditingUnit(unit)
        setFormData({
            name: unit.name,
            display_name: unit.display_name,
            allows_decimal: unit.allows_decimal,
            step_size: unit.step_size
        })
        setMode('edit')
    }

    const handleSelectUnit = (unitId: number) => {
        if (onUnitSelect) {
            onUnitSelect(unitId)
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'list' ? '📦 Quản lý Đơn vị' : mode === 'create' ? '➕ Thêm Đơn vị Mới' : '✏️ Chỉnh Sửa Đơn vị'}
                    </DialogTitle>
                    {mode === 'list' && (
                        <DialogDescription>
                            Quản lý các đơn vị sản phẩm. Đơn vị hệ thống không thể xóa.
                        </DialogDescription>
                    )}
                </DialogHeader>

                {mode === 'list' && (
                    <div className="space-y-4">
                        <Button onClick={() => setMode('create')} className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm đơn vị mới
                        </Button>

                        {isLoading ? (
                            <p className="text-center text-muted-foreground py-8">Đang tải...</p>
                        ) : units.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">Chưa có đơn vị nào</p>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                                <table className="w-full">
                                    <thead className="bg-muted sticky top-0">
                                        <tr>
                                            <th className="text-left p-3 font-semibold">Tên hiển thị</th>
                                            <th className="text-center p-3 font-semibold">Loại</th>
                                            <th className="text-center p-3 font-semibold">Bước</th>
                                            <th className="text-right p-3 font-semibold">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {units.map((unit) => (
                                            <tr
                                                key={unit.id}
                                                className="border-t hover:bg-muted/50 cursor-pointer"
                                                onClick={() => onUnitSelect && handleSelectUnit(unit.id)}
                                            >
                                                <td className="p-3">
                                                    <div>
                                                        <div className="font-medium">{unit.display_name}</div>
                                                        <div className="text-xs text-muted-foreground">({unit.name})</div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`inline-flex px-2 py-1 rounded text-xs ${unit.allows_decimal
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {unit.allows_decimal ? 'Số thập phân' : 'Số nguyên'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center text-sm">{unit.step_size}</td>
                                                <td className="p-3">
                                                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleEdit(unit)}
                                                            disabled={unit.is_system}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(unit)}
                                                            disabled={unit.is_system}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {(mode === 'create' || mode === 'edit') && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Tên (internal)</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="kg, met, cai..."
                                disabled={mode === 'edit' && editingUnit?.is_system}
                            />
                            <p className="text-xs text-muted-foreground">Tên nội bộ, chữ thường, không dấu</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="display_name">Tên hiển thị</Label>
                            <Input
                                id="display_name"
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder="Kilogram, Mét, Cái..."
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="allows_decimal"
                                checked={formData.allows_decimal}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    allows_decimal: e.target.checked,
                                    step_size: e.target.checked ? 0.1 : 1.0
                                })}
                                disabled={mode === 'edit' && editingUnit?.is_system}
                                className="h-4 w-4"
                            />
                            <Label htmlFor="allows_decimal" className="cursor-pointer">
                                Cho phép số thập phân (0.5, 1.25...)
                            </Label>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="step_size">Bước nhảy</Label>
                            <Input
                                id="step_size"
                                type="number"
                                step="0.01"
                                value={formData.step_size}
                                onChange={(e) => setFormData({ ...formData, step_size: parseFloat(e.target.value) || 1.0 })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Bước tăng/giảm khi click nút +/- (ví dụ: 0.1 cho kg, 1.0 cho cái)
                            </p>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={resetForm}>
                                Hủy
                            </Button>
                            <Button
                                onClick={mode === 'create' ? handleCreate : handleUpdate}
                                disabled={createUnit.isPending || updateUnit.isPending}
                            >
                                {mode === 'create' ? 'Tạo' : 'Lưu'}
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {mode === 'list' && (
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Đóng
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
