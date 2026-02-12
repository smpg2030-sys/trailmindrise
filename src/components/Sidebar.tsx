import { NavLink, useNavigate } from "react-router-dom";
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
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { triggerRefresh } = useHomeRefresh();

    return (
        <aside className="w-64 h-screen sticky top-0 bg-white dark:bg-black border-r border-slate-200 dark:border-zinc-800 flex flex-col p-4 z-40 transition-colors duration-300">
            <div className="mb-8 px-2">
                <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-white dark:to-zinc-400 tracking-tight">
                    Bodham
                </h1>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map(({ to, label, Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        onClick={(e) => {
                            if (to === "/") {
                                // If we are already on home, trigger refresh and scroll to top
                                if (window.location.pathname === "/") {
                                    e.preventDefault();
                                    triggerRefresh();
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${isActive
                                ? "bg-emerald-50 text-emerald-600 shadow-sm dark:bg-zinc-900 dark:text-white dark:shadow-none"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                            }`
                        }
                    >
                        <Icon className="w-5 h-5" />
                        <span>{label}</span>
                    </NavLink>
                ))}

                <button
                    onClick={() => {
                        navigate("/?create=true");
                    }}
                    className="w-full mt-6 flex items-center justify-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-black p-4 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-zinc-200 transition shadow-lg shadow-slate-200 dark:shadow-none"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Post</span>
                </button>
            </nav>

            <div className="mt-auto border-t border-slate-100 dark:border-zinc-800 pt-4 space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-zinc-900 flex items-center justify-center text-emerald-600 dark:text-white font-bold overflow-hidden border border-emerald-50 dark:border-zinc-800">
                        {user?.profile_pic ? (
                            <img src={user.profile_pic} alt="" className="w-full h-full object-cover" />
                        ) : (
                            user?.full_name?.[0] || user?.email?.[0]?.toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user?.full_name || "User"}</p>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 truncate">{user?.email}</p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-zinc-900 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
