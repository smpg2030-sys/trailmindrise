import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Settings, Shield, Trash2, MoreVertical, Grid, Bookmark, Camera, Video as VideoIcon, Users, UserPlus, CheckCircle2, Clock } from "lucide-react";
import { Post, Video, AppFriend, User, JournalEntry } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import VideoPlayer from "../components/VideoPlayer";
import GrowthTree from "../components/GrowthTree";

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");
  if (base.startsWith("http")) return base;
  return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();

export default function ProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();
  const { user: currentUser, logout, setUser: setCurrentUser } = useAuth();

  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetUserId = userId || currentUser?.id;

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "videos" | "friends">("posts");
  const [showSettings, setShowSettings] = useState(false);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myVideos, setMyVideos] = useState<Video[]>([]);
  const [friendsList, setFriendsList] = useState<AppFriend[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending" | "received" | "accepted">("none");

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [calculatedStreak, setCalculatedStreak] = useState<number>(0);

  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setTargetUser(currentUser);
      setNewName(currentUser.full_name || "");
      setNewEmail(currentUser.email || "");
      setBioDraft(currentUser.bio || "");
    } else if (userId) {
      fetchTargetUser(userId);
    }
  }, [userId, currentUser, isOwnProfile]);

  const fetchTargetUser = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/user/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTargetUser(data);
      }
    } catch (e) {
      console.error("Failed to fetch target user", e);
    } finally {
    }
  };

  useEffect(() => {
    if ((location.state as any)?.openEdit && isOwnProfile) {
      setIsEditingDetails(true);
      navigate(".", { replace: true, state: {} });
    }
  }, [location, navigate, isOwnProfile]);

  useEffect(() => {
    if (targetUserId) {
      if (isOwnProfile) refreshUserRole();
      fetchMyPosts();
      fetchMyVideos();
      fetchFriends();
      fetchStreakData();
      if (!isOwnProfile) checkFriendship();
    }
  }, [targetUserId, isOwnProfile]);

  const fetchStreakData = async () => {
    if (!targetUserId) return;
    try {
      const res = await fetch(`${API_BASE}/journals/?user_id=${targetUserId}`);
      if (res.ok) {
        const entries: JournalEntry[] = await res.json();
        const streak = calculateStreakFromJournals(entries);
        setCalculatedStreak(streak);
      }
    } catch (err) {
      console.error("Error fetching streak data", err);
    }
  };

  const calculateStreakFromJournals = (entries: JournalEntry[]) => {
    if (!entries || entries.length === 0) return 0;

    // Get unique dates in YYYY-MM-DD format
    const dates = new Set(entries.map(e => {
      try {
        return new Date(e.date).toISOString().split('T')[0];
      } catch (e) {
        return null;
      }
    }).filter(d => d !== null) as string[]);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let streak = 0;
    let currentCheckDate = "";

    // If they journaled today, start from today. 
    // If not, but they journaled yesterday, start from yesterday (streak still active).
    // Otherwise, streak is 0.
    if (dates.has(today)) {
      currentCheckDate = today;
    } else if (dates.has(yesterday)) {
      currentCheckDate = yesterday;
    } else {
      return 0;
    }

    // Move backward day by day
    while (dates.has(currentCheckDate)) {
      streak++;
      const dateObj = new Date(currentCheckDate);
      dateObj.setDate(dateObj.getDate() - 1);
      currentCheckDate = dateObj.toISOString().split('T')[0];
    }

    return streak;
  };

  const checkFriendship = async () => {
    if (!currentUser || !userId) return;
    try {
      const res = await fetch(`${API_BASE}/friends/status?user1_id=${currentUser.id}&user2_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setFriendshipStatus(data.status);
      }
    } catch (err) {
      console.error("Error checking friendship status", err);
    }
  };

  const fetchFriends = async () => {
    if (!targetUserId) return;
    try {
      const res = await fetch(`${API_BASE}/friends/list?user_id=${targetUserId}`);
      if (res.ok) {
        const data = await res.json();
        setFriendsList(data);
      }
    } catch (err) {
      console.error("Error fetching friends", err);
    }
  };

  const refreshUserRole = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`${API_BASE}/auth/user/${currentUser.id}`);
      if (res.ok) {
        const freshUser = await res.json();
        setCurrentUser(freshUser);
      }
    } catch (e) {
      console.error("User refresh failed", e);
    }
  };

  const fetchMyPosts = async () => {
    if (!targetUserId) return;
    setLoadingPosts(true);
    try {
      const res = await fetch(`${API_BASE}/posts/my?user_id=${targetUserId}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out rejected posts
        setMyPosts(Array.isArray(data) ? data.filter((p: any) => p.status !== 'rejected') : []);
      }
    } catch (error) {
      console.error("Failed to fetch posts", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchMyVideos = async () => {
    if (!targetUserId) return;
    setLoadingVideos(true);
    try {
      const res = await fetch(`${API_BASE}/videos/user/${targetUserId}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out rejected videos
        setMyVideos(Array.isArray(data) ? data.filter((v: any) => v.status !== 'rejected') : []);
      }
    } catch (error) {
      console.error("Failed to fetch videos", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleFriendAction = async () => {
    if (!currentUser || !userId) return;
    try {
      if (friendshipStatus === "none") {
        const res = await fetch(`${API_BASE}/friends/request?from_user_id=${currentUser.id}&to_user_id=${userId}`, {
          method: "POST"
        });
        if (res.ok) {
          setFriendshipStatus("pending");
          alert("Friend request sent!");
        }
      } else if (friendshipStatus === "received") {
        // Find the request ID from notifications or requests list (simplified for now: we need an endpoint to get request id by users)
        // Or refactor respond to take from/to users.
        // For now, let's just assume we need to respond.
        // Actually, backend respond takes request_id. 
        // Let's add an endpoint or search for it.
        alert("Please respond to the friend request in your notifications 🔔");
      }
    } catch (err) {
      console.error("Friend action failed", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}?user_id=${currentUser?.id}`, {
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


  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      const res = await fetch(`${API_BASE}/videos/${videoId}?user_id=${currentUser?.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMyVideos(prev => prev.filter(v => v.id !== videoId));
      } else {
        alert("Failed to delete video");
      }
    } catch (error) {
      console.error("Error deleting video", error);
    }
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentUser) {
      const file = e.target.files[0];
      try {
        // 1. Get Signature from Backend for ProfilePics
        const sigRes = await fetch(`${API_BASE}/upload/signature?folder=MindRise_ProfilePics`);
        if (!sigRes.ok) throw new Error("Could not get upload signature");
        const { signature, timestamp, api_key, cloud_name, folder } = await sigRes.json();

        // 2. Upload directly to Cloudinary
        const cloudFormData = new FormData();
        cloudFormData.append("file", file);
        cloudFormData.append("api_key", api_key);
        cloudFormData.append("timestamp", timestamp.toString());
        cloudFormData.append("signature", signature);
        cloudFormData.append("folder", folder);

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;
        const cloudRes = await fetch(cloudinaryUrl, {
          method: "POST",
          body: cloudFormData,
        });

        if (!cloudRes.ok) {
          const cloudErr = await cloudRes.json();
          throw new Error(cloudErr.error?.message || "Cloudinary upload failed");
        }

        const cloudData = await cloudRes.json();
        const profilePicUrl = cloudData.secure_url;

        // 3. Save the URL to our backend
        const res = await fetch(`${API_BASE}/auth/user/${currentUser.id}/profile-pic`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile_pic: profilePicUrl }),
        });

        if (res.ok) {
          const updatedUser = await res.json();
          setCurrentUser(updatedUser);
          alert("Profile picture updated! ✅");
        } else {
          alert("Failed to save profile picture URL to backend");
        }
      } catch (error: any) {
        console.error("Profile pic upload error", error);
        alert(`Error uploading profile picture: ${error.message}`);
      }
    }
  };

  const handleBioSave = async () => {
    if (!currentUser) return;
    setIsSavingBio(true);
    try {
      const res = await fetch(`${API_BASE}/auth/user/${currentUser.id}/bio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bioDraft }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSavingDetails(true);
    try {
      const res = await fetch(`${API_BASE}/auth/user/${currentUser.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          full_name: newName
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
        setIsEditingDetails(false);
        alert("Profile updated successfully!");
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error", error);
      alert("Error updating profile");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleDeleteProfilePic = async () => {
    if (!currentUser || !currentUser.profile_pic) return;
    if (!confirm("Are you sure you want to remove your profile picture?")) return;

    try {
      const res = await fetch(`${API_BASE}/auth/user/${currentUser.id}/profile-pic`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
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
        return <span className="px-2.5 py-1 bg-green-100/50 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-green-200">Approved</span>;
      case "rejected":
        return <span className="px-2.5 py-1 bg-rose-100/50 text-rose-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-rose-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-1 bg-amber-100/50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-amber-200">Pending</span>;
    }
  };


  if (!targetUser) return null;
  const isAdmin = currentUser?.role === "admin";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full"
    >
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl px-4 py-4 flex items-center justify-between border-b border-slate-100/50 shadow-sm">
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Profile</h1>
        <button
          type="button"
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Menu"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4 pt-8">
        <div className="flex flex-col items-center text-center mb-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative inline-block mb-4"
          >
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-4xl font-bold text-white overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-100">
              {targetUser.profile_pic ? (
                <img src={targetUser.profile_pic} alt="" className="w-full h-full object-cover" />
              ) : (
                targetUser.full_name?.[0] || targetUser.email[0].toUpperCase()
              )}
            </div>
            {isOwnProfile && (
              <label className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-slate-900 shadow-lg border-2 border-white flex items-center justify-center text-white cursor-pointer hover:bg-slate-800 transition-transform hover:scale-105">
                <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
                <Camera className="w-4 h-4" />
              </label>
            )}
          </motion.div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            {targetUser.full_name || targetUser.email.split("@")[0]}
          </h2>
          <p className="text-slate-400 text-sm font-medium mb-4">{targetUser.email}</p>

          <div className="w-full max-w-sm px-2">
            {isEditingBio ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
              >
                <textarea
                  className="w-full p-0 text-sm border-none focus:ring-0 resize-none min-h-[60px] text-center"
                  placeholder="Tell us about your mindful journey..."
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 justify-center pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsEditingBio(false);
                      setBioDraft(targetUser.bio || "");
                    }}
                    className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBioSave}
                    disabled={isSavingBio}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {isSavingBio ? "Saving..." : "Save Bio"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div
                className="group cursor-pointer relative py-2 px-4 rounded-xl hover:bg-slate-50 transition-colors"
                onClick={() => {
                  if (isOwnProfile) {
                    setBioDraft(targetUser.bio || "");
                    setIsEditingBio(true);
                  }
                }}
              >
                <p className="text-slate-600 text-sm leading-relaxed px-2">
                  {targetUser.bio || (isOwnProfile ? "Click to add a bio..." : "No bio yet")}
                </p>
                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">EDIT</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-center mt-6">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {targetUser.role}
            </span>
            {isOwnProfile && targetUser.profile_pic && (
              <button
                onClick={handleDeleteProfilePic}
                className="text-rose-600 text-[10px] uppercase font-bold tracking-wider bg-rose-50 px-3 py-1 rounded-full border border-rose-100 hover:bg-rose-100 transition-colors"
              >
                Remove Photo
              </button>
            )}
            {!isOwnProfile && (
              <button
                onClick={handleFriendAction}
                disabled={friendshipStatus === "pending" || friendshipStatus === "accepted"}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all shadow-sm ${friendshipStatus === "none"
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : friendshipStatus === "pending"
                    ? "bg-amber-50 text-amber-600 border border-amber-200 cursor-default"
                    : friendshipStatus === "received"
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                  }`}
              >
                {friendshipStatus === "none" && <><UserPlus className="w-4 h-4" /> Add Friend</>}
                {friendshipStatus === "pending" && <><Clock className="w-4 h-4" /> Requested</>}
                {friendshipStatus === "received" && <><CheckCircle2 className="w-4 h-4" /> Accept Request</>}
                {friendshipStatus === "accepted" && <><Users className="w-4 h-4" /> Friends</>}
              </button>
            )}
          </div>
        </div>

        {/* Bodham Growth Tree Section */}
        {(isOwnProfile || friendshipStatus === "accepted") ? (
          <div className="mb-8">
            <GrowthTree
              createdAt={targetUser.created_at}
              manualStreak={calculatedStreak}
            />
          </div>
        ) : (
          <div className="mb-8 p-8 bg-slate-50 rounded-3xl border border-slate-100 text-center">
            <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-700 font-bold mb-1">Growth Tree is private</p>
            <p className="text-slate-400 text-sm">Become friends to see their mindful growth journey 🌳</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-800">{myPosts.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Posts</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-800">{myVideos.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Videos</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-800">{friendsList.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Friends</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg shadow-emerald-200 text-center text-white transform scale-105">
            <p className="text-2xl font-bold text-white">
              {(isOwnProfile || friendshipStatus === "accepted") ? calculatedStreak : "—"}
            </p>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mt-1">Streak</p>
          </div>
        </div>

        {isAdmin && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => navigate("/admin")}
            className="w-full py-4 rounded-2xl font-bold text-white bg-slate-900 mb-8 flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
          >
            <Shield className="w-5 h-5" />
            Admin Panel
          </motion.button>
        )}


        <div className="flex mb-6 bg-slate-100/50 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === "posts"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            <Grid className="w-4 h-4" />
            Posts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === "videos"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            <VideoIcon className="w-4 h-4" />
            Videos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === "friends"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            <Users className="w-4 h-4" />
            Friends
          </button>
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === "saved"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
                }`}
            >
              <Bookmark className="w-4 h-4" />
              Saved
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "posts" && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {loadingPosts ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
                </div>
              ) : myPosts.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl mb-4">
                    📝
                  </div>
                  <p className="text-slate-900 font-bold mb-1">No posts yet</p>
                  <p className="text-slate-500 text-sm">Valid posts you create will appear here.</p>
                </div>
              ) : (
                myPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(post)}
                        <span className="text-[10px] font-medium text-slate-400">{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-slate-300 hover:text-rose-500 p-1.5 rounded-full hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-slate-700 text-sm mb-3 leading-relaxed">{post.content}</p>
                    {post.image_url && (
                      <div className="mt-3 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                        <img
                          src={post.image_url.startsWith("/static") ? `${API_BASE}${post.image_url}` : post.image_url}
                          alt="Post content"
                          className="w-full h-auto max-h-[300px] object-cover"
                        />
                      </div>
                    )}
                    {post.status === "rejected" && (
                      <div className="bg-rose-50 p-3 rounded-xl mt-3 border border-rose-100">
                        <p className="text-rose-700 font-bold text-xs mb-1 flex items-center gap-1">
                          <span className="text-sm">⚠️</span> Community Guidelines Issue
                        </p>
                        {post.rejection_reason && (
                          <p className="text-rose-600 text-xs pl-5">
                            Reason: {post.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "videos" && (
            <motion.div
              key="videos"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {loadingVideos ? (
                <div className="col-span-full py-12 text-center text-slate-400">Loading videos...</div>
              ) : myVideos.length === 0 ? (
                <div className="col-span-full py-16 text-center">
                  <VideoIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold">No videos yet</p>
                </div>
              ) : (
                myVideos.map(video => (
                  <div key={video.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm relative group">
                    <div className="aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
                      <VideoPlayer
                        src={video.video_url.startsWith("/static") ? `${API_BASE}${video.video_url}` : video.video_url}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-bold text-slate-800 truncate mb-1">
                        {video.title || "Untitled Reel"}
                      </h4>
                      {video.caption && (
                        <p className="text-[10px] text-slate-500 line-clamp-2 mb-2 italic">
                          "{video.caption}"
                        </p>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Approved
                        </span>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "saved" && isOwnProfile && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl mb-4">
                🔖
              </div>
              <p className="text-slate-900 font-bold mb-1">No saved items</p>
              <p className="text-slate-500 text-sm">Save posts to read them later.</p>
            </motion.div>
          )}

          {activeTab === "friends" && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {friendsList.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl mb-4">
                    🤝
                  </div>
                  <p className="text-slate-900 font-bold mb-1">No friends yet</p>
                  <p className="text-slate-500 text-sm">Connect with others to grow together!</p>
                </div>
              ) : (
                friendsList.map(friend => (
                  <div
                    key={friend.id}
                    onClick={() => navigate(`/profile/${friend.id}`)}
                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden border-2 border-white shadow-sm">
                        {friend.profile_pic ? (
                          <img src={friend.profile_pic} alt="" className="w-full h-full object-cover" />
                        ) : (
                          friend.full_name?.[0] || friend.email[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{friend.full_name || "User"}</p>
                        <p className="text-xs text-slate-400">{friend.email}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      →
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="w-full mt-8 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 mb-8"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </motion.button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
              <h2 className="text-xl font-bold mb-6 text-center text-slate-800">Settings</h2>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setIsEditingDetails(true);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors group"
                >
                  <span className="flex items-center gap-3 font-semibold text-slate-700">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <span className="text-xs">👤</span>
                    </div>
                    Account Details
                  </span>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    logout();
                    navigate("/login", { replace: true });
                  }}
                  className="w-full flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-colors group"
                >
                  <span className="flex items-center gap-3 font-bold text-rose-600">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <LogOut className="w-4 h-4" />
                    </div>
                    Logout
                  </span>
                  <span className="text-rose-400 group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setIsEditingDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4 text-slate-800 text-center">Edit Profile</h2>
              <form
                onSubmit={(e) => {
                  handleUpdateProfile(e);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="john@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingDetails}
                  className="w-full py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isSavingDetails ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
