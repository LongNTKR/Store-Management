import { api } from './api'
import type { Unit, UnitCreate, UnitUpdate } from '../types'

export const unitService = {
    /**
     * Get all units
     */
    async getUnits(includeInactive = false): Promise<Unit[]> {
        const response = await api.get<Unit[]>('/api/units', {
            params: { include_inactive: includeInactive }
        })
        return response.data
    },

    /**
     * Get unit by ID
     */
    async getUnit(id: number): Promise<Unit> {
        const response = await api.get<Unit>(`/api/units/${id}`)
        return response.data
    },

    /**
     * Create a new unit
     */
    async createUnit(data: UnitCreate): Promise<Unit> {
        const response = await api.post<Unit>('/api/units', data)
        return response.data
    },

    /**
     * Update an existing unit
     */
    async updateUnit(id: number, data: UnitUpdate): Promise<Unit> {
        const response = await api.put<Unit>(`/api/units/${id}`, data)
        return response.data
    },

    /**
     * Delete (soft delete) a unit
     */
    async deleteUnit(id: number): Promise<void> {
        await api.delete(`/api/units/${id}`)
    },

    /**
     * Get product count for a unit
     */
    async getProductCount(id: number): Promise<{ unit_id: number; product_count: number }> {
        const response = await api.get<{ unit_id: number; product_count: number }>(
            `/api/units/${id}/product-count`
        )
        return response.data
    }
}
