import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    description?: string
    variant?: "default" | "blue" | "emerald" | "amber" | "rose" | "indigo"
    className?: string
}

const variants = {
    default: "text-slate-600 bg-slate-50",
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    rose: "text-rose-600 bg-rose-50",
    indigo: "text-indigo-600 bg-indigo-50",
}

export function StatCard({ title, value, icon: Icon, description, variant = "default", className }: StatCardProps) {
    const colorClass = variants[variant]

    return (
        <Card className={`border-none shadow-sm ${className}`}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className={`p-2 rounded-full ${colorClass} bg-opacity-50`}>
                        <Icon className="w-4 h-4" />
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                    {description && (
                        <p className="text-xs text-muted-foreground">{description}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
