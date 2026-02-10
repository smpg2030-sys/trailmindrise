import React, { useState, useEffect } from "react";
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
    <div className="app-container min-h-screen bg-[#f8f9fa] p-4 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 text-slate-600 text-2xl"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Immediate Support</h1>
      </div>

      {connecting ? (
        <div className="text-center py-12">
          <div className="w-32 h-32 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-5xl animate-pulse">💗</span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-800">Connecting you...</h2>
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
          <div className="bg-gradient-to-r from-green-100 to-sky-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-sky-400 rounded-full flex items-center justify-center text-3xl text-white">
                👩‍⚕️
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800">{therapist.name}</h3>
                <p className="text-sm text-slate-600">{therapist.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-600 font-medium">Available Now</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
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
              className="w-full py-4 rounded-xl font-semibold text-white bg-green-500 flex items-center justify-center gap-2 no-underline"
            >
              <span>📞</span> Call Now (9398789351)
            </a>
            <a
              href="https://wa.me/919398789351?text=Hello,%20I%20need%20immediate%20support."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-xl font-semibold text-white bg-sky-500 flex items-center justify-center gap-2 no-underline"
            >
              <span>💬</span> Chat on WhatsApp
            </a>
            <button
              type="button"
              className="w-full py-4 rounded-xl font-semibold text-white bg-violet-500 flex items-center justify-center gap-2"
            >
              <span>📹</span> Video Call
            </button>
          </div>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <h4 className="font-bold text-slate-800 mb-2">🚨 Crisis Hotlines</h4>
            <div className="space-y-2 text-sm text-slate-700">
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

