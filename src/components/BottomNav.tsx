import { NavLink, useLocation } from "react-router-dom";
import { Home, Compass, MessageCircle, Zap, User } from "lucide-react";
import { useHomeRefresh } from "../context/HomeRefreshContext";

const navItems = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/explore", label: "Explore", Icon: Compass },
  { to: "/messages", label: "Messages", Icon: MessageCircle },
  { to: "/focus", label: "Focus", Icon: Zap },
  { to: "/profile", label: "Profile", Icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const { triggerRefresh } = useHomeRefresh();
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div className="w-full max-w-[640px] md:max-w-[768px] bg-white/90 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] px-4 pb-6 pt-3 flex items-center justify-around pointer-events-auto">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={(e) => {
              if (to === "/") {
                // If we are already on home, trigger refresh and scroll to top
                if (location.pathname === "/") {
                  e.preventDefault();
                  triggerRefresh();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }
            }}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${isActive ? "text-emerald-600 scale-110" : "text-slate-400 hover:text-slate-600"
              }`
            }
          >
            <Icon className={`w-5 h-5 mb-1.5 transition-transform ${to === location.pathname ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            <span className="opacity-80">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
