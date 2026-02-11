import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "/api");
  if (base.startsWith("http")) return base;
  return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();


type Mode = "login" | "register";

export default function LoginScreen() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [mode, setMode] = useState<"login" | "register" | "forgot-request" | "forgot-reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      let endpoint = "";
      let body = {};

      if (mode === "login") {
        endpoint = "/auth/login";
        body = { email, password };
      } else if (mode === "register") {
        endpoint = "/auth/register";
        body = { email, password, full_name: fullName || undefined };
      } else if (mode === "forgot-request") {
        endpoint = "/auth/forgot-password";
        body = { email };
      } else if (mode === "forgot-reset") {
        endpoint = "/auth/reset-password";
        body = { email, otp, new_password: newPassword };
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.detail ||
          data?.message ||
          "Something went wrong. Please try again."
        );
      }

      if (mode === "login") {
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        setUser({
          id: data.id,
          email: data.email,
          full_name: data.full_name ?? null,
        });
        navigate("/", { replace: true });
        return;
      }

      if (mode === "register") {
        setMessage({
          type: "success",
          text: "Code sent! Redirecting to verify...",
        });
        setTimeout(() => navigate("/verify", { state: { email } }), 1000);
      } else if (mode === "forgot-request") {
        setMessage({ type: "success", text: "OTP sent to your email." });
        setMode("forgot-reset");
      } else if (mode === "forgot-reset") {
        setMessage({ type: "success", text: "Password updated! please login." });
        setTimeout(() => setMode("login"), 2000);
      }

    } catch (err: any) {
      if (err.message.includes("Email not verified") && mode === "login") {
        setMessage({
          type: "error",
          text: "Account not verified. Redirecting...",
        });
        setTimeout(() => navigate("/verify", { state: { email } }), 1500);
      } else {
        setMessage({
          type: "error",
          text: err.message || "Network error. Please try again.",
        });
      }
      if (mode === "login" || mode === "register") setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center mb-1">MindRise</h1>
        <p className="text-center text-sm text-slate-500 mb-6">
          {mode === "login" && "Sign in to your account"}
          {mode === "register" && "Create an account"}
          {mode === "forgot-request" && "Reset your password"}
          {mode === "forgot-reset" && "Enter OTP and new password"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Full name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Your name"
              />
            </div>
          )}

          {(mode === "login" || mode === "register" || mode === "forgot-request" || mode === "forgot-reset") && (
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={mode === "forgot-reset"}
                className="input-field disabled:opacity-70"
                placeholder="you@example.com"
              />
            </div>
          )}

          {mode === "forgot-reset" && (
            <div>
              <label className="block text-sm font-medium mb-1">OTP Code</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="input-field"
                placeholder="Enter 6-digit code"
              />
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
          )}

          {mode === "forgot-reset" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="input-field pr-10"
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
          )}

          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode("forgot-request")}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {message && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${message.type === "success"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-800"
                }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-400 to-green-600 disabled:opacity-50"
          >
            {loading ? "Please wait..." :
              mode === "login" ? "Sign In" :
                mode === "register" ? "Register" :
                  mode === "forgot-request" ? "Send OTP" : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMessage(null);
              setMode("login");
            }}
            className="text-sm text-slate-600 hover:text-green-600 font-medium"
          >
            {mode === "login"
              ? <span onClick={(e) => { e.stopPropagation(); setMode("register"); }}>Don't have an account? Register</span>
              : "Back to Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

