import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="app-container flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6 relative overflow-hidden"
    >
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-200/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="relative mb-12"
      >
        <div className="absolute inset-0 bg-emerald-300 rounded-full blur-xl opacity-20 animate-pulse"></div>
        <div className="bg-white rounded-full w-48 h-48 flex items-center justify-center shadow-premium relative z-10 glass-card border-none">
          <div className="text-emerald-500">
            <svg
              className="w-24 h-24 animate-float"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ strokeWidth: 1.5 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center z-10"
      >
        <h1 className="text-5xl font-bold text-slate-800 mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
          Bodham
        </h1>
        <p className="text-slate-600 text-lg px-6 mb-12 leading-relaxed max-w-xs mx-auto">
          Your peaceful space for <br />
          <span className="font-semibold text-emerald-600">daily well-being</span>.
        </p>
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => navigate("/goals")}
        className="w-full max-w-xs py-4 rounded-2xl font-bold text-white bg-slate-900 shadow-xl shadow-slate-200 hover:shadow-2xl transition-all z-10 flex items-center justify-center gap-2 group"
      >
        <span>Get Started</span>
        <span className="group-hover:translate-x-1 transition-transform">→</span>
      </motion.button>
    </motion.div>
  );
}
