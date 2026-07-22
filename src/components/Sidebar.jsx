import { useEffect, useState } from "react";
import {
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  FileBarChart,
  ReplyAll,
  Send,
  Upload,
  X,
} from "lucide-react";

const menuItems = [
  { id: "dashboard", label: "Dashboard", description: "Overview & activity", icon: LayoutDashboard },
  { id: "replies", label: "Replies & Forwards", description: "Track responses", icon: ReplyAll },
  { id: "create", label: "Create email", description: "Compose a message", icon: Send },
  { id: "upload", label: "Upload record", description: "Add communication", icon: Upload },
  { id: "reports", label: "Reports", description: "Insights & exports", icon: FileBarChart },
];

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

export default function Sidebar({ activeView, setActiveView, collapsed, setCollapsed }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const user = getUser();
  const userName = user.name || user.fullName || "CommTrack User";
  const userEmail = user.email || "Authorized account";

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setShowLogoutModal(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const selectView = (id) => {
    setActiveView(id);
    setMobileOpen(false);
  };

  const logout = () => {
    localStorage.removeItem("user");
    window.location.reload();
  };

  const sidebarContent = (isMobile = false) => (
    <>
      <div className={`flex h-24 items-center border-b border-white/10 ${collapsed && !isMobile ? "justify-center px-3" : "px-5"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,.2)]">
            <img src="/logo-dtms.png" alt="CommTrack" className="h-9 w-9 object-contain" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-tight text-white">CommTrack</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">OCDRA III</p>
            </div>
          )}
        </div>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="ml-auto rounded-xl p-2 text-blue-100 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300">
            <X size={20} />
          </button>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto py-6 ${collapsed && !isMobile ? "px-3" : "px-4"}`}>
        {(!collapsed || isMobile) && <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300/60">Workspace</p>}
        <nav aria-label="Main navigation" className="space-y-2">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => selectView(item.id)}
                title={collapsed && !isMobile ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex w-full items-center rounded-2xl text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-[#081d46] ${
                  collapsed && !isMobile ? "h-13 justify-center" : "min-h-15 gap-3 px-3 py-2.5"
                } ${isActive ? "bg-white text-blue-950 shadow-[0_10px_30px_rgba(0,0,0,.18)]" : "text-blue-100/75 hover:bg-white/[0.08] hover:text-white"}`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${isActive ? "bg-blue-50 text-blue-700" : "bg-white/[0.06] text-blue-200 group-hover:bg-white/10 group-hover:text-sky-300"}`}>
                  <Icon size={20} strokeWidth={2} />
                </span>
                {(!collapsed || isMobile) && (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className={`mt-0.5 block truncate text-[11px] ${isActive ? "text-slate-500" : "text-blue-200/50"}`}>{item.description}</span>
                  </span>
                )}
                {isActive && (!collapsed || isMobile) && <ChevronLeft className="rotate-180 text-blue-600" size={16} />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className={`border-t border-white/10 ${collapsed && !isMobile ? "p-3" : "p-4"}`}>
        {(!collapsed || isMobile) && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400 text-sm font-bold text-blue-950">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="truncate text-[11px] text-blue-200/55">{userEmail}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowLogoutModal(true)}
          title={collapsed && !isMobile ? "Log out" : undefined}
          className={`flex w-full items-center rounded-xl text-sm font-semibold text-blue-100/70 transition hover:bg-rose-400/10 hover:text-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-300 ${collapsed && !isMobile ? "h-11 justify-center" : "gap-3 px-3 py-2.5"}`}
        >
          <LogOut size={19} />
          {(!collapsed || isMobile) && <span>Log out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-17 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl md:hidden">
        <button onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="rounded-xl border border-slate-200 p-2.5 text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600">
          <Menu size={21} />
        </button>
        <img src="/logo-dtms.png" alt="CommTrack" className="ml-3 h-10 w-10 object-contain" />
        <div className="ml-2">
          <p className="text-sm font-bold text-slate-950">CommTrack</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-700">OCDRA III</p>
        </div>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-[#081d46] shadow-[12px_0_35px_rgba(15,23,42,.12)] transition-[width] duration-300 md:flex ${collapsed ? "w-[88px]" : "w-[280px]"}`}>
        {sidebarContent()}
        <button
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-0 top-[108px] flex h-7 w-7 translate-x-0 items-center justify-center rounded-l-lg border border-r-0 border-white/10 bg-[#102b5d] text-blue-200 transition hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-[min(86vw,320px)] flex-col overflow-hidden bg-[#081d46] shadow-2xl">{sidebarContent(true)}</aside>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="logout-title" onMouseDown={(event) => event.target === event.currentTarget && setShowLogoutModal(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><LogOut size={22} /></div>
            <h2 id="logout-title" className="mt-5 text-xl font-bold tracking-tight text-slate-950">Log out of CommTrack?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">You’ll need to sign in again to access the communication workspace.</p>
            <div className="mt-7 flex justify-end gap-3">
              <button autoFocus onClick={() => setShowLogoutModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">Cancel</button>
              <button onClick={logout} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2">Log out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
