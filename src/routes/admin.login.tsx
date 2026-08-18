import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Factory, Loader2, LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Staff Sign In — Kaizen Management Portal" },
      {
        name: "description",
        content: "Management and HR sign-in for the shopfloor Kaizen portal: review, approve and reward suggestions.",
      },
      { property: "og:title", content: "Staff Sign In — Kaizen Management Portal" },
      {
        property: "og:description",
        content: "Sign in to review shopfloor Kaizen submissions, update status and export reward reports.",
      },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"management" | "hr">("management");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName, role },
        },
      });
      if (error) throw error;
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
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
              <Factory className="size-7" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold leading-tight">Kaizen Portal</h1>
              <p className="text-sm opacity-80">Management &amp; HR access</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-card p-5 text-card-foreground shadow-panel">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              {(["signin", "signup"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={
                    mode === option
                      ? "rounded-md bg-primary py-2 text-sm font-bold text-primary-foreground"
                      : "rounded-md py-2 text-sm font-semibold text-muted-foreground"
                  }
                >
                  {option === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {mode === "signup" ? (
              <>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Full name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    className="w-full rounded-lg border-2 border-input bg-background px-3 py-3 text-base outline-none focus:border-primary"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">Role</span>
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as "management" | "hr")}
                    className="w-full rounded-lg border-2 border-input bg-background px-3 py-3 text-base outline-none focus:border-primary"
                  >
                    <option value="management">Management</option>
                    <option value="hr">HR</option>
                  </select>
                </label>
              </>
            ) : null}

            <label className="block space-y-1">
              <span className="text-sm font-semibold">Work email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border-2 border-input bg-background px-3 py-3 text-base outline-none focus:border-primary"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-semibold">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full rounded-lg border-2 border-input bg-background px-3 py-3 text-base outline-none focus:border-primary"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-base font-extrabold text-primary-foreground disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm opacity-80">
            Shopfloor operator?{" "}
            <Link to="/" className="font-bold underline">
              Go to the Kaizen entry form
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
