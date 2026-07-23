import { useEffect, useMemo, useState } from "react";
import { request } from "../services/api";
import QuickForwardModal from "./QuickForwardModal";
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
  const [forwardModal, setForwardModal] = useState({ isOpen: false, record: null });
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardNotice, setForwardNotice] = useState(null);

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

  const getThreadId = (i) =>
    String(i?.["Thread ID"] || i?.ThreadId || i?.threadId || "").trim();

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
  threadId:
    item?.["Thread ID"] ||
    item?.ThreadId ||
    item?.threadId ||
    "",
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

  const openForwardModal = (item) => {
    setForwardNotice(null);
    setForwardModal({
      isOpen: true,
      record: { ...item },
    });
  };

  const forwardReply = async (person) => {
    const record = forwardModal.record;
    if (!record || !person?.email) return;
    setIsForwarding(true);
    setForwardNotice(null);
    try {
      const recipient = person.email.trim();
      const result = await request("forwardReply", "POST", {
        threadId: getThreadId(record),
        to: recipient,
      });
      if (!result?.success) throw new Error(result?.error || "Forward failed.");
      setForwardModal({ isOpen: false, record: null });
      setForwardNotice({ type: "success", message: `The email was forwarded to ${person.name || recipient}.` });
    } catch (err) {
      setForwardModal({ isOpen: false, record: null });
      setForwardNotice({ type: "error", message: err?.message || "Could not forward the email." });
    } finally {
      setIsForwarding(false);
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

    const withoutMe = sorted.filter(
      (item) => String(getSender(item)).trim().toLowerCase() !== "me"
    );

    const unique = withoutMe.filter((item) => {
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
    <div className="min-h-screen flex-1 bg-[#f5f7fb]">
      {/* Header */}
      <header className="relative w-full overflow-hidden bg-[#071d49] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg backdrop-blur-sm">
                <Inbox className="h-6 w-6 text-sky-300" />
              </div>

              <div>
                <h1 className="text-2xl font-extrabold leading-none tracking-[-0.025em] text-white sm:text-3xl">
                  Replies & Forwards
                </h1>

                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />

                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/60">
                    {data.length} threads synced
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group flex-1 md:flex-none">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-200/60 transition-colors group-focus-within:text-sky-300" />

                <input
                  type="text"
                  placeholder="Filter by subject or sender..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-blue-200/50 focus:border-sky-300 focus:bg-white/15 focus:ring-2 focus:ring-sky-300/20 md:w-80"
                />
              </div>

              <button
                onClick={fetchReplies}
                aria-label="Refresh replies"
                className="rounded-xl border border-white/15 bg-white/10 p-3 text-blue-100 transition hover:bg-white/15 hover:text-white active:scale-95"
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

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {forwardNotice && (
          <div role="status" className={`mb-5 flex items-center justify-between gap-4 rounded-2xl border p-4 text-sm font-bold ${forwardNotice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            <span>{forwardNotice.message}</span>
            <button type="button" onClick={() => setForwardNotice(null)} className="shrink-0 text-xs uppercase opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 w-full animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-5 text-sm font-bold text-rose-600">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(processedData).map(([date, items]) => (
              <section key={date} className="relative">
                <div className="sticky top-0 z-30 mb-4 flex items-center gap-4 bg-[#f5f7fb]/90 py-2 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />

                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-950">
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
                        className="group flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_5px_20px_rgba(15,23,42,.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(15,23,42,.08)] sm:p-5 lg:flex-row lg:items-center"
                      >
                        <div
                          className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${
                            isFwd
                              ? "bg-amber-50 text-amber-600"
                              : "bg-blue-50 text-blue-700"
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
                                  : "text-blue-700"
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

                          <h2 className="truncate text-[15px] font-bold text-slate-900 transition-colors group-hover:text-blue-700">
                            {getSubject(item)}
                          </h2>

                          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
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

                        <div className="flex w-full flex-wrap items-center gap-2 border-t border-slate-100 pt-4 lg:w-auto lg:flex-nowrap lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">

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
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-white disabled:opacity-60"
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
                            className="group/btn flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-blue-700 hover:text-white"
                          >
                            View Thread

                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              aria-label="Forward communication"
                              title="Forward communication"
                              onClick={() => openForwardModal(item)}
                              className="relative z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                          </div>
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
      {forwardModal.isOpen && (
        <QuickForwardModal
          isOpen
          forwarding={isForwarding}
          onClose={() => !isForwarding && setForwardModal({ isOpen: false, record: null })}
          onForward={forwardReply}
        />
      )}
    </div>
  );
}
