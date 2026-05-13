import React, { useState } from "react";
import {
  Send,
  Paperclip,
  X,
  User,
  AtSign,
  Sparkles,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Helper for escaping HTML
const escapeHtml = (str = "") =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// --- Status Modal Component ---
const StatusModal = ({ isOpen, type, message, onClose }) => {
  if (!isOpen) return null;
  const isSuccess = type === "success";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm animate-in fade-in zoom-in duration-200 rounded-[2rem] bg-white p-8 shadow-2xl text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isSuccess ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          {isSuccess ? (
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          ) : (
            <AlertCircle className="h-10 w-10 text-rose-500" />
          )}
        </div>
        <h3 className="text-xl font-black text-slate-900">{isSuccess ? "Success!" : "Action Required"}</h3>
        <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition-transform active:scale-95"
        >
          {isSuccess ? "Awesome" : "Try Again"}
        </button>
      </div>
    </div>
  );
};

export default function Email({ setActiveView }) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  
  const [modal, setModal] = useState({ open: false, type: "success", message: "" });

  const showStatus = (type, message) => setModal({ open: true, type, message });

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = typeof result === "string" ? result.split(",")[1] : "";
        resolve({ name: file.name, type: file.type || "application/octet-stream", data: base64 });
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    try {
      if (!to.trim() || !subject.trim() || !message.trim()) {
        showStatus("error", "Please fill in the Recipient, Subject, and Message fields to continue.");
        return;
      }

      setSending(true);
      const attachmentData = await Promise.all(attachments.map((file) => fileToBase64(file)));
      
      const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
      const fullHtmlMessage = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">${safeMessage}</div>`;

      const response = await fetch(import.meta.env.VITE_EMAIL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ to, cc, subject, message: fullHtmlMessage, attachments: attachmentData }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to send email.");

      showStatus("success", "Your email has been dispatched successfully.");
      setTo(""); setCc(""); setSubject(""); setMessage(""); setAttachments([]);
    } catch (error) {
      showStatus("error", error.message || "An unexpected error occurred.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-[1000px] px-8 py-12">
      <StatusModal 
        isOpen={modal.open} 
        type={modal.type} 
        message={modal.message} 
        onClose={() => setModal({ ...modal, open: false })} 
      />

      {/* Header */}
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-600/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-600">
            <Sparkles className="h-3.5 w-3.5" />
            Secure Communication
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            New <span className="font-bold italic text-slate-400">Correspondence</span>
          </h1>
        </div>
        <button
          onClick={() => setActiveView("dashboard")}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit Composer
        </button>
      </div>

      {/* Form Section */}
      <div className="grid gap-8 grid-cols-1">
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/40">
          <div className="border-b border-slate-100 bg-slate-50/50 p-8">
            <h2 className="text-xl font-black text-slate-900">Message Details</h2>
          </div>

          <div className="space-y-5 p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Recipient</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@email.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">CC</label>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@email.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white" />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white" />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Body</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Compose your message..." rows={12}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white" />
            </div>

            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Paperclip className="h-4 w-4 text-indigo-500" /> Attachments
                </span>
                <label className="cursor-pointer rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold shadow-sm hover:bg-slate-50">
                  Upload Files
                  <input type="file" multiple className="hidden" onChange={handleAttachmentChange} />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                    {file.name}
                    <button onClick={() => removeAttachment(i)}><X className="h-3 w-3 text-rose-500" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSend} disabled={sending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-bold text-white shadow-xl hover:bg-indigo-600 disabled:opacity-50 transition-all">
                <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Message"}
              </button>
              <button onClick={() => {setTo(""); setCc(""); setSubject(""); setMessage(""); setAttachments([]);}}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">
                <Save className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}