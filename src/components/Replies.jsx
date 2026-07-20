import { useEffect, useMemo, useState } from "react";
import { request } from "../services/api";
import {
  ReplyAll,
  Forward,
  Search,
  Clock3,
  RefreshCw,
  Inbox,
  AlertCircle,
  MoreHorizontal,
  ChevronRight,
  Calendar,
  CheckCheck,
  LoaderCircle,
} from "lucide-react";


export default function Replies() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acknowledging, setAcknowledging] = useState("");
  const [acknowledged, setAcknowledged] = useState(() => new Set());
  const [acknowledgeError, setAcknowledgeError] = useState({});

  const fetchReplies = async () => {

  try {

    setLoading(true);
    setError("");

    const json = await request(
      "getNotifications",
      "GET"
    );

    setData(
      Array.isArray(json)
        ? json
        : []
    );

  } catch (err) {

    console.error(err);

    setError(
      err.message ||
      "Failed to connect to the database"
    );

    setData([]);

  } finally {

    setLoading(false);

  }

};

  useEffect(() => {
    fetchReplies();
  }, []);

  // --- Helpers ---
  const getSubject = (i) =>
    i?.Subject || i?.subject || i?.Title || "Untitled Communication";

  const getSender = (i) =>
  i?.Sender ||
  i?.sender ||
  i?.From ||
  i?.from ||
  i?.["Received From"] ||
  i?.receivedFrom ||
  i?.Email ||
  i?.email ||
  i?.Name ||
  i?.name ||
  "Anonymous";

  const getMessage = (i) =>
    i?.Message || i?.message || i?.Body || "";

  const getSenderEmail = (i) => {
    const raw = String(
      i?.SenderEmail ||
        i?.senderEmail ||
        i?.Email ||
        i?.email ||
        i?.FromEmail ||
        i?.fromEmail ||
        i?.Sender ||
        i?.sender ||
        i?.From ||
        i?.from ||
        ""
    );
    const angleAddress = raw.match(/<([^<>\s]+@[^<>\s]+)>/);
    const plainAddress = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

    return (angleAddress?.[1] || plainAddress?.[0] || "").trim();
  };

  const getItemKey = (item, index = 0) =>
    String(
      item?.Id ||
        item?.id ||
        item?.NotificationId ||
        item?.notificationId ||
        item?.["Thread ID"] ||
        item?.ThreadId ||
        item?.threadId ||
        `${getSubject(item)}-${getSenderEmail(item)}-${getTimeRaw(item)}-${index}`
    );

  const acknowledgeReply = async (item, index) => {
    const key = getItemKey(item, index);
    const recipient = getSenderEmail(item);

    try {
      if (!recipient) {
        throw new Error("This message does not include a valid sender email address.");
      }

      setAcknowledging(key);
      setAcknowledgeError((current) => ({ ...current, [key]: "" }));

      const result = await request("sendAcknowledgementEmail", "POST", {
        to: recipient,
        subject: getSubject(item),
      });

      if (!result?.success) {
        throw new Error(result?.error || result?.message || "Acknowledgement could not be sent.");
      }

      setAcknowledged((current) => new Set(current).add(key));
    } catch (err) {
      setAcknowledgeError((current) => ({
        ...current,
        [key]: err.message || "Acknowledgement could not be sent.",
      }));
    } finally {
      setAcknowledging("");
    }
  };

  const getTimeRaw = (i) =>
  i?.Time ||
  i?.time ||
  i?.Timestamp ||
  i?.timestamp ||
  i?.Date ||
  i?.date ||
  i?.["Date Received"] ||
  i?.dateReceived ||
  "";

  const getType = (item) => {
    const raw = String(item?.Type || item?.type || "").toLowerCase();

    return raw.includes("forward") || raw.includes("fwd")
      ? "forward"
      : "reply";
  };

  const getGroupDate = (dateStr) => {
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) return "Recent";

    const today = new Date();
    const yesterday = new Date();

    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";

    if (date.toDateString() === yesterday.toDateString())
      return "Yesterday";

    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const processedData = useMemo(() => {
    if (!data.length) return {};

    const sorted = [...data].sort(
      (a, b) =>
        new Date(getTimeRaw(b)).getTime() -
        new Date(getTimeRaw(a)).getTime()
    );

    const seen = new Set();

    const unique = sorted.filter((item) => {
      const key = String(getSubject(item))
        .toLowerCase()
        .trim()
        .replace(/^(re|fwd|fw)\s*:\s*/gi, "");

      return seen.has(key) ? false : seen.add(key);
    });

    const q = search.toLowerCase().trim();

    const filtered = q
      ? unique.filter((item) =>
          [getSubject(item), getSender(item), getMessage(item)].some(
            (f) => String(f).toLowerCase().includes(q)
          )
        )
      : unique;

    return filtered.reduce((groups, item) => {
      const date = getGroupDate(getTimeRaw(item));

      if (!groups[date]) groups[date] = [];

      groups[date].push(item);

      return groups;
    }, {});
  }, [data, search]);

  return (
    <div className="flex-1 min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                <Inbox className="h-6 w-6 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900 leading-none">
                  Replies & Forwards
                </h1>

                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />

                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {data.length} threads synced
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group flex-1 md:flex-none">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />

                <input
                  type="text"
                  placeholder="Filter by subject or sender..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 w-full md:w-72 rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              <button
                onClick={fetchReplies}
                className="p-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
              >
                <RefreshCw
                  className={`h-5 w-5 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-10">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-24 w-full rounded-2xl bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-5 text-sm font-bold text-rose-600">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(processedData).map(([date, items]) => (
              <section key={date} className="relative">
                <div className="sticky top-[108px] z-30 flex items-center gap-4 py-2 bg-[#F8FAFC]/90 backdrop-blur-sm mb-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500" />

                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
                      {date}
                    </span>
                  </div>

                  <div className="h-[1px] flex-1 bg-slate-200" />
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const isFwd = getType(item) === "forward";
                    const itemKey = getItemKey(item, idx);
                    const isAcknowledging = acknowledging === itemKey;
                    const isAcknowledged =
                      acknowledged.has(itemKey) ||
                      String(item?.Acknowledged || item?.acknowledged || "")
                        .trim()
                        .toLowerCase() === "acknowledged";

                    return (
                      <div
                        key={idx}
                        className="group bg-white border border-slate-200/70 rounded-2xl p-4 flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-200 hover:-translate-y-0.5"
                      >
                        <div
                          className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${
                            isFwd
                              ? "bg-amber-50 text-amber-600"
                              : "bg-indigo-50 text-indigo-600"
                          }`}
                        >
                          {isFwd ? (
                            <Forward className="h-5 w-5" />
                          ) : (
                            <ReplyAll className="h-5 w-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest ${
                                isFwd
                                  ? "text-amber-600"
                                  : "text-indigo-600"
                              }`}
                            >
                              {getType(item)}
                            </span>

                            <span className="text-slate-300">•</span>

                            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[11px]">
                              <Clock3 className="h-3 w-3" />

                              {new Date(
                                getTimeRaw(item)
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>

                          <h2 className="text-[15px] font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {getSubject(item)}
                          </h2>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-slate-700">
                              {getSender(item)}
                            </span>

                            {getMessage(item) && (
                              <>
                                <span className="text-slate-300">·</span>

                                <p className="text-xs font-medium text-slate-400 truncate max-w-[400px]">
                                  {getMessage(item)}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-4 border-l border-slate-100">

                          <div className="relative">
                              <button
                                type="button"
                                onClick={() => acknowledgeReply(item, idx)}
                                disabled={isAcknowledging || isAcknowledged}
                                title={
                                  getSenderEmail(item)
                                    ? `Send an acknowledgement to ${getSenderEmail(item)}`
                                    : "Send an acknowledgement to the message sender"
                                }
                                className={`h-10 px-4 flex items-center gap-2 rounded-xl font-bold text-xs transition-all shadow-sm disabled:cursor-not-allowed ${
                                  isAcknowledged
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white disabled:opacity-60"
                                }`}
                              >
                                {isAcknowledging ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCheck className="h-4 w-4" />
                                )}
                                {isAcknowledging
                                  ? "Sending..."
                                  : isAcknowledged
                                    ? "Acknowledged"
                                    : "Acknowledge"}
                              </button>

                              {acknowledgeError[itemKey] && (
                                <p
                                  role="alert"
                                  className="absolute right-0 top-12 z-10 w-64 rounded-lg border border-rose-100 bg-white p-2 text-[11px] font-semibold text-rose-600 shadow-lg"
                                >
                                  {acknowledgeError[itemKey]}
                                </p>
                              )}
                          </div>

                          <button
                            onClick={() =>
                              window.open(
                                item.Link || item.link,
                                "_blank"
                              )
                            }
                            className="h-10 px-4 flex items-center gap-2 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all group/btn shadow-sm"
                          >
                            View Thread

                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                          </button>

                          <button className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
