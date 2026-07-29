"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Copy, Link2, RefreshCw, ShieldAlert, UserPlus } from "lucide-react";
import {
  createInvitationAction,
  createPasswordResetAction,
  resendInvitationAction,
  setUserAccessStatusAction,
  type AccessActionState
} from "@/features/auth/access";
import { Button } from "@/components/ui/button";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  accessStatus: string;
  projectCount: number;
  pageCount: number;
  lastActiveAt: string | null;
  activeNow: boolean;
  invitationDate: string | null;
  activationDate: string | null;
};

type InvitationRow = { id: string; email: string; name: string | null; expiresAt: string; createdAt: string };

function ActionButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="secondary" disabled={pending}>{pending ? "WAIT" : children}</Button>;
}

function formatDate(value: string | null) {
  if (!value) return "NEVER";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function AdminManager({ users, invitations }: { users: AdminUserRow[]; invitations: InvitationRow[] }) {
  const [inviteState, inviteAction] = useActionState<AccessActionState, FormData>(createInvitationAction, {});
  const [copied, setCopied] = useState<string | null>(null);

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(link);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="space-y-6">
      <section className="border border-pf-border bg-pf-panel">
        <div className="flex items-center gap-2 border-b border-pf-border px-4 py-3"><UserPlus size={15} className="text-pf-red" /><h2 className="font-brand text-sm uppercase">01 / Invite Customer</h2></div>
        <form action={inviteAction} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]">
          <input className="technical-input" name="name" placeholder="Customer name" required minLength={2} />
          <input className="technical-input" name="email" type="email" placeholder="customer@email.com" required />
          <ActionButton>CREATE INVITE</ActionButton>
        </form>
        {inviteState.error ? <p className="mx-4 mb-4 border border-pf-darkRed bg-pf-darkRed/20 p-3 font-mono text-xs uppercase text-pf-red">{inviteState.error}</p> : null}
        {inviteState.link ? <div className="mx-4 mb-4 border border-pf-success/40 bg-pf-success/10 p-3"><p className="font-mono text-xs uppercase text-pf-success">{inviteState.message}</p><div className="mt-2 flex gap-2"><input className="technical-input min-w-0 flex-1 text-xs" readOnly value={inviteState.link} /><Button type="button" onClick={() => void copyLink(inviteState.link ?? "")}><Copy size={14} />{copied === inviteState.link ? "COPIED" : "COPY"}</Button></div></div> : null}
      </section>

      {invitations.length > 0 ? <section className="border border-pf-border bg-pf-panel"><div className="border-b border-pf-border px-4 py-3"><h2 className="font-brand text-sm uppercase">02 / Pending Invitations</h2></div><div className="divide-y divide-pf-border">{invitations.map((invitation) => <div key={invitation.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-center"><div><p className="text-sm text-pf-text">{invitation.name || "Unnamed customer"}</p><p className="font-mono text-xs text-pf-muted">{invitation.email}</p></div><p className="font-mono text-xs uppercase text-pf-muted">EXPIRES {formatDate(invitation.expiresAt)}</p><p className="font-mono text-xs uppercase text-pf-muted">CREATED {formatDate(invitation.createdAt)}</p><ResendInvitation invitationId={invitation.id} /></div>)}</div></section> : null}

      <section className="border border-pf-border bg-pf-panel"><div className="border-b border-pf-border px-4 py-3"><h2 className="font-brand text-sm uppercase">03 / Customer Access</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="border-b border-pf-border font-mono text-[0.65rem] uppercase text-pf-muted"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Cloud Mapper</th><th className="px-4 py-3">Last Active</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-pf-border">{users.map((user) => <tr key={user.id} className="align-top"><td className="px-4 py-4"><p className="text-sm text-pf-text">{user.name}</p><p className="font-mono text-xs text-pf-muted">{user.email}</p><p className="mt-1 font-mono text-[0.62rem] uppercase text-pf-muted">{user.role} / INVITED {formatDate(user.invitationDate)}</p><p className="font-mono text-[0.62rem] uppercase text-pf-muted">ACTIVE SINCE {formatDate(user.activationDate)}</p></td><td className="px-4 py-4"><span className={`border px-2 py-1 font-mono text-[0.65rem] uppercase ${user.accessStatus === "ACTIVE" ? "border-pf-success/40 text-pf-success" : user.accessStatus === "SUSPENDED" ? "border-pf-warning/40 text-pf-warning" : "border-pf-darkRed text-pf-red"}`}>{user.accessStatus}</span>{user.activeNow ? <p className="mt-2 font-mono text-[0.62rem] uppercase text-pf-success">ACTIVE NOW</p> : null}</td><td className="px-4 py-4 font-mono text-xs uppercase text-pf-muted">{user.projectCount} PROJECTS / {user.pageCount} PAGES</td><td className="px-4 py-4 font-mono text-xs uppercase text-pf-muted">{formatDate(user.lastActiveAt)}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><form action={setUserAccessStatusAction}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="status" value={user.accessStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} /><ActionButton>{user.accessStatus === "ACTIVE" ? "SUSPEND" : "RESTORE"}</ActionButton></form>{user.accessStatus !== "REVOKED" ? <form action={setUserAccessStatusAction}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="status" value="REVOKED" /><ActionButton><ShieldAlert size={13} /> REVOKE</ActionButton></form> : null}<ResetLink userId={user.id} /></div></td></tr>)}</tbody></table></div></section>
    </div>
  );
}

function ResetLink({ userId }: { userId: string }) {
  const [state, action] = useActionState<AccessActionState, FormData>(createPasswordResetAction, {});
  const [copied, setCopied] = useState(false);
  return <div className="flex items-center gap-2"><form action={action}><input type="hidden" name="userId" value={userId} /><ActionButton><Link2 size={13} /> RESET LINK</ActionButton></form>{state.link ? <Button type="button" onClick={() => { void navigator.clipboard.writeText(state.link ?? ""); setCopied(true); }}> <Copy size={13} /> {copied ? "COPIED" : "COPY"}</Button> : null}</div>;
}

function ResendInvitation({ invitationId }: { invitationId: string }) {
  const [state, action] = useActionState<AccessActionState, FormData>(resendInvitationAction, {});
  const [copied, setCopied] = useState(false);
  return <div className="flex items-center gap-2"><form action={action}><input type="hidden" name="invitationId" value={invitationId} /><ActionButton><RefreshCw size={13} /> RESEND</ActionButton></form>{state.link ? <Button type="button" onClick={() => { void navigator.clipboard.writeText(state.link ?? ""); setCopied(true); }}><Copy size={13} /> {copied ? "COPIED" : "COPY"}</Button> : null}</div>;
}
