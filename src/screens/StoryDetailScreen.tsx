import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Calendar } from "lucide-react";
import { CommunityStory } from "../types";

const getApiBase = () => {
    const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");
    if (base.startsWith("http")) return base;
    return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();

export default function StoryDetailScreen() {
    const { storyId } = useParams<{ storyId: string }>();
    const navigate = useNavigate();
    const [story, setStory] = useState<CommunityStory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStory = async () => {
            try {
                const response = await fetch(`${API_BASE}/community-stories/${storyId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch story");
                }
                const data = await response.json();
                setStory(data);
            } catch (err) {
                setError("Failed to load story. Please try again later.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (storyId) {
            fetchStory();
        }
    }, [storyId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (error || !story) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="text-xl text-slate-500 mb-4">{error || "Story not found"}</div>
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header with back button */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-slate-600 hover:text-slate-900 transition"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Explore
                </button>
            </header>

            <article className="max-w-3xl mx-auto px-4 py-8">
                {/* Hero Image */}
                <div className="w-full aspect-video rounded-2xl overflow-hidden mb-8 shadow-sm bg-slate-100">
                    {story.image_url ? (
                        <img
                            src={story.image_url}
                            alt={story.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl bg-violet-50">
                            📰
                        </div>
                    )}
                </div>

                {/* Title and Meta */}
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                    {story.title}
                </h1>

                <div className="flex flex-wrap gap-4 items-center text-sm text-slate-500 mb-8 pb-8 border-b border-slate-100">
                    {story.author && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                                <User className="w-4 h-4 text-violet-600" />
                            </div>
                            <span className="font-medium text-slate-700">{story.author}</span>
                        </div>
                    )}
                    {story.created_at && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(story.created_at).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>

                {/* Description/Intro */}
                <div className="text-xl text-slate-600 leading-relaxed mb-8 font-medium">
                    {story.description}
                </div>

                {/* Main Content */}
                <div className="prose prose-lg prose-slate max-w-none">
                    <div className="whitespace-pre-line text-slate-800 leading-8">
                        {story.content}
                    </div>
                </div>
            </article>
        </div>
    );
}
