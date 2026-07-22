import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileBarChart,
  Inbox,
  Printer,
  RefreshCw,
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
  const filtered = useMemo(() => rows.filter((row) =>
    (year === "All" || row.date?.getFullYear() === Number(year)) &&
    (status === "All" || row.status === status)
  ), [rows, year, status]);

  const report = useMemo(() => {
    const monthly = MONTHS.map((month) => ({ month, records: 0 }));
    const statusCounts = new Map();
    filtered.forEach((row) => {
      if (row.date) monthly[row.date.getMonth()].records += 1;
      statusCounts.set(row.status, (statusCounts.get(row.status) || 0) + 1);
    });
    const resolved = filtered.filter((row) => ["approved", "actioned"].includes(row.status.toLowerCase())).length;
    const pending = filtered.filter((row) => ["pending", "for action"].includes(row.status.toLowerCase())).length;
    return {
      monthly,
      statuses: [...statusCounts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      resolved,
      pending,
    };
  }, [filtered]);

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
    { label: "Status groups", value: report.statuses.length, hint: "Distinct classifications", icon: BarChart3, tone: "bg-violet-50 text-violet-700" },
  ];

  return (
    <>
    <div className="report-screen min-h-screen bg-slate-50 px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-blue-700"><FileBarChart size={16} /> Reporting center</div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Communication reports</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Review workload, status distribution, and monthly communication volume.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filter by year" value={year} onChange={(e) => setYear(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-600">
              <option value="All">All years</option>{years.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-48 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-600">
              <option value="All">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button onClick={() => load(true)} disabled={refreshing} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:opacity-50" aria-label="Refresh report"><RefreshCw size={19} className={refreshing ? "animate-spin" : ""} /></button>
            <button onClick={() => window.print()} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50"><Printer size={17} /> Print</button>
            <button onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"><Download size={17} /> Export CSV</button>
          </div>
        </div>

        {error && <div className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertCircle size={19} /> {error}</div>}

        {loading ? (
          <div className="mt-8 flex min-h-96 items-center justify-center rounded-3xl border border-slate-200 bg-white"><RefreshCw className="animate-spin text-blue-700" size={28} /></div>
        ) : (
          <>
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
              <p className="report-print-office">OFFICE OF THE CIVIL DEFENSE REGIONAL OFFICE III</p>
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
