const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Configuration = require("./models/Configuration"); // Ensure filename matches your model

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log(err));

const seedConfig = async () => {
  try {
    await Configuration.deleteMany({}); // Clear old settings
    
    // Create Default Configuration
    await Configuration.create({
      academyName: "Edwardian Academy",
      address: "Peshawar, Pakistan",
      phone: "+92 300 1234567",
      
      // Default Splits
      teacherSharePercentage: 70,
      academySharePercentage: 30,
      
      // Partner Rules
      partnerStructure: {
        type: "percentage",
        splits: {
          waqar: 50,
          zahid: 30,
          saud: 20
        }
      },

      // The Critical Part: Session Prices
      sessionPrices: [], // Starts empty, you will fill this in Mission 1

      // Expenses
      expenseCategories: ["Utilities", "Rent", "Salaries", "Maintenance", "Tea/Entertainment"]
    });

    console.log("🎉 Financial Configuration Created!");
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

seedConfig();