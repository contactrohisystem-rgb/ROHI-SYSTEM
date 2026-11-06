"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, LogOut, Search, Mail, Phone, Clock, TrendingUp, CheckCircle2, XCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Enquiry = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  whatNeeded: string | null;
  improving: string | null;
  budgetRange: string | null;
  preferredContact: string | null;
  createdAt: string;
  status: string;
  notes: string | null;
  followUpDate: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  contacted: { label: "Contacted", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Mail },
  proposal_sent: { label: "Proposal Sent", color: "bg-purple-100 text-purple-700 border-purple-200", icon: FileText },
  won: { label: "Won", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  lost: { label: "Lost", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  in_progress: { label: "In Progress", color: "bg-cyan-100 text-cyan-700 border-cyan-200", icon: TrendingUp },
  delivered: { label: "Delivered", color: "bg-teal-100 text-teal-700 border-teal-200", icon: CheckCircle2 },
  ongoing: { label: "Ongoing", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: TrendingUp },
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [dueFollowups, setDueFollowups] = useState<Enquiry[]>([]);

  // Check auth on mount
  useEffect(() => {
    fetch("/api/admin/enquiries")
      .then((r) => {
        if (r.ok) {
          setAuthed(true);
          return r.json();
        }
        setAuthed(false);
        setLoading(false);
        return null;
      })
      .then((data) => {
        if (data?.ok) {
          setEnquiries(data.enquiries);
          setDueFollowups(data.dueFollowups || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/enquiries");
    if (res.ok) {
      const data = await res.json();
      if (data.ok) setEnquiries(data.enquiries);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1220]">
        <Loader2 className="size-8 animate-spin text-teal" />
      </div>
    );
  }

  if (!authed) {
    return <LoginForm onLogin={() => { setAuthed(true); refresh(); }} />;
  }

  return (
    <Dashboard
      enquiries={enquiries}
      setEnquiries={setEnquiries}
      dueFollowups={dueFollowups}
      search={search}
      setSearch={setSearch}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      selected={selected}
      setSelected={setSelected}
      refresh={refresh}
      onLogout={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        setAuthed(false);
      }}
    />
  );
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      onLogin();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1220] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono-tech text-xs uppercase tracking-widest text-teal">ROHI SYSTEMS</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Admin Dashboard</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/70">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/30 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
              placeholder="Enter admin password"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-teal px-4 py-2.5 font-semibold text-[#0B1220] transition-colors hover:bg-teal/90 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({
  enquiries,
  setEnquiries,
  dueFollowups,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  selected,
  setSelected,
  refresh,
  onLogout,
}: {
  enquiries: Enquiry[];
  setEnquiries: React.Dispatch<React.SetStateAction<Enquiry[]>>;
  dueFollowups: Enquiry[];
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  selected: Enquiry | null;
  setSelected: (e: Enquiry | null) => void;
  refresh: () => void;
  onLogout: () => void;
}) {
  const filtered = enquiries.filter((e) => {
    const matchesSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.company || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: enquiries.length,
    new: enquiries.filter((e) => e.status === "new").length,
    contacted: enquiries.filter((e) => e.status === "contacted").length,
    won: enquiries.filter((e) => e.status === "won").length,
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-[#0B1220] px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <span className="font-mono-tech text-xs uppercase tracking-widest text-teal">ROHI SYSTEMS</span>
            <span className="ml-3 text-sm font-semibold text-white">Admin Dashboard</span>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Follow-ups due alert */}
        {dueFollowups.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">
                {dueFollowups.length} follow-up{dueFollowups.length > 1 ? "s" : ""} due
              </h3>
            </div>
            <div className="mt-2 space-y-1">
              {dueFollowups.slice(0, 5).map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="block w-full text-left text-sm text-amber-800 hover:underline"
                >
                  • {e.name} — due {e.followUpDate ? new Date(e.followUpDate).toLocaleDateString() : ""}
                </button>
              ))}
              {dueFollowups.length > 5 && (
                <p className="text-xs text-amber-600">+ {dueFollowups.length - 5} more...</p>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={stats.total} icon={TrendingUp} color="text-gray-700" />
          <StatCard label="New" value={stats.new} icon={Clock} color="text-blue-600" />
          <StatCard label="Contacted" value={stats.contacted} icon={Mail} color="text-amber-600" />
          <StatCard label="Won" value={stats.won} icon={CheckCircle2} color="text-green-600" />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-teal focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="in_progress">In Progress</option>
            <option value="delivered">Delivered</option>
            <option value="ongoing">Ongoing</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {enquiries.length === 0 ? "No enquiries yet." : "No enquiries match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                    <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 sm:table-cell">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 md:table-cell">Follow-up</th>
                    <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 lg:table-cell">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((e) => {
                    const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG.new;
                    return (
                      <tr
                        key={e.id}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                        onClick={() => setSelected(e)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{e.name}</div>
                          {e.company && <div className="text-xs text-gray-500">{e.company}</div>}
                        </td>
                        <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">{e.email}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", sc.color)}>
                            <sc.icon className="size-3" />
                            {sc.label}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                          {e.followUpDate ? new Date(e.followUpDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right text-teal hover:underline">View</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <EnquiryDetail
          enquiry={selected}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => {
            setEnquiries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Clock; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        <Icon className={cn("size-4", color)} />
      </div>
      <div className={cn("mt-1 text-2xl font-bold", color)}>{value}</div>
    </div>
  );
}

function EnquiryDetail({
  enquiry,
  onClose,
  onUpdate,
}: {
  enquiry: Enquiry;
  onClose: () => void;
  onUpdate: (e: Enquiry) => void;
}) {
  const [status, setStatus] = useState(enquiry.status);
  const [notes, setNotes] = useState(enquiry.notes || "");
  const [followUpDate, setFollowUpDate] = useState(
    enquiry.followUpDate ? enquiry.followUpDate.split("T")[0] : "",
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: enquiry.id,
        status,
        notes,
        followUpDate: followUpDate || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        onUpdate(data.enquiry);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{enquiry.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-5 p-5">
          {/* Contact info */}
          <div className="space-y-2">
            <DetailRow icon={Mail} label="Email" value={enquiry.email} href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(enquiry.email)}`} />
            <DetailRow icon={Phone} label="Phone" value={enquiry.phone || "—"} />
            {enquiry.company && <DetailRow icon={TrendingUp} label="Company" value={enquiry.company} />}
            {enquiry.budgetRange && <DetailRow icon={TrendingUp} label="Budget" value={enquiry.budgetRange} />}
            {enquiry.preferredContact && <DetailRow icon={Mail} label="Preferred contact" value={enquiry.preferredContact} />}
          </div>

          {/* What they need */}
          {enquiry.whatNeeded && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">What they need</h3>
              <p className="text-sm text-gray-700">{enquiry.whatNeeded}</p>
            </div>
          )}

          {/* Improving */}
          {enquiry.improving && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">What they're trying to improve</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{enquiry.improving}</p>
            </div>
          )}

          {/* Status management */}
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lead Management</h3>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="proposal_sent">Proposal Sent</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="in_progress">In Progress</option>
                <option value="delivered">Delivered</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Follow-up date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Internal notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add notes about this lead..."
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none"
              />
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-md bg-teal px-4 py-2 text-sm font-semibold text-[#0B1220] transition-colors hover:bg-teal/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-400">
            Received: {new Date(enquiry.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-4 text-gray-400" />
      <span className="text-gray-500">{label}:</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-teal hover:underline">{value}</a>
      ) : (
        <span className="font-medium text-gray-900">{value}</span>
      )}
    </div>
  );
}
