import { useState, type ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddCustomerDialog } from '@/components/customers/AddCustomerDialog'
import {
    useCustomers,
    useCustomerSearch,
    useDeleteCustomer,
} from '@/hooks/useCustomers'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, Trash2, UserRound } from 'lucide-react'

export function CustomersPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddDialog, setShowAddDialog] = useState(false)
    const debouncedSearch = useDebounce(searchQuery, 300)

    const { data: allCustomers, isLoading: isLoadingAll } = useCustomers()
    const { data: searchResults, isLoading: isSearching } = useCustomerSearch(debouncedSearch)
    const deleteCustomer = useDeleteCustomer()

    const customers = debouncedSearch ? searchResults : allCustomers
    const isLoading = debouncedSearch ? isSearching : isLoadingAll

    const handleDelete = async (id: number) => {
        if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
            await deleteCustomer.mutateAsync(id)
        }
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold">👥 Quản Lý Khách Hàng</h1>
                <Button onClick={() => setShowAddDialog(true)}>➕ Thêm mới</Button>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="🔍 Tìm kiếm khách hàng..."
                        value={searchQuery}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-muted-foreground">Đang tải...</div>
            ) : !customers || customers.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
                    {searchQuery ? `Không tìm thấy khách hàng '${searchQuery}'` : 'Chưa có khách hàng nào'}
                </div>
            ) : (
                <>
                    <p className="mb-4 text-sm text-muted-foreground">Tổng: {customers.length} khách hàng</p>
                    <div className="grid gap-4 md:grid-cols-2">
                        {customers.map((customer) => (
                            <Card key={customer.id} className="transition-shadow hover:shadow-md">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <UserRound className="h-4 w-4 text-primary" />
                                            {customer.name}
                                        </CardTitle>
                                        {customer.phone && (
                                            <p className="text-sm text-muted-foreground">📞 {customer.phone}</p>
                                        )}
                                        {customer.email && (
                                            <p className="text-sm text-muted-foreground">📧 {customer.email}</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(customer.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {customer.address && (
                                        <p className="text-sm text-muted-foreground">📍 {customer.address}</p>
                                    )}
                                    {customer.notes && (
                                        <p className="mt-2 text-sm text-muted-foreground">📝 {customer.notes}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            <AddCustomerDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
        </div>
    )
}
