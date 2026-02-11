import { Clock, Users } from "lucide-react";

const TABS = ["Live Now", "Upcoming", "Guided", "Open"] as const;

const ROOMS = [
  { title: "Morning Zen", desc: "Gentle breathwork and intentions", count: 121, bg: "bg-emerald-50" },
  { title: "Midday Pause", desc: "Sharing gratitude and daily wins", count: 56, bg: "bg-sky-50" },
  { title: "Safe Space: Anxiety", desc: "A quiet room for open listening", count: 12, bg: "bg-violet-50" },
];

export default function MindRoomsScreen() {
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 px-4 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Mind Rooms</h1>
        <button type="button" className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors" aria-label="Schedule">
          <Clock className="w-5 h-5" />
        </button>
      </header>

      <div className="flex gap-2 px-4 py-4 bg-white/90 backdrop-blur-sm border-b border-slate-100/50 overflow-x-auto pb-3 no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${tab === "Live Now" ? "bg-green-500 text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {ROOMS.map((room) => (
          <div key={room.title} className={`${room.bg} rounded-2xl p-5 shadow-sm`}>
            <div className="flex items-center gap-2 text-sm text-pink-600 font-medium mb-2">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              LIVE NOW
            </div>
            <h2 className="text-lg font-bold text-slate-800">{room.title}</h2>
            <p className="text-slate-600 text-sm mt-1">{room.desc}</p>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">{room.count}</span>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white" />
                  ))}
                  <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs text-slate-600">
                    +{room.count - 3}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 transition"
              >
                Join Circle
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}