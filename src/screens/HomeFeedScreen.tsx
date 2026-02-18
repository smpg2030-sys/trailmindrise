import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus, Bell, Image as ImageIcon, Video as VideoIcon, Camera, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHomeRefresh } from "../context/HomeRefreshContext";
import { Post, FriendRequest, AppNotification, CommunityStory } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import VideoPlayer from "../components/VideoPlayer";
import GrowthTree from "../components/GrowthTree";
import PostCard from "../components/PostCard";

const TABS = ["All Posts", "Stories", "Daily Quotes", "Gratitude"] as const;

const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");
  if (base.startsWith("http")) return base;
  return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();
const BASE_URL = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;

export default function HomeFeedScreen() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All Posts");
  const [showNewPost, setShowNewPost] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [postContent, setPostContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ id: string, type: 'post' | 'video', status: 'pending' | 'approved' | 'rejected', progress: number, error?: string } | null>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileBanner, setShowProfileBanner] = useState(false);
  const [showFullProfilePic, setShowFullProfilePic] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const cameraPhotoInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<any>(null);
  const pressStartTime = useRef<number>(0);

  const { refreshTrigger } = useHomeRefresh();

  // Refresh user and feed when trigger changes or on mount
  useEffect(() => {
    refreshUser();
    if (refreshTrigger > 0) {
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowNewPost(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("create");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && (!user.email || !user.full_name)) {
      setShowProfileBanner(true);
    } else {
      setShowProfileBanner(false);
    }
  }, [user]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [communityStories, setCommunityStories] = useState<CommunityStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  useEffect(() => {
    fetchData(true);
  }, []);

  // Centralized Video Intersection Observer
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '-25% 0px -25% 0px', // Tighter detection area for snappier transitions
      threshold: 0.3 // Lower threshold to trigger transitions earlier
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
        // Clear active video if nothing is in the focus zone
        setActiveVideoId(null);
      }
    };

    const observer = new IntersectionObserver(handleIntersection, options);
    const videoElements = document.querySelectorAll('[data-video-id]');
    videoElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [posts, activeTab]); // Re-observe when feed changes

  const fetchData = async (reset = false) => {
    if (loading) return;

    // If not All Posts, pagination logic is skipped for now for simplicity
    if (activeTab !== "All Posts") {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/community-stories/`);
        if (res.ok) {
          const data = await res.json();
          setCommunityStories(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    const currentPage = reset ? 0 : page;
    const skip = currentPage * 15;

    try {
      const postsUrl = `${API_BASE}/posts/?user_id=${user?.id || ""}&limit=15&skip=${skip}`;
      const videosUrl = `${API_BASE}/videos/?limit=5&skip=${currentPage * 5}`;

      const [postsRes, videosRes] = await Promise.all([
        fetch(postsUrl),
        fetch(videosUrl)
      ]);

      let newItems: any[] = [];
      if (postsRes.ok) {
        const data = await postsRes.json();
        if (Array.isArray(data)) newItems = [...newItems, ...data];
      }
      if (videosRes.ok) {
        const data = await videosRes.json();
        if (Array.isArray(data)) newItems = [...newItems, ...data];
      }

      // Sort combined in memory
      newItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (reset) {
        setPosts(newItems);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...newItems]);
        setPage(prev => prev + 1);
      }

      // If we got fewer than expected, assume no more
      if (newItems.length < 10) {
        setHasMore(false);
      } else {
        setHasMore(true);
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

  const handleReportPost = async (postId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to report this post for violating guidelines? This will automatically remove it from the community for review.")) return;

    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (res.ok) {
        setPosts(prev => prev.filter(p => (p as any).id !== postId));
        setSubmissionFeedback({ type: 'success', message: 'Post reported and removed. Thank you for keeping Bodham safe!' });
        setTimeout(() => setSubmissionFeedback(null), 3000);
      }
    } catch (err) {
      console.error("Failed to report post", err);
    }
  };

  const handleReportVideo = async (videoId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to report this video for violating guidelines? This will automatically remove it from the community for review.")) return;

    try {
      const res = await fetch(`${API_BASE}/videos/${videoId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (res.ok) {
        setPosts(prev => prev.filter(p => (p as any).id !== videoId));
        setSubmissionFeedback({ type: 'success', message: 'Video reported and removed. Thank you for keeping Bodham safe!' });
        setTimeout(() => setSubmissionFeedback(null), 3000);
      }
    } catch (err) {
      console.error("Failed to report video", err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/friends/notifications?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      fetchFriendRequests();
      fetchNotifications();
      // Setup polling or socket for notifications/requests
      const interval = setInterval(() => {
        fetchFriendRequests();
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Unified Polling & Progress Animation
  useEffect(() => {
    if (!pendingItem || pendingItem.status !== 'pending') return;

    const itemId = pendingItem.id;
    let pollCounter = 0;

    const mainInterval = setInterval(async () => {
      // 1. Steady Creep Progress (every 500ms)
      setPendingItem(prev => {
        if (!prev || prev.id !== itemId || prev.status !== 'pending') return prev;
        if (prev.progress >= 95) return prev;
        return { ...prev, progress: Math.min(prev.progress + 0.5, 95) };
      });

      // 2. Status Polling (every 3 seconds = every 6 ticks of 500ms)
      pollCounter++;
      if (pollCounter >= 6) {
        pollCounter = 0;
        try {
          // Both videos and posts are now registered in the posts collections
          const endpoint = `${API_BASE}/posts/${itemId}/status`;

          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            const currentStatus = (data.status || '').toLowerCase();

            if (currentStatus === 'approved' || currentStatus === 'rejected') {
              // STOP EVERYTHING ATOMICALLY
              clearInterval(mainInterval);
              setPendingItem(null);

              const isApproved = currentStatus === 'approved';
              setSubmissionFeedback({
                type: isApproved ? 'success' : 'error',
                message: isApproved
                  ? 'Successfully posted'
                  : (data.rejection_reason
                    ? `Rejected by admin: ${data.rejection_reason}`
                    : 'Unable to post because this is against our community guidelines')
              });

              if (isApproved) {
                setTimeout(() => fetchData(), 500);
              }

              // Auto-hide popup after 5 seconds
              setTimeout(() => setSubmissionFeedback(null), 5000);
            }
          }
        } catch (err) {
          console.error("Moderation polling failed:", err);
        }
      }
    }, 500);

    return () => clearInterval(mainInterval);
  }, [pendingItem?.id, pendingItem?.status]);

  const handleLikeToggle = async (postId: string) => {
    if (!user) return;
    try {
      // Optimistic update
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          // It might be a video item which we are not using PostCard for yet, or a post item.
          // PostCard expects standard Post fields.
          // If it is a video, we might not have 'likes_count' on it yet if we didn't update types/backend for videos?
          // The backend update was for 'db.posts' and 'PostResponse'.
          // Videos are in 'db.videos'.
          // My backfill script only updated 'posts' and 'pending_posts'.
          // Videos might be missing these fields.
          // But 'posts' state here mixes them.
          // Safely check fields.
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

      const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id })
      });

      if (!res.ok) {
        // Revert if failed (simplified: just fetch data again or ignore for now)
        console.error("Like toggle failed on server");
      }
    } catch (error) {
      console.error("Like toggle failed", error);
    }
  };

  const handleCommentSubmit = async (postId: string, content: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, content })
      });
      if (res.ok) {
        setPosts(prev => prev.map(p => {
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

  const handlePostSubmit = async () => {
    if (!postContent.trim() && !selectedFile) return;
    setIsUploading(true);
    try {
      if (isVideo && selectedFile) {
        // VIDEO UPLOAD FLOW
        console.log("Starting video upload process...");

        // 1. Get cloud name from backend (safest way to get the config)
        const configRes = await fetch(`${API_BASE}/upload/signature`);
        const { cloud_name } = await configRes.json();

        // 2. Upload directly to Cloudinary (Unsigned)
        const cloudFormData = new FormData();
        cloudFormData.append("file", selectedFile);
        cloudFormData.append("upload_preset", "mind_rise_unsigned"); // Updated to match user config
        cloudFormData.append("resource_type", "video");

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloud_name || 'mindrise'}/video/upload`;
        const cloudRes = await fetch(cloudinaryUrl, {
          method: "POST",
          body: cloudFormData,
        });

        if (!cloudRes.ok) {
          const cloudErr = await cloudRes.json();
          throw new Error(cloudErr.error?.message || "Cloudinary upload failed");
        }

        const cloudData = await cloudRes.json();
        const videoUrl = cloudData.secure_url;

        // 3. Register as a post with our backend
        const queryParams = new URLSearchParams({
          user_id: user?.id || "",
          author_name: user?.full_name || user?.email || "Bodham User"
        }).toString();

        const response = await fetch(`${API_BASE}/posts/?${queryParams}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: postContent,
            video_url: videoUrl
          }),
        });

        if (!response.ok) throw new Error("Failed to submit video post");

        const postData = await response.json();
        setPendingItem({
          id: postData.id,
          type: 'video',
          status: 'pending',
          progress: 30
        });
      } else {
        // IMAGE/POST UPLOAD FLOW
        let imageUrl = null;
        if (selectedFile) {
          imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
        }

        const queryParams = new URLSearchParams({
          user_id: user?.id || "",
          author_name: user?.full_name || user?.email || ""
        }).toString();

        const response = await fetch(`${API_BASE}/posts/?${queryParams}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: postContent,
            image_url: imageUrl
          }),
        });

        if (!response.ok) throw new Error("Failed to submit post");
        const postData = await response.json();
        setPendingItem({
          id: postData.id,
          type: 'post',
          status: 'pending',
          progress: 30
        });
      }

      // Reset
      setPostContent("");
      setSelectedFile(null);
      setImagePreview(null);
      setIsVideo(false);
      setShowNewPost(false);
      refreshUser(); // Refresh user data to update streak
      fetchData(); // Refresh feed
    } catch (error: any) {
      console.error("Error creating post", error);
      setSubmissionFeedback({
        type: 'error',
        message: error.message || 'Failed to submit post'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full"
    >
      {/* Status Feedback Popup - Root level for maximum visibility */}
      <AnimatePresence>
        {submissionFeedback && (
          <motion.div
            key="submission-feedback-popup"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed inset-x-0 top-0 z-[99999] p-4 flex justify-center pointer-events-none"
          >
            <div className={`w-full max-w-md p-5 rounded-2xl shadow-2xl border-2 flex items-center gap-4 backdrop-blur-2xl pointer-events-auto ${submissionFeedback.type === 'success'
              ? 'bg-emerald-600/95 border-emerald-400 text-white'
              : 'bg-rose-600/95 border-rose-400 text-white'
              }`}>
              {submissionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
              )}
              <p className="text-sm font-bold leading-tight">
                {submissionFeedback.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl px-4 py-4 flex items-center justify-between border-b border-slate-100/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold bg-gradient-to-br from-emerald-400 to-emerald-600 overflow-hidden shadow-md border-2 border-white group-hover:scale-105 transition-transform duration-300 cursor-pointer select-none active:scale-95 touch-none"
              onPointerDown={() => {
                pressStartTime.current = Date.now();
                longPressTimer.current = setTimeout(() => {
                  if (user?.profile_pic) {
                    setShowFullProfilePic(true);
                  }
                }, 1000);
              }}
              onPointerUp={() => {
                const pressDuration = Date.now() - pressStartTime.current;
                if (longPressTimer.current) {
                  clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }

                // If held for less than 1 second, it's a normal tap
                if (pressDuration < 1000 && !showFullProfilePic) {
                  navigate("/profile");
                }
              }}
              onPointerLeave={() => {
                if (longPressTimer.current) {
                  clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }
              }}
            >
              {user?.profile_pic ? (
                <img src={user.profile_pic} alt="" className="w-full h-full object-cover pointer-events-none" />
              ) : (
                user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "M"
              )}
            </div>
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight truncate max-w-[200px]">
            {`Welcome, ${user?.full_name || user?.email?.split("@")[0] || "Friend"}`}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <GrowthTree
            variant="mini"
            createdAt={user?.created_at}
            manualStreak={user?.streak_count || 1}
            onClick={() => navigate("/profile")}
          />
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
            {(friendRequests.length > 0 || notifications.length > 0) && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            )}
          </button>
        </div>
      </header>

      <div className="sticky top-[73px] z-10 bg-white/90 backdrop-blur-sm px-4 py-3 border-b border-slate-100/50 overflow-x-auto no-scrollbar">
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

      <div className="px-4 pt-4 pb-20 space-y-6">
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

        {/* Pending Status Bar - Only show when pending */}
        <AnimatePresence mode="wait">
          {pendingItem && pendingItem.status === 'pending' && (
            <motion.div
              key="pending-status"
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: 'auto', opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-3xl border-2 shadow-sm flex flex-col gap-3 bg-white border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                    <span className="font-bold text-sm text-slate-700">
                      Reviewing your reflection...
                    </span>
                  </div>
                  {pendingItem.type === 'video' && (
                    <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                      <VideoIcon className="w-5 h-5 animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pendingItem.progress}%` }}
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 shadow-sm bg-slate-900"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium">Loading feed...</p>
          </div>
        ) : activeTab === "Stories" ? (
          <div className="grid grid-cols-1 gap-6">
            {communityStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ImageIcon className="w-16 h-16 text-slate-200 mb-4" />
                <p className="text-xl font-bold text-slate-700">No stories available</p>
              </div>
            ) : (
              communityStories.map((story, index) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group transition hover:shadow-md"
                >
                  <div className="aspect-video bg-slate-100 relative overflow-hidden">
                    {story.image_url ? (
                      <img
                        src={story.image_url}
                        alt={story.title}
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">📰</div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider">
                        Community
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-2 leading-tight group-hover:text-emerald-600 transition">
                      {story.title}
                    </h2>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3">
                      {story.description}
                    </p>
                    <button
                      onClick={() => navigate(`/story/${story.id}`)}
                      className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                    >
                      Read Full Story
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : activeTab === "All Posts" ? (
          <div className="grid grid-cols-1 gap-6">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 text-3xl">🌿</div>
                <p className="text-xl font-bold text-slate-700 mb-2">No posts yet</p>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">Be the first to share your mindful journey!</p>
              </div>
            ) : (
              posts.map((item: any, index) => {
                const isVideoItem = !!item.video_url;

                if (isVideoItem) {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group"
                    >
                      <div className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs uppercase">
                          {item.author_name?.[0] || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.author_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleReportVideo(item.id)}
                          className="ml-auto p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          title="Report Post"
                        >
                          <AlertCircle className="w-5 h-5" />
                        </button>
                      </div>

                      <div
                        className="aspect-[9/16] max-h-[600px] w-full bg-black shadow-inner"
                        data-video-id={item.id}
                      >
                        <VideoPlayer
                          src={item.video_url?.startsWith("/static") ? `${BASE_URL}${item.video_url}` : (item.video_url || "")}
                          className="h-full"
                          shouldPlay={item.id === activeVideoId}
                        />
                      </div>

                      {item.content && (
                        <div className="p-4 pt-3">
                          <p className="text-slate-700 text-sm leading-relaxed">
                            <span className="font-bold mr-2 text-slate-900">{item.author_name}</span>
                            {item.content}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <PostCard
                      post={item}
                      currentUserId={user?.id || ""}
                      onLikeToggle={handleLikeToggle}
                      onCommentSubmit={handleCommentSubmit}
                      onReport={handleReportPost}
                    />
                  </motion.div>
                );

              })
            )}

            {hasMore && posts.length > 0 && activeTab === "All Posts" && (
              <div className="flex justify-center pb-8 pt-4">
                <button
                  onClick={() => fetchData()}
                  disabled={loading}
                  className="px-8 py-3 bg-white border-2 border-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load More Reflections"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <p className="font-medium italic">Content for this tab coming soon...</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md p-4 flex items-end sm:items-center justify-center"
            onClick={() => setShowNewPost(false)}
          >
            <motion.div
              initial={{ y: 100, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 100, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800">New Reflection</h2>
                  <button
                    onClick={() => setShowNewPost(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    ×
                  </button>
                </div>

                <textarea
                  className="w-full h-40 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all duration-300 resize-none outline-none text-slate-700 font-medium placeholder:text-slate-400"
                  placeholder="What's on your mind today?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                />

                <p className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1.5 px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Note: All posts are reviewed by an admin before being published to the community.
                </p>

                {(imagePreview || (isVideo && selectedFile)) && (
                  <div className="mt-4 relative group aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-black">
                    {isVideo ? (
                      <video
                        src={imagePreview || undefined}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                        muted
                        loop
                      />
                    ) : (
                      <img src={imagePreview || ""} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setSelectedFile(null);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
                  <div className="flex gap-2">
                    {/* Camera Options Popover Trigger */}
                    <div className="relative">
                      <button
                        onClick={() => setShowCameraOptions(!showCameraOptions)}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-violet-50 text-violet-600 hover:bg-violet-100 transition-all active:scale-95 group"
                      >
                        <Camera className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      </button>

                      {/* Camera Options Menu */}
                      <AnimatePresence>
                        {showCameraOptions && (
                          <>
                            <div
                              className="fixed inset-0 z-[150]"
                              onClick={() => setShowCameraOptions(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 w-36 z-[160] flex flex-col gap-1 overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  cameraPhotoInputRef.current?.click();
                                  setShowCameraOptions(false);
                                }}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-sm text-slate-700 font-medium w-full text-left"
                              >
                                <Camera className="w-4 h-4 text-violet-500" />
                                <span>Take Photo</span>
                              </button>
                              <button
                                onClick={() => {
                                  cameraVideoInputRef.current?.click();
                                  setShowCameraOptions(false);
                                }}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-sm text-slate-700 font-medium w-full text-left"
                              >
                                <VideoIcon className="w-4 h-4 text-rose-500" />
                                <span>Record Video</span>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>

                      {/* Hidden Strict Inputs */}
                      <input
                        ref={cameraPhotoInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            setIsVideo(false);
                            const reader = new FileReader();
                            reader.onloadend = () => setImagePreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <input
                        ref={cameraVideoInputRef}
                        type="file"
                        className="hidden"
                        accept="video/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            setIsVideo(true);
                            const previewUrl = URL.createObjectURL(file);
                            setImagePreview(previewUrl);
                          }
                        }}
                      />
                    </div>
                    <label className="w-12 h-12 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all active:scale-95 cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            setIsVideo(false);
                            const reader = new FileReader();
                            reader.onloadend = () => setImagePreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <ImageIcon className="w-5 h-5" />
                    </label>
                    <label className="w-12 h-12 flex items-center justify-center rounded-2xl bg-sky-50 text-sky-600 hover:bg-sky-100 transition-all active:scale-95 cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            setIsVideo(true);
                            const previewUrl = URL.createObjectURL(file);
                            setImagePreview(previewUrl);
                          }
                        }}
                      />
                      <VideoIcon className="w-5 h-5" />
                    </label>
                  </div>

                  <button
                    onClick={handlePostSubmit}
                    disabled={isUploading || (!postContent.trim() && !selectedFile)}
                    className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isUploading ? "Posting..." : "Share Now"}
                    {!isUploading && "🌿"}
                  </button>
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
            className="fixed inset-0 z-[120] bg-white"
          >
            <div className="p-4 flex items-center gap-3 border-b">
              <button onClick={() => setShowSearch(false)} className="p-2">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  className="w-full py-2.5 pl-10 pr-4 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Find mindful friends..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim().length > 2) {
                      setSearchingUsers(true);
                      fetch(`${API_BASE}/friends/search?query=${e.target.value}&current_user_id=${user?.id || ""}`)
                        .then(r => r.json())
                        .then(d => {
                          setSearchResults(d);
                          setSearchingUsers(false);
                        });
                    } else {
                      setSearchResults([]);
                    }
                  }}
                />
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-80px)]">
              {searchingUsers ? (
                <div className="text-center py-10 text-slate-400">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold overflow-hidden cursor-pointer"
                        onClick={() => {
                          setShowSearch(false);
                          navigate(`/profile/${u.id}`);
                        }}
                      >
                        {u.profile_pic ? <img src={u.profile_pic} alt="" className="w-full h-full object-cover" /> : u.full_name?.[0] || u.email[0].toUpperCase()}
                      </div>
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setShowSearch(false);
                          navigate(`/profile/${u.id}`);
                        }}
                      >
                        <p className="font-bold text-slate-800 hover:text-emerald-600 transition-colors">{u.full_name || u.email.split("@")[0]}</p>
                        <p className="text-xs text-slate-500">{u.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const res = await fetch(`${API_BASE}/friends/request`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ from_user_id: user?.id, to_user_id: u.id }),
                        });
                        if (res.ok) alert("Friend request sent!");
                        else alert("Already friends or request pending.");
                      }}
                      className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-600 transition"
                    >
                      Connect
                    </button>
                  </div>
                ))
              ) : searchQuery && (
                <div className="text-center py-10 text-slate-400">No users found.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="fixed inset-0 z-[120] bg-white flex flex-col"
          >
            <div className="p-4 flex items-center gap-3 border-b">
              <button onClick={() => setShowNotifications(false)} className="p-2">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold">Activity</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Friend Requests</h3>
              {friendRequests.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No pending requests</p>
              ) : (
                friendRequests.map((req: any) => (
                  <div key={req.request_id} className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        setShowNotifications(false);
                        navigate(`/profile/${req.from_user_id}`);
                      }}
                    >
                      <p className="text-sm font-bold text-slate-800 hover:text-emerald-700 transition-colors">{req.from_user_name}</p>
                      <p className="text-xs text-slate-500">Sent a friend request</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const res = await fetch(`${API_BASE}/friends/accept?request_id=${req.request_id}`, { method: "POST" });
                          if (res.ok) {
                            alert("Friend request accepted!");
                            fetchFriendRequests();
                          }
                        }}
                        className="p-2 bg-emerald-600 text-white rounded-lg"
                      >
                        Accept
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`${API_BASE}/friends/reject?request_id=${req.request_id}`, { method: "POST" });
                          if (res.ok) {
                            fetchFriendRequests();
                          }
                        }}
                        className="p-2 bg-slate-200 text-slate-600 rounded-lg"
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                ))
              )}

              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-8 mb-2">Recent Notifications</h3>
              {notifications.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No recent activity</p>
              ) : (
                notifications.map((n: any) => (
                  <div key={n.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-sm text-slate-700">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
        {showFullProfilePic && user?.profile_pic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
            onClick={() => setShowFullProfilePic(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={user.profile_pic}
                alt="Full Profile"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setShowFullProfilePic(false)}
                className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors"
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
