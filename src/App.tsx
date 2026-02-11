import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import WelcomeScreen from "./screens/WelcomeScreen";
import GoalsScreen from "./screens/GoalsScreen";
import LoginScreen from "./screens/LoginScreen";
import VerifyOTPScreen from "./screens/VerifyOTPScreen";
import InnerApp from "./InnerApp";
import HomeFeedScreen from "./screens/HomeFeedScreen";
import ExploreScreen from "./screens/ExploreScreen";
import MessagingScreen from "./screens/MessagingScreen";
import MindRoomsScreen from "./screens/MindRoomsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import TherapistSupportScreen from "./screens/TherapistSupportScreen";
import AdminPanelScreen from "./screens/AdminPanelScreen";
import ArticleDetailScreen from "./screens/ArticleDetailScreen";
import CommunityStoriesPreviewScreen from "./screens/CommunityStoriesPreviewScreen";
import StoryDetailScreen from "./screens/StoryDetailScreen";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

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

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/goals" element={<GoalsScreen />} />
        <Route path="/login" element={<LoginRedirect />} />
        <Route path="/verify" element={<VerifyOTPScreen />} />
        <Route
          path="/community-stories"
          element={
            <ProtectedRoute>
              <CommunityStoriesPreviewScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/story/:storyId"
          element={
            <ProtectedRoute>
              <StoryDetailScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/article/:articleId"
          element={
            <ProtectedRoute>
              <ArticleDetailScreen />
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
          <Route path="profile/:userId" element={<ProfileScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-[#f8f9fa]">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
