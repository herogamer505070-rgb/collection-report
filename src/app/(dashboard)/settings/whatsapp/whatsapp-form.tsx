"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  connectWhatsAppConfig,
  disconnectWhatsAppConfig,
} from "@/app/(dashboard)/actions/whatsapp";

type ExistingConfig = {
  phoneNumberId: string;
  displayPhone: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
  isActive: boolean;
  connectedAt: string | null;
};

type Props = {
  existingConfig: ExistingConfig | null;
  isAdmin: boolean;
};

export function WhatsAppSettingsForm({ existingConfig, isAdmin }: Props) {
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState<ExistingConfig | null>(existingConfig);
  const [showForm, setShowForm] = useState(!existingConfig?.isActive);

  function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await connectWhatsAppConfig(formData);
      if (result.success) {
        toast.success("تم ربط واتساب بنجاح");
        setConfig({
          phoneNumberId: formData.get("phoneNumberId") as string,
          displayPhone: result.displayPhone,
          verifiedName: result.verifiedName,
          qualityRating: null,
          isActive: true,
          connectedAt: new Date().toISOString(),
        });
        setShowForm(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectWhatsAppConfig();
      if (result.success) {
        toast.success("تم قطع اتصال واتساب");
        setConfig((prev) => (prev ? { ...prev, isActive: false } : null));
        setShowForm(true);
      } else {
        toast.error(result.error);
      }
    });
  }

  const isConnected = config?.isActive === true;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Connection status */}
      {config && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">حالة الاتصال</CardTitle>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "متصل" : "غير متصل"}
              </Badge>
            </div>
          </CardHeader>
          {isConnected && (
            <CardContent className="space-y-3">
              {config.displayPhone && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">رقم الهاتف</span>
                  <span className="font-medium" dir="ltr">
                    {config.displayPhone}
                  </span>
                </div>
              )}
              {config.verifiedName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الاسم المعتمد</span>
                  <span className="font-medium">{config.verifiedName}</span>
                </div>
              )}
              {config.qualityRating && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">جودة الحساب</span>
                  <span className="font-medium">{config.qualityRating}</span>
                </div>
              )}
              {config.connectedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">تاريخ الربط</span>
                  <span className="font-medium" dir="ltr">
                    {new Date(config.connectedAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              )}
              {isAdmin && (
                <>
                  <Separator />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForm(true)}
                      disabled={isPending}
                    >
                      تحديث البيانات
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisconnect}
                      disabled={isPending}
                    >
                      {isPending ? "جاري القطع..." : "قطع الاتصال"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Connection form */}
      {showForm && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isConnected ? "تحديث بيانات واتساب" : "ربط واتساب للأعمال"}
            </CardTitle>
            <CardDescription>
              أدخل بيانات حساب Meta Business الخاص بشركتك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                <Input
                  id="phoneNumberId"
                  name="phoneNumberId"
                  type="text"
                  dir="ltr"
                  placeholder="123456789012345"
                  required
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  من لوحة Meta for Developers &gt; WhatsApp &gt; API Setup
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAccountId">
                  Business Account ID{" "}
                  <span className="text-muted-foreground">(اختياري)</span>
                </Label>
                <Input
                  id="businessAccountId"
                  name="businessAccountId"
                  type="text"
                  dir="ltr"
                  placeholder="123456789012345"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  name="accessToken"
                  type="password"
                  dir="ltr"
                  placeholder="EAAxxxxx..."
                  required
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  يُخزَّن مشفرًا — لا يُعرض مجددًا بعد الحفظ
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appSecret">App Secret</Label>
                <Input
                  id="appSecret"
                  name="appSecret"
                  type="password"
                  dir="ltr"
                  placeholder="App Secret من إعدادات تطبيق Meta"
                  required
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  مطلوب للتحقق من توقيع Webhook
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "جاري التحقق والحفظ..." : "ربط واتساب"}
                </Button>
                {isConnected && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                    disabled={isPending}
                  >
                    إلغاء
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Non-admin read-only notice */}
      {!isAdmin && !isConnected && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            واتساب غير مفعّل. تواصل مع المسؤول لربط الحساب.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
