import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { LiveRoom } from "../types";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, Play, Lock, Sparkles, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function LiveSessionsScreen() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<LiveRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"live" | "upcoming">("live");

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8000/api" : "/api");

    useEffect(() => {
        fetchRooms();
    }, [activeTab]);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/sessions/rooms?status=${activeTab}`);
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            }
        } catch (error) {
            console.error("Failed to fetch sessions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (room: LiveRoom) => {
        if (room.access === "paid" && room.hostId !== user?.id) {
            // Check if user needs to pay (simplified flow)
            // In a real app, this would trigger a payment modal
            alert(`This is a paid session ($${room.price}). Simulating payment...`);
            const payRes = await fetch(`${BASE_URL}/sessions/pay?room_id=${room.id}&user_id=${user?.id}&amount=${room.price}`, {
                method: "POST"
            });
            if (!payRes.ok) {
                alert("Payment simulation failed");
                return;
            }
        }

        const res = await fetch(`${BASE_URL}/sessions/join?room_id=${room.id}&user_id=${user?.id}`, {
            method: "POST"
        });

        if (res.ok) {
            const { token } = await res.json();
            navigate(`/sessions/${room.id}`, { state: { token } });
        } else {
            const error = await res.json();
            alert(error.detail || "Failed to join session");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 p-4">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-indigo-500 fill-indigo-100" />
                        Live Rooms
                    </h1>
                    {user?.role === "host" && user?.isVerifiedHost && (
                        <button
                            onClick={() => navigate("/sessions/host")}
                            className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 flex items-center gap-1.5"
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            Host Dashboard
                        </button>
                    )}
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab("live")}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "live" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
                    >
                        Live Now
                    </button>
                    <button
                        onClick={() => setActiveTab("upcoming")}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "upcoming" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
                    >
                        Upcoming
                    </button>
                </div>
            </header>

            <main className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center py-20">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 text-sm">Searching for sessions...</p>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-center">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm mb-6">
                            🧘‍♂️
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">No {activeTab} sessions</h3>
                        <p className="text-slate-500 text-sm max-w-[240px]">
                            Check back later for newly scheduled meditation or yoga sessions.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {rooms.map(room => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={room.id}
                                className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    {room.access === "paid" && (
                                        <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg border border-amber-100">
                                            <Lock className="w-3 h-3" />
                                            ${room.price}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 mb-1 pr-12">{room.title}</h3>
                                <div className="flex items-center gap-3 text-slate-500 text-xs mb-4">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(room.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5" />
                                        {room.totalAttendees || 0} joined
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${activeTab === "live" ? "bg-rose-500 animate-pulse" : "bg-slate-300"}`}></span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            {activeTab === "live" ? "Live" : "Upcoming"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleJoin(room)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        {activeTab === "live" ? "Join Now" : "Set Reminder"}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
