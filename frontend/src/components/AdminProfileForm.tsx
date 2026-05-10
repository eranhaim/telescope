import { useState, useRef } from "react";
import { api } from "../api/client";
import type { Profile } from "../api/client";

interface Props {
  profile?: Profile;
  onSaved: () => void;
  onCancel: () => void;
}

export default function AdminProfileForm({ profile, onSaved, onCancel }: Props) {
  const [name, setName] = useState(profile?.name || "");
  const [handle, setHandle] = useState(profile?.handle || "");
  const [telegramLink, setTelegramLink] = useState(profile?.telegramLink || "");
  const [tags, setTags] = useState(profile?.tags?.join(", ") || "");
  const [isVerified, setIsVerified] = useState(profile?.isVerified || false);
  const [order, setOrder] = useState(profile?.order || 0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [mediaItems, setMediaItems] = useState(profile?.media || []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name,
        handle,
        telegramLink,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        isVerified,
        order,
        media: mediaItems,
      };
      if (profile) {
        await api.adminUpdateProfile(profile._id, data);
      } else {
        await api.adminCreateProfile(data);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setAvatarUploading(true);
    try {
      const { key } = await api.adminUploadFile(file, profile._id, "avatar");
      await api.adminUpdateProfile(profile._id, { profileImage: key } as any);
      onSaved();
    } catch (err) {
      console.error(err);
      alert("Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !profile) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { key } = await api.adminUploadFile(file, profile._id, "media");
        const type = file.type.startsWith("video/") ? "video" : "image";
        setMediaItems((prev) => [
          ...prev,
          { _id: key, type, s3Key: key, order: prev.length, url: "" },
        ]);
      }
      const currentMedia = [...mediaItems];
      for (const file of Array.from(files)) {
        const { key } = await api.adminUploadFile(file, profile._id, "media");
        const type = file.type.startsWith("video/") ? "video" : "image";
        currentMedia.push({ _id: key, type, s3Key: key, order: currentMedia.length, url: "" });
      }
      await api.adminUpdateProfile(profile._id, { media: currentMedia } as any);
      onSaved();
    } catch (err) {
      console.error(err);
      alert("Media upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteMedia(s3Key: string) {
    if (!profile || !confirm("Delete this media item?")) return;
    try {
      await api.adminDeleteMedia(s3Key);
      const updated = mediaItems.filter((m) => m.s3Key !== s3Key);
      setMediaItems(updated);
      await api.adminUpdateProfile(profile._id, { media: updated } as any);
    } catch (err) {
      console.error(err);
    }
  }

  const inputClass =
    "w-full bg-dark-surface text-white border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent/50 transition placeholder-dark-text-secondary";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="Display name" />
      </div>
      <div>
        <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Handle</label>
        <input value={handle} onChange={(e) => setHandle(e.target.value)} required className={inputClass} placeholder="@username" />
      </div>
      <div>
        <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Telegram Link</label>
        <input value={telegramLink} onChange={(e) => setTelegramLink(e.target.value)} required className={inputClass} placeholder="https://t.me/username" />
      </div>
      <div>
        <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Tags (comma-separated)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} placeholder="trending, popular, new" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Order</label>
          <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className={inputClass} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-5">
          <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} className="w-4 h-4 accent-accent" />
          <span className="text-sm text-dark-text">Verified</span>
        </label>
      </div>

      {profile && (
        <>
          <div>
            <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Profile Image</label>
            <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              disabled={avatarUploading}
              className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border rounded-lg px-4 py-2 text-sm transition cursor-pointer disabled:opacity-50"
            >
              {avatarUploading ? "Uploading..." : "Upload Avatar"}
            </button>
          </div>

          <div>
            <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Media</label>
            <input ref={fileRef} type="file" accept="image/*, video/*, .jpg, .jpeg, .png, .gif, .webp, .mp4, .mov, .webm" multiple onChange={handleMediaUpload} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border rounded-lg px-4 py-2 text-sm transition cursor-pointer disabled:opacity-50 mb-3"
            >
              {uploading ? "Uploading..." : "Add Media"}
            </button>

            {mediaItems.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {mediaItems.map((m) => (
                  <div key={m.s3Key} className="relative group aspect-square bg-dark-surface rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-dark-text-secondary text-xs p-1 text-center break-all">
                      {m.type === "video" ? "🎬" : "🖼️"} {m.s3Key.split("/").pop()}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(m.s3Key)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs items-center justify-center hidden group-hover:flex border-0 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-accent hover:bg-accent-hover text-white py-2.5 rounded-lg text-sm font-medium transition border-0 cursor-pointer disabled:opacity-50"
        >
          {saving ? "Saving..." : profile ? "Update Profile" : "Create Profile"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border rounded-lg text-sm transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
