import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useIsFetching } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
    Home,
    Package,
    Upload,
    Search,
    FileText,
    Users,
    BarChart3,
    Store
} from 'lucide-react'

interface LayoutProps {
    children: ReactNode
}

const menuItems = [
    { icon: Home, label: '🏠 Trang chủ', path: '/' },
    { icon: Package, label: '📦 Sản phẩm', path: '/products' },
    { icon: Upload, label: '📥 Nhập báo giá', path: '/import' },
    { icon: Search, label: '🔍 Tìm kiếm AI', path: '/search' },
    { icon: FileText, label: '🧾 Hóa đơn', path: '/invoices' },
    { icon: Users, label: '👥 Khách hàng', path: '/customers' },
    { icon: BarChart3, label: '📊 Thống kê', path: '/stats' },
]

export function Layout({ children }: LayoutProps) {
    const location = useLocation()
    const [isFirstLoad, setIsFirstLoad] = useState(true)
    const isFetching = useIsFetching()

    useEffect(() => {
        // Hide splash screen after initial data loads
        if (isFirstLoad && isFetching === 0) {
            // Small delay to ensure smooth transition
            const timer = setTimeout(() => setIsFirstLoad(false), 300)
            return () => clearTimeout(timer)
        }
    }, [isFetching, isFirstLoad])

    // Show splash only on first load while fetching data
    if (isFirstLoad && isFetching > 0) {
        return <SplashScreen />
    }

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-card">
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center border-b px-6">
                        <Store className="mr-2 h-6 w-6 text-primary" />
                        <span className="text-lg font-bold">Quản Lý Bán Hàng</span>
                    </div>

                    {/* Menu */}
                    <nav className="flex-1 space-y-1 p-4">
                        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            📋 MENU CHÍNH
                        </p>
                        {menuItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    location.pathname === item.path
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
                <div className="mx-auto max-w-7xl p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}

function SplashScreen() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/98 backdrop-blur-sm">
            <div className="animate-in fade-in zoom-in-95 duration-700 text-center">
                <div className="mb-4 animate-bounce text-6xl">🏪</div>
                <h1 className="mb-2 text-3xl font-bold tracking-tight">
                    Hệ Thống Quản Lý Bán Hàng
                </h1>
                <p className="mb-8 text-muted-foreground">Đang khởi động...</p>
                <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full w-1/2 animate-pulse bg-primary"></div>
                </div>
            </div>
        </div>
    )
}
