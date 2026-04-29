// API Base URL - Auto-detect Codespaces or localhost
const getApiBaseUrl = () => {
  // Check if we're in GitHub Codespaces
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    // Extract codespace name from current URL and construct backend URL
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5001.app.github.dev/api`;
  }
  // Use env var, fallback to localhost:5001
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  return `${base}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// ========================================
// Authentication API Endpoints
// ========================================
export const authApi = {
    // Login user
    login: async (username: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Login failed');
        }
        return data;
    },

    // Get current user (auto-login check)
    getMe: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: 'include', // Send cookie
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch user');
        }
        return data;
    },

    // Logout
    logout: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include', // Send cookie
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Logout failed');
        }
        return data;
    },

    // Create staff (OWNER only)
    createStaff: async (staffData: {
        username: string;
        password: string;
        fullName: string;
        phone?: string;
        email?: string;
    }) => {
        const response = await fetch(`${API_BASE_URL}/auth/create-staff`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Send cookie
            body: JSON.stringify(staffData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to create staff');
        }
        return data;
    },

    // Get all staff (OWNER only)
    getAllStaff: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/staff`, {
            credentials: 'include', // Send cookie
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch staff');
        }
        return data;
    },
};

// Teacher API Endpoints
export const teacherApi = {
    // Get all teachers
    getAll: async (filters?: { status?: string; search?: string }) => {
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.search) queryParams.append('search', filters.search);

        const url = `${API_BASE_URL}/teachers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url, {
            credentials: 'include', // ✅ CRITICAL: Send cookies for authentication
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch teachers');
        }
        return data;
    },

    // Get single teacher by ID
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/teachers/${id}`, {
            credentials: 'include', // ✅ Send cookies
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch teacher');
        }
        return data;
    },

    // Create new teacher
    create: async (teacherData: any) => {
        const response = await fetch(`${API_BASE_URL}/teachers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // ✅ Send cookies
            body: JSON.stringify(teacherData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to create teacher');
        }
        return data;
    },

    // Update teacher
    update: async (id: string, teacherData: any) => {
        const response = await fetch(`${API_BASE_URL}/teachers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // ✅ Send cookies
            body: JSON.stringify(teacherData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update teacher');
        }
        return data;
    },

    // Delete teacher
    delete: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/teachers/${id}`, {
            method: 'DELETE',
            credentials: 'include', // ✅ Send cookies
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete teacher');
        }
        return data;
    },
};

// Settings API Endpoints
export const settingsApi = {
    // Get settings
    get: async () => {
        const response = await fetch(`${API_BASE_URL}/config`, {
            credentials: 'include', // ✅ CRITICAL: Send cookies for authentication
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch settings');
        }
        return data;
    },

    // Update settings
    update: async (settingsData: any) => {
        const response = await fetch(`${API_BASE_URL}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // ✅ Include cookies
            body: JSON.stringify(settingsData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update settings');
        }
        return data;
    },
};

// Student API Endpoints
export const studentApi = {
    // Get all students
    getAll: async (filters?: { class?: string; group?: string; subject?: string; search?: string; sessionRef?: string; time?: string; teacher?: string; feeStatus?: string }) => {
        const queryParams = new URLSearchParams();
        if (filters?.class) queryParams.append('class', filters.class);
        if (filters?.group) queryParams.append('group', filters.group);
        if (filters?.subject) queryParams.append('subject', filters.subject);
        if (filters?.search) queryParams.append('search', filters.search);
        if (filters?.sessionRef) queryParams.append('sessionRef', filters.sessionRef);
        if (filters?.time) queryParams.append('time', filters.time);
        if (filters?.teacher) queryParams.append('teacher', filters.teacher);
        if (filters?.feeStatus) queryParams.append('feeStatus', filters.feeStatus);

        const url = `${API_BASE_URL}/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url, {
            credentials: 'include', // ✅ Send cookies
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch students');
        }
        return data;
    },

    // Get single student by ID
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
            credentials: 'include', // ✅ Send cookies
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch student');
        }
        return data;
    },

    // Create new student (admission)
    create: async (studentData: any) => {
        const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(studentData),
        });
        const data = await response.json();
        if (!data.success) {
            const detail = data.error ? `${data.message}: ${data.error}` : data.message;
            throw new Error(detail || 'Failed to create student');
        }
        return data;
    },

    // Update student
    update: async (id: string, studentData: any) => {
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(studentData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update student');
        }
        return data;
    },

    // Delete student
    delete: async (id: string, refundData?: { refundAmount?: number; refundReason?: string }) => {
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: refundData ? JSON.stringify(refundData) : undefined,
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete student');
        }
        return data;
    },

    // Withdraw student (soft delete) with optional refund
    withdraw: async (id: string, payload?: { refundAmount?: number; refundReason?: string }) => {
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload || {}),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to withdraw student');
        }
        return data;
    },
};

// Class API Endpoints
export const classApi = {
    // Get all classes
    getAll: async (filters?: { status?: string; search?: string }) => {
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.search) queryParams.append('search', filters.search);

        const url = `${API_BASE_URL}/classes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url, {
            credentials: 'include', // ✅ Send cookies
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch classes');
        }
        return data;
    },

    // Get single class by ID
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/classes/${id}`, {
            credentials: 'include', // ✅ Send cookies
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch class');
        }
        return data;
    },

    // Create new class
    create: async (classData: any) => {
        const response = await fetch(`${API_BASE_URL}/classes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // ✅ Send cookies
            body: JSON.stringify(classData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to create class');
        }
        return data;
    },

    // Update class
    update: async (id: string, classData: any) => {
        const response = await fetch(`${API_BASE_URL}/classes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // ✅ Send cookies
            body: JSON.stringify(classData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update class');
        }
        return data;
    },

    // Delete class
    delete: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/classes/${id}`, {
            method: 'DELETE',
            credentials: 'include', // ✅ Send cookies
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete class');
        }
        return data;
    },
};

// Session API Endpoints
export const sessionApi = {
    // Get all sessions
    getAll: async (filters?: { status?: string; search?: string }) => {
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.search) queryParams.append('search', filters.search);

        const url = `${API_BASE_URL}/sessions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url, {
            credentials: 'include', // ✅ Send cookies
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch sessions');
        }
        return data;
    },

    // Get single session by ID
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
            credentials: 'include', // ✅ Send cookies
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch session');
        }
        return data;
    },

    // Create new session
    create: async (sessionData: any) => {
        const response = await fetch(`${API_BASE_URL}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // ✅ Send cookies
            body: JSON.stringify(sessionData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to create session');
        }
        return data;
    },

    // Update session
    update: async (id: string, sessionData: any) => {
        const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // ✅ Send cookies
            body: JSON.stringify(sessionData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update session');
        }
        return data;
    },

    // Delete session
    delete: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
            method: 'DELETE',
            credentials: 'include', // ✅ Send cookies
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete session');
        }
        return data;
    },
};

// Timetable API Endpoints
export const timetableApi = {
    // Get all timetable entries
    getAll: async (filters?: { classId?: string; teacherId?: string; day?: string; status?: string }) => {
        const queryParams = new URLSearchParams();
        if (filters?.classId) queryParams.append('classId', filters.classId);
        if (filters?.teacherId) queryParams.append('teacherId', filters.teacherId);
        if (filters?.day) queryParams.append('day', filters.day);
        if (filters?.status) queryParams.append('status', filters.status);

        const url = `${API_BASE_URL}/timetable${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch timetable');
        }
        return data;
    },

    // Get single entry by ID
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/timetable/${id}`, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch timetable entry');
        }
        return data;
    },

    // Create new entry
    create: async (entryData: any) => {
        const response = await fetch(`${API_BASE_URL}/timetable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(entryData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to create timetable entry');
        }
        return data;
    },

    // Update entry
    update: async (id: string, entryData: any) => {
        const response = await fetch(`${API_BASE_URL}/timetable/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(entryData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update timetable entry');
        }
        return data;
    },

    // Delete entry
    delete: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/timetable/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete timetable entry');
        }
        return data;
    },

    // Bulk generate timetable from all active classes
    bulkGenerate: async () => {
        const response = await fetch(`${API_BASE_URL}/timetable/bulk-generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to bulk generate timetable');
        }
        return data;
    },
};


// ========================================
// Exam API Endpoints
// ========================================
export const examApi = {
    // Get all exams (Teacher/Admin)
    getAll: async (filters?: { status?: string; classRef?: string; subject?: string }) => {
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.classRef) queryParams.append('classRef', filters.classRef);
        if (filters?.subject) queryParams.append('subject', filters.subject);

        const url = `${API_BASE_URL}/exams${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch exams');
        }
        return data;
    },

    // Get single exam by ID (with answers for Teacher)
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/exams/${id}`, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch exam');
        }
        return data;
    },

    // Create new exam (Teacher/Admin)
    create: async (examData: any) => {
        const response = await fetch(`${API_BASE_URL}/exams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(examData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to create exam');
        }
        return data;
    },

    // Update exam (Teacher/Admin)
    update: async (id: string, examData: any) => {
        const response = await fetch(`${API_BASE_URL}/exams/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(examData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update exam');
        }
        return data;
    },

    // Delete exam (Teacher/Admin)
    delete: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/exams/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete exam');
        }
        return data;
    },

    // Get exams for a class (Student - NO correct answers)
    getForClass: async (classId: string) => {
        const response = await fetch(`${API_BASE_URL}/exams/class/${classId}`, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch class exams');
        }
        return data;
    },

    // Get exam to take (Student - NO correct answers)
    getForStudent: async (id: string, token?: string) => {
        const response = await fetch(`${API_BASE_URL}/exams/${id}/take`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch exam');
        }
        return data;
    },

    // Submit exam answers (Student)
    submit: async (id: string, submitData: {
        answers: number[];
        startedAt: string;
        tabSwitchCount?: number;
        isAutoSubmitted?: boolean;
    }, token?: string) => {
        const response = await fetch(`${API_BASE_URL}/exams/${id}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify(submitData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to submit exam');
        }
        return data;
    },

    // Get exam results/leaderboard (Teacher/Admin)
    getResults: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/exams/${id}/results`, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch results');
        }
        return data;
    },

    // Get my results (Student)
    getMyResults: async (token?: string) => {
        const response = await fetch(`${API_BASE_URL}/exams/student/my-results`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch my results');
        }
        return data;
    },
};

// ========================================
// Inventory API Endpoints
// ========================================
export const inventoryApi = {
    getStats: async () => {
        const response = await fetch(`${API_BASE_URL}/inventory/stats`, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch inventory stats');
        return data;
    },

    getItems: async (filters?: { category?: string; status?: string; search?: string; lowStock?: string }) => {
        const queryParams = new URLSearchParams();
        if (filters?.category) queryParams.append('category', filters.category);
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.search) queryParams.append('search', filters.search);
        if (filters?.lowStock) queryParams.append('lowStock', filters.lowStock);

        const url = `${API_BASE_URL}/inventory/items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch inventory items');
        return data;
    },

    getItem: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/inventory/items/${id}`, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch item');
        return data;
    },

    createItem: async (itemData: any) => {
        const response = await fetch(`${API_BASE_URL}/inventory/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(itemData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to create item');
        return data;
    },

    updateItem: async (id: string, itemData: any) => {
        const response = await fetch(`${API_BASE_URL}/inventory/items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(itemData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to update item');
        return data;
    },

    deleteItem: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/inventory/items/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to delete item');
        return data;
    },

    stockTransaction: async (id: string, txData: any) => {
        const response = await fetch(`${API_BASE_URL}/inventory/items/${id}/stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(txData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Stock transaction failed');
        return data;
    },

    getTransactions: async (filters?: { type?: string; itemId?: string }) => {
        const queryParams = new URLSearchParams();
        if (filters?.type) queryParams.append('type', filters.type);
        if (filters?.itemId) queryParams.append('itemId', filters.itemId);

        const url = `${API_BASE_URL}/inventory/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch transactions');
        return data;
    },

    createMaintenance: async (itemId: string, maintData: any) => {
        const response = await fetch(`${API_BASE_URL}/inventory/items/${itemId}/maintenance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(maintData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to create maintenance log');
        return data;
    },

    updateMaintenance: async (id: string, maintData: any) => {
        const response = await fetch(`${API_BASE_URL}/inventory/maintenance/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(maintData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to update maintenance');
        return data;
    },

    getMaintenanceLogs: async (filters?: { status?: string; priority?: string }) => {
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.priority) queryParams.append('priority', filters.priority);

        const url = `${API_BASE_URL}/inventory/maintenance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch maintenance logs');
        return data;
    },
};

// ========================================
// Finance API Endpoints
// ========================================
export const financeApi = {
    // Academy Settlements - Summary
    getAcademySettlementsSummary: async () => {
        const response = await fetch(`${API_BASE_URL}/finance/academy-settlements/summary`, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch settlements summary');
        return data;
    },

    // Academy Settlements - Partner Details
    getPartnerSettlementDetails: async (partnerId: string) => {
        const response = await fetch(`${API_BASE_URL}/finance/academy-settlements/partner/${partnerId}`, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch partner settlement details');
        return data;
    },

    // Academy Settlements - Release
    releasePartnerSettlements: async (partnerId: string, options?: { partial?: boolean; amount?: number; notes?: string }) => {
        const response = await fetch(`${API_BASE_URL}/finance/academy-settlements/release/${partnerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(options || {}),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to release settlements');
        return data;
    },

    // Academy Settlements - Manual Release (arbitrary amount to partner)
    manualReleaseToPartner: async (partnerId: string, amount: number, notes?: string) => {
        const response = await fetch(`${API_BASE_URL}/finance/academy-settlements/manual-release/${partnerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ amount, notes }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to release to partner');
        return data;
    },

    // Academy Settlements - History
    getSettlementHistory: async (partnerId?: string) => {
        const url = partnerId 
            ? `${API_BASE_URL}/finance/academy-settlements/history?partnerId=${partnerId}`
            : `${API_BASE_URL}/finance/academy-settlements/history`;
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch settlement history');
        return data;
    },

    // Owner Breakdown Report
    getOwnerBreakdown: async () => {
        const response = await fetch(`${API_BASE_URL}/finance/owner-breakdown`, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch owner breakdown');
        return data;
    },
};

// ========================================
// Payroll API Endpoints
// ========================================
export const payrollApi = {
    // Create Teacher Deposit
    createTeacherDeposit: async (depositData: {
        teacherId: string;
        amount: number;
        type: 'ADVANCE' | 'BONUS' | 'REIMBURSEMENT' | 'ADJUSTMENT' | 'OTHER';
        reason?: string;
        paymentMethod?: string;
    }) => {
        const response = await fetch(`${API_BASE_URL}/payroll/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(depositData),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to create deposit');
        return data;
    },

    // Get Teacher Deposits
    getTeacherDeposits: async (teacherId: string) => {
        const response = await fetch(`${API_BASE_URL}/payroll/deposits/${teacherId}`, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch deposits');
        return data;
    },

    // Reverse Teacher Deposit
    reverseTeacherDeposit: async (depositId: string, reason?: string) => {
        const response = await fetch(`${API_BASE_URL}/payroll/deposits/${depositId}/reverse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ reason }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to reverse deposit');
        return data;
    },

    // Get Teacher Earnings Breakdown
    getTeacherEarningsBreakdown: async (teacherId: string) => {
        const response = await fetch(`${API_BASE_URL}/payroll/teacher-earnings/${teacherId}`, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch earnings breakdown');
        return data;
    },
};

// ========================================
// Configuration API Endpoints
// ========================================
export const configApi = {
    // Reset all finance data (for testing)
    // deleteStudents: true will also delete all students
    resetFinance: async (options?: { deleteStudents?: boolean }) => {
        const response = await fetch(`${API_BASE_URL}/config/reset-finance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(options || {}),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to reset finance data');
        return data;
    },
};

// ========================================
// Reports API Endpoints
// ========================================
export const reportApi = {
    // Get all classes for report dropdown
    getAllClasses: async () => {
        const response = await fetch(`${API_BASE_URL}/reports/classes`, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch classes');
        return data;
    },

    // Get all teachers for report dropdown
    getAllTeachers: async () => {
        const response = await fetch(`${API_BASE_URL}/reports/teachers`, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch teachers');
        return data;
    },

    // Get all students for report dropdown
    getAllStudents: async () => {
        const response = await fetch(`${API_BASE_URL}/reports/students`, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch students');
        return data;
    },

    // Get detailed class report
    getClassReport: async (classId: string, options?: { startDate?: string; endDate?: string }) => {
        const params = new URLSearchParams();
        if (options?.startDate) params.append('startDate', options.startDate);
        if (options?.endDate) params.append('endDate', options.endDate);
        
        const url = `${API_BASE_URL}/reports/class/${classId}${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch class report');
        return data;
    },

    // Get detailed teacher report
    getTeacherReport: async (teacherId: string, options?: { startDate?: string; endDate?: string }) => {
        const params = new URLSearchParams();
        if (options?.startDate) params.append('startDate', options.startDate);
        if (options?.endDate) params.append('endDate', options.endDate);
        
        const url = `${API_BASE_URL}/reports/teacher/${teacherId}${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch teacher report');
        return data;
    },

    // Get detailed student report
    getStudentReport: async (studentId: string) => {
        const response = await fetch(`${API_BASE_URL}/reports/student/${studentId}`, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch student report');
        return data;
    },

    // Get single-subject enrollment report (students who enrolled in just one subject)
    getSingleSubjectReport: async (options?: { subject?: string; status?: string }) => {
        const params = new URLSearchParams();
        if (options?.subject) params.append('subject', options.subject);
        if (options?.status) params.append('status', options.status);
        const url = `${API_BASE_URL}/reports/single-subject${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch single-subject report');
        return data;
    },

    // Get academy summary report
    getAcademySummary: async () => {
        const response = await fetch(`${API_BASE_URL}/reports/academy-summary`, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch academy summary');
        return data;
    },

    // Get financial overview report
    getFinancialOverview: async (options?: { startDate?: string; endDate?: string }) => {
        const params = new URLSearchParams();
        if (options?.startDate) params.append('startDate', options.startDate);
        if (options?.endDate) params.append('endDate', options.endDate);
        
        const url = `${API_BASE_URL}/reports/financial-overview${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url, {
            credentials: 'include',
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch financial overview');
        return data;
    },
};

// ========================================
// Website/Public API Endpoints
// ========================================
export const websiteApi = {
    // Get public website configuration (NO auth required, but include credentials for consistency)
    getPublicConfig: async () => {
        const response = await fetch(`${API_BASE_URL}/website/public`, {
            credentials: 'include', // ✅ Include for consistency
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch public config');
        }
        return data;
    },

    // Submit inquiry form (NO auth required)
    submitInquiry: async (inquiryData: {
        name: string;
        phone: string;
        email?: string;
        interest: string;
        remarks: string;
        source: string;
    }) => {
        const response = await fetch(`${API_BASE_URL}/public/inquiry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // ✅ Include for consistency
            body: JSON.stringify(inquiryData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to submit inquiry');
        }
        return data;
    },
};

