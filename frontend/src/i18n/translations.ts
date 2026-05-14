export type Locale = "he" | "en" | "ar";

export const RTL_LOCALES: Locale[] = ["he", "ar"];

export const translations = {
  he: {
    noProfiles: "לא נמצאו פרופילים",
    back: "חזרה",
    message: "הודעה",
    share: "שיתוף",
    shareText: "לא תאמינו מה מצאתי 😍🔥",
    linkCopied: "הקישור הועתק!",
    profileNotFound: "הפרופיל לא נמצא",
    tabAll: "הכל",
    tabTrending: "פופולרי",
    tabPopular: "הכי נצפה",
    tabNew: "חדש",
  },
  en: {
    noProfiles: "No profiles found",
    back: "Back",
    message: "Message",
    share: "Share",
    shareText: "You won't believe what I found 😍🔥",
    linkCopied: "Link copied!",
    profileNotFound: "Profile not found",
    tabAll: "All",
    tabTrending: "Trending",
    tabPopular: "Most Viewed",
    tabNew: "New",
  },
  ar: {
    noProfiles: "لم يتم العثور على ملفات شخصية",
    back: "رجوع",
    message: "رسالة",
    share: "مشاركة",
    shareText: "لن تصدقوا ماذا وجدت 😍🔥",
    linkCopied: "تم نسخ الرابط!",
    profileNotFound: "الملف الشخصي غير موجود",
    tabAll: "الكل",
    tabTrending: "رائج",
    tabPopular: "الأكثر مشاهدة",
    tabNew: "جديد",
  },
} as const;

export type TranslationKey = keyof typeof translations.he;
