import React from "react";
import { Activity, LayoutDashboard, Send, Upload, ReplyAll, Settings, ChevronRight } from "lucide-react";

export default function Sidebar({ activeView, setActiveView }) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "replies", label: "Replies & Forward", icon: ReplyAll },
    { id: "create", label: "Create Email", icon: Send },
    { id: "upload", label: "Upload Communication", icon: Upload },
  ];

  return (
    <aside 
      className="fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200/60 bg-white/80 backdrop-blur-xl p-3 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] 
                 w-20 hover:w-72 group shadow-[20px_0_30px_-15px_rgba(0,0,0,0.05)]"
    >
      {/* Logo Section */}
      <div className="mb-8 flex items-center px-2 py-4">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-200">
          <Activity className="h-6 w-6" />
          <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </div>
        <div className="ml-4 flex flex-col opacity-0 group-hover:opacity-100 transition-all duration-300">
          <span className="text-lg font-black leading-none tracking-tight text-slate-900">
            CommHub
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
            OCDRA III
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-2">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative flex w-full items-center gap-4 rounded-xl p-3 text-sm font-semibold transition-all duration-200 group/item
                ${isActive 
                  ? "bg-indigo-50 text-indigo-600" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute left-0 h-6 w-1 rounded-r-full bg-indigo-600" />
              )}
              
              <item.icon className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover/item:scale-110"}`} />
              
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                {item.label}
              </span>

              {/* Tooltip (only visible when sidebar is small) */}
              {!isActive && (
                <div className="absolute left-16 hidden rounded-md bg-slate-900 px-2 py-1 text-xs text-white group-hover:block group-hover:group-hover:hidden">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions & Status */}
      <div className="mt-auto space-y-4 px-2 pb-4">
        <button className="flex w-full items-center gap-4 rounded-xl p-3 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900">
          <Settings className="h-5 w-5 shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Settings</span>
        </button>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-2 transition-all duration-300 group-hover:p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                Network Status
              </span>
              <span className="text-xs font-bold text-emerald-600">Operational</span>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100" />
          </div>
        </div>
      </div>
    </aside>
  );
}