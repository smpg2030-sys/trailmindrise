import { useState } from "react";
import { Plus } from "lucide-react";

const CONVOS = [
  { id: 1, name: "Sarah Miller", preview: "I hope you are feeling better!", time: "2M AGO", unread: true },
  { id: 2, name: "Dr. Johnson", preview: "Let's check in tomorrow.", time: "1H AGO", unread: false },
  { id: 3, name: "Yoga Group", preview: "The morning session was great!", time: "3H AGO", unread: true },
  { id: 4, name: "Mindfulness Community", preview: "Welcome to the group!", time: "1D AGO", unread: false },
];

type Convo = (typeof CONVOS)[number];

export default function MessagingScreen() {
  const [selectedChat, setSelectedChat] = useState<Convo | null>(null);
  const [messageText, setMessageText] = useState("");

  if (selectedChat) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-24">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 px-4 py-4 flex items-center gap-3 shadow-sm">
          <button
            type="button"
            onClick={() => setSelectedChat(null)}
            className="text-xl text-slate-600"
          >
            ←
          </button>
          <div className="w-10 h-10 rounded-full bg-amber-100 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800">{selectedChat.name}</p>
            <p className="text-xs text-green-500">Online</p>
          </div>
        </header>

        <div className="flex-1 p-4 overflow-y-auto bg-slate-50">
          <div className="mb-3">
            <div className="inline-block bg-white p-3 rounded-xl shadow-sm">
              <p className="text-sm text-slate-700">Hey! How are you doing today?</p>
              <span className="text-xs text-slate-400">10:30 AM</span>
            </div>
          </div>
          <div className="mb-3 text-right">
            <div className="inline-block bg-green-500 text-white p-3 rounded-xl">
              <p className="text-sm">I'm doing great, thanks! 😊</p>
              <span className="text-xs text-green-100">10:32 AM</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100/50">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 p-3 border-2 border-slate-200 rounded-full"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <button
              type="button"
              className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center text-lg"
            >
              📤
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 px-4 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Messages</h1>
        <button
          type="button"
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
          aria-label="New message"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <ul className="divide-y divide-slate-100">
        {CONVOS.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setSelectedChat(c)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition"
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-amber-100" />
                {c.unread && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{c.name}</p>
                <p className="text-sm text-slate-500 truncate">{c.preview}</p>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">{c.time}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
