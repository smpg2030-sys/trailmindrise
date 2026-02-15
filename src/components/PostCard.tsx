import { useState } from "react";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { Post, Comment } from "../types";
import VideoPlayer from "./VideoPlayer";

interface PostCardProps {
    post: Post;
    currentUserId: string;
    activeVideoId?: string | null;
    onLikeToggle: (postId: string) => void;
    onCommentSubmit: (postId: string, content: string) => void;
    onDelete?: (postId: string) => void;
}

export default function PostCard({ post, currentUserId, activeVideoId, onLikeToggle, onCommentSubmit, onDelete }: PostCardProps) {
    const [commentText, setCommentText] = useState("");
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);

    const handleLike = () => {
        onLikeToggle(post.id);
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        onCommentSubmit(post.id, commentText);
        setCommentText("");
    };

    const toggleComments = async () => {
        setShowComments(!showComments);
        if (!showComments && comments.length === 0) {
            setLoadingComments(true);
            try {
                const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");
                const apiBase = base.startsWith("http") ? base : window.location.origin + (base.startsWith("/") ? "" : "/") + base;

                const res = await fetch(`${apiBase}/posts/${post.id}/comments`);
                if (res.ok) {
                    const data = await res.json();
                    setComments(data);
                }
            } catch (error) {
                console.error("Failed to load comments", error);
            } finally {
                setLoadingComments(false);
            }
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
                        {post.author_profile_pic ? (
                            <img src={post.author_profile_pic} alt={post.author_name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                                {post.author_name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">{post.author_name}</h3>
                        <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {post.status !== 'approved' && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${post.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                            {post.status}
                        </span>
                    )}
                    {currentUserId === post.user_id && onDelete && (
                        <button onClick={() => onDelete(post.id)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-2">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Media */}
            {post.image_url && (
                <div className="w-full aspect-video bg-slate-100">
                    <img src={post.image_url} alt="Post content" className="w-full h-full object-cover" />
                </div>
            )}
            {post.video_url && (
                <div
                    className="w-full aspect-video bg-black"
                    data-video-id={post.id}
                >
                    <VideoPlayer
                        src={post.video_url}
                        className="w-full h-full"
                        shouldPlay={post.id === activeVideoId}
                    />
                </div>
            )}

            {/* Actions */}
            <div className="p-4 flex items-center gap-6 border-t border-slate-50">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 transition-colors ${post.is_liked_by_me ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500'}`}
                >
                    <Heart className={`w-6 h-6 ${post.is_liked_by_me ? 'fill-current' : ''}`} />
                    <span className="font-medium">{post.likes_count}</span>
                </button>

                <button
                    onClick={toggleComments}
                    className="flex items-center gap-2 text-slate-500 hover:text-violet-600 transition-colors"
                >
                    <MessageCircle className="w-6 h-6" />
                    <span className="font-medium">{post.comments_count}</span>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="bg-slate-50 p-4 border-t border-slate-100">
                    {loadingComments ? (
                        <div className="text-center py-4 text-slate-400">Loading comments...</div>
                    ) : (
                        <div className="space-y-4 mb-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                                        {comment.author_profile_pic ? (
                                            <img src={comment.author_profile_pic} alt={comment.author_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                                                {comment.author_name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold text-slate-700">{comment.author_name}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-slate-600">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <div className="text-center py-4 text-slate-400 text-sm">No comments yet. Be the first!</div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleCommentSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-violet-500"
                        />
                        <button
                            type="submit"
                            disabled={!commentText.trim()}
                            className="p-2 bg-violet-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700 transition"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
