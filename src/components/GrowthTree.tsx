import { motion } from "framer-motion";
import { TreePine, Sprout, Leaf, Flower2, Sparkles } from "lucide-react";

interface GrowthTreeProps {
    createdAt?: string | null;
}

export default function GrowthTree({ createdAt }: GrowthTreeProps) {
    const calculateDays = () => {
        if (!createdAt) return 0;
        const created = new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - created.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const days = calculateDays();

    const getStage = () => {
        if (days >= 90) return { icon: <TreePine size={64} className="text-yellow-400" />, label: "Glowing Tree", sub: "90+ Days of Growth", color: "from-yellow-400 to-amber-600", effect: true };
        if (days >= 60) return { icon: <Flower2 size={64} className="text-pink-400" />, label: "Flowering Tree", sub: "60+ Days of Growth", color: "from-pink-400 to-rose-600" };
        if (days >= 30) return { icon: <TreePine size={64} className="text-green-500" />, label: "Healthy Tree", sub: "30+ Days of Growth", color: "from-green-500 to-emerald-700" };
        if (days >= 14) return { icon: <TreePine size={48} className="text-green-400" />, label: "Growing Tree", sub: "14+ Days of Growth", color: "from-green-400 to-green-600" };
        if (days >= 7) return { icon: <Leaf size={40} className="text-green-300" />, label: "Small Plant", sub: "7+ Days of Growth", color: "from-green-300 to-green-500" };
        if (days >= 3) return { icon: <Sprout size={32} className="text-green-200" />, label: "Small Sprout", sub: "3+ Days of Growth", color: "from-green-200 to-green-400" };
        return { icon: <div className="w-4 h-4 rounded-full bg-amber-800" />, label: "Seed", sub: "Just Started", color: "from-amber-700 to-amber-900" };
    };

    const stage = getStage();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden relative group">
            {/* Decorative background gradients */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stage.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />

            <div className="relative flex flex-col items-center gap-6 text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    🌳 <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">My Growth Tree</span>
                </h2>

                <div className="relative">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 100, damping: 15 }}
                        className={`w-32 h-32 rounded-full flex items-center justify-center bg-white dark:bg-gray-900 shadow-2xl border-4 border-opacity-20 ${stage.color.split(' ')[0]}`}
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

                    {/* Particle decorations */}
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
                        className="text-3xl font-black text-gray-900 dark:text-white"
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
