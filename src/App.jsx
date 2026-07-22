import { Component, useState, useEffect } from "react";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import CommTrackDashboard from "./components/CommTrackDashboard";
import Email from "./components/Email";
import Replies from "./components/Replies";
import UploadCommunication from "./components/UploadCommunication";
import Report from "./components/Report";

class ReportErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
          <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-950">Reports could not be displayed</h1>
            <p className="mt-2 text-sm text-slate-500">Refresh the page and try again. If the problem continues, the report data may be unavailable.</p>
            <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {

  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("user")
  );

  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  // ================================
  // AUTO LOGOUT EVERY 12:00 MIDNIGHT
  // ================================
  useEffect(() => {

    const logoutAtMidnight = () => {
      const now = new Date();

      if (
        now.getHours() === 0 &&
        now.getMinutes() === 0
      ) {
        localStorage.removeItem("user");

        setLoggedIn(false);

        console.log("Session expired. Logged out.");
      }
    };


    // check every 30 seconds
    const timer = setInterval(
      logoutAtMidnight,
      30000
    );


    return () => clearInterval(timer);

  }, []);



  // ====================================
  // CHECK IF USER WAS LOGGED IN YESTERDAY
  // ====================================
  useEffect(() => {

    const savedUser = JSON.parse(
      localStorage.getItem("user")
    );


    if (!savedUser) return;


    const today =
      new Date().toDateString();


    if (savedUser.loginDate !== today) {

      localStorage.removeItem("user");

      setLoggedIn(false);

    }


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
        return <ReportErrorBoundary><Report /></ReportErrorBoundary>;

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

        {renderView()}

      </main>


    </div>
  );
}
