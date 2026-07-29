"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetPasswordAction, type AccessActionState } from "@/features/auth/access";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="primary" className="w-full" disabled={pending}>{pending ? "UPDATING" : "SET NEW PASSWORD"}</Button>;
}

export function PasswordResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<AccessActionState, FormData>(resetPasswordAction, {});
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <label className="block space-y-2"><span className="technical-label">New Password</span><input className="technical-input" name="password" type="password" autoComplete="new-password" required minLength={8} /></label>
      <label className="block space-y-2"><span className="technical-label">Confirm Password</span><input className="technical-input" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} /></label>
      {state.error ? <p className="border border-pf-darkRed bg-pf-darkRed/20 px-3 py-2 text-sm text-pf-red">{state.error}</p> : null}
      {state.message ? <div className="space-y-3 border border-pf-success/40 bg-pf-success/10 p-3 text-sm text-pf-success"><p>{state.message}</p><Link className="inline-block border border-pf-success/50 px-3 py-2 font-mono text-xs uppercase" href="/login">Go to Login</Link></div> : <SubmitButton />}
    </form>
  );
}
