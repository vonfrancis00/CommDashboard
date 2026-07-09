import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, User, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { login } from "../services/api";

export default function Login({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [lastUser, setLastUser] = useState(null);
  const [continueMode, setContinueMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("lastLogin");
    if (saved) {
      const user = JSON.parse(saved);
      setLastUser(user);
      setContinueMode(true);
      setForm((prev) => ({ ...prev, username: user.email }));
    }
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const result = await login(form.username, form.password);

      if (!result.success) {
        setError(result.message || "Invalid username or password");
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...result,
          loginDate: new Date().toDateString(),
        })
      );

      localStorage.setItem(
        "lastLogin",
        JSON.stringify({
          ...result.id,
          email: result.email,
          name: result.name,
        })
      );

      onLogin();
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased selection:bg-indigo-500 selection:text-white">

      {/* LEFT PANEL: Cinematic/Executive Presentation Branding */}
      <div className="hidden lg:flex w-[45%] relative items-center justify-center bg-slate-900 overflow-hidden p-12">
        {/* Modern Graphic Accents */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
        <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-20 blur-[120px] rounded-full -top-12 -left-12 animate-pulse speed-slow" />
        <div className="absolute w-[400px] h-[400px] bg-indigo-600 opacity-10 blur-[100px] rounded-full bottom-10 right-0" />

        <div className="relative z-10 max-w-md w-full flex flex-col justify-between h-full text-center lg:text-left">
          {/* Top Brand Tag */}
          <div className="flex items-center gap-2 self-start bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-full px-3.5 py-1.5 shadow-sm">
            <ShieldCheck className="text-indigo-400" size={14} />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-300">Secure Enterprise Gateway</span>
          </div>

          {/* Main Hero Copy */}
          <div className="my-auto space-y-6">
            <div className="inline-flex p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm shadow-inner shadow-white/5">
              <img
                src="/logo-dtms.png"
                alt="Logo"
                className="w-38 h-48 object-contain filter drop-shadow-[0_4px_12px_rgba(99,102,241,0.3)]"
              />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-5xl font-black tracking-tight text-white leading-tight">
                Communication <br />
                <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-white bg-clip-text text-transparent italic font-serif font-normal">Hub</span>
              </h1>
              <div className="h-1 w-12 bg-indigo-500 rounded-full my-4" />
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                Office of Commissioner Desiderio R. Apag III
              </p>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                A centralized, audited ecosystem built for hyper-efficient communication tracking, monitoring, and administrative intelligence management.
              </p>
            </div>
          </div>

          {/* Bottom Metatag */}
          <div className="text-[11px] text-slate-500 font-medium tracking-wide">
            © {new Date().getFullYear()} CMS • All Systems Operational
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Crisp, Focused Control Interface */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 md:px-16 bg-slate-50/60">
        <div className="w-full max-w-[440px]">

          <div className="bg-white border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] p-8 sm:p-12 relative">
            
            {/* Top Minimal Header */}
            <div className="mb-8">
              {/* Responsive Mobile Logo Integration */}
              <div className="lg:hidden flex items-center gap-3 mb-6 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                <img src="/logo-dtms.png" alt="Logo" className="w-9 h-9 object-contain" />
                <div>
                  <h1 className="text-base font-bold text-slate-900">Communication <span className="text-indigo-600 font-normal italic">Hub</span></h1>
                  <p className="text-[10px] text-slate-400 font-medium">Office of Comm. Apag III</p>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h2>
              <p className="text-slate-400 mt-1 text-xs font-medium">
                Please securely authenticate credentials into your station.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>

              {/* Identity Router Area */}
              {!continueMode ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                    <input
                      type="email"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      placeholder="name@domain.gov"
                      className="w-full bg-slate-50/60 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium placeholder-slate-400"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-3.5 flex items-center justify-between ring-1 ring-indigo-500/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-md shadow-indigo-500/20">
                      {lastUser?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">Active Session</span>
                        <Sparkles size={10} className="text-indigo-500 fill-indigo-500" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                        {lastUser?.name}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setContinueMode(false);
                      setLastUser(null);
                      localStorage.removeItem("lastLogin");
                      setForm({ username: "", password: "" });
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-sm"
                  >
                    Switch
                  </button>
                </div>
              )}

              {/* Password Area */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Security Password
                  </label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full bg-slate-50/60 border border-slate-200 rounded-2xl pl-11 pr-12 py-3 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium placeholder-slate-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error Callout */}
              {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  {error}
                </div>
              )}

              {/* Interactive Submit Button */}
              <button
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 hover:bg-indigo-600 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-xl shadow-slate-900/10 hover:shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="tracking-wide">Validating Token...</span>
                  </div>
                ) : (
                  <>
                    <span className="tracking-wide">{continueMode ? "Confirm & Open Desk" : "Secure Sign In"}</span>
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

            </form>

            {/* Global Institutional Subtext */}
            <div className="mt-10 text-center text-[10px] font-semibold tracking-wider text-slate-400/90 leading-relaxed border-t border-slate-100 pt-6 uppercase">
              Communication Monitoring System
              <br />
              <span className="text-slate-400 font-normal normal-case block mt-0.5">Office of Commissioner Desiderio R. Apag III</span>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}