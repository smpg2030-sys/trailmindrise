import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FloatingSupport from "../components/FloatingSupport";
import { Users, FileText, CheckCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "/api");

interface UserInfo {
  id: string;
  email: string;
  full_name: string | null;
}

export default function AdminPanelScreen() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [stats, setStats] = useState({ total_users: 0, pending_moderation: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/admin/users`),
          fetch(`${API_BASE}/admin/stats`)
        ]);

        if (usersRes.ok && statsRes.ok) {
          const [usersData, statsData] = await Promise.all([
            usersRes.json(),
            statsRes.json()
          ]);
          setUsers(usersData);
          setStats(statsData);
        }
      } catch (err) {
        console.error("Failed to fetch admin data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="app-container min-h-screen bg-[#f8f9fa] p-4 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={() => navigate(-1)} className="text-2xl text-slate-600">
          ←
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.total_users}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Pending Posts</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.pending_moderation}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800">User Management</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No users found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <div className="font-semibold text-slate-800">{u.full_name || "Unknown"}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded">
                  Active
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FloatingSupport />
    </div>
  );
}
