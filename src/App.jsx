import React, { useState } from "react";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import CommTrackDashboard from "./components/CommTrackDashboard";
import Email from "./components/Email";
import Replies from "./components/Replies";
import UploadCommunication from "./components/UploadCommunication";

export default function App() {

  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("user")
  );

  const [activeView, setActiveView] = useState("dashboard");

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

      default:
        return <CommTrackDashboard />;
    }
  };

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-slate-50">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <main className="min-h-screen w-full flex-1 pl-20 transition-all duration-300 ease-in-out">
        {renderView()}
      </main>
    </div>
  );
}