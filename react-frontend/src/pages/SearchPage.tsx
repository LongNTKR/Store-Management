import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Clock } from 'lucide-react'

export function SearchPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold">
                    <span className="inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                        <img alt="Product Management Icon" className="h-16 w-16 object-contain drop-shadow-sm" src="/Image_tzcpqytzcpqytzcp.png" />
                    </span>
                    Tìm Kiếm AI
                </h1>
                <p className="text-muted-foreground">Tìm theo tên hoặc hình ảnh sản phẩm.</p>
            </div>

            {/* Coming Soon Banner */}
            <Card className="border-2 border-dashed border-primary/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
                <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                            <Clock className="absolute -bottom-1 -right-1 h-6 w-6 text-blue-600 bg-white rounded-full p-1" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">🚀 Sắp Ra Mắt</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-lg text-muted-foreground">
                        Tính năng <span className="font-semibold text-primary">Tìm Kiếm AI</span> đang trong quá trình phát triển
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-left">
                        <div className="p-4 bg-white rounded-lg border">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">📝</span>
                                <div>
                                    <h3 className="font-semibold mb-1">Tìm Theo Tên</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Tìm kiếm sản phẩm thông minh bằng AI với khả năng hiểu ngữ cảnh
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white rounded-lg border">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">📷</span>
                                <div>
                                    <h3 className="font-semibold mb-1">Tìm Theo Hình Ảnh</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Tải ảnh lên để tìm các sản phẩm tương tự với độ chính xác cao
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 pt-6 border-t">
                        <p className="text-sm text-muted-foreground italic">
                            ✨ Chúng tôi đang nỗ lực hoàn thiện để mang đến trải nghiệm tốt nhất cho bạn
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
