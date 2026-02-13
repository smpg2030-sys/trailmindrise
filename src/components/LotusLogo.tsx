

export default function LotusLogo({ className = "w-24 h-24" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="petalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d946ef" /> {/* Fuchsia 500 */}
                    <stop offset="50%" stopColor="#ec4899" /> {/* Pink 500 */}
                    <stop offset="100%" stopColor="#f97316" /> {/* Orange 500 */}
                </linearGradient>
                <linearGradient id="centerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" /> {/* Amber 400 */}
                    <stop offset="100%" stopColor="#f59e0b" /> {/* Amber 500 */}
                </linearGradient>
            </defs>

            {/* Central Petal */}
            <path
                d="M50 20 C60 40 65 60 50 80 C35 60 40 40 50 20 Z"
                fill="url(#petalGradient)"
                opacity="0.9"
            />

            {/* Side Petals (Left) */}
            <path
                d="M50 80 C40 75 25 60 30 35 C40 50 45 70 50 80 Z"
                fill="url(#petalGradient)"
                opacity="0.8"
            />
            <path
                d="M50 80 C40 82 15 75 10 55 C25 65 40 75 50 80 Z"
                fill="url(#petalGradient)"
                opacity="0.7"
            />

            {/* Side Petals (Right) - Mirrored */}
            <path
                d="M50 80 C60 75 75 60 70 35 C60 50 55 70 50 80 Z"
                fill="url(#petalGradient)"
                opacity="0.8"
            />
            <path
                d="M50 80 C60 82 85 75 90 55 C75 65 60 75 50 80 Z"
                fill="url(#petalGradient)"
                opacity="0.7"
            />

            {/* Center Pollen/Stamen Details */}
            <circle cx="50" cy="55" r="3" fill="url(#centerGradient)" />
            <circle cx="50" cy="65" r="2" fill="url(#centerGradient)" />

            {/* Feet/Pad Icon in center (Abstract representation from user image) */}
            <path
                d="M46 50 C46 48 48 46 48 50 C48 54 46 56 46 54 Z"
                fill="#fcd34d"
            />
            <path
                d="M54 50 C54 48 52 46 52 50 C52 54 54 56 54 54 Z"
                fill="#fcd34d"
            />

        </svg>
    );
}
