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
import { Pencil } from "lucide-react";
import { updateCustomer } from "@/app/(dashboard)/actions/cases";

interface EditCustomerDialogProps {
  customerId: string;
  initialName: string | null;
  initialPhone: string | null;
}

export function EditCustomerDialog({
  customerId,
  initialName,
  initialPhone,
}: EditCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateCustomer(customerId, {
        name: name.trim() || null,
        phone: phone.trim() || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("تم تحديث بيانات العميل");
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={() => setOpen(true)}
        aria-label="تعديل بيانات العميل"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل بيانات العميل</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">الاسم</Label>
              <Input
                id="customer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم العميل"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">رقم الهاتف</Label>
              <Input
                id="customer-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+201XXXXXXXXX"
                dir="ltr"
                className="text-left"
              />
            </div>

            <DialogFooter className="flex-row-reverse gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "جاري الحفظ..." : "حفظ"}
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
