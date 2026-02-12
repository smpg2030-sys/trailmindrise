import { Clock, Users } from "lucide-react";

const TABS = ["Live Now", "Upcoming", "Guided", "Open"] as const;

const ROOMS = [
  { title: "Morning Zen", desc: "Gentle breathwork and intentions", count: 121, bg: "bg-emerald-50" },
  { title: "Midday Pause", desc: "Sharing gratitude and daily wins", count: 56, bg: "bg-sky-50" },
  { title: "Safe Space: Anxiety", desc: "A quiet room for open listening", count: 12, bg: "bg-violet-50" },
];

export default function MindRoomsScreen() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-slate-300 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight">Mind Rooms</h1>
        <button type="button" className="p-2 text-white hover:bg-slate-200/10 rounded-full transition-colors" aria-label="Schedule">
          <Clock className="w-5 h-5" />
        </button>
      </header>

      <div className="flex px-4 border-b border-slate-300 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-4 text-sm font-bold whitespace-nowrap transition-colors relative hover:bg-slate-200/10 ${tab === "Live Now" ? "text-white" : "text-slate-500"
              }`}
          >
            {tab}
            {tab === "Live Now" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {ROOMS.map((room) => (
          <div key={room.title} className="bg-black border border-slate-300 rounded-none p-5 relative">
            <div className="flex items-center gap-2 text-sm text-pink-500 font-bold mb-2 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              LIVE NOW
            </div>
            <h2 className="text-lg font-bold text-white">{room.title}</h2>
            <p className="text-slate-500 text-sm mt-1">{room.desc}</p>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">{room.count} listening</span>
              </div>
              <button
                type="button"
                className="px-4 py-1.5 rounded-full border border-slate-500 text-white font-bold text-sm hover:bg-slate-900 transition"
              >
                Join
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}