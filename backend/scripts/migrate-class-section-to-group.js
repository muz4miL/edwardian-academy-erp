/**
 * MIGRATION SCRIPT: Split 'section' into 'group' and 'shift'
 *
 * Purpose: Update existing Class documents to use new schema structure
 * - Old: section = "Medical" | "Engineering" | "Morning" | "Evening" | "Batch A"
 * - New: group = "Pre-Medical" | "Pre-Engineering" | "ICS" | etc.
 *        shift = "Morning" | "Evening" | "Weekend" | "Batch A" | etc.
 *
 * Run: node backend/scripts/migrate-class-section-to-group.js
 */

const mongoose = require("mongoose");
const Class = require("../models/Class");

// MongoDB connection string
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/edwardian-academy";

// Mapping rules for old section values
const sectionToGroup = {
  Medical: "Pre-Medical",
  medical: "Pre-Medical",
  Engineering: "Pre-Engineering",
  engineering: "Pre-Engineering",
  ICS: "ICS",
  ics: "ICS",
  "Computer Science": "Computer Science",
  "computer science": "Computer Science",
  Arts: "Arts",
  arts: "Arts",
  General: "General",
  general: "General",
};

const sectionToShift = {
  Morning: "Morning",
  morning: "Morning",
  Evening: "Evening",
  evening: "Evening",
  Weekend: "Weekend",
  weekend: "Weekend",
  "Batch A": "Batch A",
  "batch a": "Batch A",
  "Batch B": "Batch B",
  "batch b": "Batch B",
  "Batch C": "Batch C",
  "batch c": "Batch C",
};

async function migrateClasses() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all classes with old 'section' field
    const classes = await Class.find({ section: { $exists: true } });
    console.log(`\n📊 Found ${classes.length} classes to migrate\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const classDoc of classes) {
      const oldSection = classDoc.section;
      console.log(
        `\n🔍 Processing: ${classDoc.classTitle || classDoc.classId}`,
      );
      console.log(`   Old section: "${oldSection}"`);

      // Determine new group and shift values
      let newGroup = null;
      let newShift = null;

      // Check if it's a group value
      if (sectionToGroup[oldSection]) {
        newGroup = sectionToGroup[oldSection];
        console.log(`   ✓ Mapped to group: "${newGroup}"`);
      }
      // Check if it's a shift value
      else if (sectionToShift[oldSection]) {
        newShift = sectionToShift[oldSection];
        // Need to set a default group
        newGroup = "General"; // Default group when only shift is provided
        console.log(
          `   ✓ Mapped to shift: "${newShift}" (group defaulted to "General")`,
        );
      }
      // Try intelligent parsing from classTitle
      else {
        console.log(`   ⚠️  No direct mapping for "${oldSection}"`);

        // Parse classTitle for hints
        const title = (classDoc.classTitle || "").toLowerCase();
        if (title.includes("medical") || title.includes("mdcat")) {
          newGroup = "Pre-Medical";
          console.log(`   ✓ Inferred from title: "Pre-Medical"`);
        } else if (title.includes("engineering") || title.includes("ecat")) {
          newGroup = "Pre-Engineering";
          console.log(`   ✓ Inferred from title: "Pre-Engineering"`);
        } else if (title.includes("ics")) {
          newGroup = "ICS";
          console.log(`   ✓ Inferred from title: "ICS"`);
        } else if (title.includes("computer")) {
          newGroup = "Computer Science";
          console.log(`   ✓ Inferred from title: "Computer Science"`);
        } else {
          newGroup = "General";
          console.log(`   ℹ️  Defaulted to: "General"`);
        }
      }

      if (!newGroup) {
        console.log(
          `   ❌ SKIP: Could not determine group for "${oldSection}"`,
        );
        skipped++;
        continue;
      }

      try {
        // Update the document
        classDoc.group = newGroup;
        if (newShift) {
          classDoc.shift = newShift;
        }

        // Remove old section field
        classDoc.section = undefined;

        await classDoc.save();
        updated++;
        console.log(`   ✅ Updated successfully`);
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully updated: ${updated}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📦 Total processed: ${classes.length}`);
    console.log("=".repeat(60));

    await mongoose.connection.close();
    console.log("\n✅ Migration complete. Database connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrateClasses();
