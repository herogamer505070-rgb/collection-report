import { LoginForm } from "./login-form";

export const metadata = {
  title: "تسجيل الدخول — نظام التحصيل",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">نظام التحصيل</h1>
        <p className="mt-2 text-muted-foreground">إدارة المتابعات والتحصيل</p>
      </div>
      <LoginForm />
    </div>
  );
}
