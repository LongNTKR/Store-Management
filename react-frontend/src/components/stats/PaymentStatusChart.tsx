import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Cell
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PaymentStatusChartProps {
    paid: number
    pending: number
    cancelled: number
}

export function PaymentStatusChart({ paid, pending, cancelled }: PaymentStatusChartProps) {
    const data = [
        { name: "Đã thanh toán", value: paid, color: "#10b981" },
        { name: "Chưa thanh toán", value: pending, color: "#f59e0b" },
        { name: "Đã hủy", value: cancelled, color: "#ef4444" },
    ]

    const hasData = paid + pending + cancelled > 0

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Trạng thái thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full min-h-[300px]">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
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
