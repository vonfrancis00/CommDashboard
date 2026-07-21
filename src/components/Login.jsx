import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Clock3,
  Eye,
  EyeOff,
  FileCheck2,
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
    <main className="min-h-screen bg-slate-100 text-slate-950 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#061a3a] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16 2xl:p-20">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,0.4),transparent_32%),radial-gradient(circle_at_88%_82%,rgba(14,165,233,0.18),transparent_34%)]" />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:64px_64px]" />

        <header className="relative flex items-center gap-4">
          <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/15 bg-[#071839] shadow-xl">
            <img src="/logo-dtms.png" alt="" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">OCDRA Communication</p>
            <p className="mt-0.5 text-xs text-blue-200/65">Official communications portal</p>
          </div>
        </header>

        <div className="relative max-w-2xl py-12">
          <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
            <span className="h-px w-8 bg-sky-400" />
            Communication monitoring system
          </p>
          <h1 className="max-w-xl text-[3.35rem] font-semibold leading-[1.08] tracking-[-0.045em] xl:text-[4.25rem]">
            Keep every official communication
            <span className="text-sky-300"> moving forward.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-blue-100/65 xl:text-lg xl:leading-8">
            Track correspondence, maintain accountability, and keep every action visible from receipt to resolution.
          </p>

          <div className="mt-12 grid max-w-2xl grid-cols-3 border-y border-white/10 py-6">
            {[
              [Activity, "Live status", "Track progress"],
              [FileCheck2, "Clear records", "Stay accountable"],
              [Clock3, "Timely action", "Meet deadlines"],
            ].map(([Icon, title, detail], index) => (
              <div key={title} className={`flex gap-3 px-5 first:pl-0 ${index ? "border-l border-white/10" : ""}`}>
                <Icon size={19} className="mt-0.5 shrink-0 text-sky-300" />
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs text-blue-200/55">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="relative flex items-end justify-between gap-8 text-xs text-blue-200/45">
          <p>Office of Commissioner Desiderio R. Apag III</p>
          <p>Secure • Monitored • Authorized access only</p>
        </footer>
      </section>

      <section className="relative flex min-h-screen items-center justify-center bg-[#f8fafc] px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-800 via-blue-600 to-sky-400 lg:hidden" />

        <div className="w-full max-w-[430px]">
          <header className="mb-12 flex items-center gap-3 lg:hidden">
            <div className="h-11 w-11 overflow-hidden rounded-xl bg-[#071839] shadow-sm">
              <img src="/logo-dtms.png" alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">CommTrack</p>
              <p className="text-xs text-slate-500">Official communications portal</p>
            </div>
          </header>

          <div>
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
              <ShieldCheck size={21} strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.17em] text-blue-700">Secure sign in</p>
            <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              {continueMode ? `Welcome back, ${lastUser?.name?.split(" ")[0]}` : "Welcome back"}
            </h2>
            <p className="mt-3 text-[15px] leading-6 text-slate-500">
              {continueMode ? "Enter your password to continue to your workspace." : "Sign in with your authorized account to continue."}
            </p>
          </div>

          <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
            {continueMode ? (
              <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-base font-bold text-white shadow-sm">
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
                <label htmlFor="username" className="text-sm font-semibold text-slate-700">CHED Email</label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                  <input id="username" type="email" name="username" value={form.username} onChange={handleChange} placeholder="name@ched.gov.ph" autoComplete="username" required autoFocus className="h-13 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-[15px] text-slate-900 shadow-sm shadow-slate-200/40 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
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
                <input id="password" type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="Enter your password" autoComplete="current-password" required autoFocus={continueMode} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} className="h-13 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-[15px] text-slate-900 shadow-sm shadow-slate-200/40 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
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

            <button type="submit" disabled={loading} className="group flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#0b3b91] px-5 font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#082f76] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-65">
              {loading ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Signing in...</>
              ) : (
                <>{continueMode ? "Continue to CommTrack" : "Sign in securely"}<ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" /></>
              )}
            </button>
          </form>

          <div className="mt-9 flex items-start gap-3 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-blue-700" />
            <p>This is a restricted system. Activity may be monitored for security and compliance.</p>
          </div>

          <p className="mt-10 text-center text-[11px] text-slate-400 lg:text-left">© 2026 CommTrack System</p>
        </div>
      </section>
    </main>
  );
}
