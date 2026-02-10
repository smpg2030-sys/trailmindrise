import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Users, FileText, CheckCircle, XCircle, AlertCircle, History, Filter } from "lucide-react";
import { Post, User } from "../types";

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "/api");
  if (base.startsWith("http")) return base;
  return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();

export default function AdminPanelScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ total_users: 0, pending_moderation: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "pending" | "history">("pending");
  const [historyFilter, setHistoryFilter] = useState<"all" | "approved" | "rejected">("all");

  useEffect(() => {
    fetchData();
  }, [user, activeTab, historyFilter]);

  async function fetchData() {
    if (!user) return;
    setLoading(true);
    try {
      // Always fetch stats
      const statsRes = await fetch(`${API_BASE}/admin/stats?role=${user.role}`);
      if (statsRes.ok) setStats(await statsRes.json());

      if (activeTab === "users") {
        const usersRes = await fetch(`${API_BASE}/admin/users?role=${user.role}`);
        if (usersRes.ok) setUsers(await usersRes.json());
      } else if (activeTab === "pending") {
        const postsRes = await fetch(`${API_BASE}/admin/posts?status=pending&role=${user.role}`);
        if (postsRes.ok) setPosts(await postsRes.json());
      } else if (activeTab === "history") {
        const statusParam = historyFilter === "all" ? "all" : historyFilter;
        // In a real app, "all" might exclude pending, but here we just show what API returns
        // Our API returns all if status is "all"
        const postsRes = await fetch(`${API_BASE}/admin/posts?status=${statusParam}&role=${user.role}`);
        if (postsRes.ok) {
          let data = await postsRes.json();
          // Filter out pending from history if we want
          if (historyFilter === "all") {
            data = data.filter((p: Post) => p.status !== "pending");
          }
          setPosts(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleModeration = async (postId: string, status: "approved" | "rejected") => {
    let reason = "";
    if (status === "rejected") {
      reason = prompt("Enter rejection reason (optional):") || "";
      if (reason === null) return; // Cancelled
    }

    try {
      const res = await fetch(`${API_BASE}/admin/posts/${postId}/status?role=${user?.role}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejection_reason: reason })
      });

      if (res.ok) {
        // Remove from list if in pending tab
        if (activeTab === "pending") {
          setPosts(prev => prev.filter(p => p.id !== postId));
          setStats(prev => ({ ...prev, pending_moderation: Math.max(0, prev.pending_moderation - 1) }));
        } else {
          // Refresh data if in history
          fetchData();
        }
      } else {
        alert("Failed to update post status");
      }
    } catch (error) {
      console.error("Error updating post", error);
    }
  };

  return (
    <div className="app-container min-h-screen bg-[#f8f9fa] p-4 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={() => navigate("/profile")} className="text-2xl text-slate-600">
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
            <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.pending_moderation}</div>
        </div>
      </div>

      <div className="mb-4 flex gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-2 px-4 font-medium text-sm whitespace-nowrap transition ${activeTab === "pending" ? "border-b-2 border-amber-500 text-amber-600" : "text-slate-500"}`}
        >
          Pending
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2 px-4 font-medium text-sm whitespace-nowrap transition ${activeTab === "history" ? "border-b-2 border-blue-500 text-blue-600" : "text-slate-500"}`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-2 px-4 font-medium text-sm whitespace-nowrap transition ${activeTab === "users" ? "border-b-2 border-green-500 text-green-600" : "text-slate-500"}`}
        >
          Users
        </button>
      </div>

      {activeTab === "history" && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(["all", "approved", "rejected"] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setHistoryFilter(filter)}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${historyFilter === filter
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200"
                }`}
            >
              {filter}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading data...</div>
      ) : activeTab === "users" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {users.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No users found</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div>
                    <div className="font-semibold text-slate-800">{u.full_name || "Unknown"}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {u.role}
                    </span>
                    {u.is_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No posts found.</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
                      {post.author_name ? post.author_name[0] : "?"}
                    </span>
                    <div>
                      <p className="font-semibold text-sm">{post.author_name}</p>
                      {post.author_email && <p className="text-xs text-slate-500">{post.author_email}</p>}
                      <p className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${post.status === 'approved' ? 'bg-green-100 text-green-700' :
                    post.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                    {post.status}
                  </span>
                </div>
                <p className="text-slate-800 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {post.content}
                </p>
                {post.image_url && (
                  <img
                    src={post.image_url.startsWith("/static") ? `${API_BASE}${post.image_url}` : post.image_url}
                    alt="Post content"
                    className="w-full h-auto max-h-[500px] object-contain rounded-xl mb-4 bg-slate-50"
                  />
                )}

                {post.status === "rejected" && post.rejection_reason && (
                  <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded">
                    Reason: {post.rejection_reason}
                  </div>
                )}

                {activeTab === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleModeration(post.id, "approved")}
                      className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-sm font-semibold hover:bg-green-100 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleModeration(post.id, "rejected")}
                      className="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}

                {activeTab === "history" && post.status === "approved" && (
                  <button
                    onClick={() => handleModeration(post.id, "rejected")}
                    className="w-full bg-red-50 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Revoke Approval
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
