import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Settings, MoreVertical } from "lucide-react";

const ADMIN_EMAIL = "admin@mindrise.com";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"posts" | "saved">("posts");
  const [showSettings, setShowSettings] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <div className="app-container min-h-screen bg-[#f8f9fa] pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="p-1.5 text-slate-600"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
        <button type="button" className="p-1.5 text-slate-600" aria-label="Menu">
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4 pt-6 pb-4">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full mx-auto mb-3 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-3xl font-bold text-white">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm cursor-pointer">
              <input type="file" accept="image/*" className="hidden" />
              <span className="text-sm">+</span>
            </label>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "User"}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Living one breath at a time 🌱
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">0</p>
            <p className="text-sm text-slate-500">POSTS</p>
          </div>
          <div className="text-center py-4 rounded-xl bg-green-100">
            <p className="text-2xl font-bold text-green-600">12</p>
            <p className="text-sm text-slate-500">STREAK</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">0</p>
            <p className="text-sm text-slate-500">SAVED</p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="w-full py-4 rounded-xl font-semibold text-white bg-red-500 mb-4"
          >
            🛡️ Admin Panel
          </button>
        )}

        <div className="flex gap-4 mb-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab("posts")}
            className={`pb-2 text-sm font-medium border-b-2 transition ${
              tab === "posts" ? "text-green-600 border-green-500 border-b-2" : "text-slate-400 border-transparent"
            }`}
          >
            My Posts
          </button>
          <button
            type="button"
            onClick={() => setTab("saved")}
            className={`pb-2 text-sm font-medium border-b-2 transition ${
              tab === "saved" ? "text-green-600 border-green-500 border-b-2" : "text-slate-400 border-transparent"
            }`}
          >
            Saved
          </button>
        </div>

        <div className="flex flex-col items-center py-12">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-100 to-sky-100 flex items-center justify-center text-2xl">
            🖼️
          </div>
          <p className="text-slate-500 text-sm mt-3">No posts found yet</p>
        </div>

        <button
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="w-full mt-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
        >
          Log out
        </button>
      </div>

      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-6 text-center">Settings</h2>
            <div className="space-y-2">
              <button type="button" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="flex items-center gap-3">👤 Change user name</span>
                <span>→</span>
              </button>
              <button type="button" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="flex items-center gap-3">🖼️ Update bio</span>
                <span>→</span>
              </button>
              <button type="button" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="flex items-center gap-3">📱 Add mobile number</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  logout();
                  navigate("/login", { replace: true });
                }}
                className="w-full flex items-center justify-between p-4 bg-red-50 rounded-xl text-red-600"
              >
                <span className="flex items-center gap-3">🚪 Logout</span>
                <span>→</span>
              </button>
              <button type="button" className="w-full flex items-center justify-between p-4 bg-amber-50 rounded-xl text-amber-700">
                <span className="flex items-center gap-3">🛡️ Account deactivation</span>
                <span>→</span>
              </button>
              <button type="button" className="w-full flex items-center justify-between p-4 bg-red-100 rounded-xl text-red-600">
                <span className="flex items-center gap-3">🗑️ Account delete</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
