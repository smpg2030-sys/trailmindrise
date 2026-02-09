import React from "react";
import { useNavigate } from "react-router-dom";
import FloatingSupport from "../components/FloatingSupport";

export default function AdminPanelScreen() {
  const navigate = useNavigate();

  return (
    <div className="app-container min-h-screen bg-[#f8f9fa] p-4 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={() => navigate(-1)} className="text-2xl text-slate-600">
          ←
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Admin Moderation</h1>
      </div>
      <div className="bg-yellow-100 rounded-xl p-4 mb-6">
        <div className="font-semibold">Pending Posts: 0</div>
        <div className="text-sm text-slate-600">Review and moderate user content</div>
      </div>
      <div className="text-center py-12 text-slate-500">
        <div className="text-5xl mb-3">✅</div>
        <p>All caught up! No pending posts to review</p>
      </div>
      <FloatingSupport />
    </div>
  );
}
