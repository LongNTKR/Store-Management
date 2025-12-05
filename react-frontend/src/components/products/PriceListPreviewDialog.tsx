/**
 * Preview Dialog for AI-powered price list import.
 * Shows detected products with match information and allows user to review/edit before confirming.
 */
import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Badge } from '../ui/badge'
import { Card } from '../ui/card'
import type { PreviewItem, PreviewResponse, ImportAction } from '../../types/import'

interface PriceListPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  previewData: PreviewResponse | null
  masterPassword: string
  onConfirm: (
    items: Array<{
      action: ImportAction
      product_id?: number | null
      name: string
      price: number
      import_price?: number | null
      unit?: string | null
      category?: string | null
    }>
  ) => void
  isConfirming: boolean
}

export function PriceListPreviewDialog({
  open,
  onOpenChange,
  previewData,
  masterPassword,
  onConfirm,
  isConfirming,
}: PriceListPreviewDialogProps) {
  // Local state for user modifications
  const [items, setItems] = useState<PreviewItem[]>([])

  // Initialize items when preview data changes
  useState(() => {
    if (previewData) {
      setItems(previewData.items)
    }
  })

  // Update item
  const updateItem = (index: number, updates: Partial<PreviewItem>) => {
    setItems((prev) => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], ...updates }
      return newItems
    })
  }

  // Bulk actions
  const acceptAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        user_action: item.suggested_action,
      }))
    )
  }

  const skipAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        user_action: 'skip' as ImportAction,
      }))
    )
  }

  // Calculate confirmed items count
  const confirmedCount = useMemo(() => {
    return items.filter((item) => (item.user_action || item.suggested_action) !== 'skip').length
  }, [items])

  // Handle confirm
  const handleConfirm = () => {
    const confirmedItems = items
      .filter((item) => (item.user_action || item.suggested_action) !== 'skip')
      .map((item) => {
        const action = item.user_action || item.suggested_action
        const productId =
          action === 'update'
            ? item.user_product_id || item.existing_product_id
            : undefined

        return {
          action,
          product_id: productId,
          name: item.user_name || item.detected_name,
          price: item.user_price !== undefined ? item.user_price : item.detected_price,
          import_price:
            item.user_import_price !== undefined
              ? item.user_import_price
              : item.detected_import_price,
          unit: item.user_unit !== undefined ? item.user_unit : item.detected_unit,
          category:
            item.user_category !== undefined ? item.user_category : item.detected_category,
        }
      })

    onConfirm(confirmedItems)
  }

  if (!previewData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Xem Trước Danh Sách Nhập</DialogTitle>
          <div className="text-sm text-gray-500">
            AI Provider: <span className="font-semibold">{previewData.provider_used}</span>
          </div>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 my-4">
          <Card className="p-4">
            <div className="text-2xl font-bold">{previewData.summary.total}</div>
            <div className="text-sm text-gray-500">Tổng cộng</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {previewData.summary.new_count}
            </div>
            <div className="text-sm text-gray-500">Sản phẩm mới</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {previewData.summary.update_count}
            </div>
            <div className="text-sm text-gray-500">Cập nhật</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {previewData.summary.similar_count}
            </div>
            <div className="text-sm text-gray-500">Tương tự</div>
          </Card>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={acceptAll}>
            Chấp nhận tất cả
          </Button>
          <Button variant="outline" size="sm" onClick={skipAll}>
            Bỏ qua tất cả
          </Button>
        </div>

        {/* Preview Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Tên sản phẩm
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Giá bán
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Giá nhập
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Trạng thái
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <PreviewRow
                  key={index}
                  item={item}
                  onUpdate={(updates) => updateItem(index, updates)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Errors from failed providers */}
        {previewData.errors.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm font-semibold text-yellow-800 mb-2">
              Cảnh báo từ các providers thất bại:
            </div>
            <ul className="list-disc list-inside text-sm text-yellow-700">
              {previewData.errors.slice(0, 3).map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            Hủy
          </Button>
          <Button onClick={handleConfirm} disabled={confirmedCount === 0 || isConfirming}>
            {isConfirming ? 'Đang nhập...' : `Xác nhận nhập (${confirmedCount} sản phẩm)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Preview Row Component - Editable row for each preview item
 */
interface PreviewRowProps {
  item: PreviewItem
  onUpdate: (updates: Partial<PreviewItem>) => void
}

function PreviewRow({ item, onUpdate }: PreviewRowProps) {
  const [isEditing, setIsEditing] = useState(false)

  const currentAction = item.user_action || item.suggested_action
  const currentName = item.user_name || item.detected_name
  const currentPrice = item.user_price !== undefined ? item.user_price : item.detected_price
  const currentImportPrice =
    item.user_import_price !== undefined
      ? item.user_import_price
      : item.detected_import_price

  // Match status badge
  const getStatusBadge = () => {
    switch (item.match_status) {
      case 'new':
        return <Badge className="bg-green-100 text-green-800">Mới</Badge>
      case 'exact_match':
        return <Badge className="bg-blue-100 text-blue-800">Cập nhật</Badge>
      case 'similar_match':
        return <Badge className="bg-orange-100 text-orange-800">Tương tự</Badge>
    }
  }

  // Action select handler
  const handleActionChange = (action: ImportAction) => {
    onUpdate({ user_action: action })

    // If changing to update for similar_match, auto-select first suggestion
    if (
      action === 'update' &&
      item.match_status === 'similar_match' &&
      item.suggested_matches.length > 0
    ) {
      const firstMatch = item.suggested_matches[0]
      onUpdate({
        user_action: action,
        user_product_id: firstMatch.product_id,
      })
    }
  }

  return (
    <tr className="hover:bg-gray-50">
      {/* Name */}
      <td className="px-4 py-3">
        {isEditing ? (
          <Input
            value={currentName}
            onChange={(e) => onUpdate({ user_name: e.target.value })}
            className="max-w-xs"
          />
        ) : (
          <div>
            <div className="font-medium">{currentName}</div>
            {item.match_status === 'exact_match' && item.existing_product_name && (
              <div className="text-xs text-gray-500">
                Hiện tại: {item.existing_product_name} - {item.existing_price?.toLocaleString('vi-VN')}đ
              </div>
            )}
          </div>
        )}
      </td>

      {/* Price */}
      <td className="px-4 py-3">
        {isEditing ? (
          <Input
            type="number"
            value={currentPrice}
            onChange={(e) => onUpdate({ user_price: parseFloat(e.target.value) })}
            className="w-32"
          />
        ) : (
          <div className="font-medium">{currentPrice.toLocaleString('vi-VN')}đ</div>
        )}
      </td>

      {/* Import Price */}
      <td className="px-4 py-3">
        {isEditing ? (
          <Input
            type="number"
            value={currentImportPrice || ''}
            onChange={(e) =>
              onUpdate({
                user_import_price: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="w-32"
            placeholder="Tùy chọn"
          />
        ) : (
          <div className="text-gray-600">
            {currentImportPrice ? `${currentImportPrice.toLocaleString('vi-VN')}đ` : '-'}
          </div>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">{getStatusBadge()}</td>

      {/* Action */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <Select value={currentAction} onValueChange={handleActionChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="create">Tạo mới</SelectItem>
              <SelectItem value="update">Cập nhật</SelectItem>
              <SelectItem value="skip">Bỏ qua</SelectItem>
            </SelectContent>
          </Select>

          {/* Show suggested matches dropdown for similar_match */}
          {item.match_status === 'similar_match' &&
            currentAction === 'update' &&
            item.suggested_matches.length > 0 && (
              <Select
                value={
                  item.user_product_id?.toString() || item.suggested_matches[0].product_id.toString()
                }
                onValueChange={(value) => onUpdate({ user_product_id: parseInt(value) })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {item.suggested_matches.map((match) => (
                    <SelectItem key={match.product_id} value={match.product_id.toString()}>
                      {match.product_name} ({match.similarity_score.toFixed(0)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

          {/* Edit toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs"
          >
            {isEditing ? 'Xong' : 'Chỉnh sửa'}
          </Button>
        </div>
      </td>
    </tr>
  )
}
