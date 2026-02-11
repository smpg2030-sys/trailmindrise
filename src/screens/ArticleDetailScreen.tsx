import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Share2, Clock, User } from "lucide-react";
import { motion } from "framer-motion";

const getApiBase = () => {
    const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");
    if (base.startsWith("http")) return base;
    return window.location.origin + (base.startsWith("/") ? "" : "/") + base;
};

const API_BASE = getApiBase();

export default function ArticleDetailScreen() {
    const { articleId } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/news/${articleId}`)
            .then((res) => {
                if (!res.ok) throw new Error("Article not found");
                return res.json();
            })
            .then((data) => {
                setArticle(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, [articleId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Article Not Found</h2>
                <p className="text-slate-600 mb-6">The story you're looking for might have been removed.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 bg-violet-600 text-white rounded-xl font-semibold"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white min-h-screen flex flex-col"
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-slate-800 truncate">Story Details</h1>
                <button className="ml-auto p-2 hover:bg-slate-100 rounded-full text-slate-600">
                    <Share2 className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                    {/* Title at the top */}
                    <h1 className="text-3xl font-extrabold text-slate-900 leading-tight mb-6">
                        {article.title}
                    </h1>

                    {/* Image below the title */}
                    <div className="rounded-2xl overflow-hidden bg-slate-100 aspect-video mb-8 shadow-sm">
                        {article.image_url ? (
                            <img
                                src={article.image_url}
                                alt={article.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">📰</div>
                        )}
                    </div>

                    {/* Full content */}
                    <div className="prose prose-slate max-w-none mb-10">
                        <p className="text-violet-700 font-medium text-lg leading-relaxed mb-6 italic border-l-4 border-violet-200 pl-4">
                            {article.short_description}
                        </p>
                        {article.content.split('\n\n').map((para: string, i: number) => (
                            <p key={i} className="text-slate-700 text-lg leading-relaxed mb-4">
                                {para}
                            </p>
                        ))}
                    </div>

                    {/* Author and Date at the bottom */}
                    <div className="pt-8 border-t border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-slate-800 font-semibold">
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                                <User className="w-4 h-4" />
                            </div>
                            <span>{article.author}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 ml-10">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Published on {new Date(article.published_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
