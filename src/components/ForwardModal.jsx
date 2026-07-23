import { useEffect, useState } from "react";
import {
  X,
  Send,
  Search,
  Mail,
  Users,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { request } from "../services/api";

export default function ForwardModal({
  isOpen,
  data,
  setData,
  onClose,
  onForward,
  isForwarding,
}) {

  const [sucs, setSucs] = useState([]);
  const [selectedSucs, setSelectedSucs] = useState([]);
  const [offices, setOffices] = useState([]);
  const [selectedOffices, setSelectedOffices] = useState([]);
  const [sucSearch, setSucSearch] = useState("");
  const [officeSearch, setOfficeSearch] = useState("");
  const [loadingSucs, setLoadingSucs] = useState(false);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [showSucs, setShowSucs] = useState(false);
  const [showOffices, setShowOffices] = useState(false);


  useEffect(() => {
    if (!isOpen) return;
    async function loadSucs() {
      try {
        setLoadingSucs(true);
        const res = await request(
          "getSucs",
          "GET"
        );
        setSucs(res || []);
      } catch (err) {
        console.error(
          "Failed loading SUCs:",
          err
        );
      } finally {
        setLoadingSucs(false);
      }
    }
    loadSucs();

    async function loadOffices() {
      try {
        setLoadingOffices(true);
        const res = await request(
          "getOffices",
          "GET"
        );
        setOffices(res || []);
      } catch (err) {
        console.error(
          "Failed loading offices:",
          err
        );
      } finally {
        setLoadingOffices(false);
      }
    }
    loadOffices();
  }, [isOpen]);
  useEffect(() => {
  if (!isOpen) {
    setSelectedSucs([]);
    setSelectedOffices([]);
    setSucSearch("");
    setOfficeSearch("");
    setShowSucs(false);
    setShowOffices(false);
  }
}, [isOpen]);
  const resetModal = () => {
  setSelectedSucs([]);
  setSelectedOffices([]);
  setSucSearch("");
  setOfficeSearch("");
  setShowSucs(false);
  setShowOffices(false);

  setData({
    isOpen: false,
    refNumber: "",
    to: "",
    subject: "",
    includeOriginalCc: true,
    originalCc: "",
  });
};

const handleClose = () => {
  resetModal();
  onClose();
};
  function updateRecipients(nextSucs, nextOffices) {
    setData(prev => {
      const listedEmails = new Set(
        [...sucs, ...offices]
          .map(recipient => recipient.email)
          .filter(Boolean)
      );
      const manualEmails =
        (prev.to || "")
          .split(",")
          .map(e => e.trim())
          .filter(
            e =>
              e &&
              !listedEmails.has(e)
          );
      return {
        ...prev,
        to: [
          ...manualEmails,
          ...nextSucs,
          ...nextOffices
        ]
          .filter(Boolean)
          .filter((email, index, emails) => emails.indexOf(email) === index)
          .join(", ")
      };
    });
  }

  function toggleSUC(email) {
    const updated = selectedSucs.includes(email)
      ? selectedSucs.filter(e => e !== email)
      : [...selectedSucs, email];

    setSelectedSucs(updated);
    updateRecipients(updated, selectedOffices);
  }

  function toggleOffice(email) {
    const updated = selectedOffices.includes(email)
      ? selectedOffices.filter(e => e !== email)
      : [...selectedOffices, email];

    setSelectedOffices(updated);
    updateRecipients(selectedSucs, updated);
  }

  const filteredSucs =
  sucs
    .filter(s =>
      s.name
        ?.toLowerCase()
        .includes(
          sucSearch.toLowerCase()
        )
    )
    .sort((a, b) =>
      a.name.localeCompare(
        b.name,
        undefined,
        { sensitivity: "base" }
      )
    );
  const filteredOffices =
  offices
    .filter(office =>
      office.name
        ?.toLowerCase()
        .includes(
          officeSearch.toLowerCase()
        )
    )
    .sort((a, b) =>
      a.name.localeCompare(
        b.name,
        undefined,
        { sensitivity: "base" }
      )
    );
  async function handleForward() {
  const success = await onForward();

  if (success) {
    resetModal();
  }
}
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/50 bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-6">
          <div>
            <div className="flex items-center gap-3">
              <div className=" flex h-11 w-11items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <Mail size={22}/>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Forward Communication
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  Reference No: {data.refNumber}
                </p>
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={22}/>
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* TO */}
          <section>
            <Label>
              Forward To
            </Label>
            <input value={data.to} onChange={(e)=>
                setData(prev=>({
                  ...prev,
                  to:e.target.value
                }))
              }
              placeholder="email1@example.com, email2@example.com"
              className="input-style"
            />
          </section>
          {/* SUC */}
          <section>
            <button
              type="button"
              onClick={() => setShowSucs(open => !open)}
              aria-expanded={showSucs}
              aria-controls="suc-recipients"
              className="mb-2 flex w-full items-center justify-between rounded-xl px-1 py-1 text-left hover:bg-slate-50"
            >
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                SUC Recipients
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-500">
                  {selectedSucs.length} selected
                </span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform ${showSucs ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            {showSucs && (
              <div id="suc-recipients">
                {/* SEARCH */}
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3">
              <Search
                size={16}
                className="text-slate-400"
              />
              <input value={sucSearch}
                onChange={(e)=>
                  setSucSearch(
                    e.target.value
                  )
                }
                placeholder="Search SUC..."
                className="flex-1 bg-transparent py-2 text-sm outline-none"
              />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-2xl bg-slate-50 p-3 space-y-2">
              {/* {loadingSucs && (
                <p className="text-center text-sm text-slate-400">
                  Loading recipients...
                </p>
              )} */}
              {!loadingSucs &&
               filteredSucs.length === 0 && (
                <p className="text-center text-sm text-slate-400">
                  No SUCs found
                </p>
              )}
              {filteredSucs.map((suc,index)=>(
                <label key={index} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition
                    ${
                      selectedSucs.includes(
                        suc.email
                      )
                      ? 
                      "border-indigo-400 bg-indigo-50"
                      :
                      "border-transparent bg-white hover:border-slate-200"
                    }
                  `}
                >
                  <input type="checkbox" checked={
                      selectedSucs.includes(
                        suc.email
                      )
                    }
                    onChange={() =>
                      toggleSUC(
                        suc.email
                      )
                    }
                  />
                  <Users size={18} className="text-slate-400"/>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700">
                      {suc.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {suc.email}
                    </p>
                  </div>
                  {selectedSucs.includes(
                    suc.email
                  ) && (
                    <CheckCircle2 size={18} className="text-indigo-600"/>
                  )}
                </label>
              ))}
                </div>
              </div>
            )}
          </section>
          {/* OFFICES */}
          <section>
            <button
              type="button"
              onClick={() => setShowOffices(open => !open)}
              aria-expanded={showOffices}
              aria-controls="office-recipients"
              className="mb-2 flex w-full items-center justify-between rounded-xl px-1 py-1 text-left hover:bg-slate-50"
            >
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Office Recipients
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-500">
                  {selectedOffices.length} selected
                </span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform ${showOffices ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            {showOffices && (
              <div id="office-recipients">
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3">
              <Search
                size={16}
                className="text-slate-400"
              />
              <input value={officeSearch}
                onChange={(e)=>
                  setOfficeSearch(
                    e.target.value
                  )
                }
                placeholder="Search office..."
                className="flex-1 bg-transparent py-2 text-sm outline-none"
              />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-2xl bg-slate-50 p-3 space-y-2">
              {!loadingOffices &&
               filteredOffices.length === 0 && (
                <p className="text-center text-sm text-slate-400">
                  No offices found
                </p>
              )}
              {filteredOffices.map((office,index)=>(
                <label key={office.email || index} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition
                    ${
                      selectedOffices.includes(
                        office.email
                      )
                      ?
                      "border-indigo-400 bg-indigo-50"
                      :
                      "border-transparent bg-white hover:border-slate-200"
                    }
                  `}
                >
                  <input type="checkbox" checked={
                      selectedOffices.includes(
                        office.email
                      )
                    }
                    onChange={() =>
                      toggleOffice(
                        office.email
                      )
                    }
                  />
                  <Users size={18} className="text-slate-400"/>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700">
                      {office.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {office.email}
                    </p>
                  </div>
                  {selectedOffices.includes(
                    office.email
                  ) && (
                    <CheckCircle2 size={18} className="text-indigo-600"/>
                  )}
                </label>
              ))}
                </div>
              </div>
            )}
          </section>
          {/* SUBJECT */}
          <section>
            <Label>
              Subject
            </Label>
            <input
              value={data.subject}
              onChange={(e)=>
                setData(prev=>({
                  ...prev,
                  subject:e.target.value
                }))
              } className="input-style"
            />
          </section>
          {/* CC */}
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 px-5 py-4">
            <input type="checkbox" checked={
                data.includeOriginalCc
              }
              onChange={(e)=>
                setData(prev=>({
                  ...prev,
                  includeOriginalCc:
                  e.target.checked
                }))
              }
            />
            <span className="text-sm font-semibold text-slate-700">
              Include original CC recipients
            </span>
          </label>
        </div>
        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-8 py-5 bg-white ">
          <button onClick={handleClose} className=" rounded-xl px-6 py-3 text-xs font-black uppercase hover:bg-red-400">
            Cancel
          </button>
          <button onClick={handleForward} disabled={isForwarding} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-black uppercase text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50">
            <Send size={16}/>
            {
              isForwarding
              ? "Forwarding..."
              : "Forward"
            }
          </button>
        </div>
      </div>
    </div>
  );
}
function Label({children}) {

  return (

    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
      {children}
    </label>
  );
}
