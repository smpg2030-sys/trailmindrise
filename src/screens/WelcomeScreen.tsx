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
            <div className="text-6xl animate-float">
              🪷
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center z-10"
      >
        <h1 className="text-5xl font-bold mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500">
          Bodham
        </h1>
        <p className="text-slate-600 text-lg px-6 mb-12 leading-relaxed max-w-xs mx-auto font-medium">
          Awaken Positivity. <br />
          <span className="text-slate-800">Nurture Minds.</span>
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
