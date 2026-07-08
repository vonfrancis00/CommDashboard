import React, { useState } from "react";
import {
  Send,
  Paperclip,
  X,
  User,
  AtSign,
  Sparkles,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm scale-100 animate-in zoom-in-95 duration-200 rounded-[2rem] bg-white p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] text-center border border-slate-100">
        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl rotate-3 transition-transform hover:rotate-0 ${isSuccess ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'}`}>
          {isSuccess ? <CheckCircle2 className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{isSuccess ? "Sent Successfully" : "Action Required"}</h3>
        <p className="mt-3 text-sm font-medium text-slate-500 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className={`mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white tracking-wide transition-all active:scale-[0.98] ${
            isSuccess ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          {isSuccess ? "Perfect" : "Review Fields"}
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

  const handleClear = () => {
    if (window.confirm("Are you sure you want to discard this draft?")) {
      setTo(""); setCc(""); setSubject(""); setMessage(""); setAttachments([]);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100/50 mx-auto max-w-5xl px-4 py-12 sm:px-8">
      
      {/* Background Decorative Blob */}
      <div className="absolute top-0 right-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="absolute bottom-10 left-1/4 -z-10 h-96 w-96 rounded-full bg-purple-200/20 blur-3xl" />

      {/* Header */}
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-900 px-4 py-1 text-[11px] font-black uppercase tracking-widest text-white shadow-md shadow-blue-500/20">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Secure Terminal
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            New <span className="bg-blue-900 bg-clip-text text-transparent">Correspondence</span>
          </h1>
        </div>
        
        <button
          onClick={() => setActiveView("dashboard")}
          className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:shadow-md active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
          Exit Composer
        </button>
      </div>

      {/* Main Glassmorphic Panel */}
      <div className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 backdrop-blur-md shadow-[0_32px_64px_-16px_rgba(15,23,42,0.08)]">
        
        {/* Input Fields Stack */}
        <div className="p-8 pb-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            
            {/* Recipient Field */}
            <div className="group relative rounded-2xl border border-slate-200/60 bg-white px-4 py-2.5 shadow-sm transition-all focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500/80">Recipient</label>
              <div className="mt-1 flex items-center gap-2.5">
                <User className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <input 
                  type="email" 
                  value={to} 
                  onChange={(e) => setTo(e.target.value)} 
                  placeholder="name@company.com"
                  className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400" 
                />
              </div>
            </div>

            {/* CC Field */}
            <div className="group relative rounded-2xl border border-slate-200/60 bg-white px-4 py-2.5 shadow-sm transition-all focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Carbon Copy</label>
              <div className="mt-1 flex items-center gap-2.5">
                <AtSign className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Optional copies"
                  autoComplete="off"
                  name="cc-disabled-autofill"
                  className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

          </div>

          {/* Subject Field */}
          <div className="group relative rounded-2xl border border-slate-200/60 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Subject Thread</label>
            <input 
              type="text" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              placeholder="What is this correspondence regarding?"
              className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400" 
            />
          </div>
        </div>

        {/* Rich Body Text Area */}
        <div className="px-8 pb-8">
          <div className="rounded-3xl border border-slate-200/60 bg-white p-4 shadow-inner focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Begin typing message content here..." 
              rows={13}
              className="w-full resize-y bg-transparent p-2 text-sm font-medium leading-relaxed text-slate-800 outline-none placeholder:text-slate-400" 
            />

            {/* Elevated Dynamic Attachments Area */}
            <div className="mt-4 rounded-2xl bg-slate-50/80 p-4 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <Paperclip className="h-4 w-4 text-indigo-500" /> 
                  Files attached {attachments.length > 0 && <span className="ml-1 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-black text-indigo-600">{attachments.length}</span>}
                </span>
                
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white border border-slate-200/80 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300">
                  Add Asset
                  <input type="file" multiple className="hidden" onChange={handleAttachmentChange} />
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/40 pt-3">
                  {attachments.map((file, i) => (
                    <div key={i} className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white pl-3 pr-2 py-1.5 text-xs font-bold text-slate-600 shadow-sm animate-in fade-in zoom-in-95 duration-150">
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <button 
                        onClick={() => removeAttachment(i)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            
            <button 
              onClick={handleClear}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              Discard Draft
            </button>

            <button 
              onClick={handleSend} 
              disabled={sending}
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-950/20 transition-all hover:from-indigo-600 hover:to-indigo-700 hover:shadow-indigo-600/30 disabled:opacity-50 active:scale-[0.98]"
            >
              <Send className={`h-4 w-4 ${sending ? "animate-bounce" : ""}`} /> 
              {sending ? "Dispatched Transmission..." : "Send Correspondence"}
            </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}