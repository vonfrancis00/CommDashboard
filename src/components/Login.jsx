import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, User, ShieldCheck } from "lucide-react";
import { login } from "../services/api";

export default function Login({ onLogin }) {

  const [showPassword, setShowPassword] = useState(false);
  const [lastUser, setLastUser] = useState(null);
  const [continueMode, setContinueMode] = useState(false);

  useEffect(() => {
  const saved = localStorage.getItem("lastLogin");

  if (saved) {
    const user = JSON.parse(saved);

    setLastUser(user);
    setContinueMode(true);

    setForm({
      username: user.email,
      password: "",
    });
  }
}, []);

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    const result = await login(
      form.username,
      form.password
    );

    if (!result.success) {
      setError(result.message || "Invalid username or password");
      return;
    }

    // save active session (expires at midnight)
localStorage.setItem(
  "user",
  JSON.stringify({
    ...result,
    loginDate: new Date().toDateString()
  })
);


// save continue login account
localStorage.setItem(
  "lastLogin",
  JSON.stringify({
    id: result.id,
    email: result.email,
    name: result.name,
  })
);


onLogin();

  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 flex">

      {/* LEFT PANEL */}

      <div className="hidden lg:flex w-1/2 relative items-center justify-center">

        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-slate-900 to-slate-950"></div>

        <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-900/60 blur-3xl"></div>

        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 blur-3xl rounded-full"></div>

        <div className="relative z-10 max-w-lg text-center px-3">

          <img
            src="/logo-dtms.png"
            alt="Logo"
            className="w-88 mx-auto drop-shadow-2xl"
          />

          <h1 className="mt-5 text-5xl font-black tracking-wide text-white">
            COMMUNICATION
          </h1>

          <h2 className="text-4xl font-black text-blue-400">
            MONITORING SYSTEM
          </h2>

          <p className="mt-8 text-slate-300 leading-8 text-lg">
            Office of Commissioner Desiderio R. Apag III
          </p>

          <div className="mt-10 flex justify-center gap-4">

            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-5 border border-white/10">

              <ShieldCheck className="mx-auto text-blue-400" size={32} />

              <p className="mt-2 text-sm text-slate-300">
                Secure Login
              </p>

            </div>

            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-5 border border-white/10">

              <Lock className="mx-auto text-cyan-400" size={32} />

              <p className="mt-2 text-sm text-slate-300">
                Protected Data
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* RIGHT PANEL */}

      <div className="flex-1 flex items-center justify-center bg-slate-950 px-8">

        <div className="w-full max-w-md">

          <div className="bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-slate-700 shadow-2xl p-10">

            <h2 className="text-3xl font-bold text-white">
              Welcome Back
            </h2>

            <p className="text-slate-400 mt-1">
              Sign in to continue
            </p>

            <form
              className="mt-10 space-y-6"
              onSubmit={handleSubmit}
            >

              {!continueMode ? (
                <div>
                  <label className="text-sm text-slate-300">
                    Email
                  </label>

                  <div className="mt-2 relative">

                    <User
                      className="absolute left-4 top-4 text-slate-500"
                      size={20}
                    />

                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      placeholder="Enter email"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    />

                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
                    {lastUser.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                      Continue as
                    </p>

                    <h3 className="text-xl font-bold text-white">
                      {lastUser.name}
                    </h3>

                    {/* <p className="text-sm text-slate-400">
                      {lastUser.email}
                    </p> */}
                  </div>

                </div>
              )}

              <div>

                <label className="text-sm text-slate-300">
                  Password
                </label>

                <div className="mt-2 relative">

                  <Lock
                    className="absolute left-4 top-4 text-slate-500"
                    size={20}
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-12 py-3 text-white focus:outline-none focus:border-blue-500 transition"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4 text-slate-400"
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>

                </div>

              </div>
              {continueMode && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setContinueMode(false);
                      setLastUser(null);

                      localStorage.removeItem("lastLogin");

                      setForm({
                        username: "",
                        password: "",
                      });
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Use another account
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-xl p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
  disabled={loading}
  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition text-white font-semibold shadow-lg shadow-blue-700/30 disabled:opacity-60"
>
  {loading
  ? "Signing In..."
  : continueMode
  ? `Continue as ${lastUser?.name}`
  : "Sign In"}
</button>

            </form>

            <div className="mt-10 text-center text-xs text-slate-500">
              Communication Monitoring System
              <br />
              Office of Commissioner Desiderio R. Apag III
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}