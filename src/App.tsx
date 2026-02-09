import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import WelcomeScreen from "./screens/WelcomeScreen";
import GoalsScreen from "./screens/GoalsScreen";
import LoginScreen from "./screens/LoginScreen";
import InnerApp from "./InnerApp";
import HomeFeedScreen from "./screens/HomeFeedScreen";
import ExploreScreen from "./screens/ExploreScreen";
import MessagingScreen from "./screens/MessagingScreen";
import MindRoomsScreen from "./screens/MindRoomsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import TherapistSupportScreen from "./screens/TherapistSupportScreen";
import AdminPanelScreen from "./screens/AdminPanelScreen";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

function LoginRedirect() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <LoginScreen />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col items-center bg-[#f8f9fa]">
          <div className="w-full max-w-[430px] min-h-screen flex flex-col app-container">
        <Routes>
          <Route path="/welcome" element={<WelcomeScreen />} />
          <Route path="/goals" element={<GoalsScreen />} />
          <Route path="/login" element={<LoginRedirect />} />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <TherapistSupportScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanelScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <InnerApp />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeFeedScreen />} />
            <Route path="explore" element={<ExploreScreen />} />
            <Route path="messages" element={<MessagingScreen />} />
            <Route path="focus" element={<MindRoomsScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
          </Route>
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
