import React, { useState, useEffect } from "react";

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
      />


      <main className="min-h-screen w-full flex-1 pl-20 transition-all duration-300 ease-in-out">

        {renderView()}

      </main>


    </div>
  );
}