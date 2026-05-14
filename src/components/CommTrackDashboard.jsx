import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useDebounce } from "use-debounce";
import {
  Activity,
  Search,
  RefreshCw,
  Inbox,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Mail,
  ThumbsUp,
  Calendar,
  LayoutGrid,
  Clock,
  ChevronLeft,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

const API_URL =
  "https://script.google.com/macros/s/AKfycbxr95Fg-mKtFgOmLcn0fHNFTh8fUXTpcvpBLTJ6CnwNowtsfl1yYIJJMvRT9Hb8UkQ13w/exec";

const ROWS_PER_PAGE = 30;
const AUTO_REFRESH_MS = 15000;

const cardStyle =
  "group relative rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1";

function safe(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function cleanName(value) {
  const text = safe(value);
  let cleaned = text.replace(/\s*<[^>]*>\s*/g, "");
  cleaned = cleaned.replace(/\s*\([^)]*@[^)]*\)\s*/g, "");

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    cleaned = cleaned.split("@")[0].replace(/[._]/g, " ");
  }

  return cleaned.trim();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(String(value));
  return isNaN(date) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return safe(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalize(item = {}) {
  const activity = safe(item.Activity || item.activity);
  const refNumber = safe(item["Ref number"] || item.refNumber || item.RefNumber);
  const receivedFrom = cleanName(item["Received From"] || item.receivedFrom);
  const subject = safe(item.Subject || item.subject);
  const remarks = safe(item.Remarks || item.remarks);
  const dateReceived = item["Date Received"] || item.dateReceived;
  const parsedDate = parseDate(dateReceived);

  return {
    activity,
    refNumber,
    receivedFrom,
    subject,
    remarks,
    dateReceived,
    parsedDate,
    searchBlob: [activity, refNumber, receivedFrom, subject, remarks]
      .join(" ")
      .toLowerCase(),
  };
}

function buildSignature(dataArray) {
  // A compact fingerprint of the data to detect real changes
  return dataArray
    .map((item) =>
      [
        safe(item["Ref number"] || item.refNumber || item.RefNumber),
        safe(item["Received From"] || item.receivedFrom),
        safe(item.Subject || item.subject),
        safe(item.Remarks || item.remarks),
        safe(item["Date Received"] || item.dateReceived),
      ].join("||")
    )
    .join("##");
}

const getStatusStyles = (status) => {
  const s = status?.toLowerCase() || "";
  if (s === "pending") return "bg-orange-500/10 text-orange-600 border-orange-200/50";
  if (s === "actioned" || s === "approved") return "bg-emerald-500/10 text-emerald-600 border-emerald-200/50";
  if (s === "for action") return "bg-blue-500/10 text-blue-600 border-blue-200/50";
  if (s === "invitations") return "bg-purple-500/10 text-purple-600 border-purple-200/50";
  return "bg-slate-500/10 text-slate-600 border-slate-200/50";
};

function ModernStatCard({ icon: Icon, label, value, hint, color }) {
  return (
    <div className={cardStyle}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ${color}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <Activity className="h-3 w-3" /> Live
          </span>
        </div>

        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
        </div>

        <div className="border-t border-slate-50 pt-4">
          <p className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${color?.replace("text", "bg")}`} />
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CommTrackDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search] = useDebounce(searchInput, 300);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [remarkFilter, setRemarkFilter] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(1);

  const lastSignatureRef = useRef("");

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      if (!API_URL) {
        console.error("Missing API URL");
        setRows([]);
        return;
      }

      const response = await fetch(`${API_URL}?_=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON returned by API: ${text}`);
      }

      const incomingArray = Array.isArray(data) ? data : [];
      const signature = buildSignature(incomingArray);

      // Only update state if the data really changed
      if (signature !== lastSignatureRef.current) {
        lastSignatureRef.current = signature;
        setRows(incomingArray.map(normalize));
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
      else setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);

    const intervalId = setInterval(() => {
      fetchData(true);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [fetchData, refresh]);

  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate, remarkFilter, selectedYear]);

  const toggleRow = (idx) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(idx)) newExpanded.delete(idx);
    else newExpanded.add(idx);
    setExpandedRows(newExpanded);
  };

  const availableYears = useMemo(() => {
    const years = rows.map((r) => r.parsedDate?.getFullYear()).filter(Boolean);
    return ["All", ...new Set(years)].sort((a, b) => (b === "All" ? -1 : b - a));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? new Date(endDate + "T23:59:59").getTime() : null;

    return rows
      .filter((row) => {
        if (q && !row.searchBlob.includes(q)) return false;
        if (remarkFilter !== "All" && row.remarks !== remarkFilter) return false;

        if (start || end) {
          if (!row.parsedDate) return false;
          const time = row.parsedDate.getTime();
          if (start && time < start) return false;
          if (end && time > end) return false;
        }

        return true;
      })
      .sort((a, b) => (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0));
  }, [rows, search, startDate, endDate, remarkFilter]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, page]);

  const { chartData, statusData, stats } = useMemo(() => {
    const monthMap = new Map();
    const statusMap = new Map();
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const chartFilteredRows =
      selectedYear === "All"
        ? rows
        : rows.filter((r) => r.parsedDate?.getFullYear().toString() === selectedYear);

    chartFilteredRows.forEach((row) => {
      const mKey = row.parsedDate
        ? row.parsedDate.toLocaleDateString("en-US", { month: "short" })
        : "N/A";
      monthMap.set(mKey, (monthMap.get(mKey) || 0) + 1);

      const sKey = row.remarks || "No Remark";
      statusMap.set(sKey, (statusMap.get(sKey) || 0) + 1);
    });

    const getC = (v) => rows.filter((r) => r.remarks?.toLowerCase() === v.toLowerCase()).length;

    return {
      chartData: monthOrder.map((m) => ({ month: m, count: monthMap.get(m) || 0 })),
      statusData: Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })),
      stats: {
        pending: getC("Pending"),
        forAction: getC("For Action"),
        invitations: getC("Invitations"),
        forInfo: getC("For Info"),
        approved: getC("Approved"),
        actioned: getC("Actioned"),
      },
    };
  }, [rows, selectedYear]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));

  return (
    <div className="relative z-10 mx-auto max-w-[1400px] px-8 py-12">
      <div className="mb-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-600/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
            </span>
            System Live
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            Communication <span className="font-bold italic text-slate-400">Hub</span>
          </h1>

          <p className="mt-2 text-sm font-medium text-slate-400">
            {isRefreshing ? "Checking for new data..." : "Auto-updating every 15 seconds"}
          </p>
        </div>

        <button
          onClick={() => setRefresh((r) => r + 1)}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading || isRefreshing ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <ModernStatCard icon={AlertCircle} label="Pending" value={stats.pending} hint="Requires Attention" color="text-orange-500" />
        <ModernStatCard icon={Activity} label="For Action" value={stats.forAction} hint="Active Workflow" color="text-blue-500" />
        <ModernStatCard icon={Mail} label="Invitations" value={stats.invitations} hint="Events & Meetings" color="text-purple-500" />
        <ModernStatCard icon={Inbox} label="For Info" value={stats.forInfo} hint="Knowledge Base" color="text-slate-500" />
        <ModernStatCard icon={ThumbsUp} label="Approved" value={stats.approved} hint="Finalized Records" color="text-emerald-500" />
        <ModernStatCard icon={CheckCircle2} label="Actioned" value={stats.actioned} hint="Archived/Closed" color="text-emerald-700" />
      </div>

      <div className="mb-12 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 rounded-[2.5rem] border border-white bg-white/60 p-8 shadow-sm backdrop-blur-md lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Clock className="h-5 w-5 text-indigo-500" /> Volume Over Time
            </h3>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y === "All" ? "All Years" : y}
                </option>
              ))}
            </select>
          </div>

          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 600, fill: "#94a3b8" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 600, fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="natural"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#areaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 rounded-[2.5rem] border border-white bg-white/60 p-8 shadow-sm backdrop-blur-md">
          <h3 className="mb-8 flex items-center gap-2 text-lg font-bold">
            <LayoutGrid className="h-5 w-5 text-slate-400" /> Status Distribution
          </h3>

          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={statusData}>
                <XAxis dataKey="name" hide />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={40}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "#6366f1" : "#cbd5e1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/40">
        <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                Data Explorer
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                <p className="text-sm font-bold text-slate-400">
                  {filteredRows.length} entries analyzed
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
  <div className="group relative">
    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input
      type="text"
      placeholder="Search anything..."
      className="w-64 rounded-2xl border border-slate-200 bg-white/50 py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white"
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
    />
  </div>

  {/* DATE FILTER */}
  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
    <Calendar className="h-4 w-4 text-indigo-500" />

    <input
      type="date"
      className="bg-transparent text-[11px] font-black uppercase text-slate-600 outline-none"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
    />

    <span className="px-1 font-light text-slate-300">|</span>

    <input
      type="date"
      className="bg-transparent text-[11px] font-black uppercase text-slate-600 outline-none"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
    />

    {/* CLEAR BUTTON */}
    {(startDate || endDate) && (
      <button
        onClick={() => {
          setStartDate("");
          setEndDate("");
        }}
        className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-red-100 hover:text-red-600"
        title="Clear date filter"
      >
        ✕
      </button>
    )}
  </div>

  <select
    className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-900 px-5 py-3 text-sm font-bold text-white outline-none shadow-lg hover:bg-slate-800"
    value={remarkFilter}
    onChange={(e) => setRemarkFilter(e.target.value)}
  >
    <option value="All">All Statuses</option>

    {[...new Set(rows.map((r) => r.remarks))]
      .filter(Boolean)
      .map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
  </select>
</div>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="bg-white/95 backdrop-blur-md">
                <th className="border-b border-slate-100 px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Reference
                </th>
                <th className="border-b border-slate-100 px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Recipient
                </th>
                <th className="border-b border-slate-100 px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Timestamp
                </th>
                <th className="border-b border-slate-100 px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  Details
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-32 text-center font-black italic text-slate-200 animate-pulse"
                  >
                    Synchronizing...
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const isExpanded = expandedRows.has(idx);

                  return (
                    <tr key={idx} className="group transition-all duration-200 hover:bg-slate-50/50">
                      <td className="relative px-8 py-6 align-top">
                        <div className="absolute bottom-0 left-0 top-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100" />
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          {row.refNumber || "---"}
                        </span>
                      </td>

                      <td className="px-6 py-6 align-top font-bold text-slate-900">
                        {row.receivedFrom || "---"}
                      </td>

                      <td className="px-6 py-6 align-top">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">
                            {formatDate(row.dateReceived).split(",")[0]}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {formatDate(row.dateReceived).split(",")[1]}
                          </span>
                        </div>
                      </td>

                      <td className="px-8 py-6 align-top">
                        <div
                          className="flex cursor-pointer flex-col gap-2.5"
                          onClick={() => toggleRow(idx)}
                        >
                          <p
                            className={`text-[15px] font-bold leading-snug text-slate-800 ${
                              isExpanded ? "" : "line-clamp-2"
                            }`}
                          >
                            {row.subject}
                          </p>

                          {row.remarks && (
                            <span
                              className={`w-fit rounded-lg border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm ${getStatusStyles(
                                row.remarks
                              )}`}
                            >
                              {row.remarks}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 p-8">
          <div className="flex h-10 w-24 items-center justify-center rounded-xl border border-slate-200 bg-white font-black text-slate-900 shadow-sm">
            {page} <span className="mx-2 font-light text-slate-300">/</span> {totalPages}
          </div>

          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm disabled:opacity-20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg disabled:opacity-20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}