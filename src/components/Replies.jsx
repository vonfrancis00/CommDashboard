import React, { useEffect, useMemo, useState } from "react";
import {
  ReplyAll,
  Forward,
  Search,
  Clock3,
  RefreshCw,
  Inbox,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzKVZ-0_LlN4Ryjc3Rjsmlo4s4ub2zUuQgqjQfSEaJfHHFEe6smMNTPnNnL0hoZ7Cjy3A/exec";

export default function Replies() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReplies = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${WEB_APP_URL}?sheet=Notifications`);
      const json = await res.json();
      if (!res.ok) throw new Error("Failed to load data");
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err.message || "Failed to connect to the database");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, []);

  // --- Data Normalization Helpers ---
  const getSubject = (i) => i?.Subject || i?.subject || i?.SubjectLine || i?.Title || "Untitled Communication";
  const getSender = (i) => i?.Sender || i?.sender || i?.From || i?.Name || "Anonymous";
  const getEmail = (i) => i?.Email || i?.email || i?.FromEmail || "";
  const getMessage = (i) => i?.Message || i?.message || i?.Body || "";
  const getTimeRaw = (i) => i?.Time || i?.time || i?.Timestamp || i?.["Created At"] || "";
  
  const getDisplayTime = (item) => {
    const rawTime = getTimeRaw(item);
    if (!rawTime) return "Recently";
    const date = new Date(rawTime);
    return !isNaN(date.getTime()) 
      ? date.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
      : String(rawTime);
  };

  const getType = (item) => {
    const raw = String(item?.Type || item?.type || item?.Category || "").toLowerCase();
    return (raw.includes("forward") || raw.includes("fwd")) ? "forward" : "reply";
  };

  // --- Logic Filtering ---
  const latestUniqueData = useMemo(() => {
    if (!data.length) return [];
    const sorted = [...data].sort((a, b) => new Date(getTimeRaw(b)).getTime() - new Date(getTimeRaw(a)).getTime());
    const seen = new Set();
    return sorted.filter(item => {
      const key = String(getSubject(item)).toLowerCase().trim().replace(/^(re|fwd|fw)\s*:\s*/gi, "");
      return seen.has(key) ? false : seen.add(key);
    });
  }, [data]);

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return latestUniqueData;
    return latestUniqueData.filter(item => 
      [getSubject(item), getSender(item), getMessage(item)].some(f => String(f).toLowerCase().includes(q))
    );
  }, [latestUniqueData, search]);

  return (
    <div className="flex-1 min-h-screen bg-[#F8FAFC]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <div className="flex flex-col gap-4 px-8 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-[0.2em] mt-1">
              Communication Hub & Archives
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search communications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full md:w-72 rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>
            <button
              onClick={fetchReplies}
              disabled={loading}
              className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="mx-auto max-w-6xl p-8">
        {loading ? (
          <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-12 w-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
            <p className="mt-4 text-sm font-bold text-slate-500">Updating communication logs...</p>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-600 shadow-sm">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50">
            <div className="rounded-2xl bg-slate-100 p-4">
              <Inbox className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-500 text-center">
              No conversations found.<br/>
              <span className="font-medium text-slate-400">Try adjusting your filters.</span>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map((item, index) => {
              const type = getType(item);
              const isForward = type === "forward";

              return (
                <div
                  key={index}
                  className="group relative flex flex-col sm:flex-row sm:items-center gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-indigo-300 hover:shadow-[0_20px_50px_rgba(79,70,229,0.08)] hover:-translate-y-0.5"
                >
                  <div className={`absolute left-0 top-0 h-full w-1.5 transition-all ${
                    isForward ? "bg-amber-400" : "bg-indigo-600"
                  }`} />
                  
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 shadow-inner ${
                    isForward 
                      ? "bg-amber-50 text-amber-600 group-hover:bg-amber-100" 
                      : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                  }`}>
                    {isForward ? <Forward className="h-7 w-7" /> : <ReplyAll className="h-7 w-7" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1.5">
                      <h2 className="text-[17px] font-extrabold text-slate-800 tracking-tight truncate group-hover:text-indigo-900 transition-colors">
                        {getSubject(item)}
                      </h2>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                        isForward 
                          ? "bg-amber-50 text-amber-700 border-amber-200" 
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      }`}>
                        {type}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className="font-bold text-slate-700">{getSender(item)}</span>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="text-slate-400 font-medium truncate max-w-[250px]">{getEmail(item)}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Clock3 className="h-3.5 w-3.5" />
                          {getDisplayTime(item)}
                        </div>
                        
                        {getMessage(item) && (
                          <p className="text-[13px] text-slate-500 italic truncate hidden md:block">
                            "{getMessage(item).substring(0, 80)}..."
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex justify-end">
                    <button
                      onClick={() => window.open(item.Link || item.link, "_blank", "noopener,noreferrer")}
                      className="group/btn relative flex items-center gap-2 overflow-hidden rounded-xl bg-white border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900 active:scale-95"
                    >
                      <span className="relative z-10">Open Thread</span>
                      <ArrowUpRight className="relative z-10 h-4 w-4 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}