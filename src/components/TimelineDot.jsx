import { X, Clock3, CheckCircle2, Circle } from "lucide-react";

export default function TimelineDot({
  isOpen,
  onClose,
  data = [],
  refNumber,
}) {
  if (!isOpen) return null;

  // 1. CREATE FULL STATUS FLOW
  const timeline = data.length
    ? [
        {
          status: data[0].oldStatus || "No Status",
          timestamp: "Initial Status",
        },
        ...data.map((item) => ({
          status: item.newStatus,
          timestamp: item.timestamp,
        })),
      ]
    : [];

  // 2. STATE LOGIC DERIVATIONS (Calculated once outside the loop)
const finalStatuses = [
  "approved",
  "disapproved",
  "actioned",
  "for info",
  "meetings",
  "memorandums",
];

const latestStatus =
  timeline[timeline.length - 1]?.status?.trim().toLowerCase() || "";

const isCompletedProcess =
  finalStatuses.includes(latestStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 transition-all duration-300">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">History Log</span>
            <h2 className="text-2xl font-bold text-slate-800 mt-0.5">
              Status Timeline
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Reference No: <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{refNumber}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TIMELINE BODY */}
        <div className="flex-1 overflow-y-auto py-6">
          {timeline.length ? (
            <div className="relative overflow-x-auto px-8 py-24 my-4 scrollbar-thin scrollbar-thumb-slate-200">
              
              {/* THE FLEX WRAPPER (Locks vertical alignment geometry for the line) */}
              <div className="relative flex justify-between gap-16 min-w-max items-center h-10">
                
                {/* CONNECTING LINE TRACK (Offsets: half of node width = 4.5rem) */}
                <div className="absolute left-[4.5rem] right-[4.5rem] top-1/2 h-0.5 -translate-y-1/2 bg-slate-100 z-0" />
                
                {/* PROGRESS LINE */}
                <div 
                className={`absolute left-[4.5rem] top-1/2 h-0.5 -translate-y-1/2 z-0 transition-all duration-500 ${
                    isCompletedProcess
                    ? "bg-emerald-500"
                    : "bg-indigo-500"
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
                        <div className="absolute -top-20 w-44 text-center flex flex-col items-center justify-end h-16 transition-transform duration-200 group-hover:-translate-y-1">
                          <h3 className="text-xs font-bold text-slate-800 line-clamp-2">
                            {item.status}
                          </h3>
                          <p className="mt-1 text-[11px] font-medium text-slate-400">
                            {item.timestamp}
                          </p>
                        </div>
                      )}

                      {/* THE TIMELINE NODE / DOT */}
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300">
                        {isLast ? (
                          <>
                            {/* Current / Active Status Indicator */}
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-45" />
                            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-200 border-4 border-white">
                              <Circle className="h-2.5 w-2.5 fill-white text-white" />
                            </div>
                          </>
                        ) : (
                          /* Completed Status Indicator */
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 shadow-md shadow-emerald-100 text-white transition-transform group-hover:scale-110">
                            <CheckCircle2 className="h-4 w-4 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* CARD: BOTTOM PLACEMENT */}
                      {!isTop && (
                        <div className="absolute top-12 w-44 text-center transition-transform duration-200 group-hover:translate-y-1">
                          <h3 className="text-xs font-bold text-slate-800 line-clamp-2">
                            {item.status}
                          </h3>
                          <p className="mt-1 text-[11px] font-medium text-slate-400">
                            {item.timestamp}
                          </p>
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
        
      </div>
    </div>
  );
}