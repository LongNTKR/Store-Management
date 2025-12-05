import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unitService } from '../services/units'
import type { Unit, UnitCreate, UnitUpdate } from '../types'
import { toast } from 'sonner'

export function useUnits(includeInactive = false) {
    return useQuery({
        queryKey: ['units', includeInactive],
        queryFn: () => unitService.getUnits(includeInactive),
    })
}

export function useUnit(id: number) {
    return useQuery({
        queryKey: ['units', id],
        queryFn: () => unitService.getUnit(id),
        enabled: !!id,
    })
}

export function useCreateUnit() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: UnitCreate) => unitService.createUnit(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] })
            toast.success('Đã tạo đơn vị mới')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Không thể tạo đơn vị')
        },
    })
}

export function useUpdateUnit() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UnitUpdate }) =>
            unitService.updateUnit(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] })
            toast.success('Đã cập nhật đơn vị')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Không thể cập nhật đơn vị')
        },
    })
}

export function useDeleteUnit() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => unitService.deleteUnit(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] })
            toast.success('Đã xóa đơn vị')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Không thể xóa đơn vị')
        },
    })
}

export function useProductCountByUnit(id: number) {
    return useQuery({
        queryKey: ['units', id, 'product-count'],
        queryFn: () => unitService.getProductCount(id),
        enabled: !!id,
    })
}
