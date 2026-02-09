import React from "react";
import { useNavigate } from "react-router-dom";

export default function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="app-container flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-blue-50 p-6">
      <div className="bg-white rounded-full w-48 h-48 flex items-center justify-center shadow-lg mb-8">
        <div className="text-emerald-500">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" />
            <path
              d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <h1 className="text-4xl font-bold text-slate-800 mb-4 text-center">Welcome to MindRise</h1>
      <p className="text-slate-600 text-center px-8 mb-12">
        Rise to a healthier mind. A peaceful space
        <br />
        for your daily well-being journey.
      </p>
      <button
        type="button"
        onClick={() => navigate("/goals")}
        className="w-80 max-w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 shadow-lg hover:shadow-green-200 transition"
      >
        Get Started
      </button>
    </div>
  );
}
