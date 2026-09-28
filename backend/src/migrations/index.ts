import mongoose from "mongoose";

const MEDIA_SECTION_MIGRATION = "20260928_add_media_sections";

export async function runMigrations(): Promise<void> {
  const migrations = mongoose.connection.collection("migrations");
  const applied = await migrations.findOne({ name: MEDIA_SECTION_MIGRATION });
  if (applied) return;

  const result = await mongoose.connection.collection("profiles").updateMany(
    { "media.section": { $exists: false } },
    { $set: { "media.$[item].section": "post" } },
    { arrayFilters: [{ "item.section": { $exists: false } }] }
  );

  await migrations.insertOne({
    name: MEDIA_SECTION_MIGRATION,
    appliedAt: new Date(),
    modifiedProfiles: result.modifiedCount,
  });
  console.log(`Applied ${MEDIA_SECTION_MIGRATION}: ${result.modifiedCount} profiles updated`);
}
