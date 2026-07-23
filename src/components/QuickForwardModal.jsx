import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Forward, Search, UserRound, X } from "lucide-react";
import { request } from "../services/api";

function field(record, names) {
  const entry = Object.entries(record || {}).find(([key]) =>
    names.includes(String(key).trim().toLowerCase())
  );
  return entry ? String(entry[1] || "").trim() : "";
}

function normalizeAccounts(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      name: field(row, ["name", "full name", "personnel name"]),
      email: field(row, ["email", "email address", "username"]),
    }))
    .filter(({ email }) => {
      const key = email.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
}

export default function QuickForwardModal({ isOpen, forwarding, onClose, onForward }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    request("", "GET", { sheet: "Accounts" })
      .then((rows) => { if (active) setAccounts(normalizeAccounts(rows)); })
      .catch(() => { if (active) setError("Unable to load recipients from the Accounts sheet."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter(({ name, email }) => `${name} ${email}`.toLowerCase().includes(term));
  }, [accounts, search]);

  if (!isOpen) return null;
  const selected = accounts.find(({ email }) => email === selectedEmail);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-7 py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><Forward className="h-5 w-5" /></span>
            <div>
              <h2 className="text-xl font-black text-slate-900">Forward Communication</h2>
              <p className="text-xs font-semibold text-slate-400">Select a recipient from Accounts</p>
            </div>
          </div>
          <button type="button" disabled={forwarding} onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-7 py-6">
          <p className="text-sm text-slate-500">Select an account to forward the original email and attachments immediately.</p>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email..." className="w-full bg-transparent py-3 text-sm outline-none" />
          </div>
          <div className="min-h-48 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-3">
            {loading && <p className="py-8 text-center text-sm font-semibold text-slate-400">Loading accounts...</p>}
            {!loading && error && <p className="py-8 text-center text-sm font-semibold text-red-500">{error}</p>}
            {!loading && !error && filtered.length === 0 && <p className="py-8 text-center text-sm font-semibold text-slate-400">No accounts found</p>}
            {!loading && filtered.map((person) => (
              <button type="button" key={person.email} onClick={() => setSelectedEmail(person.email)} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${selectedEmail === person.email ? "border-blue-400 bg-blue-50" : "border-transparent bg-white hover:border-slate-200"}`}>
                <UserRound className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-700">{person.name || person.email}</span>
                  <span className="block truncate text-xs text-slate-400">{person.email}</span>
                </span>
                {selectedEmail === person.email && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-7 py-5">
          <button type="button" disabled={forwarding} onClick={onClose} className="rounded-xl px-5 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={!selected || forwarding} onClick={() => onForward(selected)} className="flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-xs font-black uppercase text-white hover:bg-blue-800 disabled:opacity-50">
            <Forward className="h-4 w-4" />{forwarding ? "Forwarding..." : "Forward"}
          </button>
        </div>
      </div>
    </div>
  );
}
