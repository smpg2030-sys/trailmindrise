import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "/api");


type Mode = "login" | "register";

export default function LoginScreen() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, full_name: fullName || undefined };

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
        // ✅ Save token if backend returns one
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

      setMessage({
        type: "success",
        text: "Account created successfully. Please sign in.",
      });

      setMode("login");
      setPassword("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Network error. Please try again.",
      });
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center mb-1">MindRise</h1>
        <p className="text-center text-sm text-slate-500 mb-6">
          {mode === "login" ? "Sign in to your account" : "Create an account"}
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

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
              placeholder="••••••••"
            />
          </div>

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
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-sm text-slate-600 hover:text-green-600 font-medium"
          >
            {mode === "login"
              ? "Don't have an account? Register"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

