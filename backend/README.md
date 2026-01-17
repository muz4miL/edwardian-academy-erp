# Academy Management System - Backend API

This is the backend API for the Academy Management System built with the MERN stack.

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM (Object Data Modeling)
- **CORS** - Cross-Origin Resource Sharing
- **dotenv** - Environment variable management

## 📁 Project Structure

```
backend/
├── models/
│   ├── Student.js          # Student schema
│   ├── Teacher.js          # Teacher schema
│   └── FinanceRecord.js    # Finance record schema
├── routes/
│   ├── students.js         # Student API routes
│   ├── teachers.js         # Teacher API routes
│   └── finance.js          # Finance API routes
├── .env                    # Environment variables
├── server.js               # Main server file
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)

### Installation

1. **Install MongoDB locally** (if not using Atlas):
   - Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Install and start MongoDB service

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:
   - Open `.env` file
   - For **local MongoDB**, use:
     ```
     MONGODB_URI=mongodb://localhost:27017/academyDB
     ```
   - For **MongoDB Atlas**, use:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/academyDB
     ```

4. **Start the server**:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## 📚 API Endpoints

### Students API (`/api/students`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | Get all students |
| GET | `/api/students/:id` | Get student by ID |
| POST | `/api/students` | Create new student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |
| GET | `/api/students/stats/overview` | Get student statistics |

**Query Parameters for GET /api/students:**
- `class` - Filter by class (9th, 10th, 11th, 12th, MDCAT, ECAT)
- `group` - Filter by group (Pre-Medical, Pre-Engineering)
- `status` - Filter by status (active, inactive, graduated)
- `search` - Search by student name

**Example POST Request Body:**
```json
{
  "studentId": "STU-001",
  "name": "Ahmed Ali",
  "fatherName": "Mohammad Ali",
  "class": "11th",
  "group": "Pre-Medical",
  "subjects": ["Biology", "Chemistry", "Physics"],
  "phone": "0321-1234567",
  "email": "ahmed@example.com",
  "totalFee": 40000,
  "paidAmount": 40000,
  "status": "active",
  "feeStatus": "paid"
}
```

### Teachers API (`/api/teachers`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teachers` | Get all teachers |
| GET | `/api/teachers/:id` | Get teacher by ID |
| POST | `/api/teachers` | Create new teacher |
| PUT | `/api/teachers/:id` | Update teacher |
| DELETE | `/api/teachers/:id` | Delete teacher |

**Example POST Request Body:**
```json
{
  "teacherId": "TCH-001",
  "name": "Dr. Muhammad Aslam",
  "subject": "Biology",
  "phone": "0321-1111111",
  "email": "aslam@academy.com",
  "studentCount": 45,
  "monthlyEarnings": 126000,
  "status": "active"
}
```

### Finance API (`/api/finance`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/finance` | Get all finance records |
| GET | `/api/finance/:id` | Get finance record by ID |
| POST | `/api/finance` | Create new finance record |
| PUT | `/api/finance/:id` | Update finance record |
| DELETE | `/api/finance/:id` | Delete finance record |
| GET | `/api/finance/stats/overview` | Get finance statistics |

**Query Parameters for GET /api/finance:**
- `status` - Filter by status (paid, partial, pending)
- `month` - Filter by month
- `year` - Filter by year

**Example POST Request Body:**
```json
{
  "receiptId": "FEE-001",
  "studentId": "673abc123def456789",
  "studentName": "Ahmed Ali",
  "studentClass": "11th",
  "totalFee": 40000,
  "paidAmount": 40000,
  "balance": 0,
  "status": "paid",
  "paymentMethod": "cash",
  "month": "December",
  "year": 2025
}
```

## 🔧 Data Models

### Student Schema
- `studentId` - Unique identifier
- `name` - Student name
- `fatherName` - Father's name
- `class` - Class (9th, 10th, 11th, 12th, MDCAT, ECAT)
- `group` - Group (Pre-Medical, Pre-Engineering)
- `subjects` - Array of subjects
- `phone` - Contact number
- `email` - Email address
- `status` - Status (active, inactive, graduated)
- `feeStatus` - Fee status (paid, partial, pending)
- `totalFee` - Total fee amount
- `paidAmount` - Amount paid
- `balance` - Virtual field (totalFee - paidAmount)

### Teacher Schema
- `teacherId` - Unique identifier
- `name` - Teacher name
- `subject` - Teaching subject
- `phone` - Contact number
- `email` - Email address
- `studentCount` - Number of students
- `monthlyEarnings` - Monthly earnings (70% share)
- `status` - Status (active, inactive, on-leave)
- `revenueSharePercentage` - Revenue share percentage

### FinanceRecord Schema
- `receiptId` - Unique receipt ID
- `studentId` - Reference to Student
- `studentName` - Student name
- `studentClass` - Student class
- `totalFee` - Total fee
- `paidAmount` - Amount paid
- `balance` - Remaining balance
- `status` - Payment status (paid, partial, pending)
- `paymentMethod` - Payment method (cash, bank-transfer, cheque, online)
- `month` - Month of payment
- `year` - Year of payment

## 🧪 Testing the API

You can test the API using:
- **Postman** - [Download here](https://www.postman.com/downloads/)
- **Thunder Client** - VS Code extension
- **cURL** - Command line

Example cURL command:
```bash
curl http://localhost:5000/api/students
```

## 🔄 Next Steps

To connect this backend to your React frontend:

1. Update your frontend API calls to use `http://localhost:5000/api`
2. Replace hardcoded data with `useEffect` and `fetch` calls
3. See the main README for frontend integration examples

## 📝 Environment Variables

Create a `.env` file in the backend directory:

```env
MONGODB_URI=mongodb://localhost:27017/academyDB
PORT=5000
NODE_ENV=development
```

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check your connection string in `.env`
- For local MongoDB, verify service is started

**Port Already in Use:**
- Change the PORT in `.env` file
- Or stop the process using port 5000

**CORS Errors:**
- CORS is already configured in `server.js`
- Ensure frontend is making requests to `http://localhost:5000`
