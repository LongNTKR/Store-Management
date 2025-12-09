import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAvailableReturnQuantities, useCreateReturn } from '@/hooks/useInvoiceReturns';
import type { InvoiceReturnItemCreate } from '@/types/invoiceReturn';
import { Loader2 } from 'lucide-react';

interface CreateReturnDialogProps {
  invoiceId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReturnItemState {
  invoice_item_id: number;
  quantity_returned: number;
  restore_inventory: boolean;
  selected: boolean;
}

export function CreateReturnDialog({ invoiceId, open, onOpenChange }: CreateReturnDialogProps) {
  const { data: availableQuantities, isLoading } = useAvailableReturnQuantities(open ? invoiceId : null);
  const createReturn = useCreateReturn();

  const [returnItems, setReturnItems] = useState<Record<number, ReturnItemState>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [refundMode, setRefundMode] = useState<'auto' | 'manual'>('auto');
  const [manualRefundAmount, setManualRefundAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Initialize return items state when available quantities load
  useEffect(() => {
    if (availableQuantities) {
      const initialState: Record<number, ReturnItemState> = {};
      availableQuantities.forEach((item) => {
        initialState[item.invoice_item_id] = {
          invoice_item_id: item.invoice_item_id,
          quantity_returned: 0,
          restore_inventory: true,
          selected: false,
        };
      });
      setReturnItems(initialState);
    }
  }, [availableQuantities]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setReason('');
      setReasonError(false);
      setRefundMode('auto');
      setManualRefundAmount('');
      setNotes('');
      setErrors({});
    }
  }, [open]);

  const selectedItems = Object.values(returnItems).filter((item) => item.selected);
  const totalRefundAmount = selectedItems.reduce((sum, item) => {
    const availableItem = availableQuantities?.find((q) => q.invoice_item_id === item.invoice_item_id);
    return sum + (availableItem ? item.quantity_returned * availableItem.product_price : 0);
  }, 0);

  const handleSubmit = () => {
    // Validation
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm để hoàn trả');
      return;
    }

    // Check for 0 quantity or invalid integer and set errors
    const newErrors: Record<number, string> = {};
    let hasError = false;

    selectedItems.forEach(item => {
      if (item.quantity_returned <= 0) {
        newErrors[item.invoice_item_id] = 'Số lượng phải lớn hơn 0';
        hasError = true;
      } else {
        const availableItem = availableQuantities?.find(q => q.invoice_item_id === item.invoice_item_id);

        // Debug logging


        if (availableItem && !availableItem.allows_decimal) {
          if (!Number.isInteger(item.quantity_returned)) {
            newErrors[item.invoice_item_id] = 'Vui lòng nhập số nguyên';
            hasError = true;
          }
        }
      }
    });

    setErrors(newErrors);

    // Validate reason
    if (!reason.trim()) {
      setReasonError(true);
      hasError = true;
    } else {
      setReasonError(false);
    }

    if (hasError) {
      // Find first error and scroll to it
      const firstErrorId = Object.keys(newErrors)[0];
      if (firstErrorId) {
        setTimeout(() => {
          const element = document.getElementById(`return-item-${firstErrorId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      return;
    }

    // Build return items data
    const returnItemsData: InvoiceReturnItemCreate[] = selectedItems.map((item) => ({
      invoice_item_id: item.invoice_item_id,
      quantity_returned: item.quantity_returned,
      restore_inventory: item.restore_inventory,
    }));

    // Build request data
    const refundAmount = refundMode === 'manual' ? parseFloat(manualRefundAmount) || 0 : null;

    createReturn.mutate(
      {
        invoiceId,
        data: {
          return_items: returnItemsData,
          reason: reason.trim(),
          refund_amount: refundAmount,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleItemSelect = (itemId: number, selected: boolean) => {
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected },
    }));
    // Clear error when deselecting
    if (!selected) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[itemId];
        return newErrors;
      });
    }
  };

  const handleQuantityChange = (itemId: number, value: string) => {
    const quantity = parseFloat(value) || 0;
    const availableItem = availableQuantities?.find((q) => q.invoice_item_id === itemId);
    const maxQuantity = availableItem?.available_for_return || 0;

    setReturnItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity_returned: Math.min(quantity, maxQuantity),
      },
    }));

    // Clear error on change
    if (errors[itemId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[itemId];
        return newErrors;
      });
    }
  };

  const handleRestoreInventoryChange = (itemId: number, checked: boolean) => {
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], restore_inventory: checked },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo hoàn trả hóa đơn</DialogTitle>
          <DialogDescription>
            Chọn sản phẩm và số lượng cần hoàn trả, sau đó điền lý do hoàn trả.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Product Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Chọn sản phẩm hoàn trả</Label>
              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {availableQuantities?.map((item) => {
                  const isFullyReturned = item.available_for_return <= 0;
                  const isInteger = !item.allows_decimal;
                  const step = isInteger ? '1' : '0.01';

                  return (
                    <div
                      key={item.invoice_item_id}
                      id={`return-item-${item.invoice_item_id}`}
                      className={cn(
                        "p-4 space-y-3",
                        isFullyReturned && "opacity-60 bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={returnItems[item.invoice_item_id]?.selected || false}
                          onCheckedChange={(checked) =>
                            handleItemSelect(item.invoice_item_id, checked as boolean)
                          }
                          disabled={isFullyReturned}
                        />
                        <div className="flex-1">
                          <p className={cn("font-medium", isFullyReturned && "line-through")}>
                            {item.product_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Đã mua: {item.original_quantity} {item.unit} | Đã trả:{' '}
                            {item.already_returned} {item.unit} | Còn lại:{' '}
                            <span className={cn("font-semibold text-foreground", isFullyReturned && "text-muted-foreground")}>
                              {item.available_for_return} {item.unit}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Giá: {item.product_price.toLocaleString('vi-VN')}đ/{item.unit}
                          </p>
                        </div>
                      </div>

                      {returnItems[item.invoice_item_id]?.selected && (
                        <div className="grid grid-cols-2 gap-4 pl-9">
                          <div>
                            <Label htmlFor={`qty-${item.invoice_item_id}`}>
                              Số lượng hoàn trả {isInteger && <span className="text-xs text-muted-foreground">(Số nguyên)</span>}
                            </Label>
                            <Input
                              id={`qty-${item.invoice_item_id}`}
                              type="number"
                              min="0"
                              max={item.available_for_return}
                              step={step}
                              value={returnItems[item.invoice_item_id]?.quantity_returned ?? 0}
                              onChange={(e) => handleQuantityChange(item.invoice_item_id, e.target.value)}
                              className={cn(
                                (errors[item.invoice_item_id] || (isInteger && returnItems[item.invoice_item_id]?.quantity_returned % 1 !== 0)) && "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                            {errors[item.invoice_item_id] && (
                              <p className="text-[0.8rem] text-destructive mt-1">{errors[item.invoice_item_id]}</p>
                            )}
                            {!errors[item.invoice_item_id] && isInteger && returnItems[item.invoice_item_id]?.quantity_returned % 1 !== 0 && (
                              <p className="text-[0.8rem] text-destructive mt-1">Vui lòng nhập số nguyên</p>
                            )}
                          </div>
                          <div className="flex items-end">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`restore-${item.invoice_item_id}`}
                                checked={returnItems[item.invoice_item_id]?.restore_inventory || false}
                                onCheckedChange={(checked) =>
                                  handleRestoreInventoryChange(item.invoice_item_id, checked as boolean)
                                }
                              />
                              <label
                                htmlFor={`restore-${item.invoice_item_id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Cộng lại kho
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Return Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Lý do hoàn trả <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError && e.target.value.trim()) {
                    setReasonError(false);
                  }
                }}
                placeholder="Nhập lý do hoàn trả"
                rows={3}
                className={cn(
                  reasonError && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {reasonError && (
                <p className="text-[0.8rem] text-destructive">
                  Vui lòng nhập lý do hoàn trả
                </p>
              )}
            </div>

            {/* Refund Options */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tùy chọn hoàn tiền</Label>

              <RadioGroup value={refundMode} onValueChange={(value) => setRefundMode(value as 'auto' | 'manual')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto" id="refund-auto" />
                  <Label htmlFor="refund-auto" className="font-normal">
                    Tự động tính ({totalRefundAmount.toLocaleString('vi-VN')}đ)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="refund-manual" />
                  <Label htmlFor="refund-manual" className="font-normal">
                    Nhập thủ công
                  </Label>
                </div>
              </RadioGroup>

              {refundMode === 'manual' && (
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={manualRefundAmount}
                  onChange={(e) => setManualRefundAmount(e.target.value)}
                  placeholder="Nhập số tiền hoàn lại"
                />
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú thêm (nếu có)"
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createReturn.isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={createReturn.isPending || isLoading || selectedItems.length === 0}>
            {createReturn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận hoàn trả
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
