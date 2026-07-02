
import { useState } from "react";
import { Send, X, Search } from "lucide-react";

export default function ForwardModal({
  isOpen,
  onClose,
  onForward,
  loading,
  forwardData,
  setForwardData,
  schools = [],
}) {
  if (!isOpen) return null;

  const selected = forwardData.selectedSchools || [];
  const [search, setSearch] = useState("");

  const toggleSchool = (school) => {
    const exists = selected.includes(school.email);
    const updated = exists
      ? selected.filter((e) => e !== school.email)
      : [...selected, school.email];

    setForwardData((p) => ({
      ...p,
      selectedSchools: updated,
      to: [...new Set([...updated, ...(p.manualEmails || "").split(",").map(v=>v.trim()).filter(Boolean)])].join(", "),
    }));
  };

  const selectAll = () => {
    const all = schools.map(s => s.email);
    const enable = selected.length !== schools.length;
    setForwardData(p=>({
      ...p,
      selectedSchools: enable ? all : [],
      to: enable ? all.join(", ") : ""
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden">

        <div className="px-8 py-6 border-b flex justify-between items-start">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Send size={22}/>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Forward Communication</h2>
              <p className="text-sm text-slate-500 mt-1">
                Forward this communication together with its attachments.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X size={18}/>
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">

          <div className="rounded-2xl border bg-slate-50">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-slate-700 uppercase text-sm">
                ● SUC Directory Network
              </h3>

              <button
                onClick={selectAll}
                className="text-indigo-600 font-semibold text-sm"
              >
                {selected.length===schools.length ? "Clear All":"Select All"}
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search school..."
                  className="w-full border rounded-xl pl-10 pr-4 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="h-48 overflow-y-auto space-y-2 pr-2">
                {schools
                  .filter((school) =>
                    school.school.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((school) => (
                  <label
                    key={school.id}
                    className="flex items-center gap-3 rounded-xl hover:bg-slate-100 p-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(school.email)}
                      onChange={()=>toggleSchool(school)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        {school.school}
                      </p>

                      <p className="text-xs text-slate-500">
                        {school.email}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-slate-50">
            <div className="px-5 py-4 border-b">
              <h3 className="font-bold text-slate-700 uppercase text-sm">
                ● Manual & Custom Routing
              </h3>
            </div>

            <div className="p-5 space-y-5">

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Recipient Emails
                </label>
                <input
                  value={forwardData.to || ""}
                  onChange={(e)=>setForwardData(p=>({...p,to:e.target.value,manualEmails:e.target.value}))}
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                  placeholder="office@example.edu.ph, sample@email.com"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Subject Title
                </label>
                <input
                  value={forwardData.subject || ""}
                  onChange={(e)=>setForwardData(p=>({...p,subject:e.target.value}))}
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                  placeholder="Fwd: Subject..."
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={forwardData.includeCc ?? true}
                  onChange={(e)=>setForwardData(p=>({...p,includeCc:e.target.checked}))}
                />
                <span className="font-medium">CC Context Recipients</span>
              </label>

              <input
                value={forwardData.cc || ""}
                onChange={(e)=>setForwardData(p=>({...p,cc:e.target.value}))}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Add extra CC emails separated by commas..."
              />
            </div>
          </div>
        </div>

        <div className="border-t bg-slate-50 px-8 py-5 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500">
            COMMUNICATION TRACKING SYSTEM
          </span>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl border font-semibold"
            >
              Cancel
            </button>

            <button
              onClick={onForward}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Forwarding..." : "Forward"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
