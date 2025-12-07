import { useState, useEffect } from 'react';
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
  const [reason, setReason] = useState('');
  const [refundMode, setRefundMode] = useState<'auto' | 'manual'>('auto');
  const [manualRefundAmount, setManualRefundAmount] = useState('');
  const [createRefundPayment, setCreateRefundPayment] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
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
      setRefundMode('auto');
      setManualRefundAmount('');
      setCreateRefundPayment(true);
      setPaymentMethod('cash');
      setNotes('');
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

    if (reason.trim().length < 3) {
      alert('Lý do hoàn trả phải có ít nhất 3 ký tự');
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
          create_refund_payment: createRefundPayment,
          payment_method: paymentMethod,
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
              <div className="border rounded-lg divide-y">
                {availableQuantities?.map((item) => (
                  <div key={item.invoice_item_id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={returnItems[item.invoice_item_id]?.selected || false}
                        onCheckedChange={(checked) =>
                          handleItemSelect(item.invoice_item_id, checked as boolean)
                        }
                        disabled={item.available_for_return <= 0}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Đã mua: {item.original_quantity} {item.unit} | Đã trả:{' '}
                          {item.already_returned} {item.unit} | Còn lại:{' '}
                          <span className="font-semibold text-foreground">
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
                          <Label htmlFor={`qty-${item.invoice_item_id}`}>Số lượng hoàn trả</Label>
                          <Input
                            id={`qty-${item.invoice_item_id}`}
                            type="number"
                            min="0"
                            max={item.available_for_return}
                            step="0.01"
                            value={returnItems[item.invoice_item_id]?.quantity_returned || 0}
                            onChange={(e) => handleQuantityChange(item.invoice_item_id, e.target.value)}
                          />
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
                ))}
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
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do hoàn trả (tối thiểu 3 ký tự)"
                rows={3}
              />
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-payment"
                  checked={createRefundPayment}
                  onCheckedChange={(checked) => setCreateRefundPayment(checked as boolean)}
                />
                <Label htmlFor="create-payment" className="font-normal">
                  Tạo phiếu hoàn tiền
                </Label>
              </div>

              {createRefundPayment && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="payment-method">Phương thức thanh toán</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tiền mặt</SelectItem>
                      <SelectItem value="transfer">Chuyển khoản</SelectItem>
                      <SelectItem value="card">Thẻ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          <Button onClick={handleSubmit} disabled={createReturn.isPending || isLoading}>
            {createReturn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận hoàn trả
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
