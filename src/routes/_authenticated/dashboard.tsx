import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Download,
  Factory,
  ImageOff,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { STATUSES, STATUS_LABEL, StatusBadge, type KaizenStatus } from "@/components/kaizen/StatusBadge";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "kaizen-attachments";

function parseRosterCsv(text: string): { employee_id: string; full_name: string }[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];

  const splitRow = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else quoted = !quoted;
      } else if (char === "," && !quoted) {
        cells.push(current);
        current = "";
      } else current += char;
    }
    cells.push(current);
    return cells.map((cell) => cell.trim());
  };

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
  const header = splitRow(lines[0] ?? "").map(normalize);
  const idKeys = ["employeeid", "empid", "id", "employeecode"];
  const nameKeys = ["employeename", "fullname", "name", "employee"];
  let idIndex = header.findIndex((cell) => idKeys.includes(cell));
  let nameIndex = header.findIndex((cell) => nameKeys.includes(cell));
  const hasHeader = idIndex !== -1 || nameIndex !== -1;
  if (idIndex === -1) idIndex = 0;
  if (nameIndex === -1) nameIndex = 1;

  const rows = hasHeader ? lines.slice(1) : lines;
  const map = new Map<string, string>();
  rows.forEach((line) => {
    const cells = splitRow(line);
    const id = (cells[idIndex] ?? "").replace(/[^0-9]/g, "");
    const name = cells[nameIndex] ?? "";
    if (id && name) map.set(id, name);
  });
  return [...map.entries()].map(([employee_id, full_name]) => ({ employee_id, full_name }));
}


type KaizenRow = {
  id: string;
  employee_id: string;
  audio_url: string | null;
  image_url: string | null;
  transcription: string;
  language: string | null;
  status: string;
  management_notes: string | null;
  reward_points: number;
  created_at: string;
};

type KaizenWithLinks = KaizenRow & { audioLink: string | null; imageLink: string | null };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Kaizen Dashboard — Management & HR" },
      {
        name: "description",
        content:
          "Review every shopfloor Kaizen submission: voice notes, transcriptions, photos, status updates, review notes and reward points.",
      },
      { property: "og:title", content: "Kaizen Dashboard — Management & HR" },
      {
        property: "og:description",
        content: "Filter, review and reward shopfloor Kaizen submissions, and export monthly reports.",
      },
    ],
  }),
  component: Dashboard,
});

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toCsv(rows: KaizenWithLinks[]) {
  const header = [
    "Submitted At",
    "Employee ID",
    "Language",
    "Transcription",
    "Status",
    "Review Notes",
    "Reward Points",
  ];
  const escape = (value: string | number | null) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((row) =>
    [
      formatDateTime(row.created_at),
      row.employee_id,
      row.language ?? "",
      row.transcription,
      STATUS_LABEL[(row.status as KaizenStatus) ?? "pending"] ?? row.status,
      row.management_notes ?? "",
      row.reward_points,
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | KaizenStatus>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openRow, setOpenRow] = useState<KaizenWithLinks | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deleteRow, setDeleteRow] = useState<KaizenWithLinks | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  const roleQuery = useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userData.user.id),
        supabase.from("profiles").select("full_name").eq("id", userData.user.id).maybeSingle(),
      ]);
      return {
        email: userData.user.email ?? "",
        fullName: profile?.full_name ?? null,
        roles: (roles ?? []).map((entry) => entry.role as string),
      };
    },
  });
  const roles = roleQuery.data?.roles ?? [];
  const isSystemManager = roles.includes("system_manager");
  // Any signed-in staff member (management, HR or system manager) may import the roster.
  const canManageRoster = roles.length > 0;

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("employee_id, full_name");
      if (error) throw error;
      return new Map((data ?? []).map((row) => [row.employee_id, row.full_name]));
    },
  });
  const employeeNames = employeesQuery.data;


  const kaizensQuery = useQuery({
    queryKey: ["kaizens"],
    queryFn: async (): Promise<KaizenWithLinks[]> => {
      const { data, error } = await supabase
        .from("kaizens")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as KaizenRow[];
      const paths = rows.flatMap((row) => [row.audio_url, row.image_url].filter(Boolean) as string[]);
      const signedMap = new Map<string, string>();
      if (paths.length) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
        (signed ?? []).forEach((entry) => {
          if (entry.path && entry.signedUrl) signedMap.set(entry.path, entry.signedUrl);
        });
      }

      return rows.map((row) => ({
        ...row,
        audioLink: row.audio_url ? (signedMap.get(row.audio_url) ?? null) : null,
        imageLink: row.image_url ? (signedMap.get(row.image_url) ?? null) : null,
      }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      status: KaizenStatus;
      management_notes: string;
      reward_points: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("kaizens")
        .update({
          status: input.status,
          management_notes: input.management_notes || null,
          reward_points: input.reward_points,
          reviewed_by: userData.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kaizen updated");
      setOpenRow(null);
      queryClient.invalidateQueries({ queryKey: ["kaizens"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kaizens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kaizen deleted");
      setDeleteRow(null);
      queryClient.invalidateQueries({ queryKey: ["kaizens"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  const rosterMutation = useMutation({
    mutationFn: async (file: File) => {
      const rows = parseRosterCsv(await file.text());
      if (!rows.length) throw new Error("No valid rows found. Expected columns: employee_id, employee_name");
      const { error } = await supabase.from("employees").upsert(rows, { onConflict: "employee_id" });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`Successfully updated ${count} employees`);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Roster upload failed"),
  });

  const filtered = useMemo(() => {
    const rows = kaizensQuery.data ?? [];
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        const name = employeeNames?.get(row.employee_id)?.toLowerCase() ?? "";
        if (
          !row.employee_id.includes(needle) &&
          !name.includes(needle) &&
          !row.transcription.toLowerCase().includes(needle)
        )
          return false;
      }
      if (fromDate && new Date(row.created_at) < new Date(`${fromDate}T00:00:00`)) return false;
      if (toDate && new Date(row.created_at) > new Date(`${toDate}T23:59:59`)) return false;
      return true;
    });
  }, [kaizensQuery.data, statusFilter, search, fromDate, toDate, employeeNames]);


  const counts = useMemo(() => {
    const rows = kaizensQuery.data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((row) => row.status === "pending").length,
      implemented: rows.filter((row) => row.status === "implemented").length,
      points: rows.reduce((sum, row) => sum + (row.reward_points ?? 0), 0),
    };
  }, [kaizensQuery.data]);

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kaizen-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="h-2 hazard-stripe" />
      <header className="bg-steel px-4 py-4 text-steel-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Factory className="size-6" />
          </span>
          <div className="mr-auto">
            <h1 className="text-xl font-extrabold leading-tight">Kaizen Dashboard</h1>
            <p className="text-sm opacity-80">
              {roleQuery.data?.fullName ?? roleQuery.data?.email ?? "Staff"}
              {roleQuery.data?.roles?.length ? ` · ${roleQuery.data.roles.join(", ").toUpperCase()}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => kaizensQuery.refetch()}
            className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2 text-sm font-semibold"
          >
            <RefreshCw className={kaizensQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
          >
            <Download className="size-4" />
            Export CSV
          </button>
          {canManageRoster ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) rosterMutation.mutate(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={rosterMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {rosterMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Upload Employee Roster (CSV)
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm font-semibold"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total Kaizens", value: counts.total },
            { label: "Pending review", value: counts.pending },
            { label: "Implemented", value: counts.implemented },
            { label: "Reward points awarded", value: counts.points },
          ].map((card) => (
            <div key={card.label} className="panel p-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-3xl font-extrabold">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="panel grid gap-3 p-4 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-sm font-semibold">Search</span>
            <div className="flex items-center gap-2 rounded-lg border-2 border-input bg-background px-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Employee name, ID or text"
                className="w-full bg-transparent py-2.5 text-base outline-none"
              />
            </div>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | KaizenStatus)}
              className="w-full rounded-lg border-2 border-input bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold">From date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-lg border-2 border-input bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold">To date</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-lg border-2 border-input bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
            />
          </label>
        </section>

        {kaizensQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading submissions…
          </div>
        ) : kaizensQuery.error ? (
          <p className="panel p-6 text-center font-semibold text-destructive">
            Could not load submissions. Make sure your account has a management or HR role.
          </p>
        ) : filtered.length === 0 ? (
          <p className="panel p-10 text-center text-muted-foreground">No Kaizen submissions match these filters.</p>
        ) : (
          <section className="panel overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Voice note</th>
                  <th className="px-4 py-3">Transcription</th>
                  <th className="px-4 py-3">Photo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-4 py-3">{formatDateTime(row.created_at)}</td>
                    <td className="px-4 py-3">
                      {employeeNames?.get(row.employee_id) ? (
                        <>
                          <p className="font-bold">{employeeNames.get(row.employee_id)}</p>
                          <p className="font-mono text-xs text-muted-foreground">{row.employee_id}</p>
                        </>
                      ) : (
                        <span className="font-mono text-base font-bold">{row.employee_id}</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.audioLink ? (
                        <audio controls src={row.audioLink} preload="none" className="h-9 w-48" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      <p className="line-clamp-3 whitespace-pre-wrap">{row.transcription}</p>
                      {row.language ? (
                        <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {row.language}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {row.imageLink ? (
                        <button type="button" onClick={() => setImagePreview(row.imageLink)}>
                          <img
                            src={row.imageLink}
                            alt={`Kaizen photo from employee ${row.employee_id}`}
                            className="size-16 rounded-md border border-border object-cover"
                          />
                        </button>
                      ) : (
                        <ImageOff className="size-5 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 font-bold">{row.reward_points}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenRow(row)}
                          className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                        >
                          Review
                        </button>
                        {isSystemManager ? (
                          <button
                            type="button"
                            onClick={() => setDeleteRow(row)}
                            aria-label={`Delete Kaizen from employee ${row.employee_id}`}
                            className="rounded-lg border border-destructive p-2 text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>

      {imagePreview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
          onClick={() => setImagePreview(null)}
        >
          <img src={imagePreview} alt="Kaizen attachment full preview" className="max-h-full max-w-full rounded-lg" />
        </div>
      ) : null}

      {openRow ? (
        <ReviewPanel
          row={openRow}
          saving={updateMutation.isPending}
          onClose={() => setOpenRow(null)}
          onSave={(values) => updateMutation.mutate({ id: openRow.id, ...values })}
        />
      ) : null}

      {deleteRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-5 text-card-foreground">
            <h2 className="text-lg font-extrabold">Delete Kaizen</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this Kaizen submission?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteRow(null)}
                className="flex-1 rounded-lg border-2 border-input py-3 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteRow.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive py-3 text-sm font-bold text-destructive-foreground disabled:opacity-60"
              >
                {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReviewPanel({
  row,
  saving,
  onClose,
  onSave,
}: {
  row: KaizenWithLinks;
  saving: boolean;
  onClose: () => void;
  onSave: (values: { status: KaizenStatus; management_notes: string; reward_points: number }) => void;
}) {
  const [status, setStatus] = useState<KaizenStatus>(
    (STATUSES as readonly string[]).includes(row.status) ? (row.status as KaizenStatus) : "pending",
  );
  const [notes, setNotes] = useState(row.management_notes ?? "");
  const [points, setPoints] = useState(row.reward_points ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/70 p-0 md:items-center md:p-6">
      <div className="w-full max-w-lg space-y-4 rounded-t-2xl bg-card p-5 text-card-foreground md:rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="mr-auto">
            <h2 className="text-xl font-extrabold">Review Kaizen</h2>
            <p className="text-sm text-muted-foreground">
              Employee {row.employee_id} · {formatDateTime(row.created_at)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md bg-muted p-2">
            <X className="size-5" />
          </button>
        </div>

        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
          {row.transcription}
        </p>
        {row.audioLink ? <audio controls src={row.audioLink} className="w-full" /> : null}

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as KaizenStatus)}
            className="w-full rounded-lg border-2 border-input bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
          >
            {STATUSES.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABEL[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Review notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border-2 border-input bg-background p-3 text-base outline-none focus:border-primary"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold">Reward points</span>
          <input
            type="number"
            min={0}
            value={points}
            onChange={(event) => setPoints(Number(event.target.value))}
            className="w-full rounded-lg border-2 border-input bg-background px-3 py-2.5 text-base outline-none focus:border-primary"
          />
        </label>

        <button
          type="button"
          disabled={saving}
          onClick={() => onSave({ status, management_notes: notes, reward_points: points })}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-base font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-5 animate-spin" /> : null}
          Save review
        </button>
      </div>
    </div>
  );
}
