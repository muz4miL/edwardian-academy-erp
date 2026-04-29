#!/usr/bin/env node

/**
 * Seed Production Clone
 *
 * Purpose:
 * Restore a MongoDB dump archive into the target DB so deployed data
 * exactly matches source data.
 *
 * Example:
 * node scripts/seed-production-clone.js \
 *   --archive /var/www/edwardian-academy-erp/backend/current-data.gz \
 *   --source-db edwardianDB \
 *   --target-db edwardian-erp \
 *   --target-uri "mongodb://127.0.0.1:27017/edwardian-erp"
 */

const fs = require("fs");
const { spawnSync } = require("child_process");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;

    const key = arg.replace(/^--/, "");
    const next = args[i + 1];

    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }

    result[key] = next;
  }

  return result;
};

const printUsage = () => {
  console.log("\nSeed Production Clone Usage:\n");
  console.log(
    "  node scripts/seed-production-clone.js --archive <dump.gz> [--source-db <name>] [--target-db <name>] [--target-uri <mongodb-uri>]"
  );
  console.log("\nFlags:\n");
  console.log("  --archive      Required. Path to mongodump archive created with --gzip");
  console.log("  --source-db    Optional. Source database name inside the dump (default: edwardianDB)");
  console.log("  --target-db    Optional. Target database name in deployed server (default: edwardian-erp)");
  console.log(
    "  --target-uri   Optional. Mongo URI for restore destination (default: MONGODB_URI env or mongodb://127.0.0.1:27017/edwardian-erp)"
  );
  console.log("  --help         Show this help\n");
};

const run = () => {
  const args = parseArgs();

  if (args.help || args.h) {
    printUsage();
    process.exit(0);
  }

  const archivePath = args.archive;
  const sourceDb = args["source-db"] || "edwardianDB";
  const targetDb = args["target-db"] || "edwardian-erp";
  const targetUri =
    args["target-uri"] ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/edwardian-erp";

  if (!archivePath) {
    console.error("\nMissing required --archive argument.");
    printUsage();
    process.exit(1);
  }

  if (!fs.existsSync(archivePath)) {
    console.error(`\nArchive file not found: ${archivePath}`);
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("EDWARDIAN SEED PRODUCTION CLONE");
  console.log("========================================");
  console.log(`Archive:   ${archivePath}`);
  console.log(`Source DB: ${sourceDb}`);
  console.log(`Target DB: ${targetDb}`);
  console.log(`Target URI:${targetUri}`);

  const versionCheck = spawnSync("mongorestore", ["--version"], {
    stdio: "pipe",
    encoding: "utf-8",
  });

  if (versionCheck.error) {
    console.error(
      "\nmongorestore is not available. Install MongoDB database tools on this server first."
    );
    process.exit(1);
  }

  const restoreArgs = [
    `--uri=${targetUri}`,
    `--archive=${archivePath}`,
    "--gzip",
    "--drop",
  ];

  if (sourceDb && targetDb) {
    // Required when source DB name differs from target DB name.
    // Without nsInclude, mongorestore may skip source namespaces when --uri points at target DB.
    restoreArgs.push(`--nsInclude=${sourceDb}.*`);
    restoreArgs.push(`--nsFrom=${sourceDb}.*`);
    restoreArgs.push(`--nsTo=${targetDb}.*`);
  }

  console.log("\nRunning mongorestore with --drop (replaces target collections)...\n");

  const restore = spawnSync("mongorestore", restoreArgs, {
    stdio: "inherit",
  });

  if (restore.status !== 0) {
    console.error("\nRestore failed.");
    process.exit(restore.status || 1);
  }

  console.log("\nRestore completed successfully.");
  console.log("Restart your API process to pick up fresh data state.\n");
};

run();
