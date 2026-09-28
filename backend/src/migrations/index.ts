import mongoose from "mongoose";

const MEDIA_SECTION_MIGRATION = "20260928_add_media_sections";
const MEDIA_ID_MIGRATION = "20260928_add_missing_media_ids";

export async function runMigrations(): Promise<void> {
  const migrations = mongoose.connection.collection("migrations");
  const profiles = mongoose.connection.collection("profiles");

  if (!(await migrations.findOne({ name: MEDIA_SECTION_MIGRATION }))) {
    const result = await profiles.updateMany(
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

  if (await migrations.findOne({ name: MEDIA_ID_MIGRATION })) return;

  const profilesWithMissingMediaIds = await profiles
    .find({ "media._id": { $exists: false } }, { projection: { media: 1 } })
    .toArray();
  if (profilesWithMissingMediaIds.length > 0) {
    await profiles.bulkWrite(
      profilesWithMissingMediaIds.map((profile) => ({
        updateOne: {
          filter: { _id: profile._id },
          update: {
            $set: {
              media: (profile.media as Record<string, unknown>[]).map((item) =>
                item._id ? item : { ...item, _id: new mongoose.Types.ObjectId() }
              ),
            },
          },
        },
      }))
    );
  }

  await migrations.insertOne({
    name: MEDIA_ID_MIGRATION,
    appliedAt: new Date(),
    modifiedProfiles: profilesWithMissingMediaIds.length,
  });
  console.log(`Applied ${MEDIA_ID_MIGRATION}: ${profilesWithMissingMediaIds.length} profiles updated`);
}
