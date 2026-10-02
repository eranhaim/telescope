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
    searchLabel: "חיפוש בקטלוג",
    searchPlaceholder: "חיפוש יוצרת או @משתמש",
    clearSearch: "ניקוי חיפוש",
    noSearchResults: "לא נמצאו יוצרות שמתאימות לחיפוש",
  },
  en: {
    noProfiles: "No profiles found",
    back: "Back",
    message: "Message",
    share: "Share",
    shareText: "You won't believe what I found 😍🔥",
    linkCopied: "Link copied!",
    profileNotFound: "Profile not found",
    searchLabel: "Search the catalog",
    searchPlaceholder: "Search a creator or @handle",
    clearSearch: "Clear search",
    noSearchResults: "No creators match that search",
  },
  ar: {
    noProfiles: "لم يتم العثور على ملفات شخصية",
    back: "رجوع",
    message: "رسالة",
    share: "مشاركة",
    shareText: "لن تصدقوا ماذا وجدت 😍🔥",
    linkCopied: "تم نسخ الرابط!",
    profileNotFound: "الملف الشخصي غير موجود",
    searchLabel: "البحث في الكتالوج",
    searchPlaceholder: "ابحث عن منشئة أو @اسم مستخدم",
    clearSearch: "مسح البحث",
    noSearchResults: "لا توجد منشئات تطابق البحث",
  },
} as const;

export type TranslationKey = keyof typeof translations.he;
