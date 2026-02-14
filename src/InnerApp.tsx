import { Outlet, useLocation } from "react-router-dom";
import ResponsiveLayout from "./components/ResponsiveLayout";
import FloatingSupport from "./components/FloatingSupport";
import { HomeRefreshProvider } from "./context/HomeRefreshContext";
import SwipeLayout from "./components/SwipeLayout";

export default function InnerApp() {
  const location = useLocation();

  // List of paths that should be part of the horizontal swipe stack
  const tabPaths = ["/", "/explore", "/messages", "/focus", "/profile"];
  const isTabRoute = tabPaths.includes(location.pathname) || location.pathname.startsWith("/profile/");

  return (
    <HomeRefreshProvider>
      <ResponsiveLayout>
        {isTabRoute ? <SwipeLayout /> : <Outlet />}
        <FloatingSupport />
      </ResponsiveLayout>
    </HomeRefreshProvider>
  );
}
