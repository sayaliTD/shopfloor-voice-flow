import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a New Password — Kaizen Portal" },
      {
        name: "description",
        content: "Choose a new password for your Kaizen management portal staff account.",
      },
      { property: "og:title", content: "Set a New Password — Kaizen Portal" },
      {
        property: "og:description",
        content: "Complete your password reset for the shopfloor Kaizen management portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You are signed in.");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-steel text-steel-foreground">
      <div className="h-2 hazard-stripe" />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <KeyRound className="size-7" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold leading-tight">New password</h1>
              <p className="text-sm opacity-80">Set a new password for your staff account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-card p-5 text-card-foreground shadow-panel">
            <label className="block space-y-1">
              <span className="text-sm font-semibold">New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border-2 border-input bg-background px-3 py-3 text-base outline-none focus:border-primary"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-semibold">Confirm password</span>
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border-2 border-input bg-background px-3 py-3 text-base outline-none focus:border-primary"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-base font-extrabold text-primary-foreground disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : <KeyRound className="size-5" />}
              Update password
            </button>
          </form>

          <p className="mt-5 text-center text-sm opacity-80">
            <Link to="/admin/login" className="font-bold underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
