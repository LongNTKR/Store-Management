import { useState, useEffect, type ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Key, Lock, Eye, EyeOff, Trash2, Save, Shield, RefreshCw, Loader2, UploadCloud } from 'lucide-react'
import { aiConfigService, type AIModelInfo } from '@/services/aiConfig'
import type { AIConfig } from '@/services/aiConfig'
import { searchService } from '@/services/search'
import type { ImportResult } from '@/types'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

// AI Provider information
const AI_PROVIDERS = [
    { id: 'google', name: 'Google AI', icon: '🔍', color: 'bg-blue-50 border-blue-200' },
    { id: 'openai', name: 'OpenAI', icon: '🤖', color: 'bg-green-50 border-green-200' },
    { id: 'grok', name: 'Grok (xAI)', icon: '⚡', color: 'bg-purple-50 border-purple-200' },
    { id: 'claude', name: 'Claude (Anthropic)', icon: '🧠', color: 'bg-orange-50 border-orange-200' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🔬', color: 'bg-indigo-50 border-indigo-200' },
    { id: 'qwen', name: 'Qwen (Alibaba)', icon: '🌐', color: 'bg-red-50 border-red-200' }
]

export function AIPage() {
    const { toast } = useToast()
    const [configs, setConfigs] = useState<AIConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [masterPasswordSet, setMasterPasswordSet] = useState(false)

    // Dialog states
    const [showMasterPasswordDialog, setShowMasterPasswordDialog] = useState(false)
    const [showPasswordVerifyDialog, setShowPasswordVerifyDialog] = useState(false)
    const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)

    // Form states
    const [masterPassword, setMasterPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [verifyPassword, setVerifyPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
    const [apiKey, setApiKey] = useState('')
    const [pendingAction, setPendingAction] = useState<((password: string) => void) | null>(null)

    // Model selection states
    const [availableModels, setAvailableModels] = useState<Record<string, AIModelInfo[]>>({})
    const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({})

    // Quote import states
    const [file, setFile] = useState<File | null>(null)
    const [importResult, setImportResult] = useState<ImportResult | null>(null)

    // Tab state
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('aiPageActiveTab') || 'import')

    // Update localStorage when tab changes
    useEffect(() => {
        localStorage.setItem('aiPageActiveTab', activeTab)
    }, [activeTab])

    const importMutation = useMutation({
        mutationFn: (payload: File) => searchService.importQuotation(payload),
        onSuccess: (data) => setImportResult(data),
    })

    // Load initial data
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [status, configList] = await Promise.all([
                aiConfigService.getMasterPasswordStatus(),
                aiConfigService.getAllConfigs()
            ])
            setMasterPasswordSet(status.is_set)
            setConfigs(configList)
        } catch (error) {
            console.error('Failed to load AI configurations:', error)
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Không thể tải cấu hình AI'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSetMasterPassword = async () => {
        if (masterPassword.length < 8) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Mật khẩu phải có ít nhất 8 ký tự'
            })
            return
        }

        if (masterPassword !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Mật khẩu xác nhận không khớp'
            })
            return
        }

        try {
            await aiConfigService.setMasterPassword({
                password: masterPassword,
                confirm_password: confirmPassword
            })
            toast({
                title: 'Thành công',
                description: 'Đã thiết lập mật khẩu chủ'
            })
            setMasterPasswordSet(true)
            setShowMasterPasswordDialog(false)
            setMasterPassword('')
            setConfirmPassword('')
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Không thể thiết lập mật khẩu'
            })
        }
    }

    const requestPasswordVerification = (action: (password: string) => void) => {
        setPendingAction(() => action)
        setShowPasswordVerifyDialog(true)
    }

    const handlePasswordVerified = async () => {
        const isValid = await aiConfigService.verifyMasterPassword({ password: verifyPassword })

        if (!isValid) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Mật khẩu không đúng'
            })
            return
        }

        const password = verifyPassword
        setShowPasswordVerifyDialog(false)
        setVerifyPassword('')

        if (pendingAction) {
            pendingAction(password)
            setPendingAction(null)
        }
    }

    const handleSaveApiKey = async () => {
        if (!selectedProvider || !apiKey.trim()) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Vui lòng nhập API key'
            })
            return
        }

        if (!masterPasswordSet) {
            toast({
                variant: 'destructive',
                title: 'Lỗi',
                description: 'Vui lòng thiết lập mật khẩu chủ trước'
            })
            return
        }

        requestPasswordVerification(async (password: string) => {
            try {
                await aiConfigService.createOrUpdateConfig({
                    provider: selectedProvider!,
                    api_key: apiKey,
                    is_enabled: true,
                    master_password: password
                })

                toast({
                    title: 'Thành công',
                    description: 'Đã lưu API key'
                })

                setShowApiKeyDialog(false)
                setApiKey('')
                setSelectedProvider(null)
                await loadData()
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Lỗi',
                    description: 'Không thể lưu API key'
                })
            }
        })
    }

    const handleDeleteConfig = async (provider: string) => {
        requestPasswordVerification(async (password: string) => {
            try {
                await aiConfigService.deleteConfig(provider, password)
                toast({
                    title: 'Thành công',
                    description: 'Đã xóa cấu hình'
                })
                await loadData()
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Lỗi',
                    description: 'Không thể xóa cấu hình'
                })
            }
        })
    }

    const handleToggleProvider = async (provider: string, enabled: boolean) => {
        requestPasswordVerification(async (password: string) => {
            try {
                await aiConfigService.toggleProvider(provider, enabled, password)
                toast({
                    title: 'Thành công',
                    description: enabled ? 'Đã bật nhà cung cấp' : 'Đã tắt nhà cung cấp'
                })
                await loadData()
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Lỗi',
                    description: 'Không thể thay đổi trạng thái'
                })
            }
        })
    }

    const handleLoadModels = async (provider: string) => {
        // Check if already loaded
        if (availableModels[provider]) {
            return
        }

        requestPasswordVerification(async (password: string) => {
            try {
                setLoadingModels(prev => ({ ...prev, [provider]: true }))
                const models = await aiConfigService.getAvailableModels(provider, password)
                setAvailableModels(prev => ({ ...prev, [provider]: models }))
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Lỗi',
                    description: 'Không thể tải danh sách mô hình'
                })
            } finally {
                setLoadingModels(prev => ({ ...prev, [provider]: false }))
            }
        })
    }

    const handleSelectModel = async (provider: string, model: string) => {
        requestPasswordVerification(async (password: string) => {
            try {
                const updatedConfig = await aiConfigService.selectModel(provider, model, password)
                toast({
                    title: 'Thành công',
                    description: 'Đã chọn mô hình'
                })
                // Update the specific config in state instead of reloading all data
                setConfigs(prevConfigs =>
                    prevConfigs.map(config =>
                        config.provider === provider ? updatedConfig : config
                    )
                )
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Lỗi',
                    description: 'Không thể chọn mô hình'
                })
            }
        })
    }

    const getConfigForProvider = (providerId: string) => {
        return configs.find(c => c.provider === providerId)
    }

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        setFile(selectedFile || null)
        setImportResult(null)
    }

    const handleImport = () => {
        if (!file) return
        importMutation.mutate(file)
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Đang tải...</div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold">
                    <span className="inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                        <img
                            alt="AI Icon"
                            className="h-16 w-16 object-contain drop-shadow-sm"
                            src="/Image_tzcpqytzcpqytzcp.png"
                        />
                    </span>
                    AI
                </h1>
                <p className="text-muted-foreground">Nhập báo giá và quản lý cấu hình AI</p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="import">Nhập Báo Giá</TabsTrigger>
                    <TabsTrigger value="settings">Cấu Hình AI</TabsTrigger>
                </TabsList>

                {/* Quote Import Tab */}
                <TabsContent value="import" className="space-y-4 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Hướng dẫn</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                1. Chọn file báo giá (ảnh, PDF, Excel, CSV) • 2. Hệ thống tự động đọc và phân tích • 3. Sản phẩm
                                mới được thêm, giá cũ được cập nhật • 4. Xem kết quả chi tiết
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <Input type="file" accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.csv" onChange={handleFileChange} />
                                <Button
                                    onClick={handleImport}
                                    disabled={!file || importMutation.isPending}
                                    className="w-full md:w-auto"
                                >
                                    {importMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <UploadCloud className="mr-2 h-4 w-4" />
                                    )}
                                    Bắt đầu nhập
                                </Button>
                            </div>
                            {file && (
                                <p className="text-sm text-muted-foreground">
                                    Đã chọn: <span className="font-medium text-foreground">{file.name}</span>
                                </p>
                            )}

                            {importMutation.isError && (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                    Không thể nhập file, vui lòng thử lại.
                                </div>
                            )}

                            {importResult && (
                                <div className="mt-4 grid gap-4 md:grid-cols-3">
                                    <div className="rounded-lg border bg-card p-4">
                                        <p className="text-sm text-muted-foreground">✅ Cập nhật</p>
                                        <p className="text-2xl font-bold">{importResult.updated}</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <p className="text-sm text-muted-foreground">➕ Thêm mới</p>
                                        <p className="text-2xl font-bold">{importResult.added}</p>
                                    </div>
                                    <div className="rounded-lg border bg-card p-4">
                                        <p className="text-sm text-muted-foreground">⚠️ Lỗi</p>
                                        <p className="text-2xl font-bold">{importResult.errors.length}</p>
                                    </div>
                                </div>
                            )}

                            {importResult?.errors?.length ? (
                                <div className="rounded-lg border bg-amber-50 p-4 text-amber-900">
                                    <p className="mb-2 font-semibold">Một số lỗi xảy ra:</p>
                                    <ul className="list-disc space-y-1 pl-4 text-sm">
                                        {importResult.errors.slice(0, 5).map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                        ))}
                                        {importResult.errors.length > 5 && (
                                            <li>... và {importResult.errors.length - 5} lỗi khác</li>
                                        )}
                                    </ul>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* AI Settings Tab */}
                <TabsContent value="settings" className="space-y-6 mt-6">
                    {/* Master Password Section */}
                    {!masterPasswordSet && (
                        <Card className="border-2 border-yellow-200 bg-yellow-50/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-yellow-600" />
                                    Thiết Lập Mật Khẩu Chủ
                                </CardTitle>
                                <CardDescription>
                                    Bạn cần thiết lập mật khẩu chủ để bảo vệ các API keys
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => setShowMasterPasswordDialog(true)}>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Thiết Lập Mật Khẩu
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* AI Providers Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {AI_PROVIDERS.map(provider => {
                            const config = getConfigForProvider(provider.id)
                            const models = availableModels[provider.id] || []
                            const isLoadingModels = loadingModels[provider.id] || false

                            return (
                                <Card key={provider.id} className={`${provider.color} border-2`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{provider.icon}</span>
                                                <span className="text-lg">{provider.name}</span>
                                            </div>
                                            {config && (
                                                <Switch
                                                    checked={config.is_enabled}
                                                    onCheckedChange={(checked) => handleToggleProvider(provider.id, checked)}
                                                    disabled={!masterPasswordSet}
                                                />
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Key className="h-4 w-4" />
                                            <span className={config?.has_api_key ? 'text-green-600 font-medium' : 'text-gray-500'}>
                                                {config?.has_api_key ? 'Đã cấu hình' : 'Chưa cấu hình'}
                                            </span>
                                        </div>

                                        {/* Model Selection */}
                                        {config?.has_api_key && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm">Mô hình</Label>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2"
                                                        onClick={() => handleLoadModels(provider.id)}
                                                        disabled={!masterPasswordSet || isLoadingModels}
                                                    >
                                                        <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                                                    </Button>
                                                </div>
                                                <Select
                                                    key={`${provider.id}-${config.selected_model || 'empty'}`}
                                                    value={config.selected_model || ''}
                                                    onValueChange={(value) => handleSelectModel(provider.id, value)}
                                                    disabled={!masterPasswordSet}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue placeholder="Chọn mô hình" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {isLoadingModels ? (
                                                            <SelectItem value="loading" disabled>
                                                                Đang tải...
                                                            </SelectItem>
                                                        ) : models.length > 0 ? (
                                                            models.map(model => (
                                                                <SelectItem key={model.id} value={model.id}>
                                                                    {model.name}
                                                                </SelectItem>
                                                            ))
                                                        ) : config.selected_model ? (
                                                            <SelectItem value={config.selected_model}>
                                                                {config.selected_model}
                                                            </SelectItem>
                                                        ) : (
                                                            <SelectItem value="no-models" disabled>
                                                                Nhấn biểu tượng làm mới để tải mô hình
                                                            </SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => {
                                                    setSelectedProvider(provider.id)
                                                    setShowApiKeyDialog(true)
                                                }}
                                                disabled={!masterPasswordSet}
                                            >
                                                <Save className="mr-2 h-3 w-3" />
                                                {config?.has_api_key ? 'Cập nhật' : 'Thêm API Key'}
                                            </Button>

                                            {config && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteConfig(provider.id)}
                                                    disabled={!masterPasswordSet}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Master Password Setup Dialog */}
            <Dialog open={showMasterPasswordDialog} onOpenChange={setShowMasterPasswordDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thiết Lập Mật Khẩu Chủ</DialogTitle>
                        <DialogDescription>
                            Mật khẩu này sẽ được sử dụng để bảo vệ các API keys. Vui lòng ghi nhớ mật khẩu này.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="master-password">Mật khẩu (tối thiểu 8 ký tự)</Label>
                            <Input
                                id="master-password"
                                type={showPassword ? 'text' : 'password'}
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
                            <Input
                                id="confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                            {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        </Button>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowMasterPasswordDialog(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSetMasterPassword}>
                            Thiết Lập
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Password Verification Dialog */}
            <Dialog open={showPasswordVerifyDialog} onOpenChange={setShowPasswordVerifyDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác Thực Mật Khẩu</DialogTitle>
                        <DialogDescription>
                            Vui lòng nhập mật khẩu chủ để tiếp tục
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="verify-password">Mật khẩu chủ</Label>
                            <Input
                                id="verify-password"
                                type="password"
                                value={verifyPassword}
                                onChange={(e) => setVerifyPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePasswordVerified()}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowPasswordVerifyDialog(false)
                            setVerifyPassword('')
                            setPendingAction(null)
                        }}>
                            Hủy
                        </Button>
                        <Button onClick={handlePasswordVerified}>
                            Xác Nhận
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* API Key Dialog */}
            <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedProvider && AI_PROVIDERS.find(p => p.id === selectedProvider)?.name} API Key
                        </DialogTitle>
                        <DialogDescription>
                            Nhập API key cho nhà cung cấp này
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="api-key">API Key</Label>
                            <Input
                                id="api-key"
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowApiKeyDialog(false)
                            setApiKey('')
                            setSelectedProvider(null)
                        }}>
                            Hủy
                        </Button>
                        <Button onClick={handleSaveApiKey}>
                            Lưu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
