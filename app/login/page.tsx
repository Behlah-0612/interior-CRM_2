import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Sign In — Interior Home Services BC",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
            Interior Home Services BC
          </p>
          <p className="mt-1 text-sm text-muted">Sign in to your CRM</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
