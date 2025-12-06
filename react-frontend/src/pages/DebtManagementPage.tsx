import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, AlertCircle, TrendingUp, Users, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { customerService } from '@/services/customers'
import { paymentService } from '@/services/payments'
import { AgingAnalysis } from '@/components/debt/AgingAnalysis'
import { CustomerDebtDetailDialog } from '@/components/debt/CustomerDebtDetailDialog'
import type { DebtSummary } from '@/types/payment'
import type { Customer } from '@/types'

interface CustomerWithDebt extends Customer {
  debt_summary: DebtSummary | null
}

export function DebtManagementPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'debt' | 'overdue' | 'invoices'>('debt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [detailCustomer, setDetailCustomer] = useState<{ id: number, name: string } | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Fetch all customers
  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['all-customers'],
    queryFn: () => customerService.list({ limit: 1000 })
  })

  const customers = customersData?.items || []

  // Fetch debt for all customers
  const { data: debtMap, isLoading: isLoadingDebts } = useQuery({
    queryKey: ['all-customer-debts'],
    queryFn: async () => {
      const entries = await Promise.all(
        customers.map(async (customer) => {
          try {
            const summary = await paymentService.getCustomerDebt(customer.id)
            return [customer.id, summary] as const
          } catch {
            return [customer.id, null] as const
          }
        })
      )
      return Object.fromEntries(entries) as Record<number, DebtSummary | null>
    },
    enabled: customers.length > 0
  })

  // Combine customers with debt data
  const customersWithDebt: CustomerWithDebt[] = useMemo(() => {
    return customers.map((customer) => ({
      ...customer,
      debt_summary: debtMap?.[customer.id] ?? null
    }))
  }, [customers, debtMap])

  // Filter customers with debt only
  const customersWithDebtOnly = useMemo(() => {
    return customersWithDebt.filter((c) => c.debt_summary && c.debt_summary.total_debt > 0)
  }, [customersWithDebt])

  // Filter by search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customersWithDebtOnly

    const query = searchQuery.toLowerCase()
    return customersWithDebtOnly.filter((c) =>
      c.name.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    )
  }, [customersWithDebtOnly, searchQuery])

  // Sort customers
  const sortedCustomers = useMemo(() => {
    const sorted = [...filteredCustomers]

    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'debt':
          comparison = (a.debt_summary?.total_debt || 0) - (b.debt_summary?.total_debt || 0)
          break
        case 'overdue':
          comparison = (a.debt_summary?.overdue_debt || 0) - (b.debt_summary?.overdue_debt || 0)
          break
        case 'invoices':
          comparison = (a.debt_summary?.total_invoices || 0) - (b.debt_summary?.total_invoices || 0)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [filteredCustomers, sortBy, sortOrder])

  // Calculate aggregate stats
  const stats = useMemo(() => {
    const totalDebt = customersWithDebtOnly.reduce(
      (sum, c) => sum + (c.debt_summary?.total_debt || 0),
      0
    )
    const totalOverdue = customersWithDebtOnly.reduce(
      (sum, c) => sum + (c.debt_summary?.overdue_debt || 0),
      0
    )
    const customersWithDebtCount = customersWithDebtOnly.length

    return {
      totalDebt,
      totalOverdue,
      customersWithDebt: customersWithDebtCount
    }
  }, [customersWithDebtOnly])

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const handleViewDetail = (customer: CustomerWithDebt) => {
    setDetailCustomer({ id: customer.id, name: customer.name })
    setDetailDialogOpen(true)
  }

  const isLoading = isLoadingCustomers || isLoadingDebts

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quản lý công nợ</h1>
        <p className="text-muted-foreground">
          Tổng quan công nợ và đối chiếu khách hàng
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Đang tải dữ liệu công nợ...</span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng công nợ</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(stats.totalDebt)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tổng số tiền chưa thu được
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Khách hàng có nợ</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.customersWithDebt}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Khách hàng chưa thanh toán đủ
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nợ quá hạn</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalOverdue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Nợ tồn đọng trên 30 ngày
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Aging Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Phân tích tuổi nợ (toàn hệ thống)</CardTitle>
            </CardHeader>
            <CardContent>
              <AgingAnalysis />
            </CardContent>
          </Card>

          {/* Customer Debt Table */}
          <Card>
            <CardHeader>
              <CardTitle>Danh sách khách hàng có nợ</CardTitle>
              <div className="flex items-center gap-2 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm khách hàng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sortedCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? 'Không tìm thấy khách hàng nào phù hợp'
                      : 'Không có khách hàng nào có công nợ'}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button
                            onClick={() => handleSort('name')}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            Khách hàng
                            {sortBy === 'name' && (
                              <span className="text-xs">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        </TableHead>
                        <TableHead>Liên hệ</TableHead>
                        <TableHead className="text-right">
                          <button
                            onClick={() => handleSort('debt')}
                            className="flex items-center gap-1 ml-auto hover:text-foreground"
                          >
                            Tổng nợ
                            {sortBy === 'debt' && (
                              <span className="text-xs">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        </TableHead>
                        <TableHead className="text-right">
                          <button
                            onClick={() => handleSort('overdue')}
                            className="flex items-center gap-1 ml-auto hover:text-foreground"
                          >
                            Quá hạn
                            {sortBy === 'overdue' && (
                              <span className="text-xs">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        </TableHead>
                        <TableHead className="text-center">
                          <button
                            onClick={() => handleSort('invoices')}
                            className="flex items-center gap-1 mx-auto hover:text-foreground"
                          >
                            Số hóa đơn
                            {sortBy === 'invoices' && (
                              <span className="text-xs">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        </TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCustomers.map((customer) => (
                        <TableRow
                          key={customer.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewDetail(customer)}
                        >
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {customer.phone || customer.email || '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-amber-600">
                            {formatCurrency(customer.debt_summary?.total_debt || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {customer.debt_summary?.overdue_debt ? (
                              <span className="font-semibold text-red-600 flex items-center justify-end gap-1">
                                {formatCurrency(customer.debt_summary.overdue_debt)}
                                <AlertCircle className="h-3 w-3" />
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {customer.debt_summary?.total_invoices || 0}
                            {customer.debt_summary?.unpaid_invoices ? (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({customer.debt_summary.unpaid_invoices} chưa TT)
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDetail(customer)
                              }}
                            >
                              Chi tiết
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Customer Debt Detail Dialog */}
      <CustomerDebtDetailDialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open)
          if (!open) {
            setDetailCustomer(null)
          }
        }}
        customerId={detailCustomer?.id || null}
        customerName={detailCustomer?.name}
      />
    </div>
  )
}
