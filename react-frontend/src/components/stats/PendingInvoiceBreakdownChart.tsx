import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    Legend
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PendingInvoiceBreakdownChartProps {
    pendingExported: number
    pendingNonExported: number
}

export function PendingInvoiceBreakdownChart({ pendingExported, pendingNonExported }: PendingInvoiceBreakdownChartProps) {
    const data = [
        { name: "Chờ TT đã xuất", value: pendingExported, color: "#3b82f6" }, // blue-500
        { name: "Chờ TT chưa xuất", value: pendingNonExported, color: "#f97316" },   // orange-500
    ]

    const total = pendingExported + pendingNonExported
    const hasData = total > 0

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Tình trạng xuất file - HĐ chờ thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[220px] w-full min-h-[220px]">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={data[index].color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => [`${value} hóa đơn`, "Số lượng"]}
                                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={32}
                                    formatter={(value, entry: any) => (
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 ml-2">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            Chưa có hóa đơn chờ thanh toán
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
