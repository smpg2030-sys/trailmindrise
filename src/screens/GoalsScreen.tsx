import { useState } from "react";
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
        localStorage.setItem("bodham_goals", JSON.stringify(selectedGoals));
      } catch { }
    }
    navigate("/login");
  };

  return (
    <div className="app-container min-h-screen bg-black p-6 pb-28 flex flex-col justify-center">
      <h2 className="text-3xl font-black text-left mb-2 text-white tracking-tight">
        What brings you to
        <br />
        Bodham?
      </h2>
      <p className="text-slate-500 text-left mb-8">
        Select your mental wellness goals to personalize your experience.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-24">
        {GOALS.map((goal) => (
          <button
            key={goal.id}
            type="button"
            onClick={() => toggle(goal.id)}
            className={`relative rounded-xl p-6 text-left transition border ${selectedGoals.includes(goal.id)
              ? "border-white bg-slate-900"
              : "border-slate-800 bg-black hover:bg-slate-900/50"
              }`}
          >
            <span className="text-3xl block mb-3">{goal.icon}</span>
            <h3 className="font-bold text-lg text-white">{goal.title}</h3>
            <p className="text-sm text-slate-500">{goal.subtitle}</p>
            {selectedGoals.includes(goal.id) && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center text-black text-xs font-bold">
                ✓
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-black border-t border-slate-800 max-w-[430px] mx-auto">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-3.5 rounded-full font-bold text-black bg-white hover:bg-slate-200 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
