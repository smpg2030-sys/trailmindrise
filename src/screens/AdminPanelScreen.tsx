import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Post, User, Video } from "../types";
import { Users, FileText, CheckCircle, XCircle, Video as VideoIcon, AlertTriangle, Trash2, Ban } from "lucide-react";
import VideoPlayer from "../components/VideoPlayer";

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");
  if (base.startsWith("http")) return base;
  return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();
const BASE_URL = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;

export default function AdminPanelScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState({ total_users: 0, pending_moderation: 0, email_users: 0, mobile_users: 0, flagged_posts: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "pending" | "flagged" | "history" | "videos">("pending");
  const [historyFilter, setHistoryFilter] = useState<"all" | "approved" | "rejected">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user, activeTab, historyFilter, searchTerm]);

  async function fetchData() {
    if (!user) return;
    setLoading(true);
    try {
      const statsRes = await fetch(`${API_BASE}/admin/stats?role=${user.role}`);
      if (statsRes.ok) setStats(await statsRes.json());

      const searchParam = searchTerm ? `&search_user=${encodeURIComponent(searchTerm)}` : "";

      if (activeTab === "users") {
        const usersRes = await fetch(`${API_BASE}/admin/users?role=${user.role}${searchParam}`);
        if (usersRes.ok) setUsers(await usersRes.json());
      } else if (activeTab === "pending") {
        const postsRes = await fetch(`${API_BASE}/admin/posts?status=pending&role=${user.role}${searchParam}`);
        if (postsRes.ok) setPosts(await postsRes.json());
      } else if (activeTab === "flagged") {
        const postsRes = await fetch(`${API_BASE}/admin/posts?status=flagged&role=${user.role}${searchParam}`);
        if (postsRes.ok) setPosts(await postsRes.json());
      } else if (activeTab === "videos") {
        const videosRes = await fetch(`${API_BASE}/admin/videos?status=pending&role=${user.role}${searchParam}`);
        if (videosRes.ok) setVideos(await videosRes.json());
      } else if (activeTab === "history") {
        const statusParam = historyFilter === "all" ? "all" : historyFilter;
        const postsRes = await fetch(`${API_BASE}/admin/posts?status=${statusParam}&role=${user.role}${searchParam}`);
        if (postsRes.ok) {
          let data = await postsRes.json();
          if (historyFilter === "all" && !searchTerm) {
            data = data.filter((p: Post) => p.status !== "pending" && p.status !== "flagged");
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

  // Centralized Video Intersection Observer
  useEffect(() => {
    const options = {
      root: null,
      threshold: 0.5
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      let mostVisibleEntry: IntersectionObserverEntry | null = null;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!mostVisibleEntry || entry.intersectionRatio > mostVisibleEntry.intersectionRatio) {
            mostVisibleEntry = entry;
          }
        }
      });
      if (mostVisibleEntry) {
        const id = (mostVisibleEntry as any).target.getAttribute('data-video-id');
        if (id) setActiveVideoId(id);
      }
    };

    const observer = new IntersectionObserver(handleIntersection, options);
    const videoElements = document.querySelectorAll('[data-video-id]');
    videoElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [videos, activeTab]);

  const handleModeration = async (postId: string, status: "approved" | "rejected") => {
    let reason = "";
    if (status === "rejected") {
      reason = prompt("Enter rejection reason (optional):") || "";
      if (reason === null) return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/posts/${postId}/status?role=${user?.role}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejection_reason: reason })
      });

      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        // Update stats optimistically
        fetchData();
      } else {
        const errorText = await res.text();
        alert(`Failed to update post status: ${errorText}`);
      }
    } catch (error) {
      console.error("Error updating post", error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to permanently delete this post?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/posts/${postId}?role=${user?.role}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        alert("Post deleted.");
      }
    } catch (error) {
      console.error("Error deleting post", error);
    }
  };

  const handleBanUser = async (userId: string) => {
    const reason = prompt("Enter reason for banning this user:");
    if (!reason) return;

    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/ban?role=${user?.role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        alert("User banned successfully.");
        fetchData();
      }
    } catch (error) {
      console.error("Error banning user", error);
    }
  };

  const handleVideoModeration = async (videoId: string, status: "approved" | "rejected") => {
    let reason = "";
    if (status === "rejected") {
      reason = prompt("Enter rejection reason (optional):") || "";
      if (reason === null) return;
    }

    try {
      const res = await fetch(`${API_BASE}/approve-video?role=${user?.role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_id: videoId, status, rejection_reason: reason })
      });

      if (res.ok) {
        setVideos(prev => prev.filter(v => v.id !== videoId));
      } else {
        const errorText = await res.text();
        alert(`Failed to update video status: ${errorText}`);
      }
    } catch (error) {
      console.error("Error updating video", error);
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

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by user email, name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-slate-200 focus:outline-none transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.total_users}</div>
          <div className="flex gap-2 mt-2 text-xs text-slate-500">
            <span>📧 {stats.email_users || 0}</span>
            <span>📱 {stats.mobile_users || 0}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-slate-800">{stats.pending_moderation}</div>
            {stats.flagged_posts > 0 && (
              <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {stats.flagged_posts} Flagged
              </span>
            )}
          </div>
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
          onClick={() => setActiveTab("flagged")}
          className={`pb-2 px-4 font-medium text-sm whitespace-nowrap transition ${activeTab === "flagged" ? "border-b-2 border-rose-500 text-rose-600" : "text-slate-500"}`}
        >
          Flagged
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`pb-2 px-4 font-medium text-sm whitespace-nowrap transition ${activeTab === "videos" ? "border-b-2 border-purple-500 text-purple-600" : "text-slate-500"}`}
        >
          Videos
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                      {u.profile_pic ? (
                        <img src={u.profile_pic} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.full_name?.[0] || u.email[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{u.full_name || "Unknown"}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                      {u.last_active_at && (
                        <div className="text-[10px] mt-0.5 font-medium flex items-center gap-1">
                          {new Date(u.last_active_at).getTime() > Date.now() - 5 * 60 * 1000 ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Online
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Active {new Date(u.last_active_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBanUser(u.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Ban User"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
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
      ) : activeTab === "videos" ? (
        <div className="space-y-4">
          {videos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <VideoIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No videos pending moderation.</p>
            </div>
          ) : (
            videos.map(video => (
              <div key={video.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                {/* Video Item Content - Simplified for Brevity (Same as before) */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{video.author_name}</span>
                  </div>
                </div>
                <div
                  className="bg-black rounded-lg aspect-video mb-4 relative"
                  data-video-id={video.id}
                >
                  <VideoPlayer
                    src={video.video_url.startsWith("/static") ? `${BASE_URL}${video.video_url}` : video.video_url}
                    className="w-full h-full"
                    shouldPlay={video.id === activeVideoId}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVideoModeration(video.id, "approved")}
                    className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl text-sm font-bold hover:bg-emerald-100 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleVideoModeration(video.id, "rejected")}
                    className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl text-sm font-bold hover:bg-rose-100 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
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
              <div key={post.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-2 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 rounded-full transition-colors"
                    title="Emergency Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs overflow-hidden">
                      {post.author_profile_pic ? (
                        <img src={post.author_profile_pic} alt="" className="w-full h-full object-cover" />
                      ) : (
                        post.author_name ? post.author_name[0] : "?"
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{post.author_name}</p>
                      <p className="text-xs text-slate-400">{new Date(post.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${post.status === 'approved' ? 'bg-green-100 text-green-700' :
                    post.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      post.status === 'flagged' ? 'bg-rose-100 text-rose-700' :
                        'bg-yellow-100 text-yellow-700'
                    }`}>
                    {post.status}
                  </span>
                </div>

                {/* Moderation Upgrade - Detailed View */}
                <div className="mb-4 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1.5 ${(post.moderation_score || 0) > 0.7 ? "bg-red-50 text-red-600 border border-red-100" :
                      (post.moderation_score || 0) > 0.3 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}>
                      Score: {post.moderation_score || "0.0"}
                    </div>
                    {post.moderation_category && (
                      <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        Cat: {post.moderation_category}
                      </div>
                    )}
                    <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border flex items-center gap-1.5 ${post.moderation_source === 'admin_override' ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-blue-50 text-blue-600 border-blue-100"
                      }`}>
                      Source: {post.moderation_source || 'AI'}
                    </div>
                  </div>

                  {(post.moderation_logs && post.moderation_logs.length > 0) && (
                    <div>
                      <button
                        onClick={() => setShowLogs(showLogs === post.id ? null : post.id)}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline"
                      >
                        {showLogs === post.id ? "Hide Logs" : "View Action Logs"}
                      </button>
                      {showLogs === post.id && (
                        <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-100 space-y-1.5">
                          {post.moderation_logs.map((log, i) => (
                            <div key={i} className="text-[9px] text-slate-500 flex justify-between gap-4">
                              <span><b>{log.operator}:</b> {log.action}</span>
                              <span className="shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Metadata Details */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-slate-50/50 p-2 rounded border border-slate-100/50">
                      <p className="text-[8px] uppercase text-slate-400 font-bold mb-0.5">Detected Language</p>
                      <p className="text-[10px] font-medium text-slate-600">English (Alpha)</p>
                    </div>
                    {post.video_url && (
                      <div className="bg-slate-50/50 p-2 rounded border border-slate-100/50">
                        <p className="text-[8px] uppercase text-slate-400 font-bold mb-0.5">Video Transcript</p>
                        <p className="text-[10px] font-medium text-amber-600 italic">Processing...</p>
                      </div>
                    )}
                  </div>
                </div>

                {post.content && (
                  <p className="text-slate-800 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                    {post.content}
                  </p>
                )}
                {post.image_url && (
                  <div className="mt-3 bg-slate-900/5 rounded-xl overflow-hidden flex items-center justify-center">
                    <img
                      src={post.image_url.startsWith("/static") ? `${BASE_URL}${post.image_url}` : post.image_url}
                      alt="Post content"
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                  </div>
                )}

                {post.video_url && (
                  <div
                    className="mt-3 bg-black rounded-xl overflow-hidden aspect-[9/16] max-h-[500px] relative border border-slate-100 shadow-inner group"
                    data-video-id={post.id}
                  >
                    <VideoPlayer
                      src={post.video_url.startsWith("/static") ? `${BASE_URL}${post.video_url}` : post.video_url}
                      className="w-full h-full"
                      shouldPlay={post.id === activeVideoId}
                    />
                  </div>
                )}

                {(activeTab === "pending" || activeTab === "flagged") && (
                  <div className="flex gap-2 mt-4">
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
                  <button onClick={() => handleModeration(post.id, "rejected")} className="w-full mt-4 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-100">Revoke</button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
