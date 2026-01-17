/**
 * Seed Teaching Staff for Edwardian Academy
 * Run: node scripts/seed-teachers.js
 *
 * Creates 4 core teaching staff:
 * - Sir Jamil (Physics) - Standard 70/30 split
 * - Sir Shams (Mathematics) - Standard 70/30 split
 * - Sir Waqar (Chemistry) - Partner (100% revenue)
 * - Dr. Zahid (Biology) - Partner (100% revenue)
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/sca-erp";

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    joiningDate: { type: Date, default: Date.now },
    isPartner: { type: Boolean, default: false },
    revenuePercentage: { type: Number, default: 70 },
    address: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
);

const Teacher =
  mongoose.models.Teacher || mongoose.model("Teacher", teacherSchema);

const teachingStaff = [
  {
    name: "Sir Jamil",
    subject: "physics",
    phone: "0333-1234567",
    email: "jamil@edwardian.edu.pk",
    status: "active",
    isPartner: false,
    revenuePercentage: 70,
    notes: "Senior Physics faculty - Standard 70/30 split",
  },
  {
    name: "Sir Shams",
    subject: "mathematics",
    phone: "0333-2345678",
    email: "shams@edwardian.edu.pk",
    status: "active",
    isPartner: false,
    revenuePercentage: 70,
    notes: "Senior Mathematics faculty - Standard 70/30 split",
  },
  {
    name: "Waqar Baig",
    subject: "chemistry",
    phone: "0334-5852326",
    email: "waqar@edwardian.edu.pk",
    status: "active",
    isPartner: true,
    revenuePercentage: 100,
    notes: "Partner/Owner - Chemistry Expert - 100% revenue (no academy share)",
  },
  {
    name: "Dr. Zahid",
    subject: "biology",
    phone: "0333-4567890",
    email: "zahid@edwardian.edu.pk",
    status: "active",
    isPartner: true,
    revenuePercentage: 100,
    notes: "Partner - Biology Expert - 100% revenue (no academy share)",
  },
];

async function seedTeachers() {
  try {
    console.log("\n🌱 Seeding Teaching Staff for Edwardian Academy...\n");
    console.log("Connecting to MongoDB:", MONGODB_URI);

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    let created = 0;
    let skipped = 0;

    for (const staff of teachingStaff) {
      // Check if teacher already exists by name (case-insensitive)
      const exists = await Teacher.findOne({
        name: { $regex: new RegExp(`^${staff.name}$`, "i") },
      });

      if (exists) {
        console.log(`⏭️  Skipping ${staff.name} - already exists`);
        skipped++;
        continue;
      }

      const teacher = await Teacher.create(staff);
      const icon = staff.isPartner ? "👑" : "👨‍🏫";
      console.log(
        `${icon} Created: ${teacher.name} (${teacher.subject}) - ${staff.isPartner ? "Partner 100%" : "Standard 70/30"}`,
      );
      created++;
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(
      `✅ Seeding complete! Created: ${created} | Skipped: ${skipped}`,
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Show current teacher count
    const total = await Teacher.countDocuments({ status: "active" });
    console.log(`📊 Total active teachers: ${total}\n`);
  } catch (error) {
    console.error("❌ Error seeding teachers:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

seedTeachers();
