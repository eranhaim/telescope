import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTelegram } from "./hooks/useTelegram";
import ExplorePage from "./pages/ExplorePage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import AdminProfileAnalyticsPage from "./pages/AdminProfileAnalyticsPage";

export default function App() {
  useTelegram();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="/admin/profile-analytics/:id" element={<AdminProfileAnalyticsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
