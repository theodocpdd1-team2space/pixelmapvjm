"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { activateInvitationAction, type AccessActionState } from "@/features/auth/access";
import { Button } from "@/components/ui/button";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="primary" className="w-full" disabled={pending}>{pending ? "ACTIVATING" : label}</Button>;
}

export function AccessSetupForm({ token, email, suggestedName }: { token: string; email: string; suggestedName?: string | null }) {
  const [state, formAction] = useActionState<AccessActionState, FormData>(activateInvitationAction, {});
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div className="border border-pf-border bg-black/25 p-3 font-mono text-xs uppercase text-pf-muted">INVITED EMAIL / <span className="text-pf-text">{email}</span></div>
      <label className="block space-y-2"><span className="technical-label">Name</span><input className="technical-input" name="name" defaultValue={suggestedName ?? ""} autoComplete="name" required minLength={2} /></label>
      <label className="block space-y-2"><span className="technical-label">Create Password</span><input className="technical-input" name="password" type="password" autoComplete="new-password" required minLength={8} /></label>
      <label className="block space-y-2"><span className="technical-label">Confirm Password</span><input className="technical-input" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} /></label>
      <p className="font-mono text-[0.68rem] uppercase leading-5 text-pf-muted">Minimum 8 characters. Link ini hanya dapat digunakan satu kali.</p>
      {state.error ? <p className="border border-pf-darkRed bg-pf-darkRed/20 px-3 py-2 text-sm text-pf-red">{state.error}</p> : null}
      {state.message ? <div className="space-y-3 border border-pf-success/40 bg-pf-success/10 p-3 text-sm text-pf-success"><p>{state.message}</p><Link className="inline-block border border-pf-success/50 px-3 py-2 font-mono text-xs uppercase" href="/login">Go to Login</Link></div> : null}
      {!state.message ? <SubmitButton label="ACTIVATE ACCESS" /> : null}
    </form>
  );
}
