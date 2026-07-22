import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const CHECK_INTERVAL_MS = 30_000;

export default function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkForUpdate = useCallback(async () => {
    if (!import.meta.env.PROD || updateAvailable) return;

    try {
      const versionUrl = new URL(
        `${import.meta.env.BASE_URL}version.json`,
        window.location.origin,
      );
      versionUrl.searchParams.set("t", Date.now().toString());

      const response = await fetch(versionUrl, { cache: "no-store" });
      if (!response.ok) return;

      const { version } = await response.json();
      if (version && version !== import.meta.env.VITE_APP_VERSION) {
        setUpdateAvailable(true);
      }
    } catch {
      // A temporary network failure should not interrupt the dashboard.
    }
  }, [updateAvailable]);

  useEffect(() => {
    const initialCheck = window.setTimeout(checkForUpdate, 0);
    const timer = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("online", checkForUpdate);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
    };
  }, [checkForUpdate]);

  if (!updateAvailable) return null;

  return (
    <div className="fixed left-1/2 top-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl shadow-slate-900/20">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <RefreshCw size={20} />
        </div>
        <div>
          <p className="font-bold text-slate-900">New version available</p>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            An updated version of CommTrack is ready.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200"
      >
        Apply update
      </button>
    </div>
  );
}
