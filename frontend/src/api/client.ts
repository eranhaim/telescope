const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface MediaItem {
  _id: string;
  type: "image" | "video";
  s3Key: string;
  url: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  order: number;
  clicks: number;
}

export interface LinkButton {
  _id?: string;
  label: string;
  url: string;
  linkType?: "telegram_group" | "onlyfans" | "other";
  order: number;
}

export interface Profile {
  _id: string;
  name: string;
  handle: string;
  telegramLink: string;
  profileImage: string;
  profileImageUrl?: string;
  profileImageThumb?: string;
  profileImageThumbUrl?: string;
  media: MediaItem[];
  linkButtons: LinkButton[];
  tags: string[];
  order: number;
  clicks: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  getProfiles(tag?: string, search?: string): Promise<Profile[]> {
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (search) params.set("search", search);
    const qs = params.toString();
    return request(`/profiles${qs ? `?${qs}` : ""}`);
  },

  getProfile(id: string): Promise<Profile> {
    return request(`/profiles/${id}`);
  },

  adminLogin(password: string): Promise<{ token: string }> {
    return request("/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },

  adminCreateProfile(data: Partial<Profile>): Promise<Profile> {
    return request("/admin/profiles", {
      method: "POST",
      body: JSON.stringify(data),
      headers: authHeaders(),
    });
  },

  adminUpdateProfile(id: string, data: Partial<Profile>): Promise<Profile> {
    return request(`/admin/profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: authHeaders(),
    });
  },

  adminReorderProfiles(order: { id: string; order: number }[]): Promise<void> {
    return request("/admin/profiles/reorder", {
      method: "PUT",
      body: JSON.stringify({ order }),
      headers: authHeaders(),
    });
  },

  adminDeleteProfile(id: string): Promise<void> {
    return request(`/admin/profiles/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  },

  async adminUploadFile(
    file: File,
    profileId: string,
    folder: "media" | "avatar" = "media"
  ): Promise<{ key: string; thumbnail?: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("profileId", profileId);
    formData.append("folder", folder);

    const res = await fetch(`${BASE}/admin/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },

  adminDeleteMedia(key: string): Promise<void> {
    return request(`/admin/media/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  },

  adminGetStats(): Promise<{ siteOpens: number }> {
    return request("/admin/stats", { headers: authHeaders() });
  },

  adminGetHourlyUsers(days = 7): Promise<{ hourly: { time: string; count: number }[]; totalUsers: number }> {
    return request(`/admin/users/hourly?days=${days}`, { headers: authHeaders() });
  },

  adminGetAnalytics(period: "daily" | "weekly" | "monthly" = "daily"): Promise<{
    uniqueSiteUsers: { time: string; count: number }[];
    profileEntrances: { profileId: string; time: string; count: number }[];
    messageClicks: { profileId: string; time: string; count: number }[];
    telegramGroupClicks: { profileId: string; time: string; count: number }[];
    onlyfansClicks: { profileId: string; time: string; count: number }[];
    popupClicks: { time: string; count: number }[];
    profileNames: Record<string, string>;
  }> {
    return request(`/admin/analytics?period=${period}`, { headers: authHeaders() });
  },

  async adminExportUsers(): Promise<void> {
    const res = await fetch(`${BASE}/admin/users/export`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "telegram_users.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  },

  trackSiteOpen(): void {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const source = window.Telegram?.WebApp ? "telegram" : "browser";
    fetch(`${BASE}/track/site-open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, ...(user ? { telegramUser: user } : {}) }),
    }).catch(() => {});
  },

  trackProfileClick(id: string): void {
    const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const source = window.Telegram?.WebApp ? "telegram" : "browser";
    fetch(`${BASE}/track/profile/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, ...(telegramUserId ? { telegramUserId } : {}) }),
    }).catch(() => {});
  },

  trackMediaClick(profileId: string, s3Key: string): void {
    const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const source = window.Telegram?.WebApp ? "telegram" : "browser";
    fetch(`${BASE}/track/media/${profileId}/${encodeURIComponent(s3Key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, ...(telegramUserId ? { telegramUserId } : {}) }),
    }).catch(() => {});
  },

  getPopup(): Promise<{ enabled: boolean; imageUrl?: string; buttonLabel?: string; buttonUrl?: string; idleSeconds?: number }> {
    return request("/popup");
  },

  adminGetPopup(): Promise<{
    photos: { key: string; url: string; thumbnailUrl?: string }[];
    buttonLabel: string;
    buttonUrl: string;
    idleSeconds: number;
    enabled: boolean;
  }> {
    return request("/popup/admin", { headers: authHeaders() });
  },

  adminUpdatePopup(data: { buttonLabel?: string; buttonUrl?: string; idleSeconds?: number; enabled?: boolean }): Promise<void> {
    return request("/popup/admin", {
      method: "PUT",
      body: JSON.stringify(data),
      headers: authHeaders(),
    });
  },

  async adminUploadPopupPhoto(file: File): Promise<{ key: string; url: string; thumbnailUrl?: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE}/popup/admin/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },

  adminDeletePopupPhoto(key: string): Promise<void> {
    return request(`/popup/admin/photo/${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  },

  trackPopupClick(): void {
    const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const source = window.Telegram?.WebApp ? "telegram" : "browser";
    fetch(`${BASE}/track/popup-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, ...(telegramUserId ? { telegramUserId } : {}) }),
    }).catch(() => {});
  },

  trackButtonClick(profileId: string, buttonType: string, buttonLabel?: string, linkType?: string): void {
    const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const source = window.Telegram?.WebApp ? "telegram" : "browser";
    fetch(`${BASE}/track/button-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, buttonType, buttonLabel, linkType, source, ...(telegramUserId ? { telegramUserId } : {}) }),
    }).catch(() => {});
  },
};
