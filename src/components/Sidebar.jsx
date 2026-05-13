import React from "react";
import { Activity, LayoutDashboard, Send, Upload, ReplyAll } from "lucide-react";

export default function Sidebar({ activeView, setActiveView }) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "create", label: "Create Email", icon: Send },
    { id: "upload", label: "Upload Communication", icon: Upload },
    { id: "replies", label: "Replies & Forward", icon: ReplyAll },
  ];

  return (
    <aside 
      className="fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-white/95 backdrop-blur-sm p-4 transition-all duration-300 ease-in-out 
                 w-20 hover:w-72 group shadow-2xl shadow-slate-200/50"
    >
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
          <Activity className="h-6 w-6" />
        </div>
        <span className="text-xl font-black tracking-tight text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          CommHub
        </span>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-sm font-bold transition-all ${
              activeView === item.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Status indicator */}
      <div className="mt-auto rounded-2xl bg-slate-50 p-4 border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap uppercase tracking-widest">
            System Live
          </span>
        </div>
      </div>
    </aside>
  );
}