import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { X, Mic, MicOff, Video, VideoOff, MessageCircle, LogOut } from "lucide-react";


export default function SessionRoomScreen() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { token } = location.state || {};

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef<any>(null);

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");

    useEffect(() => {
        if (!token) {
            navigate("/focus");
            return;
        }

        // Start duration timer
        timerRef.current = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 60000); // Increment every minute

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            handleLeave();
        };
    }, [token]);

    const handleLeave = async () => {
        try {
            await fetch(`${BASE_URL}/sessions/leave?room_id=${roomId}&user_id=${user?.id}`, {
                method: "POST"
            });
        } catch (error) {
            console.error("Failed to record leave", error);
        }
        navigate("/focus");
    };

    const handleEndSession = async () => {
        if (!window.confirm("Are you sure you want to end this session for everyone?")) return;

        try {
            const res = await fetch(`${BASE_URL}/sessions/end?room_id=${roomId}&host_id=${user?.id}`, {
                method: "POST"
            });
            if (res.ok) {
                navigate("/focus");
            }
        } catch (error) {
            console.error("Failed to end session", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center justify-between bg-gradient-to-b from-slate-900/50 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-xl">
                        🧘‍♂️
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-sm">Live Session</h2>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{duration}m Elapsed</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLeave}
                    className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center text-white hover:bg-slate-700 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Video Mesh (Simplified Placeholder) */}
            <div className="flex-1 p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 overflow-y-auto">
                <div className="aspect-[3/4] sm:aspect-video bg-slate-800 rounded-3xl relative overflow-hidden ring-1 ring-slate-700/50 shadow-2xl">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center text-3xl mx-auto mb-4 border border-indigo-500/20">
                                {user?.full_name?.[0] || user?.email[0].toUpperCase()}
                            </div>
                            <p className="text-slate-400 text-xs font-bold tracking-tight">You (Host)</p>
                        </div>
                    </div>
                    {isVideoOff && (
                        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center">
                            <VideoOff className="w-10 h-10 text-slate-700" />
                        </div>
                    )}
                    <div className="absolute bottom-4 left-4">
                        <span className="px-2 py-1 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold rounded-lg border border-white/10 uppercase tracking-tight">
                            Your Camera
                        </span>
                    </div>
                </div>

                {/* Simulated Participant */}
                <div className="aspect-[3/4] sm:aspect-video bg-slate-800/50 rounded-3xl relative border border-slate-700/30">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center text-2xl mx-auto mb-2">
                                A
                            </div>
                            <p className="text-slate-500 text-[10px] font-bold">Anu Sai</p>
                        </div>
                    </div>
                    <div className="absolute bottom-4 left-4">
                        <span className="px-2 py-1 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold rounded-lg border border-white/10 uppercase tracking-tight">
                            Participant
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-8 bg-gradient-to-t from-slate-900 to-transparent flex flex-col items-center gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? "bg-rose-500 text-white" : "bg-slate-800 text-white hover:bg-slate-700"}`}
                    >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>
                    <button
                        onClick={() => setIsVideoOff(!isVideoOff)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? "bg-rose-500 text-white" : "bg-slate-800 text-white hover:bg-slate-700"}`}
                    >
                        {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </button>
                    <button className="w-14 h-14 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-all">
                        <MessageCircle className="w-6 h-6" />
                    </button>
                    {user?.role === "host" && (
                        <button
                            onClick={handleEndSession}
                            className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-all shadow-lg shadow-rose-900/20"
                        >
                            <LogOut className="w-6 h-6" />
                        </button>
                    )}
                </div>

                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50">
                    Bodham Secure Live
                </p>
            </div>
        </div>
    );
}
