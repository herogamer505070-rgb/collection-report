"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordPayment } from "@/app/(dashboard)/actions/cases";

interface RecordPaymentDialogProps {
  caseId: string;
  amountDue: number;
  amountPaid: number;
  currencyCode: string;
}

export function RecordPaymentDialog({
  caseId,
  amountDue,
  amountPaid,
  currencyCode,
}: RecordPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const balance = amountDue - amountPaid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    startTransition(async () => {
      const result = await recordPayment(caseId, parsed);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("تم تسجيل الدفع بنجاح");
        setOpen(false);
        setAmount("");
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} variant="default">
        تسجيل دفع
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل دفع</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">
                المبلغ المدفوع ({currencyCode})
              </Label>
              <Input
                id="payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={balance > 0 ? balance : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                dir="ltr"
                className="text-left"
              />
              {balance > 0 && (
                <p className="text-xs text-muted-foreground">
                  الرصيد المتبقي: {balance.toLocaleString("ar-EG")}{" "}
                  {currencyCode}
                </p>
              )}
            </div>

            <DialogFooter className="flex-row-reverse gap-2">
              <Button type="submit" disabled={isPending || !amount}>
                {isPending ? "جاري الحفظ..." : "تأكيد"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
