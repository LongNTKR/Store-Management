import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface InvoiceStatusChartProps {
    total: number
    paid: number
    pending: number
    cancelled: number
    processing: number
}

export function InvoiceStatusChart({ total, paid, pending, cancelled, processing }: InvoiceStatusChartProps) {
    const data = [
        { name: "Tổng HĐ", value: total, color: "#3b82f6" },        // blue-500
        { name: "Đã TT", value: paid, color: "#10b981" },           // emerald-500
        { name: "Chờ TT", value: pending, color: "#f59e0b" },       // amber-500
        { name: "Đã hủy", value: cancelled, color: "#ef4444" },     // red-500
        { name: "Chờ xử lý", value: processing, color: "#64748b" }, // slate-500
    ]

    const hasData = total > 0

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">Thống kê trạng thái hóa đơn</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[220px] w-full">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11 }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    formatter={(value: number) => [`${value} hóa đơn`, "Số lượng"]}
                                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '11px' }}
                                    formatter={() => ""}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            Chưa có dữ liệu hóa đơn
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
