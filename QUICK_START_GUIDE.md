# Quick Start Guide - Partner Retention System

## Prerequisites

1. **MongoDB** - Install and start MongoDB locally
2. **Node.js** - Version 16 or higher
3. **npm** - Comes with Node.js

## Setup Instructions

### 1. Install MongoDB (if not already installed)

```bash
# Ubuntu/Debian
sudo apt-get install -y mongodb

# macOS
brew install mongodb-community

# Start MongoDB
sudo service mongodb start
# or
mongod --dbpath /tmp/mongodb
```

### 2. Backend Setup

```bash
cd /workspaces/edwardian-academy-erp/backend

# Install dependencies (if not done)
npm install

# Environment is already configured (.env file created)

# Start the server
npm start
```

**Expected Output:**
```
🚀 Server running on port 5000
✅ MongoDB Connected Successfully
```

### 3. Frontend Setup

```bash
cd /workspaces/edwardian-academy-erp/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
VITE ready in XXX ms
Local: http://localhost:8080
```

## Test Flow

### A. Create Test Users (if needed)

Login as admin and create:

**Partner User:**
- Username: `saud` or `zahid`
- Role: PARTNER
- Permissions: dashboard, admissions, students, finance

**Owner User:**
- Username: `waqar`
- Role: OWNER
- Permissions: all

### B. Test as Partner

1. **Login as Partner** (e.g., saud)
   - Navigate to: http://localhost:8080

2. **Go to Admissions**
   - Create a student:
     - Name: "Test Student A"
     - Class: "FSc-1"
     - Total Fee: 10,000
     - Paid Amount: 0
   - ✅ Verify: Fee Status = "Pending"

3. **Go to Students → Collect Fee**
   - Select the student
   - Amount: 10,000
   - Month: "February 2026"
   - ✅ Verify: Fee Status = "Paid"

4. **Go to Finance Dashboard**
   - ✅ Verify: "Total Cash in Drawer" = 10,000
   - ✅ Verify: "Your Calculated Share" = 1,000 (10%)
   - ✅ Verify: "Suggested Handover" = 9,000

5. **Close the Day**
   - Click "Close Day & Submit Handover"
   - Modal opens with suggested handover: 9,000
   - You can adjust the amount if needed
   - Click "Confirm Closing"
   - ✅ Verify: Success message shown
   - ✅ Verify: Pending verification appears

### C. Test as Owner

1. **Login as Owner** (waqar)
   - Navigate to: http://localhost:8080

2. **Go to Finance Dashboard**
   - ✅ Verify: You see "Pending Verifications" section
   - ✅ Verify: Saud's closing is listed:
     - Total: PKR 10,000
     - Handing: PKR 9,000

3. **Verify the Closing**
   - Click "Verify Receipt" button
   - Confirm the action
   - ✅ Verify: Success message
   - ✅ Verify: Your total cash increased by 9,000
   - ✅ Verify: Closing removed from pending list

4. **Create a Shared Expense**
   - Go to Expenses (or use API)
   - Create expense:
     - Title: "Monthly Electric Bill"
     - Amount: 6,000
     - Category: "Utilities"
   - ✅ Verify: Partners are notified
   - ✅ Verify: Partner's debt updated

5. **Clear Partner Debt**
   - Go to "Expense Debt Tracker" in Finance
   - Find partner (Saud)
   - Enter amount to clear: 1,800
   - Click "Mark Paid"
   - ✅ Verify: Success message
   - ✅ Verify: Debt reduced

## API Testing (Alternative)

If UI is not ready, test with API calls:

### 1. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "saud",
    "password": "your_password"
  }'
```

Copy the token from response.

### 2. Create Student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "studentName": "Test Student",
    "class": "FSc-1",
    "totalFee": 10000,
    "paidAmount": 0
  }'
```

### 3. Collect Fee
```bash
curl -X POST http://localhost:5000/api/students/STUDENT_ID/collect-fee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 10000,
    "month": "February 2026"
  }'
```

### 4. Partner Dashboard
```bash
curl http://localhost:5000/api/finance/partner-dashboard \
  -H "Authorization: Bearer PARTNER_TOKEN"
```

### 5. Close Day (Partner)
```bash
curl -X POST http://localhost:5000/api/finance/daily-closing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PARTNER_TOKEN" \
  -d '{
    "handoverAmount": 9000
  }'
```

### 6. Get Pending Closings (Owner)
```bash
curl http://localhost:5000/api/finance/pending-closings \
  -H "Authorization: Bearer OWNER_TOKEN"
```

### 7. Verify Closing (Owner)
```bash
curl -X POST http://localhost:5000/api/finance/verify-closing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -d '{
    "closingId": "CLOSING_ID_FROM_STEP_5"
  }'
```

### 8. Clear Debt (Owner)
```bash
curl -X POST http://localhost:5000/api/finance/clear-debt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -d '{
    "partnerId": "PARTNER_USER_ID",
    "amount": 1800
  }'
```

## Expected Database State After Full Test

### User (Partner)
```javascript
{
  username: "saud",
  totalCash: 0,           // Cleared after verification
  expenseDebt: 0,         // If debt was cleared
  walletBalance: {
    floating: 0,
    verified: 0
  }
}
```

### User (Owner)
```javascript
{
  username: "waqar",
  totalCash: 9000,        // Received from partner
  expenseDebt: 0,
  walletBalance: {
    floating: 0,
    verified: 9000
  }
}
```

### DailyClosing
```javascript
{
  partnerId: "saud_user_id",
  totalAmount: 10000,
  partnerShare: 1000,
  handoverAmount: 9000,
  status: "VERIFIED",
  verifiedBy: "waqar_user_id",
  verifiedAt: "2026-02-04T..."
}
```

### Student
```javascript
{
  studentName: "Test Student",
  totalFee: 10000,
  paidAmount: 10000,
  feeStatus: "Paid"       // Strictly calculated
}
```

## Troubleshooting

### MongoDB Connection Error
```
Error: MONGODB_URI is missing from environment
```
**Solution:** Ensure `.env` file exists in `/backend` with:
```
MONGODB_URI=mongodb://localhost:27017/edwardianDB
```

### Port Already in Use
```
Error: Port 5000 is already in use
```
**Solution:** Kill the process or change port in `.env`

### Frontend Not Connecting
```
CORS Error or Network Error
```
**Solution:** Ensure backend is running and CORS is configured in `backend/server.js`

### Fee Status Not Updating
**Solution:** The new logic is in place. Ensure you're using the updated `studentController.js`

## Success Indicators

✅ Partner can see cash in drawer after collecting fees  
✅ Partner can close day with custom handover amount  
✅ Owner receives notification of pending closing  
✅ Owner can verify and receive handover  
✅ Partner retains their share automatically  
✅ Expense debt is tracked separately  
✅ Fee status follows strict Pending → Partial → Paid logic  

## Support

If you encounter issues:
1. Check console logs (backend and frontend)
2. Verify MongoDB is running: `ps aux | grep mongo`
3. Check network tab for API errors
4. Verify user roles and permissions
5. Review `PARTNER_RETENTION_IMPLEMENTATION.md` for details

Happy Testing! 🎉
