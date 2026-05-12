import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import { useDebounce } from "use-debounce";

import {
  Activity,
  CalendarDays,
  Clock3,
  Filter,
  Search,
  RefreshCw,
  Users,
  Inbox,
  Layers3,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Mail,
  FileText,
  ThumbsUp,
  Calendar,
  X,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL =
  import.meta.env.VITE_SHEET_API_URL || "";

const ROWS_PER_PAGE = 30;

// --- DESIGN TOKENS ---
const cardStyle =
  "group relative rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md";

// --- HELPERS ---

function safe(value) {
  if (value === null || value === undefined)
    return "";

  return String(value).trim();
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
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function monthKey(value) {
  const date = parseDate(value);

  if (!date) return "Unknown";

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

// --- OPTIMIZED NORMALIZE ---

function normalize(item = {}) {
  const activity = safe(
    item.Activity || item.activity
  );

  const refNumber = safe(
    item["Ref number"] ||
      item.refNumber ||
      item.RefNumber
  );

  const receivedBy = safe(
    item["Received By"] ||
      item.receivedBy
  );

  const receivedFrom = safe(
    item["Received From"] ||
      item.receivedFrom
  );

  const subject = safe(
    item.Subject || item.subject
  );

  const remarks = safe(
    item.Remarks || item.remarks
  );

  const dateReceived =
    item["Date Received"] ||
    item.dateReceived;

  const parsedDate = parseDate(
    dateReceived
  );

  return {
    activity,
    refNumber,
    receivedBy,
    receivedFrom,
    subject,
    remarks,
    dateReceived,

    parsedDate,

    // PRECOMPUTED SEARCH
    searchBlob: [
      activity,
      refNumber,
      receivedBy,
      receivedFrom,
      subject,
      remarks,
    ]
      .join(" ")
      .toLowerCase(),
  };
}

// --- STATUS BADGE LOGIC ---

const getStatusStyles = (status) => {
  const s = status?.toLowerCase() || "";

  if (s === "pending")
    return "bg-orange-50 text-orange-700 border-orange-200";

  if (
    s === "actioned" ||
    s === "approved"
  )
    return "bg-emerald-50 text-emerald-700 border-emerald-200";

  if (s === "for action")
    return "bg-blue-50 text-blue-700 border-blue-200";

  if (s === "invitations")
    return "bg-purple-50 text-purple-700 border-purple-200";

  if (s === "for info")
    return "bg-slate-50 text-slate-700 border-slate-200";

  return "bg-slate-50 text-slate-600 border-slate-100";
};

// --- COMPONENTS ---

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
}) {
  return (
    <div className={cardStyle}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {label}
          </p>

          <h2
            className={`mt-2 text-3xl font-black leading-none ${
              color || "text-slate-900"
            }`}
          >
            {value}
          </h2>

          <p className="mt-4 flex items-center text-xs font-medium text-slate-500">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-300"></span>
            {hint}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 transition-colors group-hover:bg-white`}
        >
          <Icon
            className={`h-6 w-6 ${
              color || "text-slate-600"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

export default function CommTrackDashboard() {
  const [rows, setRows] = useState([]);

  const [loading, setLoading] =
    useState(true);

  // DEBOUNCED SEARCH

  const [searchInput, setSearchInput] =
    useState("");

  const [search] = useDebounce(
    searchInput,
    300
  );

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [remarkFilter, setRemarkFilter] =
    useState("All");

  const [error, setError] = useState("");

  const [refresh, setRefresh] =
    useState(0);

  // PAGINATION

  const [page, setPage] = useState(1);

  // --- FETCH ---

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!API_URL) {
        throw new Error(
          "Missing VITE_SHEET_API_URL"
        );
      }

      const response = await fetch(API_URL, {
        cache: "force-cache",
      });

      if (!response.ok) {
        throw new Error(
          "Failed to fetch data"
        );
      }

      const data = await response.json();

      const formatted = Array.isArray(data)
        ? data.map(normalize)
        : [];

      setRows(formatted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refresh]);

  // RESET PAGE WHEN FILTERING

  useEffect(() => {
    setPage(1);
  }, [
    search,
    startDate,
    endDate,
    remarkFilter,
  ]);

  // REMARKS LIST

  const remarksList = useMemo(
    () => [
      "All",
      ...new Set(
        rows
          .map((r) => r.remarks)
          .filter(Boolean)
      ),
    ],
    [rows]
  );

  // OPTIMIZED FILTERING

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();

    const start = startDate
      ? new Date(startDate).getTime()
      : null;

    const end = endDate
      ? new Date(
          endDate + "T23:59:59"
        ).getTime()
      : null;

    return rows
      .filter((row) => {
        // SEARCH

        if (
          q &&
          !row.searchBlob.includes(q)
        ) {
          return false;
        }

        // REMARKS

        if (
          remarkFilter !== "All" &&
          row.remarks !== remarkFilter
        ) {
          return false;
        }

        // DATE

        if (start || end) {
          if (!row.parsedDate)
            return false;

          const time =
            row.parsedDate.getTime();

          if (start && time < start)
            return false;

          if (end && time > end)
            return false;
        }

        return true;
      })
      .sort((a, b) => {
        return (
          (b.parsedDate?.getTime() ||
            0) -
          (a.parsedDate?.getTime() ||
            0)
        );
      });
  }, [
    rows,
    search,
    startDate,
    endDate,
    remarkFilter,
  ]);

  // PAGINATION

  const paginatedRows = useMemo(() => {
    const start =
      (page - 1) * ROWS_PER_PAGE;

    return filteredRows.slice(
      start,
      start + ROWS_PER_PAGE
    );
  }, [filteredRows, page]);

  // STATS

  const stats = useMemo(() => {
    const countByRemark = (val) =>
      rows.filter(
        (r) =>
          r.remarks?.toLowerCase() ===
          val.toLowerCase()
      ).length;

    const latest = [...rows]
      .filter((r) => r.parsedDate)
      .sort(
        (a, b) =>
          b.parsedDate - a.parsedDate
      )[0];

    return {
      total: rows.length,
      pending: countByRemark(
        "Pending"
      ),
      forAction: countByRemark(
        "For Action"
      ),
      invitations: countByRemark(
        "Invitations"
      ),
      forInfo: countByRemark(
        "For Info"
      ),
      approved: countByRemark(
        "Approved"
      ),
      actioned: countByRemark(
        "Actioned"
      ),
      latest: latest
        ? formatDate(
            latest.dateReceived
          )
        : "—",
    };
  }, [rows]);

  // CHART DATA

  const chartData = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      const key = monthKey(
        row.dateReceived
      );

      map.set(
        key,
        (map.get(key) || 0) + 1
      );
    });

    return Array.from(map.entries()).map(
      ([month, count]) => ({
        month,
        count,
      })
    );
  }, [rows]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* HEADER SECTION */}

        <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>

                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>

              Live Sync Active
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
              Communication{" "}
              <span className="text-slate-400">
                Dashboard
              </span>
            </h1>
          </div>

          <button
            onClick={() =>
              setRefresh((p) => p + 1)
            }
            disabled={loading}
            className="group flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-bold text-white transition-all hover:bg-indigo-600 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Sync Database
          </button>
        </header>

        {/* STATUS GRID */}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <StatCard
            icon={AlertCircle}
            label="Pending"
            value={stats.pending}
            hint="In Queue"
            color="text-orange-500"
          />

          <StatCard
            icon={Activity}
            label="For Action"
            value={stats.forAction}
            hint="Assigned"
            color="text-blue-500"
          />

          <StatCard
            icon={Mail}
            label="Invitations"
            value={stats.invitations}
            hint="Events"
            color="text-purple-500"
          />

          <StatCard
            icon={Inbox}
            label="For Info"
            value={stats.forInfo}
            hint="Reference"
            color="text-slate-500"
          />

          <StatCard
            icon={ThumbsUp}
            label="Approved"
            value={stats.approved}
            hint="Confirmed"
            color="text-emerald-500"
          />

          <StatCard
            icon={CheckCircle2}
            label="Actioned"
            value={stats.actioned}
            hint="Completed"
            color="text-emerald-700"
          />
        </div>

        {/* CHART */}

        <div className="mt-8 grid gap-8 xl:grid-cols-3">
          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm xl:col-span-2">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">
                  Engagement Over Time
                </h2>

                <p className="text-sm font-medium text-slate-400">
                  Monthly breakdown of
                  received communications
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="colorCount"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#6366f1"
                        stopOpacity={0.1}
                      />

                      <stop
                        offset="95%"
                        stopColor="#6366f1"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip />

                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm flex-1">
              <h2 className="text-xl font-black mb-6">
                Overview
              </h2>

              <div className="space-y-4">
                <div className="rounded-3xl bg-slate-50 p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Total Records
                  </p>

                  <h2 className="mt-1 text-4xl font-black">
                    {stats.total}
                  </h2>
                </div>

                <div className="rounded-3xl bg-indigo-600 p-6 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70">
                    Search Results
                  </p>

                  <h2 className="mt-1 text-4xl font-black">
                    {
                      filteredRows.length
                    }
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}

        <div className="mt-8 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-300">
          {/* FILTERS */}

          <div className="border-b border-slate-100 bg-slate-50/30 p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  Data Explorer
                </h2>

                <p className="text-sm font-medium text-slate-400">
                  Search, filter and
                  audit all incoming
                  records
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:min-w-[700px] justify-end">
                {/* SEARCH */}

                <div className="relative group flex-1 min-w-[200px]">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Search entries..."
                    value={searchInput}
                    onChange={(e) =>
                      setSearchInput(
                        e.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-medium outline-none shadow-sm"
                  />
                </div>

                {/* DATES */}

                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                  <div className="flex items-center px-2 text-slate-400">
                    <Calendar className="h-4 w-4" />
                  </div>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(
                        e.target.value
                      )
                    }
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none"
                  />

                  <span className="text-slate-300 font-bold text-[10px] uppercase">
                    to
                  </span>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                      setEndDate(
                        e.target.value
                      )
                    }
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none"
                  />

                  {(startDate ||
                    endDate) && (
                    <button
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="ml-1 flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* FILTER */}

                <div className="relative min-w-[180px]">
                  <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />

                  <select
                    value={remarkFilter}
                    onChange={(e) =>
                      setRemarkFilter(
                        e.target.value
                      )
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-10 text-sm font-bold text-slate-700 outline-none shadow-sm"
                  >
                    {remarksList.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item ===
                          "All"
                            ? "All Remarks"
                            : item}
                        </option>
                      )
                    )}
                  </select>

                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <ChevronRight className="h-4 w-4 rotate-90" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto border-t border-slate-100">
            <table className="w-full text-left text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr>
                  <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">
                    Ref Number
                  </th>

                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    Received By
                  </th>

                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    Date Received
                  </th>

                  <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">
                    Subject
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-8 py-32 text-center font-bold text-slate-400 animate-pulse"
                    >
                      Syncing
                      Database...
                    </td>
                  </tr>
                ) : filteredRows.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-8 py-32 text-center font-bold text-slate-400"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map(
                    (row, index) => (
                      <tr
                        key={index}
                        className="group hover:bg-indigo-50/30 transition-all duration-200"
                      >
                        <td className="px-8 py-6">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-600 border border-slate-200/50">
                            {row.refNumber ||
                              "N/A"}
                          </span>
                        </td>

                        <td className="px-6 py-6 font-bold text-slate-900">
                          {
                            row.receivedBy
                          }
                        </td>

                        <td className="px-6 py-6 text-slate-500 font-medium">
                          {formatDate(
                            row.dateReceived
                          )}
                        </td>

                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1.5">
                            <span className="font-semibold text-slate-700 truncate max-w-md">
                              {row.subject ||
                                "No Subject"}
                            </span>

                            {row.remarks && (
                              <span
                                className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(
                                  row.remarks
                                )}`}
                              >
                                {
                                  row.remarks
                                }
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}

          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-sm text-slate-500">
              Showing{" "}
              {
                paginatedRows.length
              }{" "}
              of{" "}
              {
                filteredRows.length
              }
            </p>

            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() =>
                  setPage((p) => p - 1)
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                Prev
              </button>

              <button
                disabled={
                  page *
                    ROWS_PER_PAGE >=
                  filteredRows.length
                }
                onClick={() =>
                  setPage((p) => p + 1)
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}