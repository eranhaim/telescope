import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTelegram } from "./hooks/useTelegram";
import ExplorePage from "./pages/ExplorePage";
import ProfilePage from "./pages/ProfilePage";
import ReelsPage from "./pages/ReelsPage";
import AdminPage from "./pages/AdminPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";

export default function App() {
  useTelegram();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/reels" element={<ReelsPage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
