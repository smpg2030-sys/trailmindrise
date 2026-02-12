import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");
  if (base.startsWith("http")) return base;
  return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();




export default function LoginScreen() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [mode, setMode] = useState<"login" | "register" | "forgot-request" | "forgot-reset">("login");
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
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

    // Determine if input is email or mobile
    const isMobile = /^\d{10}$/.test(emailOrMobile.trim());
    const isEmail = emailOrMobile.includes("@");

    if (!isMobile && !isEmail && mode !== "forgot-reset") {
      setMessage({ type: "error", text: "Please enter a valid Email or 10-digit Mobile Number." });
      setLoading(false);
      return;
    }

    try {
      let endpoint = "";
      let body: any = {};

      if (mode === "login") {
        endpoint = "/auth/login";
        body = { email: emailOrMobile, password }; // Backend handles email field as identifier
      } else if (mode === "register") {
        endpoint = "/auth/register";
        body = {
          password,
          full_name: fullName || undefined,
          mobile: phoneNumber || (isMobile ? emailOrMobile : undefined),
          email: !isMobile ? emailOrMobile : undefined,
          is_phone_verified: isPhoneVerified
        };
      } else if (mode === "forgot-request") {
        endpoint = "/auth/forgot-password";
        body = { email: emailOrMobile }; // Backend handles it
      } else if (mode === "forgot-reset") {
        endpoint = "/auth/reset-password";
        body = { email: emailOrMobile, otp, new_password: newPassword };
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
          mobile: data.mobile,
          full_name: data.full_name ?? null,
        });
        navigate("/", { replace: true });
        return;
      }

      if (mode === "register") {
        setMessage({
          type: "success",
          text: isMobile ? "OTP sent to Mobile! Check console (Simulator)." : "Code sent! Redirecting to verify...",
        });
        setTimeout(() => navigate("/verify", { state: { email: emailOrMobile } }), 1500);
      } else if (mode === "forgot-request") {
        setMessage({ type: "success", text: "OTP sent." });
        setMode("forgot-reset");
      } else if (mode === "forgot-reset") {
        setMessage({ type: "success", text: "Password updated! please login." });
        setTimeout(() => setMode("login"), 2000);
      }

    } catch (err: any) {
      if ((err.message.includes("Email not verified") || err.message.includes("Account not verified")) && mode === "login") {
        // Allow redirect to verify
        setMessage({
          type: "error",
          text: "Account not verified. Redirecting...",
        });
        setTimeout(() => navigate("/verify", { state: { email: emailOrMobile } }), 1500);
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

  const handleSendPhoneOTP = async () => {
    if (!/^\d{10}$/.test(phoneNumber)) {
      setMessage({ type: "error", text: "Enter a valid 10-digit phone number." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to send OTP");
      setIsPhoneOtpSent(true);
      setMessage({ type: "success", text: "OTP sent to your mobile!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (phoneOtp.length !== 6) {
      setMessage({ type: "error", text: "Enter 6-digit OTP." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, otp: phoneOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid OTP");
      setIsPhoneVerified(true);
      setMessage({ type: "success", text: "Phone verified successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="w-full max-w-md bg-black rounded-2xl shadow-xl border border-slate-800 p-8">
        <h1 className="text-2xl font-bold text-center mb-1 text-white">Bodham</h1>
        <p className="text-center text-sm text-slate-500 mb-6">
          {mode === "login" && "Sign in to your account"}
          {mode === "register" && "Create an account"}
          {mode === "forgot-request" && "Reset your password"}
          {mode === "forgot-reset" && "Enter OTP and new password"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {(mode === "forgot-request" || mode === "forgot-reset") && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile Verification</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={isPhoneVerified}
                  className="flex-1 px-4 py-2 bg-slate-900 rounded-xl border border-slate-800 text-sm focus:ring-0 focus:border-slate-600 outline-none transition text-white placeholder-slate-600"
                  placeholder="Enter mobile number"
                />
                {!isPhoneVerified && (
                  <button
                    type="button"
                    onClick={handleSendPhoneOTP}
                    disabled={loading || !phoneNumber}
                    className="px-4 py-2 bg-white text-black rounded-xl text-xs font-bold hover:bg-slate-200 disabled:opacity-50 transition"
                  >
                    Send OTP
                  </button>
                )}
              </div>

              {isPhoneOtpSent && !isPhoneVerified && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <input
                    type="text"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 px-4 py-2 bg-slate-900 rounded-xl border border-slate-800 text-sm focus:ring-0 focus:border-slate-600 outline-none transition text-white placeholder-slate-600"
                    placeholder="Enter 6-digit OTP"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPhoneOTP}
                    disabled={loading || phoneOtp.length !== 6}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition"
                  >
                    Verify
                  </button>
                </div>
              )}

              {isPhoneVerified && (
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-base">✅</span> Phone Verified
                </div>
              )}
            </div>
          )}

          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">
                  Full name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 rounded-xl border border-slate-800 text-sm focus:ring-0 focus:border-slate-600 outline-none transition text-white placeholder-slate-600"
                  placeholder="Your name"
                />
              </div>

              <div className="p-4 bg-black rounded-2xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile Verification (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    disabled={isPhoneVerified}
                    className="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600"
                    placeholder="Enter mobile number"
                  />
                  {!isPhoneVerified && (
                    <button
                      type="button"
                      onClick={handleSendPhoneOTP}
                      disabled={loading || !phoneNumber}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm shadow-emerald-200"
                    >
                      Send OTP
                    </button>
                  )}
                </div>

                {isPhoneOtpSent && !isPhoneVerified && (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <input
                      type="text"
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600"
                      placeholder="Enter 6-digit OTP"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyPhoneOTP}
                      disabled={loading || phoneOtp.length !== 6}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                      Verify
                    </button>
                  </div>
                )}

                {isPhoneVerified && (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 p-2 rounded-lg">
                    <span className="text-base">✅</span> Phone Verified
                  </div>
                )}
              </div>
            </>
          )}

          {(mode === "login" || mode === "register" || mode === "forgot-request" || mode === "forgot-reset") && (
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">
                {mode === "register" ? "Email Address" : "Email or Mobile"}
              </label>
              <input
                type="text"
                value={emailOrMobile}
                onChange={(e) => setEmailOrMobile(e.target.value)}
                required
                disabled={mode === "forgot-reset"}
                className="w-full px-4 py-3 bg-slate-900 rounded-xl border border-slate-800 text-sm focus:ring-0 focus:border-slate-600 outline-none transition text-white placeholder-slate-600 disabled:opacity-50"
                placeholder={mode === "register" ? "you@example.com" : "you@example.com or mobile"}
              />
            </div>
          )}

          {mode === "forgot-reset" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">OTP Code</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-900 rounded-xl border border-slate-800 text-sm focus:ring-0 focus:border-slate-600 outline-none transition text-white placeholder-slate-600"
                placeholder="Enter 6-digit code"
              />
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-900 rounded-xl border border-slate-800 text-sm focus:ring-0 focus:border-slate-600 outline-none transition text-white placeholder-slate-600 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
          )}

          {mode === "forgot-reset" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-900 rounded-xl border border-slate-800 text-sm focus:ring-0 focus:border-slate-600 outline-none transition text-white placeholder-slate-600 pr-10"
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                className="text-xs font-semibold text-slate-400 hover:text-white"
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
            className="w-full py-3.5 rounded-full font-bold text-black bg-white hover:bg-slate-200 disabled:opacity-50 transition-colors"
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
            className="text-sm text-slate-600 hover:text-green-600 dark:text-zinc-400 dark:hover:text-emerald-400 font-medium"
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
