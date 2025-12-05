import api from './api'

/**
 * AI Configuration Types
 */
export interface AIConfig {
    id: number
    provider: string
    display_name: string
    is_enabled: boolean
    has_api_key: boolean
    selected_model?: string
    created_at: string
    updated_at: string
}

export interface AIConfigCreate {
    provider: string
    api_key: string
    is_enabled: boolean
    master_password: string
}

export interface AIConfigUpdate {
    api_key?: string
    is_enabled?: boolean
    master_password: string
}

export interface MasterPasswordCreate {
    password: string
    confirm_password: string
}

export interface MasterPasswordVerify {
    password: string
}

export interface MasterPasswordStatus {
    is_set: boolean
}

export interface AIModelInfo {
    id: string
    name: string
    description: string
}

export interface AIModelListResponse {
    models: AIModelInfo[]
}

export interface AIModelSelect {
    model: string
    master_password: string
}

/**
 * AI Configuration Service
 */
export const aiConfigService = {
    /**
     * Check if master password is set
     */
    async getMasterPasswordStatus(): Promise<MasterPasswordStatus> {
        const response = await api.get<MasterPasswordStatus>('/api/ai-config/master-password/status')
        return response.data
    },

    /**
     * Set or update master password
     */
    async setMasterPassword(data: MasterPasswordCreate): Promise<void> {
        await api.post('/api/ai-config/master-password', data)
    },

    /**
     * Verify master password
     */
    async verifyMasterPassword(data: MasterPasswordVerify): Promise<boolean> {
        try {
            await api.post('/api/ai-config/master-password/verify', data)
            return true
        } catch (error) {
            return false
        }
    },

    /**
     * Get all AI configurations
     */
    async getAllConfigs(): Promise<AIConfig[]> {
        const response = await api.get<AIConfig[]>('/api/ai-config')
        return response.data
    },

    /**
     * Get specific AI configuration by provider
     */
    async getConfig(provider: string): Promise<AIConfig> {
        const response = await api.get<AIConfig>(`/api/ai-config/${provider}`)
        return response.data
    },

    /**
     * Create or update AI configuration
     */
    async createOrUpdateConfig(data: AIConfigCreate): Promise<AIConfig> {
        const response = await api.post<AIConfig>('/api/ai-config', data)
        return response.data
    },

    /**
     * Update existing AI configuration
     */
    async updateConfig(provider: string, data: AIConfigUpdate): Promise<AIConfig> {
        const response = await api.put<AIConfig>(`/api/ai-config/${provider}`, data)
        return response.data
    },

    /**
     * Delete AI configuration
     */
    async deleteConfig(provider: string, masterPassword: string): Promise<void> {
        await api.delete(`/api/ai-config/${provider}`, {
            data: { master_password: masterPassword }
        })
    },

    /**
     * Toggle provider enabled status
     */
    async toggleProvider(provider: string, isEnabled: boolean, masterPassword: string): Promise<AIConfig> {
        const response = await api.put<AIConfig>(
            `/api/ai-config/${provider}/toggle`,
            { password: masterPassword },
            { params: { is_enabled: isEnabled } }
        )
        return response.data
    },

    /**
     * Get available models for a provider
     */
    async getAvailableModels(provider: string, masterPassword: string): Promise<AIModelInfo[]> {
        const response = await api.get<AIModelListResponse>(
            `/api/ai-config/${provider}/models`,
            { params: { master_password: masterPassword } }
        )
        return response.data.models
    },

    /**
     * Select a model for a provider
     */
    async selectModel(provider: string, model: string, masterPassword: string): Promise<AIConfig> {
        const response = await api.put<AIConfig>(
            `/api/ai-config/${provider}/model`,
            { model, master_password: masterPassword }
        )
        return response.data
    }
}

export default aiConfigService

