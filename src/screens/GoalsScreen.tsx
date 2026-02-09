import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const GOALS = [
  { id: "anxiety", icon: "💙", title: "Reduce Anxiety", subtitle: "Find your calm" },
  { id: "sleep", icon: "🌙", title: "Better Sleep", subtitle: "Rest deeply" },
  { id: "gratitude", icon: "💗", title: "Build Gratitude", subtitle: "Appreciate more" },
  { id: "focus", icon: "⚡", title: "Stay Focused", subtitle: "Sharpen your mind" },
  { id: "stress", icon: "🍃", title: "Stress Relief", subtitle: "Release tension" },
  { id: "esteem", icon: "👤", title: "Self Esteem", subtitle: "Love yourself" },
];

export default function GoalsScreen() {
  const navigate = useNavigate();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    if (selectedGoals.length) {
      try {
        localStorage.setItem("mindrise_goals", JSON.stringify(selectedGoals));
      } catch {}
    }
    navigate("/login");
  };

  return (
    <div className="app-container min-h-screen bg-[#f8f9fa] p-6 pb-28">
      <h2 className="text-3xl font-bold text-center mt-12 mb-2 text-slate-800">
        What brings you to
        <br />
        MindRise?
      </h2>
      <p className="text-slate-500 text-center mb-8">
        Select your mental wellness goals to personalize your experience.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-24">
        {GOALS.map((goal) => (
          <button
            key={goal.id}
            type="button"
            onClick={() => toggle(goal.id)}
            className={`relative rounded-2xl p-6 text-left transition border-2 ${
              selectedGoals.includes(goal.id)
                ? "border-green-500 bg-green-50"
                : "border-transparent bg-white"
            } goal-card ${selectedGoals.includes(goal.id) ? "selected" : ""}`}
          >
            <span className="text-4xl block mb-3">{goal.icon}</span>
            <h3 className="font-bold text-lg text-slate-800">{goal.title}</h3>
            <p className="text-sm text-slate-500">{goal.subtitle}</p>
            {selectedGoals.includes(goal.id) && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                ✓
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t max-w-[430px] mx-auto">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-green-400 to-green-600"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
