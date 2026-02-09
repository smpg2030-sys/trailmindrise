import React from "react";
import { useNavigate } from "react-router-dom";

export default function FloatingSupport() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/support")}
      className="fixed z-40 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-lg"
      style={{
        background: "linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 100%)",
        border: "3px dashed #f472b6",
        boxShadow: "0 4px 12px rgba(244, 114, 182, 0.3)",
        // Inside 430px app column: 24px from right edge of container when centered
        right: "max(24px, calc((100vw - 430px) / 2 + 24px))",
        bottom: "80px",
      }}
      aria-label="Immediate support"
    >
      <span className="text-3xl" role="img" aria-hidden>❤️</span>
    </button>
  );
}
