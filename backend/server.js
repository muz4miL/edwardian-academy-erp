const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

dotenv.config();

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from environment");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected Successfully!");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

connectDB();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// CRITICAL ORDER
app.use(express.json());
app.use(cookieParser());

app.use(express.urlencoded({ extended: true }));

// Debug Middleware
app.use((req, res, next) => {
  console.log(
    "📡 Request:",
    req.method,
    req.url,
    "| 🍪 Cookies:",
    Object.keys(req.cookies || {}),
  );
  next();
});

// Import Routes
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const teacherRoutes = require("./routes/teachers");
const financeRoutes = require("./routes/finance");
const configRoutes = require("./routes/config");
const classRoutes = require("./routes/classes");
const sessionRoutes = require("./routes/sessions");
const timetableRoutes = require("./routes/timetable");
const expenseRoutes = require("./routes/expenses");
const userRoutes = require("./routes/users");
const websiteRoutes = require("./routes/website");
const payrollRoutes = require("./routes/payroll");

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/config", configRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/website", websiteRoutes);
app.use("/api/payroll", payrollRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Edwardian Academy ERP API",
    version: "2.0.0",
    endpoints: {
      auth: "/api/auth",
      students: "/api/students",
      teachers: "/api/teachers",
      finance: "/api/finance",
      config: "/api/config",
      classes: "/api/classes",
      sessions: "/api/sessions",
      timetable: "/api/timetable",
      expenses: "/api/expenses",
      users: "/api/users",
    },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
});
