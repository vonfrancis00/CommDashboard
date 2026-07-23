import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Search, UserRound, UserRoundCheck, X } from "lucide-react";
import { request } from "../services/api";

let personnelCache = [];
let personnelRequest = null;

function valueFrom(record, names) {
  const entry = Object.entries(record || {}).find(([key]) =>
    names.includes(String(key).trim().toLowerCase())
  );
  return entry ? String(entry[1] || "").trim() : "";
}

function normalizePersonnel(rows) {
  const seen = new Set();

  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      name: valueFrom(row, ["name", "full name", "personnel name"]),
      email: valueFrom(row, ["email", "email address", "username"]),
    }))
    .filter(({ email }) => {
      const key = email.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
}

async function fetchPersonnel() {
  if (personnelRequest) return personnelRequest;

  personnelRequest = request("getAccounts", "GET")
    .then((rows) => {
      personnelCache = normalizePersonnel(rows);
      return personnelCache;
    })
    .finally(() => {
      personnelRequest = null;
    });

  return personnelRequest;
}

export default function AssignPersonnelModal({ isOpen, record, onClose, onAssign, assigning }) {
  const [personnel, setPersonnel] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Warm the list while the dashboard is idle so opening the modal is immediate.
    fetchPersonnel().catch((err) => {
      console.error("Failed preloading Accounts sheet:", err);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    async function loadPersonnel() {
      setSelectedEmail("");
      setSearch("");
      setError("");
      const hasCachedPersonnel = personnelCache.length > 0;
      if (hasCachedPersonnel) setPersonnel(personnelCache);
      setLoading(!hasCachedPersonnel);

      try {
        // Always revalidate on open so edits to the Accounts sheet appear promptly.
        // Cached entries remain visible while this request is in flight.
        const accounts = await fetchPersonnel();
        if (!active) return;
        setPersonnel(accounts);
      } catch (err) {
        console.error("Failed loading Accounts sheet:", err);
        if (active) setError("Unable to load personnel from the Accounts sheet.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPersonnel();

    return () => { active = false; };
  }, [isOpen]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return personnel;
    return personnel.filter(({ name, email }) =>
      `${name} ${email}`.toLowerCase().includes(term)
    );
  }, [personnel, search]);

  if (!isOpen) return null;

  const selected = personnel.find((item) => item.email === selectedEmail);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-7 py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <UserRoundCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900">Assign Personnel</h2>
              <p className="text-xs font-semibold text-slate-400">Reference No: {record?.refNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-7 py-6">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email..."
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
          </div>

          <div className="min-h-48 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-3">
            {loading && <p className="py-8 text-center text-sm font-semibold text-slate-400">Loading personnel...</p>}
            {!loading && error && <p className="py-8 text-center text-sm font-semibold text-red-500">{error}</p>}
            {!loading && !error && filtered.length === 0 && (
              <p className="py-8 text-center text-sm font-semibold text-slate-400">No personnel found</p>
            )}
            {!loading && filtered.map((person) => (
              <button
                type="button"
                key={person.email}
                onClick={() => setSelectedEmail(person.email)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  selectedEmail === person.email
                    ? "border-violet-400 bg-violet-50"
                    : "border-transparent bg-white hover:border-slate-200"
                }`}
              >
                <UserRound className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-700">{person.name || person.email}</span>
                  <span className="block truncate text-xs text-slate-400">{person.email}</span>
                </span>
                {selectedEmail === person.email && <CheckCircle2 className="h-5 w-5 text-violet-600" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-7 py-5">
          <button type="button" onClick={onClose} className="rounded-xl px-5 py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-100">Cancel</button>
          <button
            type="button"
            disabled={!selected || assigning}
            onClick={() => onAssign(selected)}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-xs font-black uppercase text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <UserRoundCheck className="h-4 w-4" />
            {assigning ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
