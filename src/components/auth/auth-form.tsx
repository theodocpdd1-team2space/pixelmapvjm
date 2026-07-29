"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type AuthActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" className="w-full" disabled={pending}>
      {pending ? "PROCESSING" : label}
    </Button>
  );
}

export function AuthForm() {
  const [state, formAction] = useActionState<AuthActionState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="space-y-5">
      <label className="block space-y-2">
        <span className="technical-label">Email</span>
        <input className="technical-input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block space-y-2">
        <span className="technical-label">Password</span>
        <input
          className="technical-input"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </label>
      {state.error ? (
        <p className="border border-pf-darkRed bg-pf-darkRed/20 px-3 py-2 text-sm text-pf-red">{state.error}</p>
      ) : null}
      <SubmitButton label="LOGIN" />
    </form>
  );
}
