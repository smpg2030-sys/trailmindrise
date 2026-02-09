import { Outlet } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import FloatingSupport from "./components/FloatingSupport";

export default function InnerApp() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
      <FloatingSupport />
      <BottomNav />
    </div>
  );
}
