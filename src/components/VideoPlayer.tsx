import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";

interface VideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    autoPlay?: boolean;
}

export default function VideoPlayer({ src, poster, className = "", autoPlay = false }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<any>(null);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
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
        }
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
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, []);

    return (
        <div
            className={`relative group bg-black rounded-2xl overflow-hidden border border-slate-800 focus-within:ring-2 focus-within:ring-white ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-cover"
                autoPlay={autoPlay}
                muted={isMuted}
                loop
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                playsInline
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
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress || 0}
                        onChange={handleProgressChange}
                        className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white hover:h-1.5 transition-all"
                    />

                    <div className="flex items-center justify-between text-white drop-shadow-md">
                        <div className="flex items-center gap-4">
                            <button onClick={togglePlay} className="hover:text-slate-300 transition">
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                            </button>

                            <div className="flex items-center gap-2 group/volume">
                                <button onClick={toggleMute} className="hover:text-slate-300 transition">
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

                        <button onClick={toggleFullscreen} className="hover:text-slate-300 transition">
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
