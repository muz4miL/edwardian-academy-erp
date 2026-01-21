/**
 * Migration Script: Convert existing classes to new Class Instance format
 * 
 * This script transforms existing class documents to include:
 * - classTitle (unique identifier)
 * - gradeLevel (enum)
 * - days, startTime, endTime (schedule)
 * - roomNumber, maxCapacity
 * 
 * Run this script ONCE after deploying the new Class model:
 * node scripts/migrateClasses.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/edwardian-academy';

// Default schedule values for migrated classes
const DEFAULT_DAYS = ["Mon", "Wed", "Fri"];
const DEFAULT_START_TIME = "16:00";
const DEFAULT_END_TIME = "18:00";
const DEFAULT_ROOM = "TBD";
const DEFAULT_CAPACITY = 30;

// Grade level mapping (if className doesn't match enum, default to this)
const VALID_GRADES = [
    "9th Grade", "10th Grade", "11th Grade", "12th Grade",
    "MDCAT Prep", "ECAT Prep", "Foundation", "O-Level", "A-Level"
];

const migrateClasses = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find all classes
        const classes = await Class.find({});
        console.log(`📦 Found ${classes.length} classes to migrate`);

        if (classes.length === 0) {
            console.log('✅ No classes to migrate');
            return;
        }

        let migrated = 0;
        let skipped = 0;

        for (const cls of classes) {
            try {
                // Skip if already migrated (has classTitle)
                if (cls.classTitle) {
                    console.log(`⏭️ Skipping ${cls.classId} - already migrated`);
                    skipped++;
                    continue;
                }

                // Build classTitle from existing fields
                // Old format: className + section -> "10th Grade - Medical"
                const className = cls.className || cls.gradeLevel || "Unknown";
                const section = cls.section || "General";
                cls.classTitle = `${className} - ${section}`;

                // Set gradeLevel (use className if it's a valid grade, otherwise default)
                if (VALID_GRADES.includes(className)) {
                    cls.gradeLevel = className;
                } else {
                    // Try to extract grade from className
                    const gradeMatch = className.match(/(9th|10th|11th|12th)/i);
                    if (gradeMatch) {
                        cls.gradeLevel = `${gradeMatch[1]} Grade`;
                    } else if (className.toLowerCase().includes('mdcat')) {
                        cls.gradeLevel = "MDCAT Prep";
                    } else if (className.toLowerCase().includes('ecat')) {
                        cls.gradeLevel = "ECAT Prep";
                    } else {
                        cls.gradeLevel = "10th Grade"; // Default fallback
                    }
                }

                // Set default schedule if not present
                if (!cls.days || !cls.days.length) {
                    cls.days = DEFAULT_DAYS;
                }
                if (!cls.startTime) {
                    cls.startTime = DEFAULT_START_TIME;
                }
                if (!cls.endTime) {
                    cls.endTime = DEFAULT_END_TIME;
                }
                if (!cls.roomNumber) {
                    cls.roomNumber = DEFAULT_ROOM;
                }
                if (!cls.maxCapacity) {
                    cls.maxCapacity = DEFAULT_CAPACITY;
                }

                // Remove old className field (now using gradeLevel)
                cls.className = undefined;

                // Save the migrated class (bypass validation if needed)
                await cls.save({ validateBeforeSave: false });

                // Auto-generate timetable entries
                if (cls.days && cls.days.length > 0) {
                    await Timetable.deleteMany({ classRef: cls._id });

                    for (const day of cls.days) {
                        await Timetable.create({
                            day: day,
                            timeSlot: cls.startTime,
                            endTime: cls.endTime,
                            classRef: cls._id,
                            className: cls.classTitle,
                            teacherRef: cls.assignedTeacher,
                            teacherName: cls.teacherName || "TBD",
                            subject: cls.subjects?.[0]?.name || "General",
                            roomNumber: cls.roomNumber || "TBD",
                            status: "active",
                        });
                    }
                    console.log(`  📅 Created ${cls.days.length} timetable entries`);
                }

                console.log(`✅ Migrated: ${cls.classId} -> "${cls.classTitle}"`);
                migrated++;

            } catch (err) {
                console.error(`❌ Error migrating ${cls.classId}:`, err.message);
            }
        }

        console.log('\n========================================');
        console.log(`📊 Migration Complete`);
        console.log(`   Migrated: ${migrated}`);
        console.log(`   Skipped:  ${skipped}`);
        console.log(`   Total:    ${classes.length}`);
        console.log('========================================');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');
    }
};

// Run the migration
migrateClasses();
