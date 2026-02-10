import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Settings, Shield, Trash2, MoreVertical } from "lucide-react";
import { Post } from "../types";

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "/api");
  if (base.startsWith("http")) return base;
  return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [showSettings, setShowSettings] = useState(false);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(user?.bio || "");
  const [isSavingBio, setIsSavingBio] = useState(false);

  useEffect(() => {
    if (user?.id) {
      refreshUserRole();
      fetchMyPosts();
    }
  }, [user?.id]);

  const refreshUserRole = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/user/${user?.id}`);
      if (res.ok) {
        const freshUser = await res.json();
        if (JSON.stringify(freshUser) !== JSON.stringify(user)) {
          setUser(freshUser);
        }
      }
    } catch (e) {
      console.error("User refresh failed", e);
    }
  };

  const fetchMyPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`${API_BASE}/posts/my?user_id=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setMyPosts(data);
      }
    } catch (error) {
      console.error("Failed to fetch my posts", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}?user_id=${user?.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMyPosts(prev => prev.filter(p => p.id !== postId));
      } else {
        alert("Failed to delete post");
      }
    } catch (error) {
      console.error("Error deleting post", error);
    }
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });

        const res = await fetch(`${API_BASE}/auth/user/${user.id}/profile-pic`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile_pic: base64 }),
        });

        if (res.ok) {
          const updatedUser = await res.json();
          setUser(updatedUser);
        } else {
          alert("Failed to upload profile picture");
        }
      } catch (error) {
        console.error("Profile pic upload error", error);
        alert("Error uploading profile picture");
      }
    }
  };

  const handleBioSave = async () => {
    if (!user) return;
    setIsSavingBio(true);
    try {
      const res = await fetch(`${API_BASE}/auth/user/${user.id}/bio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bioDraft }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        setIsEditingBio(false);
      } else {
        alert("Failed to update bio");
      }
    } catch (error) {
      console.error("Bio update error", error);
      alert("Error updating bio");
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleDeleteProfilePic = async () => {
    if (!user || !user.profile_pic) return;
    if (!confirm("Are you sure you want to remove your profile picture?")) return;

    try {
      const res = await fetch(`${API_BASE}/auth/user/${user.id}/profile-pic`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
      } else {
        alert("Failed to remove profile picture");
      }
    } catch (error) {
      console.error("Profile pic deletion error", error);
      alert("Error removing profile picture");
    }
  };

  const getStatusBadge = (post: Post) => {

    switch (post.status) {
      case "approved":
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Approved</span>;
      case "rejected":
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Rejected</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Pending Review</span>;
    }
  };

  if (!user) return null;

  const isAdmin = user?.role === "admin";

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
            <div className="w-24 h-24 rounded-full mx-auto mb-3 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-lg border-2 border-white">
              {user.profile_pic ? (
                <img src={user.profile_pic} alt="" className="w-full h-full object-cover" />
              ) : (
                user.full_name?.[0] || user.email[0].toUpperCase()
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-green-500 shadow-sm border border-white flex items-center justify-center text-white text-sm cursor-pointer hover:bg-green-600 transition">
              <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
              <span className="text-sm font-bold">+</span>
            </label>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {user.full_name || user.email.split("@")[0]}
          </h2>
          <p className="text-slate-400 text-xs mt-1 mb-3">{user.email}</p>

          <div className="w-full max-w-sm px-4">
            {isEditingBio ? (
              <div className="space-y-2">
                <textarea
                  className="w-full p-3 border-2 border-green-200 rounded-xl text-sm focus:border-green-500 transition outline-none"
                  placeholder="Tell us about your mindful journey..."
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      setIsEditingBio(false);
                      setBioDraft(user.bio || "");
                    }}
                    className="px-4 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBioSave}
                    disabled={isSavingBio}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                  >
                    {isSavingBio ? "Saving..." : "Save Bio"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="group cursor-pointer" onClick={() => {
                setBioDraft(user.bio || "");
                setIsEditingBio(true);
              }}>
                <p className="text-slate-600 text-sm italic line-clamp-2 px-2">
                  {user.bio || "Click to add a bio..."}
                </p>
                <button className="text-[10px] text-green-500 font-bold uppercase tracking-wider mt-1 opacity-0 group-hover:opacity-100 transition">
                  Edit Bio
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-center mt-4">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter bg-slate-100 px-2 py-0.5 rounded">
              {user.role}
            </span>
            {user.profile_pic && (
              <button
                onClick={handleDeleteProfilePic}
                className="text-red-500 text-[10px] uppercase font-bold tracking-tighter bg-red-50 px-2 py-0.5 rounded hover:bg-red-100 transition"
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{myPosts.length}</p>
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
            className="w-full py-4 rounded-xl font-semibold text-white bg-slate-800 mb-4 flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
          >
            <Shield className="w-5 h-5" />
            Admin Panel
          </button>
        )}

        <div className="flex gap-4 mb-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`pb-2 text-sm font-medium border-b-2 transition ${activeTab === "posts" ? "text-green-600 border-green-500 border-b-2" : "text-slate-400 border-transparent"
              }`}
          >
            My Posts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`pb-2 text-sm font-medium border-b-2 transition ${activeTab === "saved" ? "text-green-600 border-green-500 border-b-2" : "text-slate-400 border-transparent"
              }`}
          >
            Saved
          </button>
        </div>

        {activeTab === "posts" && (
          <div className="space-y-4 mb-8">
            {loadingPosts ? (
              <p className="text-center text-slate-400 text-sm py-8">Loading posts...</p>
            ) : myPosts.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-100 to-sky-100 flex items-center justify-center text-2xl">
                  🖼️
                </div>
                <p className="text-slate-500 text-sm mt-3">No posts yet</p>
              </div>
            ) : (
              myPosts.map(post => (
                <div key={post.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(post)}
                      <span className="text-xs text-slate-400">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-slate-700 text-sm mb-2">{post.content}</p>
                  {post.image_url && (
                    <div className="mt-3 bg-slate-900/5 rounded-xl overflow-hidden flex items-center justify-center">
                      <img
                        src={post.image_url.startsWith("/static") ? `${API_BASE}${post.image_url}` : post.image_url}
                        alt="Post content"
                        className="w-full h-auto max-h-[400px] object-contain"
                      />
                    </div>
                  )}
                  {post.status === "rejected" && (
                    <div className="bg-red-50 p-3 rounded-lg mt-3 border border-red-100">
                      <p className="text-red-700 font-bold text-xs mb-1">
                        ⚠️ This post is against the community guidelines
                      </p>
                      {post.rejection_reason && (
                        <p className="text-red-600 text-xs">
                          Reason: {post.rejection_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="flex flex-col items-center py-12">
            <p className="text-slate-500 text-sm">No saved items</p>
          </div>
        )}

        <button
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="w-full mt-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition mb-6"
        >
          <LogOut className="w-4 h-4 inline-block mr-2" />
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
