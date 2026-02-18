import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Grid,
  Users,
  Bookmark,
  Settings,
  MoreVertical,
  Camera,
  Shield,
  UserPlus,
  CheckCircle2,
  Clock,
  LogOut,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  X,
  Play
} from "lucide-react";
import { User, Post, AppFriend } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import GrowthTree from "../components/GrowthTree";
import PostCard from "../components/PostCard";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api")).startsWith("http")
  ? (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api"))
  : window.location.origin + ((import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api")).startsWith("/") ? "" : "/") + (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api"));

export default function ProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();
  const { user: currentUser, logout, setUser: setCurrentUser, refreshUser } = useAuth();

  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetUserId = userId || currentUser?.id;

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "friends">("posts");
  const [showSettings, setShowSettings] = useState(false);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [friendsList, setFriendsList] = useState<AppFriend[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending" | "received" | "accepted">("none");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (targetUserId) {
      fetchTargetUser(targetUserId);
      if (isOwnProfile && currentUser) {
        setNewName(currentUser.full_name || "");
        setNewEmail(currentUser.email || "");
        setBioDraft(currentUser.bio || "");
      }
    }
  }, [targetUserId, currentUser, isOwnProfile]);

  const fetchTargetUser = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}?current_user_id=${currentUser?.id || ""}`);
      if (res.ok) {
        const data = await res.json();
        setTargetUser(data.userData);
        setMyPosts(data.posts);
        setFollowersCount(data.followersCount || 0);
        setFollowingCount(data.followingCount || 0);
      }
    } catch (e) {
      console.error("Failed to fetch target user", e);
    }
  };

  // Centralized Video Intersection Observer
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '-25% 0px -25% 0px',
      threshold: 0.3
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
        if (id) {
          setActiveVideoId(id);
        }
      } else {
        setActiveVideoId(null);
      }
    };

    const observer = new IntersectionObserver(handleIntersection, options);
    const videoElements = document.querySelectorAll('[data-video-id]');
    videoElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [myPosts, activeTab]);

  useEffect(() => {
    if ((location.state as any)?.openEdit && isOwnProfile) {
      setIsEditingDetails(true);
      navigate(".", { replace: true, state: {} });
    }
  }, [location, navigate, isOwnProfile]);

  useEffect(() => {
    if (targetUserId) {
      if (isOwnProfile) {
        refreshUser();
        fetchMyPosts(); // Still need to fetch posts if it's own profile and we want the non-aggregated way for now or just unify it
      } else {
        fetchTargetUser(targetUserId);
      }
      fetchFriends();
      if (!isOwnProfile) checkFriendship();
    }
  }, [targetUserId, isOwnProfile]);


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

  const handleReportPost = async (postId: string) => {
    if (!currentUser) return;
    if (!window.confirm("Are you sure you want to report this post for violating guidelines? This will automatically remove it from the community for review.")) return;

    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id }),
      });

      if (res.ok) {
        setMyPosts(prev => prev.filter(p => (p as any).id !== postId));
        setSelectedPost(null);
        alert("Post reported and removed. Thank you for keeping Bodham safe!");
      }
    } catch (err) {
      console.error("Failed to report post", err);
    }
  };

  const handleReportVideo = async (videoId: string) => {
    if (!currentUser) return;
    if (!window.confirm("Are you sure you want to report this video for violating guidelines? This will automatically remove it from the community for review.")) return;

    try {
      const res = await fetch(`${API_BASE}/videos/${videoId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id }),
      });

      if (res.ok) {
        setMyPosts(prev => prev.filter(p => (p as any).id !== videoId));
        setSelectedPost(null);
        alert("Video reported and removed. Thank you for keeping Bodham safe!");
      }
    } catch (err) {
      console.error("Failed to report video", err);
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


  const fetchMyPosts = async () => {
    if (!targetUserId) return;
    setLoadingPosts(true);
    try {
      const [postsRes, videosRes] = await Promise.all([
        fetch(`${API_BASE}/posts/my?user_id=${targetUserId}`),
        fetch(`${API_BASE}/videos/user/${targetUserId}`)
      ]);

      let allContent: any[] = [];

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        if (Array.isArray(postsData)) {
          allContent = [...allContent, ...postsData.filter((p: any) => p.status !== 'rejected')];
        }
      }

      if (videosRes.ok) {
        const videosData = await videosRes.json();
        if (Array.isArray(videosData)) {
          const normalizedVideos = videosData
            .filter((v: any) => v.status !== 'rejected')
            .map((v: any) => ({
              ...v,
              content: v.caption || v.content || "",
            }));
          allContent = [...allContent, ...normalizedVideos];
        }
      }

      // Sort combined by created_at newest first
      allContent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMyPosts(allContent);
    } catch (error) {
      console.error("Failed to fetch profile content", error);
    } finally {
      setLoadingPosts(false);
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

  const handleLikeToggle = async (postId: string) => {
    if (!currentUser) return;
    try {
      setMyPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const currentLikes = p.likes_count || 0;
          const isLiked = !!p.is_liked_by_me;
          return {
            ...p,
            likes_count: isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
            is_liked_by_me: !isLiked
          };
        }
        return p;
      }));
      await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id })
      });
    } catch (error) {
      console.error("Like toggle failed", error);
    }
  };

  const handleCommentSubmit = async (postId: string, content: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id, content })
      });
      if (res.ok) {
        setMyPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments_count: (p.comments_count || 0) + 1
            };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error("Comment submit failed", error);
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
        {isOwnProfile && (
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
        {!isOwnProfile && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            ←
          </button>
        )}
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
            {isOwnProfile && targetUser.seller_status === "approved" && (
              <button
                onClick={() => navigate("/seller/dashboard")}
                className="text-violet-600 text-[10px] uppercase font-bold tracking-wider bg-violet-50 px-3 py-1 rounded-full border border-violet-100 hover:bg-violet-100 transition-colors shadow-sm"
              >
                🏪 Seller Dashboard
              </button>
            )}
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
              manualStreak={targetUser.streak_count || 0}
            />
          </div>
        ) : (
          <div className="mb-8 p-8 bg-slate-50 rounded-3xl border border-slate-100 text-center">
            <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-700 font-bold mb-1">Growth Tree is private</p>
            <p className="text-slate-400 text-sm">Become friends to see their mindful growth journey 🌳</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-800">{myPosts.length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Posts</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-800">{followersCount}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Followers</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-800">{followingCount}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Following</p>
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
              ) : !isOwnProfile ? (
                /* Grid Layout for Visitors */
                <div className="grid grid-cols-3 gap-1">
                  {myPosts.map((post) => (
                    <div
                      key={post.id}
                      className="aspect-square relative bg-slate-200 cursor-pointer overflow-hidden group"
                      onClick={() => setSelectedPost(post)}
                    >
                      {post.image_url ? (
                        <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : post.video_url ? (
                        <div className="w-full h-full relative">
                          <video src={post.video_url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="w-8 h-8 text-white opacity-80" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-2 bg-slate-100 text-[10px] text-slate-500 overflow-hidden leading-tight italic">
                          {post.content}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-sm">
                        <span className="flex items-center gap-1"><Heart className="w-4 h-4 fill-white" /> {post.likes_count}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4 fill-white" /> {post.comments_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Card Layout for Owner (to allow easy management) */
                myPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <PostCard
                      post={post}
                      currentUserId={currentUser?.id || ""}
                      activeVideoId={activeVideoId}
                      onLikeToggle={handleLikeToggle}
                      onCommentSubmit={handleCommentSubmit}
                      onDelete={handleDeletePost}
                      onReport={handleReportPost}
                    />
                    {post.status === "rejected" && post.rejection_reason && (
                      <div className="bg-rose-50 p-3 rounded-xl mt-2 mx-1 border border-rose-100 text-xs text-rose-700">
                        <span className="font-bold">Reason:</span> {post.rejection_reason}
                      </div>
                    )}
                  </motion.div>
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

        {isOwnProfile && (
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
        )}
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
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Media Section */}
              <div className="md:w-3/5 bg-slate-900 flex items-center justify-center relative min-h-[300px]">
                {selectedPost.image_url ? (
                  <img src={selectedPost.image_url} alt="" className="max-w-full max-h-full object-contain" />
                ) : selectedPost.video_url ? (
                  <video src={selectedPost.video_url} controls autoPlay className="max-w-full max-h-full" />
                ) : (
                  <div className="p-12 text-white text-xl italic text-center font-serif leading-relaxed">
                    "{selectedPost.content}"
                  </div>
                )}
                <button
                  onClick={() => setSelectedPost(null)}
                  className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center md:hidden"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Interaction Section */}
              <div className="md:w-2/5 flex flex-col h-full bg-white">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 overflow-hidden shadow-sm">
                      {targetUser.profile_pic ? (
                        <img src={targetUser.profile_pic} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                          {targetUser.full_name?.[0] || targetUser.email[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{targetUser.full_name || targetUser.email.split("@")[0]}</span>
                  </div>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hidden md:block"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] md:min-h-0">
                  <p className="text-slate-800 text-sm whitespace-pre-wrap">{selectedPost.content}</p>
                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-4">Comments</p>
                    {/* Comments would go here or just use PostCard inside modal but that's heavy */}
                    <p className="text-xs text-slate-400 italic">Comments are visible in the main feed card view.</p>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <button onClick={() => handleLikeToggle(selectedPost.id)} className="hover:scale-110 transition-transform">
                        <Heart className={`w-6 h-6 ${selectedPost.is_liked_by_me ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                      </button>
                      <button className="hover:scale-110 transition-transform">
                        <MessageCircle className="w-6 h-6 text-slate-600" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(selectedPost.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 text-sm">{selectedPost.likes_count} likes</p>
                    {currentUser && targetUserId !== currentUser.id && (
                      <button
                        onClick={() => selectedPost.video_url ? handleReportVideo(selectedPost.id) : handleReportPost(selectedPost.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 text-[10px] uppercase font-bold"
                      >
                        Report Post
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
