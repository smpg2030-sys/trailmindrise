import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FloatingSupport from "../components/FloatingSupport";

export default function TherapistSupportScreen() {
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(true);
  const [therapist] = useState({
    name: "Manikanta",
    title: "Crisis Counselor",
    specialty: "Anxiety & Stress Management",
    experience: "5+ years",
  });

  useEffect(() => {
    const t = setTimeout(() => setConnecting(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="app-container min-h-screen bg-black p-4 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 text-white text-2xl hover:bg-slate-900 rounded-full transition-colors"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-white">Immediate Support</h1>
      </div>

      {connecting ? (
        <div className="text-center py-12">
          <div className="w-32 h-32 bg-slate-900 rounded-full mx-auto mb-6 flex items-center justify-center border border-slate-800">
            <span className="text-5xl animate-pulse">💗</span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Connecting you...</h2>
          <p className="text-slate-500 text-sm">
            Our system is finding the best therapist
            <br />
            available for your needs right now.
          </p>
          <div className="flex justify-center gap-2 mt-6">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" />
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      ) : (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-3xl text-white border border-slate-700">
                👩‍⚕️
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{therapist.name}</h3>
                <p className="text-sm text-slate-400">{therapist.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-500 font-medium">Available Now</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span>🎯</span>
                <span><strong>Specialty:</strong> {therapist.specialty}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span><strong>Experience:</strong> {therapist.experience}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <a
              href="tel:9398789351"
              className="w-full py-4 rounded-xl font-semibold text-black bg-white hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 no-underline border border-transparent"
            >
              <span>📞</span> Call Now (9398789351)
            </a>
            <a
              href="https://wa.me/919398789351?text=Hello,%20I%20need%20immediate%20support."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-xl font-semibold text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 no-underline"
            >
              <span>💬</span> Chat on WhatsApp
            </a>
            <button
              type="button"
              className="w-full py-4 rounded-xl font-semibold text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <span>📹</span> Video Call
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-6">
            <h4 className="font-bold text-white mb-2">🚨 Crisis Hotlines</h4>
            <div className="space-y-2 text-sm text-slate-400">
              <div><strong>National Crisis Line:</strong> 988</div>
              <div><strong>Crisis Text Line:</strong> Text HOME to 741741</div>
              <div><strong>Available:</strong> 24/7</div>
            </div>
          </div>
        </>
      )}
      <FloatingSupport />
    </div>
  );
}

