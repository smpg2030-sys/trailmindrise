import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, Compass, MessageCircle, Zap, User, Plus, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHomeRefresh } from "../context/HomeRefreshContext";

const navItems = [
    { to: "/", label: "Home", Icon: Home },
    { to: "/explore", label: "Explore", Icon: Compass },
    { to: "/messages", label: "Messages", Icon: MessageCircle },
    { to: "/focus", label: "Focus", Icon: Zap },
    { to: "/profile", label: "Profile", Icon: User },
];

export default function Sidebar() {
    const { user: currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const { triggerRefresh } = useHomeRefresh();
    const location = useLocation();

    return (
        <aside className="w-64 h-screen sticky top-0 bg-black border-r border-slate-300 flex flex-col p-4 z-40">
            <div className="mb-4 px-3 py-2">
                <h1 className="text-3xl font-black text-white tracking-tight">
                    Bodham
                </h1>
            </div>

            <nav className="flex-1 space-y-1">
                {navItems.map(({ to, label, Icon }) => {
                    const isActive = location.pathname === to;
                    return (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === "/"}
                            onClick={(e) => {
                                if (to === "/") {
                                    if (window.location.pathname === "/") {
                                        e.preventDefault();
                                        triggerRefresh();
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }
                            }}
                            className={({ isActive }) =>
                                `flex items-center gap-4 px-4 py-3 rounded-full transition-colors ${isActive
                                    ? "font-bold text-white bg-transparent"
                                    : "font-normal text-slate-100 hover:bg-slate-200/10"
                                }`
                            }
                        >
                            <Icon
                                className={`w-7 h-7 ${isActive ? "fill-current" : ""}`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className="text-xl">{label}</span>
                        </NavLink>
                    );
                })}

                <button
                    onClick={() => {
                        navigate("/?create=true");
                    }}
                    className="w-full mt-6 flex items-center justify-center gap-2 bg-white text-black p-4 rounded-full font-bold hover:bg-opacity-90 transition shadow-none"
                >
                    <Plus className="w-5 h-5" />
                    <span>Post</span>
                </button>
            </nav>

            <div className="mt-auto pt-4">
                <div className="flex items-center gap-3 px-3 py-3 rounded-full hover:bg-slate-200/10 cursor-pointer transition group">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold border border-black">
                        {currentUser?.profile_pic ? (
                            <img src={currentUser.profile_pic} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            currentUser?.full_name?.[0] || currentUser?.email?.[0]?.toUpperCase() || "U"
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">
                            {currentUser?.full_name || "User"}
                        </p>
                        <p className="text-slate-500 text-sm truncate">@{currentUser?.email?.split('@')[0]}</p>
                    </div>
                    <button onClick={logout} className="text-slate-500 hover:text-white">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
