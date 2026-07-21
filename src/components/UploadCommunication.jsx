import { useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Send,
  Loader2,
  CalendarDays,
  Tag,
  Users,
  Layers,
  RefreshCw
} from "lucide-react";

export default function UploadCommunication() {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    communicationType: "Memorandum",
    recipients: "",
    dateReceived: "",
    remarks: "",
  });

  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const totalSize = useMemo(() => {
    return files.reduce((sum, file) => sum + file.size, 0);
  }, [files]);

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addFiles = (incomingFiles) => {
    const validFiles = Array.from(incomingFiles || []);
    if (!validFiles.length) return;

    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const next = [...prev];

      validFiles.forEach((file) => {
        const key = `${file.name}-${file.size}`;
        if (!existing.has(key)) {
          next.push(file);
          existing.add(key);
        }
      });

      return next;
    });
  };

  const handleFileInput = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const resetForm = () => {
    setForm({
      title: "",
      communicationType: "Memorandum",
      recipients: "",
      dateReceived: "",
      remarks: "",
    });
    setFiles([]);
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setMessage({
        type: "success",
        text: "Communication logged and archived successfully.",
      });
      resetForm();
    } catch {
      setMessage({
        type: "error",
        text: "System encountered an error during submission. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800 antialiased">
        
        {/* Header Block with subtle badge */}
        <header className="relative overflow-hidden bg-[#071d49] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="relative mx-auto flex max-w-[1600px] items-start gap-4">
            <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg backdrop-blur-sm">
              <UploadCloud className="h-6 w-6 text-sky-300" />
            </div>
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300">
                <Layers className="h-3.5 w-3.5" /> Document registry
              </div>
              <h1 className="text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">
                Upload communication
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/65">
                Log organizational records, attach verified digital assets, and establish tracking routes across department networks.
              </p>
            </div>
          </div>
        </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <form onSubmit={handleSubmit} className="grid items-start gap-6 xl:grid-cols-2">
          
          {/* Section 1: Metadata Fields */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,.06)] sm:p-6">
            
            <div className="mb-5 flex items-center gap-2">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                Communication parameters
              </h2>
            </div>
            
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g., FY2026 Q3 Budget Allocation Framework"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 transition placeholder:text-slate-400/80 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Classification Type
                </label>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    name="communicationType"
                    value={form.communicationType}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-8 text-sm text-slate-900 transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option>Memorandum</option>
                    <option>Official Letter</option>
                    <option>Electronic Mail</option>
                    <option>Public Notice</option>
                    <option>Other / Unclassified</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 border-l border-slate-200 pl-2 text-slate-400 flex items-center">
                    ▼
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Date Effective / Received <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    name="dateReceived"
                    required
                    value={form.dateReceived}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-900 transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Intended Recipients / Department Stakeholders
                </label>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="recipients"
                    value={form.recipients}
                    onChange={handleChange}
                    placeholder="e.g., Executive Board, HR Department"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm text-slate-900 transition placeholder:text-slate-400/80 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Internal Remarks & Routing Notes
                </label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Provide brief context, cross-references, or tracking instructions..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 transition placeholder:text-slate-400/80 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* Section 2: File Attachments */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,.06)] sm:p-6">
            
            <div className="mb-5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                Supporting documentation
              </h2>
            </div>

            <div
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleDrop}
              onClick={openFilePicker}
              className={`group relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />

              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200/60 shadow-sm transition group-hover:scale-105">
                <UploadCloud className="h-5 w-5 text-blue-700" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Drag and drop records here, or <span className="text-blue-700 group-hover:underline">browse files</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Accepts verified PDF, DOCX, XLSX documents, or standard media archives
              </p>
            </div>

            {/* Managed File Inventory List */}
            {files.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                    <span>Attached Assets ({files.length})</span>
                  </div>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                    Total Payload Size: {formatBytes(totalSize)}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200/80 bg-white shadow-sm">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between p-3.5 transition hover:bg-slate-50/60"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-400 font-medium">{formatBytes(file.size)}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="rounded-md border border-slate-200/60 bg-white p-1.5 text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        aria-label={`Remove file ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Toast/Notification Alerts */}
          {message && (
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 text-sm shadow-sm xl:col-span-2 ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <p className="font-semibold">{message.text}</p>
            </div>
          )}

          {/* Execution Footers */}
          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200/80 pt-6 sm:flex-row sm:justify-end xl:col-span-2">
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Entry Form
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Record...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Commit to Registry
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
