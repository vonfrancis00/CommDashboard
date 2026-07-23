import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Clock3, CheckCircle2, Circle } from "lucide-react";

// 1. Move static constants outside the component to prevent redeclaration on every render
const FINAL_STATUSES = [
  "approved",
  "disapproved",
  "actioned",
  "for info",
  "meetings",
  "memorandums",
];

function getTimelineLabel(item = {}) {
  if (item.description || item.timelineDescription || item.message) {
    return item.description || item.timelineDescription || item.message;
  }

  const event = item.event || item.timelineEvent || item.action;
  const recipient = item.recipient || item.assignedTo || item.forwardedTo;
  if (event && recipient) return `${event} to ${recipient}`;

  return item.newStatus || item.status || event || "Activity updated";
}

function getActionType(item = {}, label = "") {
  const value = String(
    item.event || item.timelineEvent || item.action || label
  ).trim().toLowerCase();

  if (value.startsWith("forwarded")) return "forwarded";
  if (value.startsWith("assigned")) return "assigned";
  return "";
}

function formatTimelineDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (isNaN(date)) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export default function TimelineDot({
  isOpen,
  onClose,
  data = [],
  refNumber,
  dateReceived,
  loading,
}) {
  const [selectedGroup, setSelectedGroup] = useState(null);

  // 2. Handle Escape key to close the modal (A11y)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // 3. Memoize the timeline transformation logic
  const { timeline, isCompletedProcess } = useMemo(() => {
  if (!data || data.length === 0) {
    return { timeline: [], isCompletedProcess: false };
  }

const initialStatus = data.find(item => item.oldStatus);

const rawTimeline = [
  ...(initialStatus ? [{
    status: initialStatus.oldStatus,
    timestamp:
      formatTimelineDate(dateReceived) ||
      "Initial Status",
    user:
      initialStatus.updatedBy ||
      "System",
  }] : []),

  ...data.map((item) => {
    const status = getTimelineLabel(item);

    return {
      status,
      actionType: getActionType(item, status),
      timestamp:
      formatTimelineDate(
        item.timestamp || item.dateTime || item.createdAt
      ),

      user:
      item.updatedBy || item.user ||
      "Unknown User",
    };
  }),
];

const compiledTimeline = rawTimeline.reduce((result, item) => {
  if (!item.actionType) {
    result.push(item);
    return result;
  }

  const existing = result.find(
    entry => entry.actionType === item.actionType
  );

  if (!existing) {
    result.push({
      ...item,
      details: [item],
    });
    return result;
  }

  existing.details.push(item);
  existing.status =
    `${item.actionType === "forwarded" ? "Forwarded" : "Assigned"} ` +
    `to ${existing.details.length} recipients`;
  existing.timestamp =
    existing.details[existing.details.length - 1].timestamp;
  existing.user = "Multiple users";
  return result;
}, []);

  const latestStatus =
    compiledTimeline[
      compiledTimeline.length - 1
    ]?.status?.trim().toLowerCase() || "";

  const isCompleted = FINAL_STATUSES.includes(latestStatus);

  return {
    timeline: compiledTimeline,
    isCompletedProcess: isCompleted,
  };
}, [data, dateReceived]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-5xl rounded-2xl bg-white p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] z-10">
        
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">History Log</span>
            <h2 id="modal-title" className="text-2xl font-bold text-slate-800 mt-0.5">
              Status Timeline
            </h2>
            {refNumber && (
              <p className="mt-1 text-xs font-medium text-slate-500">
                Reference No: <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{refNumber}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TIMELINE BODY */}
        <div className="flex-1 overflow-y-auto py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <span className="absolute h-full w-full animate-ping rounded-full bg-indigo-300  opacity-40"/>
                <div className="flex h-14 w-14 animate-spin items-center justify-center rounded-full border-4 border-slate-200 border-t-indigo-600" />
              </div>
              <h3 className="mt-6 text-sm font-black text-slate-700">
                Loading Timeline
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Retrieving status history...
              </p>

            </div>

          ) : timeline.length ? (
            <div className="relative overflow-x-auto px-8 py-24 my-4 scrollbar-thin scrollbar-thumb-slate-200">
              
              <div className="relative flex justify-between gap-16 min-w-max items-center h-10">
                
                {/* CONNECTING LINE TRACK */}
                <div className="absolute left-[4.5rem] right-[4.5rem] top-1/2 h-0.5 -translate-y-1/2 bg-slate-100 z-0" />
                
                {/* PROGRESS LINE */}
                <div 
                  className={`absolute left-[4.5rem] top-1/2 h-0.5 -translate-y-1/2 z-0 transition-all duration-500 ${
                    isCompletedProcess ? "bg-emerald-500" : "bg-indigo-500"
                  }`}
                  style={{ width: `calc(100% - 9rem)` }}
                />

                {timeline.map((item, index) => {
                  const isLast = index === timeline.length - 1 && !isCompletedProcess;
                  const isTop = index % 2 === 0;

                  return (
                    <div key={index} className="relative flex flex-col items-center w-36 group z-10">
                      
                      {/* CARD: TOP PLACEMENT */}
                      {isTop && (
                        <div className="absolute -top-20 w-44 text-center flex flex-col items-center justify-end h-16 transition-transform duration-200 group-hover:-translate-y-1 select-none">
                          <h3 className="text-xs font-bold text-slate-800 line-clamp-2 break-words max-w-full">
                            {item.status}
                          </h3>
                          <p className="mt-1 text-[11px] font-medium text-slate-400 whitespace-nowrap">
                            {item.timestamp}
                          </p>

                          <p className="mt-1 text-[11px] font-bold text-indigo-500">
                            {item.user}
                          </p>
                          {item.details?.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSelectedGroup(item)}
                              className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              See more
                            </button>
                          )}
                        </div>
                      )}

                      {/* THE TIMELINE NODE / DOT */}
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300">
                        {isLast ? (
                          <>
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-45" />
                            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-200 border-4 border-white">
                              <Circle className="h-2.5 w-2.5 fill-white text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 shadow-md shadow-emerald-100 text-white transition-transform duration-200 group-hover:scale-110">
                            <CheckCircle2 className="h-4 w-4 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* CARD: BOTTOM PLACEMENT */}
                      {!isTop && (
                        <div className="absolute top-12 w-44 text-center transition-transform duration-200 group-hover:translate-y-1 select-none">
                          <h3 className="text-xs font-bold text-slate-800 line-clamp-2 break-words max-w-full">
                            {item.status}
                          </h3>
                          <p className="mt-1 text-[11px] font-medium text-slate-400 whitespace-nowrap">
                            {item.timestamp}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-indigo-500">
                            {item.user}
                          </p>
                          {item.details?.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSelectedGroup(item)}
                              className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              See more
                            </button>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* EMPTY STATE */
            <div className="py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <Clock3 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-700">No history found</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
                There are no recorded status updates transitions available for this reference number.
              </p>
            </div>
          )}
        </div>

        {selectedGroup && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-900/40 p-5 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Complete history
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-800">
                    {selectedGroup.actionType === "forwarded"
                      ? "Forwarded recipients"
                      : "Assigned personnel"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  aria-label="Close complete history"
                  className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                {selectedGroup.details.map((detail, index) => (
                  <div
                    key={`${detail.status}-${detail.timestamp}-${index}`}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-sm font-bold text-slate-800">
                      {detail.status}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
                      <span className="text-slate-500">{detail.timestamp}</span>
                      <span className="font-bold text-indigo-600">{detail.user}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>,
    document.body
  );
}
