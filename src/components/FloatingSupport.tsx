import { useNavigate } from "react-router-dom";

export default function FloatingSupport() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/support")}
      className="fixed z-40 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-slate-200 right-6 bottom-24 lg:bottom-12 lg:right-12 bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-slate-200"
      aria-label="Immediate support"
    >
      <span className="text-3xl" role="img" aria-hidden>🆘</span>
    </button>
  );
}
