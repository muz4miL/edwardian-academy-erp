// API Base URL - Auto-detect Codespaces or localhost
const getApiBaseUrl = () => {
  // Check if we're in GitHub Codespaces
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    // Extract codespace name from current URL and construct backend URL
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5000.app.github.dev/api`;
  }
  // Fallback to localhost for local development
  return 'http://localhost:5000/api';
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
        const response = await fetch(url);
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch teachers');
        }
        return data;
    },

    // Get single teacher by ID
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/teachers/${id}`);
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
    getAll: async (filters?: { class?: string; group?: string; search?: string; sessionRef?: string; time?: string; teacher?: string }) => {
        const queryParams = new URLSearchParams();
        if (filters?.class) queryParams.append('class', filters.class);
        if (filters?.group) queryParams.append('group', filters.group);
        if (filters?.search) queryParams.append('search', filters.search);
        if (filters?.sessionRef) queryParams.append('sessionRef', filters.sessionRef);
        if (filters?.time) queryParams.append('time', filters.time);
        if (filters?.teacher) queryParams.append('teacher', filters.teacher);

        const url = `${API_BASE_URL}/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch students');
        }
        return data;
    },

    // Get single student by ID
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/students/${id}`);
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
            body: JSON.stringify(studentData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to create student');
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
            body: JSON.stringify(studentData),
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update student');
        }
        return data;
    },

    // Delete student
    delete: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/students/${id}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete student');
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
        const response = await fetch(url);
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch classes');
        }
        return data;
    },

    // Get single class by ID
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/classes/${id}`);
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
        const response = await fetch(url);
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch sessions');
        }
        return data;
    },

    // Get single session by ID
    getById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/sessions/${id}`);
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
