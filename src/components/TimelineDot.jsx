import { X, Clock3, CheckCircle2 } from "lucide-react";

export default function TimelineDot({
  isOpen,
  onClose,
  data = [],
  refNumber,
}) {
  if (!isOpen) return null;


  // CREATE FULL STATUS FLOW
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


  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-orange-500",
    "bg-purple-500",
    "bg-red-500",
  ];


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-6">
      <div className="w-full max-w-6xl rounded-[2rem] bg-white p-8 shadow-2xl">


        {/* HEADER */}
        <div className="mb-12 flex items-center justify-between">

          <div>
            <h2 className="text-3xl font-black text-slate-800">
              Status Timeline
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-400">
              Reference No: {refNumber}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 hover:bg-red-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {timeline.length ? (
          <div className="relative overflow-x-auto px-10 py-20">
            {/* CONNECTING LINE */}
            <div
              className="absolute left-16 right-16 top-1/2 h-1 -translate-y-1/2 bg-red-500"
            />
            <div className="relative flex min-w-max justify-between gap-24">
              {timeline.map((item, index) => {
                const top =
                  index % 2 === 0;

                return (
                  <div
                    key={index} className="relative flex flex-col items-center">
                    {/* TOP TEXT */}
                    {top && (
                      <div className="mb-10 w-40 text-center">
                        <h3
                          className="text-sm font-black text-slate-700">
                          {item.status}
                        </h3>
                        <p className="mt-2 text-xs text-slate-400">
                          {item.timestamp}
                        </p>
                      </div>
                    )}
                    {/* DOT */}
                    <div
                      className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 border-red-500 ${colors[index % colors.length]}`}>
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                    {/* BOTTOM TEXT */}
                    {!top && (
                      <div className="mt-10 w-40 text-center">
                        <h3
                          className="text-sm font-black text-slate-700" >
                          {item.status}
                        </h3>
                        <p className="mt-2 text-xs text-slate-400">
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
          <div className="py-20 text-center">
            <Clock3 className="mx-auto h-14 w-14 text-slate-300" />
            <p className="mt-4 font-bold text-slate-400">
              No timeline history available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}