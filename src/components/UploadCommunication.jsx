import React, { useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Plus,
  Send,
  Loader2,
  CalendarDays,
  Tag,
  Users,
  Sparkles,
  ShieldCheck,
  Inbox,
  FileUp,
  Layers3,
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
        text: "Communication uploaded successfully.",
      });

      resetForm();
    } catch (err) {
      setMessage({
        type: "error",
        text: "Upload failed. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0e7ff_0%,_#f8fafc_35%,_#eef2f7_100%)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-2xl shadow-slate-200/60 backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                <Sparkles className="h-4 w-4" />
                Communication Upload
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Upload and organize communications
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500 md:text-base">
                Save incoming or outgoing communications, attach supporting files, and keep
                every record ready for tracking, review, and retrieval.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[480px]">
              <MiniStat icon={<Inbox className="h-4 w-4" />} label="Mode" value="Ready" />
              <MiniStat icon={<ShieldCheck className="h-4 w-4" />} label="Status" value="Secure" />
              <MiniStat icon={<FileUp className="h-4 w-4" />} label="Files" value={String(files.length)} />
              <MiniStat icon={<Layers3 className="h-4 w-4" />} label="Type" value={form.communicationType || "—"} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-200/60"
          >
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Communication Details</h2>
                <p className="text-sm text-slate-500">Fill in the fields below to save a new record.</p>
              </div>
              <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 md:block">
                Required fields first
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter communication title"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Communication Type
                </label>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    name="communicationType"
                    value={form.communicationType}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-10 py-3.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  >
                    <option>Memorandum</option>
                    <option>Letter</option>
                    <option>Email</option>
                    <option>Notice</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Date Received
                </label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    name="dateReceived"
                    value={form.dateReceived}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-10 py-3.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Recipients
                </label>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="recipients"
                    value={form.recipients}
                    onChange={handleChange}
                    placeholder="Enter recipient names or office"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-10 py-3.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Add notes, summary, routing details, or internal remarks"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="mt-6">
              <div
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleDrop}
                onClick={openFilePicker}
                className={`group cursor-pointer rounded-[2rem] border-2 border-dashed p-8 text-center transition-all ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50 shadow-inner"
                    : "border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-100 transition group-hover:scale-105">
                  <UploadCloud className="h-8 w-8 text-indigo-600" />
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  Drag and drop files here
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  PDF, Word, image, or other supporting files can be attached.
                  Click anywhere in this box to browse.
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition group-hover:bg-indigo-700">
                  <Plus className="h-4 w-4" />
                  Browse files
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-4 md:p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Paperclip className="h-4 w-4" />
                    Attached Files
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    {files.length} file{files.length > 1 ? "s" : ""} • {formatBytes(totalSize)}
                  </div>
                </div>

                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
                          <FileText className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {message && (
              <div
                className={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Save Communication
                  </>
                )}
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
                <Sparkles className="h-4 w-4" />
                Upload Guide
              </div>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                Keep records neat and searchable
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use short titles, include the right office or recipient, and attach all
                relevant supporting files in one upload.
              </p>

              <div className="mt-5 grid gap-3">
                <InfoChip title="Title" text="Use a descriptive document name." />
                <InfoChip title="Attachments" text="Upload signed copies or reference files." />
                <InfoChip title="Remarks" text="Add routing notes or follow-up details." />
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-2xl shadow-indigo-200/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-100">
                <ShieldCheck className="h-4 w-4" />
                Tip
              </div>
              <h3 className="mt-3 text-xl font-black tracking-tight">
                Make the upload process faster
              </h3>
              <p className="mt-3 text-sm leading-6 text-indigo-50">
                Add a generated reference number after saving so you can search, sort,
                and track each record more easily later.
              </p>

              <div className="mt-6 rounded-2xl bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">
                  <FileUp className="h-4 w-4" />
                  Recommended
                </div>
                <p className="mt-2 text-sm text-indigo-50">
                  Connect the submit action to your backend, Apps Script, or database save function.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
        {icon}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function InfoChip({ title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-500">{text}</div>
    </div>
  );
}