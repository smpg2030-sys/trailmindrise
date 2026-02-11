import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

interface ResponsiveLayoutProps {
    children: React.ReactNode;
}

export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className="flex min-h-screen bg-[#f8fafc]">
            {/* Desktop Sidebar */}
            {isDesktop && <Sidebar />}

            {/* Main Content Area */}
            <main className={`flex-1 flex flex-col items-center w-full ${isDesktop ? "pb-0" : "pb-24"}`}>
                <div className="w-full max-w-[640px] md:max-w-[768px] min-h-screen flex flex-col bg-white shadow-xl shadow-slate-200/50 border-x border-slate-100/60 relative">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            {!isDesktop && <BottomNav />}
        </div>
    );
}
