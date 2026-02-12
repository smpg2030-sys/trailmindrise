import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const getApiBase = () => {
    const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");
    if (base.startsWith("http")) return base;
    return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();

export default function VerifyOTPScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useAuth();
    const email = location.state?.email || "";

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch(`${API_BASE}/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Verification failed");
            }

            // Login user
            if (data.token) localStorage.setItem("token", data.token);
            setUser(data);

            setMessage({ type: "success", text: "Verified! Redirecting..." });
            setTimeout(() => navigate("/", { replace: true }), 1500);

        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    };

    if (!email) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <p className="text-red-500">No email provided. Please register or login first.</p>
                <button onClick={() => navigate("/login")} className="ml-4 text-blue-500 underline">
                    Go to Login
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-6">
            <div className="w-full max-w-md bg-black rounded-2xl shadow-xl border border-slate-800 p-8">
                <h2 className="text-2xl font-bold text-center mb-2 text-white">Verify Email</h2>
                <p className="text-center text-slate-500 mb-6">
                    Enter the code sent to <br />
                    <span className="font-medium text-white">{email}</span>
                </p>

                <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">OTP Code</label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-900 rounded-xl border border-slate-800 text-center text-2xl tracking-[0.5em] text-white focus:ring-0 focus:border-slate-600 outline-none transition placeholder-slate-700"
                            placeholder="000000"
                            maxLength={6}
                            required
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-full font-bold text-black bg-white hover:bg-slate-200 disabled:opacity-50 transition-colors"
                    >
                        {loading ? "Verifying..." : "Verify & Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}
