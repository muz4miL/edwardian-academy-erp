# 🧪 Authentication System Test Guide

## ✅ **AUTHENTICATION SYSTEM IS LIVE**

The server is running at: **http://localhost:5000**

---

## 📋 Quick Test Checklist

### ✅ Core Users Created
- **Waqar** (OWNER) - Username: `waqar`, Password: `admin123`
- **Zahid** (PARTNER) - Username: `zahid`, Password: `admin123`
- **Saud** (PARTNER) - Username: `saud`, Password: `admin123`

---

## 🧪 Test with Thunder Client / Postman

### Test 1: Login as Owner (Waqar)

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/login`  
**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "username": "waqar",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ Welcome back, Sir Waqar Baig!",
  "user": {
    "userId": "OWNER-001",
    "username": "waqar",
    "fullName": "Sir Waqar Baig",
    "role": "OWNER",
    "walletBalance": 0,
    "floatingCash": 0,
    "pendingDebt": 0,
    "phone": "0300-1234567",
    "email": "waqar@edwardianacademy.com",
    "isActive": true,
    "lastLogin": "2026-01-17T..."
  }
}
```

**Important:** Check the **Response Headers** for:
```
Set-Cookie: authToken=<JWT_TOKEN>; Path=/; HttpOnly; SameSite=Strict
```

---

### Test 2: Get Current User

**Method:** `GET`  
**URL:** `http://localhost:5000/api/auth/me`  
**Headers:** None (Cookie is sent automatically)

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "userId": "OWNER-001",
    "username": "waqar",
    "fullName": "Sir Waqar Baig",
    "role": "OWNER",
    "walletBalance": 0,
    "floatingCash": 0,
    "pendingDebt": 0,
    "isActive": true
  }
}
```

---

### Test 3: Create Staff (OWNER Only)

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/create-staff`  
**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "username": "ali_reception",
  "password": "reception123",
  "fullName": "Ali Ahmed",
  "phone": "0300-9999999",
  "email": "ali@edwardianacademy.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ Staff account created successfully for Ali Ahmed.",
  "user": {
    "userId": "STAFF-001",
    "username": "ali_reception",
    "fullName": "Ali Ahmed",
    "role": "STAFF",
    "isActive": true
  }
}
```

---

### Test 4: Try Creating Staff as Partner (Should Fail)

1. First, **logout** from Owner account:
   - **Method:** `POST`
   - **URL:** `http://localhost:5000/api/auth/logout`

2. **Login as Zahid:**
   - Use `/api/auth/login` with `username: "zahid"`, `password: "admin123"`

3. **Try to create staff:**
   - Use the same request from Test 3

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "🚫 Access denied. This action requires OWNER privileges."
}
```

---

### Test 5: Security Test (Token in Body)

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/login`  
**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "username": "waqar",
  "password": "admin123",
  "token": "some-fake-token"
}
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "⛔ Security Violation: Tokens must be sent via secure cookies, not request body."
}
```

---

## 🎯 All Tests Passed?

If all tests work correctly, the authentication system is **fully operational**! 

### ✅ What We've Built:
1. **User Model** with financial fields (walletBalance, floatingCash, pendingDebt)
2. **JWT-based authentication** with HTTP-only cookies
3. **Role-based access control** (OWNER, PARTNER, STAFF)
4. **Protected core accounts** (cannot be deleted)
5. **Staff management** (OWNER can create/toggle staff)
6. **Security features** (bcrypt hashing, token rejection in body, CSRF protection)

---

## 📝 Next Steps

After confirming authentication works:

1. **Frontend Integration** - React auth context with login/logout
2. **Partner Dashboard** - Display walletBalance, floatingCash, pendingDebt
3. **Daily Closing** - Move floatingCash to walletBalance
4. **Expense Management** - Waqar pays, system debits partners

---

**Test Status:** ✅ **READY FOR TESTING**
