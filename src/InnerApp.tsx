import { Outlet } from "react-router-dom";
import ResponsiveLayout from "./components/ResponsiveLayout";
import FloatingSupport from "./components/FloatingSupport";
import { HomeRefreshProvider } from "./context/HomeRefreshContext";

export default function InnerApp() {
  return (
    <HomeRefreshProvider>
      <ResponsiveLayout>
        <Outlet />
        <FloatingSupport />
      </ResponsiveLayout>
    </HomeRefreshProvider>
  );
}
