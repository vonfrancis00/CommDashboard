import { Component, lazy, Suspense, useEffect, useState } from "react";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";

const CommTrackDashboard = lazy(() => import("./components/CommTrackDashboard"));
const Email = lazy(() => import("./components/Email"));
const Replies = lazy(() => import("./components/Replies"));
const UploadCommunication = lazy(() => import("./components/UploadCommunication"));
const Report = lazy(() => import("./components/Report"));

function getActiveSession() {
  try {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (
      !savedUser ||
      !savedUser.authToken ||
      savedUser.loginDate !== new Date().toDateString()
    ) {
      localStorage.removeItem("user");
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem("user");
    return false;
  }
}

function ViewLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-label="Loading page">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
    </div>
  );
}

class ViewErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
          <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-950">This page could not be displayed</h1>
            <p className="mt-2 text-sm text-slate-500">Reload the page and try again.</p>
            <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{this.state.error?.message}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800">Reload page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {

  const [loggedIn, setLoggedIn] = useState(getActiveSession);

  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  useEffect(() => {
    if (!loggedIn) return undefined;
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const timer = window.setTimeout(() => {
      localStorage.removeItem("user");
      setLoggedIn(false);
    }, nextMidnight.getTime() - now.getTime());
    return () => window.clearTimeout(timer);
  }, [loggedIn]);

  useEffect(() => {
    const expireSession = () => setLoggedIn(false);
    window.addEventListener("commtrack:session-expired", expireSession);
    return () => window.removeEventListener("commtrack:session-expired", expireSession);
  }, []);



  const renderView = () => {
    switch (activeView) {

      case "dashboard":
        return <CommTrackDashboard />;

      case "create":
        return <Email setActiveView={setActiveView} />;

      case "upload":
        return <UploadCommunication />;

      case "replies":
        return <Replies setActiveView={setActiveView} />;

      case "reports":
      case "report":
        return <Report />;

      default:
        return <CommTrackDashboard />;
    }
  };


  if (!loggedIn) {
    return (
      <Login
        onLogin={() => setLoggedIn(true)}
      />
    );
  }


  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-slate-50">

      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />


      <main className={`min-h-screen w-full flex-1 pt-17 transition-[padding] duration-300 ease-in-out md:pt-0 ${sidebarCollapsed ? "md:pl-[88px]" : "md:pl-[280px]"}`}>

        <ViewErrorBoundary resetKey={activeView}>
          <Suspense fallback={<ViewLoading />}>
            {renderView()}
          </Suspense>
        </ViewErrorBoundary>

      </main>


    </div>
  );
}
