const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const path = require("path");

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

// Middleware - Allow all origins for Codespaces compatibility
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
  }),
);

// CRITICAL ORDER
// Increase payload limit to 50MB for large Base64 images
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
const leadRoutes = require("./routes/leads");
// Phase 2 & 3: Security & LMS
const gatekeeperRoutes = require("./routes/gatekeeper");
const publicRoutes = require("./routes/public");
const studentPortalRoutes = require("./routes/studentPortal");
const lectureRoutes = require("./routes/lectureRoutes");
const examRoutes = require("./routes/examRoutes");
const notificationRoutes = require("./routes/notifications");

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
app.use("/api/leads", leadRoutes);
// Phase 2 & 3: Security & LMS
app.use("/api/gatekeeper", gatekeeperRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/student-portal", studentPortalRoutes);
app.use("/api/lectures", lectureRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/notifications", notificationRoutes);

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
      leads: "/api/leads",
      gatekeeper: "/api/gatekeeper",
      public: "/api/public",
      studentPortal: "/api/student-portal",
      lectures: "/api/lectures",
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
