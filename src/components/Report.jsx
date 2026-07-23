import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileBarChart,
  Inbox,
  Printer,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { request } from "../services/api";

const COLORS = ["#2563eb", "#0d9488", "#f59e0b", "#7c3aed", "#e11d48", "#64748b"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const valueOf = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null) || "";

function normalize(row) {
  const rawDate = valueOf(row, "Date Received", "dateReceived");
  const date = rawDate ? new Date(rawDate) : null;
  return {
    reference: String(valueOf(row, "Ref number", "RefNumber", "refNumber")),
    sender: String(valueOf(row, "Received From", "receivedFrom")),
    subject: String(valueOf(row, "Subject", "subject")),
    status: String(valueOf(row, "Remarks", "remarks") || "No Remark"),
    rawDate,
    date: date && !Number.isNaN(date.getTime()) ? date : null,
  };
}

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

const formatPrintDate = (row) => row.date
  ? new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(row.date)
  : String(row.rawDate || "—");

export default function Report() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [year, setYear] = useState("All");
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const result = await request("getRecords", "GET");
      setRows((Array.isArray(result) ? result : []).map(normalize));
    } catch (err) {
      setError(err?.message || "Unable to load report data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    request("getRecords", "GET")
      .then((result) => {
        if (!ignore) setRows((Array.isArray(result) ? result : []).map(normalize));
      })
      .catch((err) => {
        if (!ignore) setError(err?.message || "Unable to load report data.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, []);

  const years = useMemo(() => [...new Set(rows.map((row) => row.date?.getFullYear()).filter(Boolean))].sort((a, b) => b - a), [rows]);
  const statuses = useMemo(() => [...new Set(rows.map((row) => row.status).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
    return rows.filter((row) =>
      (year === "All" || row.date?.getFullYear() === Number(year)) &&
      (status === "All" || row.status === status) &&
      (!start || (row.date && row.date >= start)) &&
      (!end || (row.date && row.date <= end)) &&
      (!query || [row.reference, row.sender, row.subject, row.status].some((value) => value.toLowerCase().includes(query)))
    );
  }, [rows, year, status, search, startDate, endDate]);

  const report = useMemo(() => {
    const monthly = MONTHS.map((month) => ({ month, records: 0 }));
    const statusCounts = new Map();
    filtered.forEach((row) => {
      if (row.date) monthly[row.date.getMonth()].records += 1;
      statusCounts.set(row.status, (statusCounts.get(row.status) || 0) + 1);
    });
    const resolved = filtered.filter((row) => ["approved", "actioned"].includes(row.status.toLowerCase())).length;
    const pending = filtered.filter((row) => ["pending", "for action"].includes(row.status.toLowerCase())).length;
    const senderCounts = new Map();
    filtered.forEach((row) => {
      const sender = row.sender.trim() || "Unknown sender";
      senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
    });
    return {
      monthly,
      statuses: [...statusCounts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      resolved,
      pending,
      completionRate: filtered.length ? Math.round((resolved / filtered.length) * 100) : 0,
      topSenders: [...senderCounts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6),
    };
  }, [filtered]);

  const recentRecords = useMemo(
    () => [...filtered].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)).slice(0, 10),
    [filtered],
  );

  const hasExtraFilters = Boolean(search || startDate || endDate);
  const clearExtraFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
  };

  const printPages = useMemo(() => {
    const rowsPerPage = 16;
    return Array.from(
      { length: Math.max(1, Math.ceil(filtered.length / rowsPerPage)) },
      (_, index) => filtered.slice(index * rowsPerPage, (index + 1) * rowsPerPage),
    );
  }, [filtered]);

  const exportCsv = () => {
    const header = ["Reference", "Date Received", "Received From", "Subject", "Status"];
    const lines = [header, ...filtered.map((row) => [row.reference, row.rawDate, row.sender, row.subject, row.status])]
      .map((line) => line.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", lines], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `commtrack-report-${year === "All" ? "all-years" : year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: "Total records", value: filtered.length, hint: "In the selected report", icon: Inbox, tone: "bg-blue-50 text-blue-700" },
    { label: "Resolved", value: report.resolved, hint: "Approved or actioned", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Needs attention", value: report.pending, hint: "Pending or for action", icon: Clock3, tone: "bg-amber-50 text-amber-700" },
    { label: "Completion rate", value: `${report.completionRate}%`, hint: `${report.statuses.length} status classifications`, icon: TrendingUp, tone: "bg-violet-50 text-violet-700" },
  ];

  return (
    <>
    <div className="report-screen min-h-screen bg-[#f5f7fb]">
      <header className="relative overflow-hidden bg-[#071d49] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative mx-auto flex max-w-[1600px] flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200"><FileBarChart size={14} /> Reporting center</div>
            <h1 className="text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl lg:text-[2.75rem]">Communication <span className="text-sky-300">Reports</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/65">Review workload, status distribution, and monthly communication volume.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filter by year" value={year} onChange={(e) => setYear(e.target.value)} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm outline-none backdrop-blur-sm focus:ring-2 focus:ring-sky-300 [&>option]:text-slate-800">
              <option value="All">All years</option>{years.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-48 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm outline-none backdrop-blur-sm focus:ring-2 focus:ring-sky-300 [&>option]:text-slate-800">
              <option value="All">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button onClick={() => load(true)} disabled={refreshing} className="rounded-xl border border-white/15 bg-white/10 p-2.5 text-blue-100 shadow-sm backdrop-blur-sm transition hover:bg-white/15 hover:text-white disabled:opacity-50" aria-label="Refresh report"><RefreshCw size={19} className={refreshing ? "animate-spin" : ""} /></button>
            <button onClick={() => window.print()} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-50"><Printer size={17} /> Print</button>
            <button onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-bold text-[#071d49] shadow-sm transition hover:bg-sky-300 disabled:opacity-50"><Download size={17} /> Export CSV</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {error && <div className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle size={19} /> {error}</div>}

        {loading ? (
          <div className="mt-8 flex min-h-96 items-center justify-center rounded-3xl border border-slate-200 bg-white"><RefreshCw className="animate-spin text-blue-700" size={28} /></div>
        ) : (
          <>
            <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,.05)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input aria-label="Search report records" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, sender, subject, or status" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">From <input aria-label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-slate-700 outline-none" /></label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">To <input aria-label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-slate-700 outline-none" /></label>
                  {hasExtraFilters && <button onClick={clearExtraFilters} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"><X size={15} /> Clear</button>}
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-400">Showing {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} records</p>
            </section>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(({ label, value, hint, icon: Icon, tone }) => <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.05)]"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon size={21} /></div><p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{value.toLocaleString()}</p><p className="mt-1 text-sm font-bold text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div>)}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.05)] sm:p-6">
                <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><CalendarDays size={20} /></div><div><h2 className="font-bold text-slate-950">Monthly volume</h2><p className="text-xs text-slate-400">Records received by month</p></div></div>
                <div className="mt-6 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.monthly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={(month) => `${month} ${year === "All" ? "(All years)" : year}`} cursor={{ fill: "#eff6ff" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} /><Bar dataKey="records" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer></div>
              </section>
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.05)] sm:p-6">
                <h2 className="font-bold text-slate-950">Status distribution</h2><p className="mt-1 text-xs text-slate-400">Breakdown of the selected records</p>
                {report.statuses.length ? <><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={report.statuses} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>{report.statuses.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} /></PieChart></ResponsiveContainer></div><div className="space-y-2.5">{report.statuses.slice(0, 6).map((item, index) => <div key={item.name} className="flex items-center text-xs"><span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} /><span className="min-w-0 flex-1 truncate font-semibold text-slate-600">{item.name}</span><span className="font-bold text-slate-950">{item.value}</span></div>)}</div></> : <div className="flex h-72 items-center justify-center text-sm text-slate-400">No records match these filters.</div>}
              </section>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.6fr]">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,.05)] sm:p-6">
                <div className="flex items-center gap-3"><div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700"><Users size={20} /></div><div><h2 className="font-bold text-slate-950">Top senders</h2><p className="text-xs text-slate-400">Highest communication volume</p></div></div>
                <div className="mt-6 space-y-4">
                  {report.topSenders.length ? report.topSenders.map((item, index) => {
                    const maximum = report.topSenders[0]?.value || 1;
                    return <div key={item.name}><div className="mb-1.5 flex items-center gap-3 text-xs"><span className="w-5 font-bold text-slate-400">{index + 1}</span><span className="min-w-0 flex-1 truncate font-semibold text-slate-700" title={item.name}>{item.name}</span><span className="font-bold text-slate-950">{item.value}</span></div><div className="ml-8 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-600" style={{ width: `${Math.max(8, (item.value / maximum) * 100)}%` }} /></div></div>;
                  }) : <p className="py-16 text-center text-sm text-slate-400">No sender data available.</p>}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.05)]">
                <div className="flex items-end justify-between border-b border-slate-100 p-5 sm:p-6"><div><h2 className="font-bold text-slate-950">Latest matching records</h2><p className="mt-1 text-xs text-slate-400">The 10 most recent results from the active filters</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{filtered.length} total</span></div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead><tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Sender / Subject</th><th className="px-5 py-3">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentRecords.map((row, index) => <tr key={`${row.reference}-${index}`} className="text-xs transition hover:bg-blue-50/40"><td className="whitespace-nowrap px-5 py-3.5 font-bold text-slate-800">{row.reference || "—"}</td><td className="whitespace-nowrap px-5 py-3.5 text-slate-500">{row.date ? new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(row.date) : "—"}</td><td className="max-w-sm px-5 py-3.5"><p className="truncate font-bold text-slate-700">{row.sender || "Unknown sender"}</p><p className="mt-0.5 truncate text-slate-400" title={row.subject}>{row.subject || "No subject"}</p></td><td className="px-5 py-3.5"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">{row.status}</span></td></tr>)}
                      {!recentRecords.length && <tr><td colSpan={4} className="px-5 py-16 text-center text-sm text-slate-400">No records match the active filters.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
    <section className="report-print-sheet" aria-hidden="true">
      {printPages.map((pageRows, pageIndex) => (
        <article className="report-print-page" key={pageIndex}>
          <div className="report-print-header">
            <img src="/logo-dtms.png" alt="" />
            <div className="report-print-heading">
              <p className="report-print-office">OFFICE OF COMMISSIONER DESIDERIO R. APAG III</p>
              <h1>COMMUNICATION TRACKING REPORT</h1>
              <p>CommTrack Records Management System</p>
            </div>
            <div className="report-print-meta">
              <p><strong>Status:</strong> {status === "All" ? "All statuses" : status}</p>
              <p><strong>Year:</strong> {year === "All" ? "All years" : year}</p>
              <p><strong>Total:</strong> {filtered.length} record{filtered.length === 1 ? "" : "s"}</p>
              <p><strong>Printed:</strong> {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date())}</p>
            </div>
          </div>
          <table>
            <thead><tr><th scope="col">Reference No.</th><th scope="col">Date Received</th><th scope="col">Received From</th><th scope="col">Subject</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr key={`${row.reference}-${index}`}>
                  <td><div>{row.reference || "—"}</div></td>
                  <td><div>{formatPrintDate(row)}</div></td>
                  <td><div>{row.sender || "—"}</div></td>
                  <td><div>{row.subject || "—"}</div></td>
                  <td><div>{row.status || "No Remark"}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <footer className="report-print-footer">
            <span>Official Communication Tracking Report</span>
            <span>Page {pageIndex + 1} of {printPages.length}</span>
            <span>Generated through CommTrack</span>
          </footer>
        </article>
      ))}
    </section>
    </>
  );
}
