import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Compass, MessageCircle, Zap, User } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/explore", label: "Explore", Icon: Compass },
  { to: "/messages", label: "Messages", Icon: MessageCircle },
  { to: "/focus", label: "Focus", Icon: Zap },
  { to: "/profile", label: "Profile", Icon: User },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 max-w-[430px] mx-auto">
      <div className="flex items-center justify-around py-3">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 text-xs transition ${
                isActive ? "text-green-600 font-medium" : "text-slate-500"
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
