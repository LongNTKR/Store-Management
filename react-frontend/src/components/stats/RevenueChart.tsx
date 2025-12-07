import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    Legend
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface RevenueChartProps {
    collectedAmount: number
    outstandingDebt: number
}

export function RevenueChart({ collectedAmount, outstandingDebt }: RevenueChartProps) {
    const data = [
        { name: "Đã thu về", value: collectedAmount, color: "#10b981" }, // emerald-500
        { name: "Còn nợ", value: outstandingDebt, color: "#f59e0b" },   // amber-500
    ]

    const total = collectedAmount + outstandingDebt
    const hasData = total > 0

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Cấu trúc doanh thu</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full min-h-[300px]">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={data[index].color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => [formatCurrency(value), "Số tiền"]}
                                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value, entry: any) => (
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-2">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            Chưa có dữ liệu
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
