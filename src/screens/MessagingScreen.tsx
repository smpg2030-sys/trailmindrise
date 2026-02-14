import { useState, useEffect } from "react";
import { Plus, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface Convo {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: boolean;
  profile_pic?: string | null;
  last_active_at?: string | null;
}

export default function MessagingScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Convo | null>(null);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      try {
        const res = await fetch(`/api/friends/list?user_id=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map((f: any) => ({
            id: f.id,
            name: f.full_name || f.email,
            preview: "Start a conversation!",
            time: "NEW",
            unread: false,
            profile_pic: f.profile_pic,
            last_active_at: f.last_active_at
          }));
          setFriends(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch friends", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  const isOnline = (lastActiveAt: string | null | undefined) => {
    if (!lastActiveAt) return false;
    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    // Consider online if active in last 5 minutes
    return now.getTime() - lastActive.getTime() < 5 * 60 * 1000;
  };

  if (selectedChat) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-24">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 px-4 py-4 flex items-center gap-3 shadow-sm">
          <button
            type="button"
            onClick={() => setSelectedChat(null)}
            className="text-xl text-slate-600 px-2"
          >
            ←
          </button>

          {selectedChat.profile_pic ? (
            <img
              src={selectedChat.profile_pic}
              alt={selectedChat.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <User className="w-6 h-6 text-amber-600" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{selectedChat.name}</p>
            <p className={`text-xs ${isOnline(selectedChat.last_active_at) ? 'text-green-500' : 'text-slate-400'}`}>
              {isOnline(selectedChat.last_active_at) ? 'Online' : 'Offline'}
            </p>
          </div>
        </header>

        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col justify-end">
          <div className="flex flex-col items-center mb-8 opacity-40">
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-2">
              <User className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 italic">This is the start of your chat with {selectedChat.name}</p>
          </div>
        </div>

        <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100/50">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 p-3 border-2 border-slate-200 rounded-full outline-none focus:border-green-400 transition-colors"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <button
              type="button"
              className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center text-lg shadow-md hover:bg-green-600 transition"
              onClick={() => setMessageText("")}
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

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-20">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500">Finding your friends...</p>
        </div>
      ) : friends.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {friends.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedChat(c)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition"
              >
                <div className="relative flex-shrink-0">
                  {c.profile_pic ? (
                    <img
                      src={c.profile_pic}
                      alt={c.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <User className="w-7 h-7 text-amber-600" />
                    </div>
                  )}
                  {isOnline(c.last_active_at) && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                  <p className="text-sm text-slate-500 truncate">{c.preview}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 font-medium">{c.time}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center pt-20 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-lg font-semibold text-slate-800">No friends yet</p>
          <p className="text-slate-500 mt-2">Add friends from the Explore page to start chatting!</p>
        </div>
      )}
    </div>
  );
}
