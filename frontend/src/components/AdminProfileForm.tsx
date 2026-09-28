import { useState, useRef } from "react";
import { api } from "../api/client";
import type { Profile, LinkButton, MediaItem, StoredMedia } from "../api/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableMediaItem({
  item,
  onDelete,
}: {
  item: MediaItem;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.s3Key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-square bg-dark-surface rounded-lg overflow-hidden"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
      >
        <img
          src={item.thumbnailUrl || item.url}
          alt=""
          className="w-full h-full object-cover pointer-events-none"
        />
      </div>
      <div className="absolute bottom-1 left-1 flex gap-1 pointer-events-none">
        {item.type === "video" && (
          <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">🎬</span>
        )}
        <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
          👁 {(item.clicks || 0).toLocaleString()}
        </span>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white text-sm flex items-center justify-center border-0 cursor-pointer shadow-md z-10"
      >
        ×
      </button>
    </div>
  );
}

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
  const postFileRef = useRef<HTMLInputElement>(null);
  const reelFileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(profile?.media || []);
  const [linkButtons, setLinkButtons] = useState<LinkButton[]>(profile?.linkButtons || []);
  const [contentVersion, setContentVersion] = useState(profile?.contentVersion || 0);

  const mediaSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function toStoredMedia(items: MediaItem[]): StoredMedia[] {
    return items.map((item) => ({
      type: item.type,
      section: item.section,
      s3Key: item.s3Key,
      thumbnail: item.thumbnail,
      order: item.order,
      clicks: item.clicks,
    }));
  }

  async function handleMediaDragEnd(event: DragEndEvent, section: "post" | "reel") {
    const { active, over } = event;
    if (!over || active.id === over.id || !profile) return;

    const sectionItems = mediaItems.filter((item) => item.section === section);
    const oldIndex = sectionItems.findIndex((m) => m.s3Key === active.id);
    const newIndex = sectionItems.findIndex((m) => m.s3Key === over.id);
    const reordered = arrayMove(sectionItems, oldIndex, newIndex).map((m, i) => ({
      ...m,
      order: i,
    }));
    const updatedOrders = new Map(reordered.map((item) => [item.s3Key, item.order]));
    const updatedMedia = mediaItems.map((item) =>
      item.section === section ? { ...item, order: updatedOrders.get(item.s3Key) ?? item.order } : item
    );
    setMediaItems(updatedMedia);

    try {
      const updatedProfile = await api.adminUpdateProfile(
        profile._id,
        { media: toStoredMedia(updatedMedia) },
        contentVersion
      );
      setContentVersion(updatedProfile.contentVersion);
      setMediaItems(updatedProfile.media);
    } catch (err) {
      console.error(err);
      alert("הפרופיל השתנה במקום אחר. יש לפתוח אותו מחדש.");
    }
  }

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
        media: toStoredMedia(mediaItems),
        linkButtons: linkButtons.map(({ label, url, linkType, order }) => ({ label, url, linkType, order })),
      };
      if (profile) {
        await api.adminUpdateProfile(profile._id, data, contentVersion);
      } else {
        await api.adminCreateProfile(data);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      alert("שמירת הפרופיל נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setAvatarUploading(true);
    try {
      const { key, thumbnail } = await api.adminUploadFile(file, profile._id, "avatar");
      const update: Record<string, string> = { profileImage: key };
      if (thumbnail) update.profileImageThumb = thumbnail;
      const updatedProfile = await api.adminUpdateProfile(
        profile._id,
        update,
        contentVersion
      );
      setContentVersion(updatedProfile.contentVersion);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "העלאת תמונת פרופיל נכשלה");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleMediaUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    section: "post" | "reel"
  ) {
    const files = e.target.files;
    if (!files || !profile) return;
    setUploading(true);
    try {
      const newItems: StoredMedia[] = [];
      for (const file of Array.from(files)) {
        const { key, thumbnail } = await api.adminUploadFile(file, profile._id, "media", section);
        const type = file.type.startsWith("video/") ? "video" : "image";
        const sectionItems = mediaItems.filter((item) => item.section === section);
        const item: StoredMedia = {
          type,
          section,
          s3Key: key,
          order: sectionItems.length + newItems.length,
          clicks: 0,
        };
        if (thumbnail) item.thumbnail = thumbnail;
        newItems.push(item);
      }
      const allMedia = [...toStoredMedia(mediaItems), ...newItems];
      const updatedProfile = await api.adminUpdateProfile(
        profile._id,
        { media: allMedia },
        contentVersion
      );
      setContentVersion(updatedProfile.contentVersion);
      setMediaItems(updatedProfile.media);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "העלאת מדיה נכשלה");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteMedia(s3Key: string) {
    if (!profile || !confirm("למחוק את פריט המדיה הזה?")) return;
    try {
      const updated = toStoredMedia(
        mediaItems.filter((m) => m.s3Key !== s3Key)
      );
      const updatedProfile = await api.adminUpdateProfile(
        profile._id,
        { media: updated },
        contentVersion
      );
      await api.adminDeleteMedia(s3Key);
      setContentVersion(updatedProfile.contentVersion);
      setMediaItems(updatedProfile.media);
    } catch (err) {
      console.error(err);
    }
  }

  const inputClass =
    "w-full bg-dark-surface text-white border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent/50 transition placeholder-dark-text-secondary";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">שם</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="שם תצוגה" />
      </div>
      <div>
        <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">שם משתמש</label>
        <input value={handle} onChange={(e) => setHandle(e.target.value)} required className={inputClass} placeholder="@username" />
      </div>
      <div>
        <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">קישור טלגרם</label>
        <input value={telegramLink} onChange={(e) => setTelegramLink(e.target.value)} className={inputClass} placeholder="https://t.me/username (אופציונלי)" />
      </div>
      <div>
        <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">תגיות (מופרדות בפסיק)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} placeholder="trending, popular, new" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">סדר</label>
          <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className={inputClass} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-5">
          <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} className="w-4 h-4 accent-accent" />
          <span className="text-sm text-dark-text">מאומת</span>
        </label>
      </div>

      <div>
        <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">כפתורי קישור</label>
        <div className="space-y-2 mb-2">
          {linkButtons.map((btn, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={btn.label}
                onChange={(e) => {
                  const updated = [...linkButtons];
                  updated[i] = { ...updated[i], label: e.target.value };
                  setLinkButtons(updated);
                }}
                className={inputClass}
                placeholder="טקסט הכפתור"
              />
              <input
                value={btn.url}
                onChange={(e) => {
                  const updated = [...linkButtons];
                  updated[i] = { ...updated[i], url: e.target.value };
                  setLinkButtons(updated);
                }}
                className={inputClass}
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={() => setLinkButtons(linkButtons.filter((_, j) => j !== i))}
                className="shrink-0 w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center border-0 cursor-pointer text-lg"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setLinkButtons([...linkButtons, { label: "", url: "", order: linkButtons.length }])}
          className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border rounded-lg px-4 py-2 text-sm transition cursor-pointer"
        >
          + הוסף כפתור
        </button>
      </div>

      {profile && (
        <>
          <div>
            <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">תמונת פרופיל</label>
            <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              disabled={avatarUploading}
              className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border rounded-lg px-4 py-2 text-sm transition cursor-pointer disabled:opacity-50"
            >
              {avatarUploading ? "מעלה..." : "העלאת תמונת פרופיל"}
            </button>
          </div>

          <div>
            <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">פוסטים</label>
            <input
              ref={postFileRef}
              type="file"
              accept="image/*,video/*,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm"
              multiple
              onChange={(event) => handleMediaUpload(event, "post")}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => postFileRef.current?.click()}
              disabled={uploading}
              className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border rounded-lg px-4 py-2 text-sm transition cursor-pointer disabled:opacity-50 mb-3"
            >
              {uploading ? "מעלה..." : "הוסף פוסט"}
            </button>

            {mediaItems.filter((item) => item.section === "post").length > 0 && (
              <DndContext sensors={mediaSensors} collisionDetection={closestCenter} onDragEnd={(event) => handleMediaDragEnd(event, "post")}>
                <SortableContext items={mediaItems.filter((item) => item.section === "post").map((item) => item.s3Key)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-4 gap-2">
                    {mediaItems.filter((item) => item.section === "post").map((item) => (
                      <SortableMediaItem key={item.s3Key} item={item} onDelete={() => handleDeleteMedia(item.s3Key)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div>
            <label className="block text-xs text-dark-text-secondary mb-1 uppercase tracking-wider">Reels</label>
            <p className="mb-2 text-xs text-dark-text-secondary">סרטונים אנכיים בלבד</p>
            <input
              ref={reelFileRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              multiple
              onChange={(event) => handleMediaUpload(event, "reel")}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => reelFileRef.current?.click()}
              disabled={uploading}
              className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border rounded-lg px-4 py-2 text-sm transition cursor-pointer disabled:opacity-50 mb-3"
            >
              {uploading ? "מעלה..." : "הוסף Reel"}
            </button>

            {mediaItems.filter((item) => item.section === "reel").length > 0 && (
              <DndContext sensors={mediaSensors} collisionDetection={closestCenter} onDragEnd={(event) => handleMediaDragEnd(event, "reel")}>
                <SortableContext items={mediaItems.filter((item) => item.section === "reel").map((item) => item.s3Key)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-4 gap-2">
                    {mediaItems.filter((item) => item.section === "reel").map((item) => (
                      <SortableMediaItem key={item.s3Key} item={item} onDelete={() => handleDeleteMedia(item.s3Key)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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
          {saving ? "שומר..." : profile ? "עדכן פרופיל" : "צור פרופיל"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border rounded-lg text-sm transition cursor-pointer"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
