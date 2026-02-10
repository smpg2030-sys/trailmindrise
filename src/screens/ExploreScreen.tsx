import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";

const CATEGORIES = [
  { icon: "☀️", title: "Meditation", subtitle: "120+ Sessions", bg: "bg-emerald-100" },
  { icon: "🖼️", title: "Journaling", subtitle: "Daily Prompts", bg: "bg-sky-100" },
  { icon: "👥", title: "Community", subtitle: "Active Stories", bg: "bg-violet-100" },
  { icon: "📚", title: "E-Books", subtitle: "Premium Library", bg: "bg-amber-100" },
];

const EBOOKS = [
  { title: "The Power of Now", author: "Eckhart Tolle", cover: "📘", price: "Premium" },
  { title: "Atomic Habits", author: "James Clear", cover: "📗", price: "Premium" },
  { title: "The Subtle Art", author: "Mark Manson", cover: "📙", price: "Premium" },
  { title: "Mindfulness Guide", author: "Jon Kabat-Zinn", cover: "📕", price: "Premium" },
  { title: "Calm Mind Journey", author: "Sarah Miller", cover: "📔", price: "Premium" },
];

const COMMUNITY_STORIES = [
  {
    title: "Indian AI Reading Document",
    source: "The Better India",
    link: "https://thebetterindia.com/innovation/indian-ai-document-reading-sarvam-gemini-openai-language-tests-11092770",
    cover: "/images/sarvam-ai.png",
    description: "How Sarvam AI is breaking language barriers in document reading."
  }
];

export default function ExploreScreen() {
  const navigate = useNavigate();
  const [showEbooks, setShowEbooks] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [hasEbookAccess, setHasEbookAccess] = useState(false);

  const handleSubscribe = () => {
    setShowPayment(true);
  };

  const handlePaymentDone = () => {
    setHasEbookAccess(true);
    setShowPayment(false);
    setShowEbooks(false);
  };

  return (
    <div className="app-container min-h-screen bg-[#f8f9fa] pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Explore</h1>
        <button type="button" className="p-2 text-slate-600" aria-label="Notifications">
          <Bell className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4">
        <div className="mb-6">
          <input
            type="text"
            className="w-full p-3 bg-slate-100 rounded-xl border-0"
            placeholder="Search meditations, journals..."
          />
        </div>

        <button
          type="button"
          onClick={() => navigate("/support")}
          className="w-full mb-6 p-4 rounded-xl bg-green-100 flex items-center justify-between hover:bg-green-200 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center text-2xl">
              💗
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-800">Need immediate support?</div>
              <div className="text-sm text-slate-600">We're here for you 24/7</div>
            </div>
          </div>
          <span className="text-slate-500">→</span>
        </button>

        <h2 className="text-xl font-bold text-slate-800 mb-4">Categories</h2>
        <div className="grid grid-cols-2 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.title}
              type="button"
              onClick={() => {
                if (cat.title === "E-Books") setShowEbooks(true);
                if (cat.title === "Community") setShowCommunity(true);
              }}
              className={`${cat.bg} rounded-xl p-6 text-left transition hover:opacity-90`}
            >
              <span className="text-3xl block mb-2">{cat.icon}</span>
              <div className="font-bold text-slate-800">{cat.title}</div>
              <div className="text-sm text-slate-600">{cat.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      {showCommunity && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowCommunity(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Community Stories</h2>
              <button type="button" onClick={() => setShowCommunity(false)} className="text-2xl text-slate-500">
                ×
              </button>
            </div>
            <div className="p-4 space-y-4">
              {COMMUNITY_STORIES.map((story, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-white rounded-xl shadow-sm overflow-hidden flex items-center justify-center">
                      {story.cover.startsWith("/") ? (
                        <img src={story.cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">{story.cover}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{story.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{story.source}</p>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm">{story.description}</p>
                  <a
                    href={story.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-violet-600 text-white text-center rounded-xl font-semibold hover:bg-violet-700 transition mt-2"
                  >
                    Read Story
                  </a>
                </div>
              ))}
              <div className="text-center py-6 text-slate-400">
                <p className="text-sm">More stories coming soon!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEbooks && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowEbooks(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">E-Books Library</h2>
              <button type="button" onClick={() => setShowEbooks(false)} className="text-2xl text-slate-500">
                ×
              </button>
            </div>
            <div className="p-4">
              {!hasEbookAccess ? (
                <div className="bg-gradient-to-r from-violet-100 to-pink-100 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold mb-2">Unlock Premium E-Books</h3>
                  <p className="text-slate-600 mb-4">Get unlimited access to our entire wellness library</p>
                  <div className="text-2xl font-bold mb-4">$9.99<span className="text-base">/month</span></div>
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600"
                  >
                    Subscribe Now
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-100 rounded-xl p-4 mb-6 flex items-center gap-2">
                  <span className="text-xl">✓</span>
                  <span className="font-semibold text-emerald-800">Premium Active</span>
                </div>
              )}
              <div className="space-y-3">
                {EBOOKS.map((book, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                    <span className="text-4xl">{book.cover}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800">{book.title}</h3>
                      <p className="text-sm text-slate-600">{book.author}</p>
                      <p className="text-xs text-violet-600 mt-1">{book.price}</p>
                    </div>
                    {hasEbookAccess ? (
                      <button type="button" className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm">
                        Read
                      </button>
                    ) : (
                      <span className="text-slate-400">🔒</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPayment && (
        <div
          className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4"
          onClick={() => setShowPayment(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Payment Details</h2>
            <div className="bg-gradient-to-r from-violet-500 to-pink-500 rounded-xl p-6 text-white mb-6">
              <div className="text-sm opacity-90">Subscription</div>
              <div className="text-2xl font-bold">$9.99<span className="text-base">/month</span></div>
              <div className="text-sm mt-1">E-Books Premium Access</div>
            </div>
            <input
              type="text"
              className="w-full p-3 border-2 border-slate-200 rounded-xl mb-3"
              placeholder="Card Number"
              maxLength={19}
            />
            <div className="flex gap-3">
              <input
                type="text"
                className="flex-1 p-3 border-2 border-slate-200 rounded-xl"
                placeholder="MM/YY"
                maxLength={5}
              />
              <input
                type="text"
                className="flex-1 p-3 border-2 border-slate-200 rounded-xl"
                placeholder="CVV"
                maxLength={4}
              />
            </div>
            <button
              type="button"
              onClick={handlePaymentDone}
              className="w-full mt-6 py-3 rounded-xl font-semibold text-white bg-emerald-500"
            >
              Complete Payment
            </button>
            <p className="text-xs text-slate-500 text-center mt-4">🔒 Secure payment</p>
          </div>
        </div>
      )}
    </div>
  );
}
