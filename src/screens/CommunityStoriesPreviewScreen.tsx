import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import { CommunityStory } from "../types";

const getApiBase = () => {
    const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");
    if (base.startsWith("http")) return base;
    return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();

export default function CommunityStoriesPreviewScreen() {
    const navigate = useNavigate();
    const [stories, setStories] = useState<CommunityStory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStories = async () => {
            try {
                const response = await fetch(`${API_BASE}/community-stories/`);
                if (!response.ok) throw new Error("Failed to fetch stories");
                const data = await response.json();
                setStories(data);
            } catch (err: any) {
                setError(err.message);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStories();
    }, []);

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Community Stories</h1>
                </div>
                <BookOpen className="w-6 h-6 text-violet-600" />
            </header>

            <main className="p-4 max-w-2xl mx-auto space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium">Loading stories...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 p-4 rounded-2xl text-red-700 text-center border border-red-100">
                        {error}
                    </div>
                ) : stories.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No stories available yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {stories.map((story) => (
                            <div key={story.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 group transition hover:shadow-md">
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
                                        <span className="bg-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-wider">
                                            Community
                                        </span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {story.created_at ? new Date(story.created_at).toLocaleDateString() : 'New Story'}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-3 leading-tight group-hover:text-violet-600 transition">
                                        {story.title}
                                    </h2>
                                    <p className="text-slate-600 leading-relaxed mb-6 line-clamp-3">
                                        {story.description}
                                    </p>
                                    <button
                                        onClick={() => navigate(`/story/${story.id}`)}
                                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                                    >
                                        Read Full Story
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
