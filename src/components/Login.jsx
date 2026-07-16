import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { login } from "../services/api";

const initialForm = { username: "", password: "" };

function getSavedUser() {
  try {
    const saved = JSON.parse(localStorage.getItem("lastLogin"));
    return saved?.email && saved?.name ? saved : null;
  } catch {
    localStorage.removeItem("lastLogin");
    return null;
  }
}

export default function Login({ onLogin }) {
  const [lastUser, setLastUser] = useState(getSavedUser);
  const [form, setForm] = useState(() =>
    lastUser ? { username: lastUser.email, password: "" } : initialForm,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [continueMode, setContinueMode] = useState(Boolean(lastUser));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const useAnotherAccount = () => {
    setContinueMode(false);
    setLastUser(null);
    setForm(initialForm);
    setError("");
    localStorage.removeItem("lastLogin");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const result = await login(form.username.trim(), form.password);

      if (!result.success) {
        setError(result.message || "The email or password you entered is incorrect.");
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify({ ...result, loginDate: new Date().toDateString() }),
      );
      localStorage.setItem(
        "lastLogin",
        JSON.stringify({ id: result.id, email: result.email, name: result.name }),
      );

      onLogin();
    } catch (err) {
      setError(err.message || "We couldn't sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f7fb] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#071d49] px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-16">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute -right-32 -top-24 h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <ShieldCheck size={22} className="text-sky-300" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">Official Communication System</p>
            <p className="text-xs text-blue-200/70">Secure access portal</p>
          </div>
        </div>

        <div className="relative max-w-2xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
            Communication Monitoring & Tracking System
          </div>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.08] tracking-[-0.035em] xl:text-6xl">
            Every message.<br />
            <span className="text-sky-300">Clearly monitored.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-blue-100/70 xl:text-lg">
            A centralized workspace for tracking official communications, responses, and pending actions.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-4">
            {[
              ["Centralized", "One source of truth"],
              ["Protected", "Authorized access only"],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                <CheckCircle2 size={20} className="mb-4 text-sky-300" />
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-blue-100/60">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs leading-5 text-blue-200/50">
          Office of Commissioner Desiderio R. Apag III
        </p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-blue-700 via-sky-500 to-cyan-400 lg:hidden" />

        <div className="w-full max-w-[440px]">
          <div className="mb-9 flex items-center justify-between lg:hidden">
            <img src="/logo-dtms.png" alt="Communication Monitoring System" className="h-16 w-auto object-contain object-left" />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck size={21} />
            </div>
          </div>

          <div className="mb-9 hidden lg:block">
            <img src="/logo-dtms.png" alt="Communication Monitoring System" className="h-20 w-auto max-w-[280px] object-contain object-left" />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-blue-700">COMMTRACK PORTAL</p>
            <h2 className="text-3xl font-bold tracking-[-0.025em] text-slate-950 sm:text-4xl">
              {continueMode ? `Welcome back, ${lastUser?.name?.split(" ")[0]}` : "Welcome back"}
            </h2>
            <p className="mt-3 text-[15px] leading-6 text-slate-500">
              {continueMode ? "Enter your password to continue to your workspace." : "Sign in with your authorized account to continue."}
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {continueMode ? (
              <div className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white shadow-sm">
                  {lastUser?.name?.charAt(0)?.toUpperCase() || <UserRound size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{lastUser?.name}</p>
                  <p className="truncate text-sm text-slate-500">{lastUser?.email}</p>
                </div>
                <button type="button" onClick={useAnotherAccount} className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
                  Change
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor="username" className="text-sm font-semibold text-slate-700">Email address</label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                  <input id="username" type="email" name="username" value={form.username} onChange={handleChange} placeholder="name@agency.gov.ph" autoComplete="username" required autoFocus className="h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-[15px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                <span className="text-xs text-slate-400">Case sensitive</span>
              </div>
              <div className="relative mt-2">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                <input id="password" type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="Enter your password" autoComplete="current-password" required autoFocus={continueMode} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} className="h-13 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-[15px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600">
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && (
              <div id="login-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="group flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-65">
              {loading ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Signing in...</>
              ) : (
                <>{continueMode ? "Continue to CommTrack" : "Sign in securely"}<ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" /></>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-start gap-3 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-600" />
            <p>This is a restricted system. Activity may be monitored for security and compliance.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
