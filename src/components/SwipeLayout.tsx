import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, PanInfo, useAnimation } from "framer-motion";
import HomeFeedScreen from "../screens/HomeFeedScreen";
import ExploreScreen from "../screens/ExploreScreen";
import MessagingScreen from "../screens/MessagingScreen";
import MindRoomsScreen from "../screens/MindRoomsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const TABS = ["/", "/explore", "/messages", "/focus", "/profile"];

export default function SwipeLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    // Find current index based on route
    const getIndex = (pathname: string) => {
        const index = TABS.indexOf(pathname);
        if (index !== -1) return index;
        if (pathname.startsWith("/profile/")) return 4;
        return 0;
    };

    const initialIndex = getIndex(location.pathname);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const controls = useAnimation();

    // Sync index when URL changes (e.g., from Bottom Nav clicks)
    useEffect(() => {
        const newIndex = getIndex(location.pathname);
        if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
            controls.start({ x: `-${newIndex * 100}%` });
        }
    }, [location.pathname, currentIndex, controls]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 50;
        const velocityThreshold = 500;

        const swipe = info.offset.x;
        const velocity = info.velocity.x;

        if (swipe < -threshold || velocity < -velocityThreshold) {
            // Swiped Left -> Move to Right Tab
            if (currentIndex < TABS.length - 1) {
                navigate(TABS[currentIndex + 1]);
            } else {
                // Bounce back if at the end
                controls.start({ x: `-${currentIndex * 100}%` });
            }
        } else if (swipe > threshold || velocity > velocityThreshold) {
            // Swiped Right -> Move to Left Tab
            if (currentIndex > 0) {
                navigate(TABS[currentIndex - 1]);
            } else {
                // Bounce back if at the beginning
                controls.start({ x: `-${currentIndex * 100}%` });
            }
        } else {
            // Not enough swipe, stay on current tab
            controls.start({ x: `-${currentIndex * 100}%` });
        }
    };

    return (
        <div className="relative w-full h-full overflow-hidden">
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                animate={controls}
                initial={{ x: `-${initialIndex * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex h-full touch-pan-y"
                style={{ width: `${TABS.length * 100}%` }}
            >
                {TABS.map((tab, index) => (
                    <div
                        key={tab}
                        className="w-full h-full flex-shrink-0 overflow-y-auto"
                        style={{ width: `${100 / TABS.length}%` }}
                    >
                        {/* 
                Performance Note: All 5 screens are mounted. 
                Internal components like VideoPlayer should use the 'shouldPlay' logic 
                (which they already do) to avoid background resource usage.
            */}
                        {index === 0 && <HomeFeedScreen />}
                        {index === 1 && <ExploreScreen />}
                        {index === 2 && <MessagingScreen />}
                        {index === 3 && <MindRoomsScreen />}
                        {index === 4 && <ProfileScreen />}
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
