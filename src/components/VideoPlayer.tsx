import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";

interface VideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    autoPlay?: boolean;
    shouldPlay?: boolean;
}

export default function VideoPlayer({ src, poster, className = "", shouldPlay = false }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Default to muted for reliable autoplay
    const [volume, setVolume] = useState(1);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const controlsTimeoutRef = useRef<any>(null);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => console.log("Manual play failed:", err));
                }
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setVolume(value);
        if (videoRef.current) {
            videoRef.current.volume = value;
            videoRef.current.muted = value === 0;
            setIsMuted(value === 0);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const total = videoRef.current.duration;
            setProgress((current / total) * 100);
        }
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (videoRef.current) {
            const newTime = (value / 100) * videoRef.current.duration;
            videoRef.current.currentTime = newTime;
            setProgress(value);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setError(null);
        }
    };

    const handleError = () => {
        setError("This video journey is unavailable right now.");
        console.error("Video Error:", src);
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                videoRef.current.parentElement?.requestFullscreen();
            }
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    useEffect(() => {
        if (videoRef.current) {
            if (shouldPlay) {
                videoRef.current.play().catch(err => {
                    if (err.name !== 'AbortError') {
                        console.log("Autoplay blocked:", err.name);
                    }
                });
            } else {
                videoRef.current.pause();
            }
        }
    }, [shouldPlay, src]);

    return (
        <div
            className={`relative group bg-black rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500 ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/80 p-6 text-center">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3 text-2xl text-white/40">📽️</div>
                    <p className="text-white text-sm font-medium mb-1 font-serif italic">{error}</p>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Nature is resting</p>
                </div>
            )}
            <video
                key={src}
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-cover"
                muted={isMuted}
                loop
                preload="auto"
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onError={handleError}
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            <div
                className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"
                    }`}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <button
                        onClick={togglePlay}
                        className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition shadow-lg"
                    >
                        {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                    {/* Progress Bar */}
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress || 0}
                        onChange={handleProgressChange}
                        className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-violet-500 hover:h-1.5 transition-all"
                    />

                    <div className="flex items-center justify-between text-white drop-shadow-md">
                        <div className="flex items-center gap-4">
                            <button onClick={togglePlay} className="hover:text-violet-400">
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                            </button>

                            <div className="flex items-center gap-2 group/volume">
                                <button onClick={toggleMute} className="hover:text-violet-400">
                                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 bg-white/30 rounded-full appearance-none accent-white cursor-pointer"
                                />
                            </div>

                            <span className="text-[10px] font-bold tabular-nums">
                                {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
                            </span>
                        </div>

                        <button onClick={toggleFullscreen} className="hover:text-violet-400">
                            <Maximize2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatTime(seconds: number) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
