import { useState, type ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { searchService } from '@/services/search'
import type { ImportResult } from '@/types'
import { Loader2, UploadCloud } from 'lucide-react'

export function ImportPage() {
    const [file, setFile] = useState<File | null>(null)
    const [result, setResult] = useState<ImportResult | null>(null)

    const importMutation = useMutation({
        mutationFn: (payload: File) => searchService.importQuotation(payload),
        onSuccess: (data) => setResult(data),
    })

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        setFile(selectedFile || null)
        setResult(null)
    }

    const handleImport = () => {
        if (!file) return
        importMutation.mutate(file)
    }

    return (
        <div>
            <h1 className="mb-6 flex items-center gap-3 text-3xl font-bold">
                <span className="inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                    <img alt="Product Management Icon" className="h-16 w-16 object-contain drop-shadow-sm" src="/Image_8htcuh8htcuh8htc.png" />
                </span>
                Nhập Bảng Báo Giá
            </h1>
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

                    {result && (
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <div className="rounded-lg border bg-card p-4">
                                <p className="text-sm text-muted-foreground">✅ Cập nhật</p>
                                <p className="text-2xl font-bold">{result.updated}</p>
                            </div>
                            <div className="rounded-lg border bg-card p-4">
                                <p className="text-sm text-muted-foreground">➕ Thêm mới</p>
                                <p className="text-2xl font-bold">{result.added}</p>
                            </div>
                            <div className="rounded-lg border bg-card p-4">
                                <p className="text-sm text-muted-foreground">⚠️ Lỗi</p>
                                <p className="text-2xl font-bold">{result.errors.length}</p>
                            </div>
                        </div>
                    )}

                    {result?.errors?.length ? (
                        <div className="rounded-lg border bg-amber-50 p-4 text-amber-900">
                            <p className="mb-2 font-semibold">Một số lỗi xảy ra:</p>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                                {result.errors.slice(0, 5).map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                ))}
                                {result.errors.length > 5 && (
                                    <li>... và {result.errors.length - 5} lỗi khác</li>
                                )}
                            </ul>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    )
}
