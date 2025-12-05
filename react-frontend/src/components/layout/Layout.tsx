import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useIsFetching } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
    Home,
    Package,
    Search,
    FileText,
    Users,
    BarChart3,
    Trash2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LayoutProps {
    children: ReactNode
}

const iconWrapperClass = "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
const iconImageClass = "h-7 w-7 object-contain"

type MenuItem = {
    icon: typeof Home
    label: string
    path: string
    customIcon: string
    isSubItem?: boolean
}

const menuItems: MenuItem[] = [
    { icon: Home, label: 'Trang chủ', path: '/', customIcon: '/Image_4sq4av4sq4av4sq4.png' },
    {
        icon: Package,
        label: 'Sản phẩm',
        path: '/products',
        customIcon: '/Image_iasozuiasozuiaso.png'
    },
    { icon: Search, label: 'AI', path: '/ai', customIcon: '/Image_tzcpqytzcpqytzcp.png' },
    { icon: FileText, label: 'Hóa đơn', path: '/invoices', customIcon: '/Image_3rudgh3rudgh3rud.png' },
    { icon: Users, label: 'Khách hàng', path: '/customers', customIcon: '/Image_d6ma5pd6ma5pd6ma.png' },
    { icon: Trash2, label: 'Thùng rác', path: '/trash', customIcon: '/Image_yapzehyapzehyapz.png' },
    { icon: BarChart3, label: 'Thống kê', path: '/stats', customIcon: '/Image_dtv8tsdtv8tsdtv8.png' },
]

export function Layout({ children }: LayoutProps) {
    const location = useLocation()
    const [isFirstLoad, setIsFirstLoad] = useState(true)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
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
            <aside className={cn(
                "fixed left-0 top-0 h-screen w-64 border-r bg-white/80 backdrop-blur transition-transform duration-300 ease-in-out z-40 shadow-sm",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center justify-between border-b px-4">
                        <Link to="/" className="flex items-center gap-3">
                            <div className={cn(iconWrapperClass, "bg-gradient-to-br from-blue-50 to-indigo-100 h-10 w-10 rounded-lg")}>
                                <img src="/Image_8enbma8enbma8enb.png" alt="Store Logo" className="h-7 w-7 object-contain" />
                            </div>
                            <span className="text-lg font-bold whitespace-nowrap text-slate-900">Quản Lý Bán Hàng</span>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(false)}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Menu */}
                    <nav className="flex-1 space-y-1 px-3 py-4">
                        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 flex items-center gap-2">
                            <span className={cn(iconWrapperClass, "h-9 w-9 rounded-lg")}>
                                <img src="/Image_b2whvdb2whvdb2wh.png" alt="Menu Icon" className="h-6 w-6 object-contain" />
                            </span>
                            Menu chính
                        </p>
                        {menuItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl font-medium transition-all",
                                    item.isSubItem
                                        ? "pl-10 pr-3 py-2 text-sm opacity-80"
                                        : "px-3 py-2.5 text-[15px]",
                                    location.pathname === item.path
                                        ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                {item.customIcon ? (
                                    <span className={cn(iconWrapperClass, "size-8 rounded-lg shadow-none ring-slate-200", item.isSubItem && "scale-90")}>
                                        <img src={item.customIcon} alt={item.label} className={iconImageClass} />
                                    </span>
                                ) : null}
                                <span>
                                    {item.label}
                                </span>
                            </Link>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Toggle Button - Shows when sidebar is closed */}
            {!isSidebarOpen && (
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsSidebarOpen(true)}
                    className="fixed left-4 top-4 z-50 h-10 w-10 shadow-md"
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
            )}

            {/* Main Content */}
            <main className={cn(
                "flex-1 transition-all duration-300 ease-in-out",
                isSidebarOpen ? "ml-64" : "ml-0"
            )}>
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
