import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { debtReportService } from '@/services/debtReports'

interface AgingAnalysisProps {
  customerId?: number | null
  compact?: boolean
}

// Color mapping for aging buckets
const bucketColors = {
  '0-30': {
    bg: 'bg-emerald-500',
    text: 'text-emerald-700',
    lightBg: 'bg-emerald-50',
    icon: '🟢',
    label: 'Bình thường'
  },
  '30-60': {
    bg: 'bg-yellow-500',
    text: 'text-yellow-700',
    lightBg: 'bg-yellow-50',
    icon: '🟡',
    label: 'Cần lưu ý'
  },
  '60-90': {
    bg: 'bg-orange-500',
    text: 'text-orange-700',
    lightBg: 'bg-orange-50',
    icon: '🟠',
    label: 'Cảnh báo'
  },
  '90+': {
    bg: 'bg-red-500',
    text: 'text-red-700',
    lightBg: 'bg-red-50',
    icon: '🔴',
    label: 'Quá hạn nghiêm trọng'
  }
}

export function AgingAnalysis({ customerId, compact = false }: AgingAnalysisProps) {
  const { data: agingData, isLoading, error } = useQuery({
    queryKey: ['aging-analysis', customerId],
    queryFn: () => debtReportService.getAgingAnalysis(customerId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Đang tải phân tích tuổi nợ...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">Không thể tải dữ liệu phân tích tuổi nợ</p>
      </div>
    )
  }

  if (!agingData || agingData.buckets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">Không có dữ liệu công nợ</p>
      </div>
    )
  }

  const { buckets, total_debt } = agingData

  // Calculate max amount for bar chart scaling
  const maxAmount = Math.max(...buckets.map(b => b.total_amount))

  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h3 className="text-lg font-semibold mb-1">Phân tích tuổi nợ</h3>
          <p className="text-sm text-muted-foreground">
            Phân loại công nợ theo thời gian tồn tại
          </p>
        </div>
      )}

      {/* Bar Chart */}
      <div className={`space-y-3 ${compact ? 'py-2' : 'p-4'} rounded-lg border bg-card`}>
        {buckets.map((bucket) => {
          const colors = bucketColors[bucket.bucket_key as keyof typeof bucketColors] || bucketColors['0-30']
          const percentage = maxAmount > 0 ? (bucket.total_amount / maxAmount) * 100 : 0
          const widthPercentage = percentage > 0 ? Math.max(percentage, 5) : 0 // Minimum 5% for visibility

          return (
            <div key={bucket.bucket_key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{colors.icon}</span>
                  <span className="font-medium">{bucket.bucket_label}</span>
                  <span className="text-muted-foreground">
                    ({bucket.invoice_count} hóa đơn)
                  </span>
                </div>
                <span className={`font-semibold ${colors.text}`}>
                  {formatCurrency(bucket.total_amount)}
                </span>
              </div>

              {/* Bar */}
              <div className="h-8 w-full bg-muted rounded-md overflow-hidden">
                <div
                  className={`h-full ${colors.bg} transition-all duration-300 flex items-center justify-end px-3`}
                  style={{ width: `${widthPercentage}%` }}
                >
                  {bucket.total_amount > 0 && (
                    <span className="text-xs font-medium text-white">
                      {((bucket.total_amount / total_debt) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detailed Table */}
      {!compact && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Khoảng tuổi nợ</TableHead>
                <TableHead className="text-center">Số hóa đơn</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.map((bucket) => {
                const colors = bucketColors[bucket.bucket_key as keyof typeof bucketColors] || bucketColors['0-30']

                return (
                  <TableRow key={bucket.bucket_key} className={colors.lightBg}>
                    <TableCell className="font-medium">
                      {bucket.bucket_label}
                    </TableCell>
                    <TableCell className="text-center">
                      {bucket.invoice_count}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${colors.text}`}>
                      {formatCurrency(bucket.total_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-lg">{colors.icon}</span>
                        <span className={`text-xs ${colors.text}`}>
                          {colors.label}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {/* Total row */}
              <TableRow className="bg-muted font-bold">
                <TableCell>Tổng cộng</TableCell>
                <TableCell className="text-center">
                  {buckets.reduce((sum, b) => sum + b.invoice_count, 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(total_debt)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Compact summary */}
      {compact && (
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Tổng công nợ:</span>
          <span className="font-bold text-lg">{formatCurrency(total_debt)}</span>
        </div>
      )}
    </div>
  )
}
