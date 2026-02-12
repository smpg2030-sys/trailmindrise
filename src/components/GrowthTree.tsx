import { motion } from "framer-motion";
import { TreePine, Leaf, Flower2, Sparkles } from "lucide-react";

interface GrowthTreeProps {
    createdAt?: string | null;
    manualStreak?: number;
    variant?: "full" | "mini";
    onClick?: () => void;
}

export default function GrowthTree({ createdAt, manualStreak, variant = "full", onClick }: GrowthTreeProps) {
    const calculateDays = () => {
        if (manualStreak !== undefined) return manualStreak;
        if (!createdAt) return 0;
        const created = new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - created.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const days = calculateDays();

    const getStage = () => {
        const sproutColor = "text-emerald-500";
        const sproutIcon = (size: number) => (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={sproutColor}>
                <motion.path
                    d="M12 22C12 22 12 18 12 13"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
                <motion.path
                    initial={{ rotate: -10, originX: "100%", originY: "100%" }}
                    animate={{ rotate: [-10, 5, -10] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    d="M12 13C12 13 8 13 4 9C4 9 3 13 12 13Z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1"
                />
                <motion.path
                    initial={{ rotate: 10, originX: "0%", originY: "100%" }}
                    animate={{ rotate: [10, -5, 10] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    d="M12 13C12 13 16 13 20 9C20 9 21 13 12 13Z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1"
                />
            </svg>
        );

        if (days >= 90) return { icon: <TreePine size={variant === "mini" ? 20 : 64} className="text-yellow-400" />, label: "Glowing Tree", sub: "90+ Days", color: "from-yellow-400 to-amber-600", effect: true };
        if (days >= 60) return { icon: <Flower2 size={variant === "mini" ? 20 : 64} className="text-pink-400" />, label: "Flowering Tree", sub: "60+ Days", color: "from-pink-400 to-rose-600" };
        if (days >= 30) return { icon: <TreePine size={variant === "mini" ? 20 : 64} className="text-green-500" />, label: "Healthy Tree", sub: "30+ Days", color: "from-green-500 to-emerald-700" };
        if (days >= 14) return { icon: <TreePine size={variant === "mini" ? 18 : 48} className="text-green-400" />, label: "Growing Tree", sub: "14+ Days", color: "from-green-400 to-green-600" };
        if (days >= 7) return { icon: <Leaf size={variant === "mini" ? 18 : 40} className="text-green-300" />, label: "Small Plant", sub: "7+ Days", color: "from-green-300 to-green-500" };
        if (days >= 3) return { icon: sproutIcon(variant === "mini" ? 20 : 48), label: "Small Sprout", sub: "3+ Days", color: "from-emerald-300 to-emerald-500" };
        return { icon: sproutIcon(variant === "mini" ? 16 : 32), label: "Just Born", sub: "Day 1", color: "from-emerald-400 to-teal-500" };
    };

    const stage = getStage();

    if (variant === "mini") {
        return (
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClick}
                className={`relative flex items-center justify-center p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-slate-100 dark:border-gray-700 overflow-hidden group`}
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${stage.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className="relative z-10">
                    {stage.icon}
                    {stage.effect && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-1 flex items-center justify-center pointer-events-none"
                        >
                            <Sparkles size={24} className="text-yellow-400 opacity-40 blur-[1px]" />
                        </motion.div>
                    )}
                </div>
            </motion.button>
        );
    }

    return (
        <div className="bg-black rounded-3xl p-8 shadow-xl border border-slate-800 overflow-hidden relative group">
            <div className={`absolute inset-0 bg-gradient-to-br ${stage.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />

            <div className="relative flex flex-col items-center gap-6 text-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🌳 <span className="text-white">My Growth Tree</span>
                </h2>

                <div className="relative">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 100, damping: 15 }}
                        className={`w-32 h-32 rounded-full flex items-center justify-center bg-slate-900 shadow-2xl border-4 border-opacity-20 ${stage.color.split(' ')[0]}`}
                    >
                        {stage.icon}
                        {stage.effect && (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                                <Sparkles size={100} className="text-yellow-400 opacity-30" />
                            </motion.div>
                        )}
                    </motion.div>

                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute -top-2 -right-2 bg-emerald-500 w-3 h-3 rounded-full blur-sm"
                    />
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute -bottom-2 -left-2 bg-teal-500 w-2 h-2 rounded-full blur-sm"
                    />
                </div>

                <div>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-3xl font-black text-white"
                    >
                        {stage.label}
                    </motion.p>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        {stage.sub}
                    </p>
                </div>

                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((days / 90) * 100, 100)}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={`h-full bg-gradient-to-r ${stage.color}`}
                    />
                </div>
            </div>
        </div>
    );
}
