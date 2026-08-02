db = db.getSiblingDB("telescope");

db.profiles.deleteMany({});
db.telegramusers.deleteMany({});
db.popupconfigs.deleteMany({});

db.profiles.insertMany([
  {
    name: "מיה כהן",
    handle: "mia_cohen",
    telegramLink: "https://t.me/mia_cohen",
    profileImage: "",
    profileImageThumb: "",
    media: [],
    linkButtons: [
      { label: "ערוץ טלגרם", url: "https://t.me/mia_cohen", linkType: "telegram_group", order: 0 }
    ],
    tags: ["ישראלית", "תל אביב"],
    order: 0,
    clicks: 42,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "נועה לוי",
    handle: "noa_levy",
    telegramLink: "https://t.me/noa_levy",
    profileImage: "",
    profileImageThumb: "",
    media: [],
    linkButtons: [
      { label: "OnlyFans", url: "https://onlyfans.com/noa_levy", linkType: "onlyfans", order: 0 }
    ],
    tags: ["ישראלית", "חיפה"],
    order: 1,
    clicks: 18,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "שירה מזרחי",
    handle: "shira_mizrahi",
    telegramLink: "https://t.me/shira_mizrahi",
    profileImage: "",
    profileImageThumb: "",
    media: [],
    linkButtons: [],
    tags: ["ישראלית", "ירושלים"],
    order: 2,
    clicks: 7,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]);

db.telegramusers.insertMany([
  {
    telegramId: 100001,
    firstName: "יוסי",
    lastName: "גולן",
    username: "yossi_g",
    languageCode: "he",
    firstSeen: new Date(),
    lastSeen: new Date(),
    startCount: 3,
    appOpens: 15,
  },
  {
    telegramId: 100002,
    firstName: "דנה",
    username: "dana123",
    languageCode: "he",
    firstSeen: new Date(),
    lastSeen: new Date(),
    startCount: 1,
    appOpens: 4,
  },
]);

db.popupconfigs.insertOne({
  posters: [],
  idleSeconds: 5,
  enabled: false,
});

print("Seed complete!");
