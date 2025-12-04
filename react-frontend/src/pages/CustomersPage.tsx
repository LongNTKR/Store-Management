import { useMemo, useState, type ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddCustomerDialog } from '@/components/customers/AddCustomerDialog'
import { EditCustomerDialog } from '@/components/customers/EditCustomerDialog'
import {
    useCustomers,
    useDeleteCustomer,
} from '@/hooks/useCustomers'
import { useDebounce } from '@/hooks/useDebounce'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { Search, Trash2, UserRound, Pencil } from 'lucide-react'
import type { Customer } from '@/types'
import { SearchHighlight } from '@/components/shared/SearchHighlight'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

export function CustomersPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<{ id: number, name: string } | null>(null)
    const debouncedSearch = useDebounce(searchQuery.trim(), 300)

    const {
        data: customerPages,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useCustomers(debouncedSearch)
    const deleteCustomer = useDeleteCustomer()

    const customers = useMemo(
        () => customerPages?.pages.flatMap((page) => page.items) ?? [],
        [customerPages]
    )
    const totalCustomers = customerPages?.pages?.[0]?.total ?? 0
    const isEmpty = !isLoading && customers.length === 0
    const loadMoreRef = useInfiniteScroll({
        hasMore: Boolean(hasNextPage),
        isLoading: isFetchingNextPage,
        onLoadMore: () => fetchNextPage(),
    })

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer)
        setShowEditDialog(true)
    }

    const handleDelete = (customer: Customer) => {
        setDeleteTarget({ id: customer.id, name: customer.name })
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return

        try {
            await deleteCustomer.mutateAsync(deleteTarget.id)
        } finally {
            setDeleteTarget(null)
        }
    }

    return (
        <div>
            <h1 className="mb-6 flex items-center gap-3 text-3xl font-bold">
                <span className="inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                    <img alt="Customers Icon" className="h-16 w-16 object-contain drop-shadow-sm" src="/Image_d6ma5pd6ma5pd6ma.png" />
                </span>
                Quản Lý Khách Hàng
            </h1>

            <div className="mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="🔍 Tìm theo tên, SĐT, email (hỗ trợ không dấu)"
                        value={searchQuery}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={() => setShowAddDialog(true)}>➕ Thêm mới</Button>
            </div>

            {isLoading && customers.length === 0 ? (
                <div className="text-muted-foreground">Đang tải...</div>
            ) : isEmpty ? (
                <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
                    {searchQuery ? `Không tìm thấy khách hàng '${searchQuery}'` : 'Chưa có khách hàng nào'}
                </div>
            ) : (
                <>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Tổng: {totalCustomers || customers.length} khách hàng • Đang hiển thị {customers.length}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        {customers.map((customer) => (
                            <Card key={customer.id} className="transition-shadow hover:shadow-md">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <UserRound className="h-4 w-4 text-primary" />
                                            <SearchHighlight text={customer.name} query={searchQuery} />
                                        </CardTitle>
                                        {customer.phone && (
                                            <p className="text-sm text-muted-foreground">
                                                📞 <SearchHighlight text={customer.phone} query={searchQuery} />
                                            </p>
                                        )}
                                        {customer.email && (
                                            <p className="text-sm text-muted-foreground">
                                                📧 <SearchHighlight text={customer.email} query={searchQuery} />
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-primary hover:text-primary"
                                            onClick={() => handleEdit(customer)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(customer)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
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
                    {(hasNextPage || isFetchingNextPage) && (
                        <div
                            ref={loadMoreRef}
                            className="py-6 text-center text-sm text-muted-foreground"
                        >
                            {isFetchingNextPage ? 'Đang tải thêm...' : 'Kéo xuống để xem thêm khách hàng'}
                        </div>
                    )}
                </>
            )}

            <AddCustomerDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
            <EditCustomerDialog
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                customer={selectedCustomer}
            />

            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Xóa khách hàng?</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa khách hàng "{deleteTarget?.name}" không?
                            <br />
                            <br />
                            💡 Khách hàng sẽ được chuyển vào <strong>Thùng rác</strong> và có thể khôi phục lại trong vòng 30 ngày. Sau 30 ngày, khách hàng sẽ bị xóa vĩnh viễn.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={deleteCustomer.isPending}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteCustomer.isPending}
                        >
                            {deleteCustomer.isPending ? 'Đang xóa...' : 'Chuyển vào thùng rác'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
