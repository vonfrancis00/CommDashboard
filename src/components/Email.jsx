import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Info,
  Mail,
  Paperclip,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { request } from "../services/api";

const emptyModal = { open: false, type: "success", message: "" };

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function StatusModal({ modal, onClose, onSuccess }) {
  if (!modal.open) return null;

  const isSuccess = modal.type === "success";
  const closeModal = () => {
    onClose();
    if (isSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-5 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white p-7 text-center shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="status-title" aria-describedby="status-message">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${isSuccess ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
          {isSuccess ? <CheckCircle2 size={29} /> : <AlertCircle size={29} />}
        </div>
        <h2 id="status-title" className="mt-5 text-xl font-bold text-slate-950">
          {isSuccess ? "Message sent" : "Unable to send"}
        </h2>
        <p id="status-message" className="mt-2 text-sm leading-6 text-slate-500">{modal.message}</p>
        <button type="button" onClick={closeModal} autoFocus className="mt-6 h-11 w-full rounded-xl bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200">
          {isSuccess ? "Return to dashboard" : "Review message"}
        </button>
      </div>
    </div>
  );
}

export default function Email({ setActiveView }) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [modal, setModal] = useState(emptyModal);

  const hasDraft = Boolean(to || cc || subject || message || attachments.length);

  const resetComposer = () => {
    setTo("");
    setCc("");
    setSubject("");
    setMessage("");
    setAttachments([]);
  };

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    setAttachments((current) => [...current, ...files]);
    event.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const data = typeof reader.result === "string" ? reader.result.split(",")[1] : "";
        resolve({ name: file.name, type: file.type || "application/octet-stream", data });
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handleSend = async (event) => {
    event.preventDefault();

    if (!to.trim() || !subject.trim() || !message.trim()) {
      setModal({ open: true, type: "error", message: "Complete the recipient, subject, and message fields before sending." });
      return;
    }

    try {
      setSending(true);
      const attachmentData = await Promise.all(attachments.map(fileToBase64));
      const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
      const fullHtmlMessage = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">${safeMessage}</div>`;

      await request("sendEmail", "POST", {
        to: to.trim(),
        cc: cc.trim(),
        subject: subject.trim(),
        message: fullHtmlMessage,
        attachments: attachmentData,
      });

      resetComposer();
      setModal({ open: true, type: "success", message: "Your correspondence was delivered successfully." });
    } catch (error) {
      setModal({ open: true, type: "error", message: error.message || "An unexpected error occurred. Please try again." });
    } finally {
      setSending(false);
    }
  };

  const handleDiscard = () => {
    if (!hasDraft || window.confirm("Discard this draft? This action cannot be undone.")) resetComposer();
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <StatusModal modal={modal} onClose={() => setModal(emptyModal)} onSuccess={() => setActiveView("dashboard")} />

      <header className="relative overflow-hidden bg-[#071d49] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative mx-auto flex max-w-[1600px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg backdrop-blur-sm">
              <Mail size={22} className="text-sky-300" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300">Official communication</p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl">Compose message</h1>
              <p className="mt-2 text-sm text-blue-100/65">Prepare and send official correspondence securely.</p>
            </div>
          </div>

          <button type="button" onClick={() => setActiveView("dashboard")} className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-sky-300 sm:self-auto">
            <ArrowLeft size={17} /> Back to dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <form onSubmit={handleSend} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,.06)]">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Message details</p>
                <p className="mt-1 text-sm text-slate-500">Add recipients and a clear subject line.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="email-to" className="text-sm font-semibold text-slate-700">To <span className="text-red-500">*</span></label>
                  <div className="relative mt-2">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input id="email-to" type="text" value={to} onChange={(event) => setTo(event.target.value)} placeholder="recipient@agency.gov.ph" autoComplete="off" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">Separate multiple addresses with commas.</p>
                </div>

                <div>
                  <label htmlFor="email-cc" className="text-sm font-semibold text-slate-700">Cc <span className="font-normal text-slate-400">(optional)</span></label>
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input id="email-cc" type="text" value={cc} onChange={(event) => setCc(event.target.value)} placeholder="copy@agency.gov.ph" autoComplete="off" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">Recipients receive a visible copy.</p>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="email-subject" className="text-sm font-semibold text-slate-700">Subject <span className="text-red-500">*</span></label>
                <input id="email-subject" type="text" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Enter a clear and concise subject" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>

            <div className="px-5 py-6 sm:px-7">
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="email-message" className="text-sm font-semibold text-slate-700">Message <span className="text-red-500">*</span></label>
                <span className="text-xs tabular-nums text-slate-400">{message.length.toLocaleString()} characters</span>
              </div>
              <textarea id="email-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your message here..." rows={13} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100" />

              <div className="mt-5 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Paperclip size={18} /></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Attachments</p>
                      <p className="text-xs text-slate-400">Add supporting files to this message.</p>
                    </div>
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 focus-within:ring-4 focus-within:ring-blue-100">
                    Choose files
                    <input type="file" multiple className="sr-only" onChange={handleAttachmentChange} />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <ul className="mt-4 grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
                    {attachments.map((file, index) => (
                      <li key={`${file.name}-${file.lastModified}-${index}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                        <FileText size={18} className="shrink-0 text-blue-600" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-700">{file.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                        <button type="button" onClick={() => removeAttachment(index)} aria-label={`Remove ${file.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"><X size={16} /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <button type="button" onClick={handleDiscard} disabled={!hasDraft || sending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={17} /> Discard draft</button>
              <button type="submit" disabled={sending} className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-65">
                {sending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Sending...</> : <><Send size={17} /> Send message</>}
              </button>
            </footer>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-8">
            <div className="overflow-hidden rounded-2xl bg-[#0b2554] p-5 text-white shadow-[0_10px_30px_rgba(7,29,73,.15)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"><ShieldCheck size={19} /></div>
                <div><p className="text-sm font-semibold text-white">Secure delivery</p><p className="text-xs text-blue-200/55">Authorized system</p></div>
              </div>
              <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-xs leading-5 text-blue-100/65">
                <p>Review recipient addresses and attachments carefully before sending.</p>
                <p>Messages sent through this portal may be retained for official records.</p>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
              <Info size={17} className="mt-0.5 shrink-0" />
              <p>Required fields are marked with an asterisk. Your message is sent as formatted plain text.</p>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
