import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Plus, Image as ImageIcon, Camera, Wand2, Video as VideoIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Post, Video } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import VideoPlayer from "../components/VideoPlayer";

const TABS = ["All Posts", "Videos", "Daily Quotes", "Gratitude"] as const;

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000" : "/api");
  if (base.startsWith("http")) return base;
  return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();

export default function HomeFeedScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All Posts");
  const [showNewPost, setShowNewPost] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileBanner, setShowProfileBanner] = useState(false);

  useEffect(() => {
    if (user && (!user.email || !user.full_name)) {
      setShowProfileBanner(true);
    } else {
      setShowProfileBanner(false);
    }
  }, [user]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "Videos") {
        const res = await fetch(`${API_BASE}/videos/`);
        const data = await res.json();
        setVideos(data);
      } else {
        const url = user ? `${API_BASE}/posts/?user_id=${user.id}` : `${API_BASE}/posts/`;
        const res = await fetch(url);
        const data = await res.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/friends/requests?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setFriendRequests(data);
      }
    } catch (err) {
      console.error("Error fetching friend requests:", err);
    }
  };

  useEffect(() => {
    fetchData();
    if (user) {
      fetchFriendRequests();
      const interval = setInterval(fetchFriendRequests, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchingUsers(true);
      try {
        const res = await fetch(`${API_BASE}/friends/search?query=${searchQuery}&current_user_id=${user?.id}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setSearchingUsers(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  const handleAddFriend = async (toUserId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/friends/request?from_user_id=${user.id}&to_user_id=${toUserId}`, {
        method: "POST"
      });
      if (res.ok) {
        alert("Friend request sent!");
      }
    } catch (err) {
      alert("Failed to send request.");
    }
  };

  const handleRespondRequest = async (requestId: string, action: "accept" | "decline") => {
    try {
      const res = await fetch(`${API_BASE}/friends/respond?request_id=${requestId}&action=${action}`, {
        method: "POST"
      });
      if (res.ok) {
        fetchFriendRequests();
        fetchData(); // Refresh feed if accepted
        alert(`Request ${action}ed!`);
      }
    } catch (err) {
      alert("Failed to respond to request.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if ((!postContent.trim() && !selectedFile) || !user) return;

    setIsUploading(true);
    let imageUrl = null;
    try {
      if (selectedFile) {
        // Convert to Base64 for reliable Vercel storage
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      }

      const queryParams = new URLSearchParams({
        user_id: user.id || "",
        author_name: user.full_name || user.email || ""
      }).toString();

      const response = await fetch(`${API_BASE}/posts/?${queryParams}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postContent,
          image_url: imageUrl
        }),
      });

      if (response.ok) {
        alert("Post submitted for review! ✅");
        setPostContent("");
        setSelectedFile(null);
        setImagePreview(null);
        setShowNewPost(false);
      } else {
        alert("Failed to submit post.");
      }
    } catch (error: any) {
      console.error("Error creating post", error);
      alert(`Error submitting post. ${error.name}: ${error.message}\nAPI_BASE: ${API_BASE}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#f8fafc] pb-24"
    >
      {/* Header ... */}
      <header className="sticky top-0 z-20 glass px-5 py-4 flex items-center justify-between border-b border-white/40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold bg-gradient-to-br from-emerald-400 to-emerald-600 overflow-hidden shadow-md border-2 border-white group-hover:scale-105 transition-transform duration-300">
              {user?.profile_pic ? (
                <img src={user.profile_pic} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "M"
              )}
            </div>
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight truncate max-w-[200px]">
            {activeTab === "Videos" ? "Mind Reels" : `Welcome, ${user?.full_name || user?.email?.split("@")[0] || "Friend"}`}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowNewPost(true)}
            className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Create Post"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="p-2.5 text-slate-600 relative hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {friendRequests.length > 0 && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            )}
          </button>
        </div>
      </header>

      <div className="sticky top-[73px] z-10 bg-[#f8fafc]/95 backdrop-blur-sm px-4 py-3 border-b border-slate-100/50 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 shadow-sm ${activeTab === tab
                ? "bg-slate-800 text-white shadow-slate-200 scale-105"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 pb-20 space-y-5">
        <AnimatePresence>
          {showProfileBanner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-amber-800 text-sm">Complete your profile</p>
                <p className="text-xs text-amber-600">Add your email and name to recover your account easily.</p>
              </div>
              <button
                onClick={() => navigate("/profile", { state: { openEdit: true } })}
                className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-amber-600 transition"
              >
                Complete
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium">Loading feed...</p>
          </div>
        ) : activeTab === "Videos" ? (
          <div className="grid grid-cols-1 gap-6">
            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <VideoIcon className="w-16 h-16 text-slate-200 mb-4" />
                <p className="text-xl font-bold text-slate-700">No videos yet</p>
              </div>
            ) : (
              videos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group"
                >
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs">
                      {video.author_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{video.author_name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{new Date(video.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <h3 className="px-4 pb-3 font-bold text-slate-800">{video.title}</h3>
                  <div className="aspect-[9/16] max-h-[600px] w-full bg-black">
                    <VideoPlayer
                      src={video.video_url.startsWith("/static") ? `${API_BASE}${video.video_url}` : video.video_url}
                      className="h-full"
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 text-3xl">
              🌿
            </div>
            <p className="text-xl font-bold text-slate-700 mb-2">No posts yet</p>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Be the first to share your mindful journey with the community!
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="post-card group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm overflow-hidden border border-slate-100">
                    {post.author_profile_pic ? (
                      <img src={post.author_profile_pic} alt="" className="w-full h-full object-cover" />
                    ) : (
                      post.author_name[0]
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-base">{post.author_name}</p>
                    <p className="text-xs font-medium text-slate-400">{new Date(post.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed text-[15px]">{post.content}</p>
                {post.image_url && (
                  <div className="mt-4 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative group-hover:shadow-md transition-shadow">
                    <img
                      src={post.image_url.startsWith("/static") ? `${API_BASE}${post.image_url}` : post.image_url}
                      alt="Post content"
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowNewPost(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <button type="button" onClick={() => setShowNewPost(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="text-sm font-semibold">Cancel</span>
                </button>
                <h2 className="text-lg font-bold text-slate-800">Create Post</h2>
                <button
                  type="button"
                  onClick={handleCreatePost}
                  disabled={isUploading}
                  className="px-5 py-2 rounded-full font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? "Posting..." : "Post"}
                </button>
              </div>

              <textarea
                className="w-full p-0 text-lg placeholder-slate-400 border-none focus:ring-0 resize-none min-h-[120px] mb-4"
                placeholder="What's on your mind?"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                autoFocus
              />

              {imagePreview && (
                <div className="relative mb-6 rounded-2xl overflow-hidden group">
                  <img src={imagePreview} alt="Preview" className="w-full h-56 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedFile(null);
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 backdrop-blur-md opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="text-xs">✕</div>
                  </button>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 mb-4 flex items-center justify-center gap-2 transition-colors"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Enhance with AI</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <Camera className="w-6 h-6 text-slate-600 mb-2" />
                    <span className="text-xs font-bold text-slate-600">Camera</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <ImageIcon className="w-6 h-6 text-slate-600 mb-2" />
                    <span className="text-xs font-bold text-slate-600">Gallery</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  </label>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-start justify-center pt-20 p-4"
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="flex-1 text-lg font-medium placeholder-slate-400 outline-none"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="button" onClick={() => setShowSearch(false)} className="bg-slate-100 p-1.5 rounded-full text-slate-500">
                  <span className="text-xs font-bold px-1">✕</span>
                </button>
              </div>
              {searchQuery ? (
                <div className="space-y-3">
                  {searchingUsers ? (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(u => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden">
                            {u.profile_pic ? (
                              <img src={u.profile_pic} alt="" className="w-full h-full object-cover" />
                            ) : (
                              u.full_name?.[0] || u.email[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{u.full_name || "User"}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[150px]">{u.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddFriend(u.id)}
                          className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition"
                        >
                          Add
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4 text-sm">No matches found</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-xs uppercase font-bold tracking-widest mb-2">Recent searches</p>
                  <p className="text-sm">No recent history</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      {showNotifications && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Friend Requests</h2>
              <button type="button" onClick={() => setShowNotifications(false)} className="text-2xl text-slate-500">
                ×
              </button>
            </div>
            {friendRequests.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-2xl mb-2">🎈</p>
                <p>No new friend requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {friendRequests.map(req => (
                  <div key={req.request_id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {req.from_user_name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{req.from_user_name}</p>
                        <p className="text-xs text-slate-500">wants to be your friend</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespondRequest(req.request_id, "accept")}
                        className="flex-1 py-2 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespondRequest(req.request_id, "decline")}
                        className="flex-1 py-2 bg-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-300 transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
