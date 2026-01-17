const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");

// Always load backend/.env regardless of where the script is executed from
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const logUser = (label, userDoc) => {
  if (!userDoc) {
    console.log(`${label}: NOT FOUND`);
    return;
  }

  console.log(`${label}:`, {
    username: userDoc.username,
    role: userDoc.role,
    walletBalance: userDoc.walletBalance,
  });
};

const main = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from environment");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected for repair");

    const users = mongoose.connection.collection("users");

    // --- ZAHID ---
    const zahidBefore = await users.findOne({ username: "zahid" });
    logUser("Before zahid", zahidBefore);

    if (zahidBefore) {
      const existingWallet = zahidBefore.walletBalance;
      const walletBalance =
        existingWallet && typeof existingWallet === "object"
          ? {
              floating:
                typeof existingWallet.floating === "number"
                  ? existingWallet.floating
                  : 0,
              verified:
                typeof existingWallet.verified === "number"
                  ? existingWallet.verified
                  : 0,
            }
          : { floating: 0, verified: 0 };

      await users.updateOne(
        { _id: zahidBefore._id },
        {
          $set: {
            role: "PARTNER",
            walletBalance,
          },
        },
      );
    }

    const zahidAfter = await users.findOne({ username: "zahid" });
    logUser("After zahid", zahidAfter);

    // --- WAQAR ---
    const waqarBefore = await users.findOne({ username: "waqar" });
    logUser("Before waqar", waqarBefore);

    if (waqarBefore) {
      await users.updateOne(
        { _id: waqarBefore._id },
        {
          $set: {
            role: "OWNER",
          },
        },
      );
    }

    const waqarAfter = await users.findOne({ username: "waqar" });
    logUser("After waqar", waqarAfter);

    console.log("✅ Database Repairs Complete");
  } catch (error) {
    console.error("❌ Repair script failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  }
};

main();
