// Client-side LocalStorage Persistence Utility for ExamCoder with PostgreSQL background sync

export interface Student {
  id: string;
  roll: string;
  name: string;
  email: string;
  dept: string;
  year: string;
  section: string;
  status: "Active" | "Inactive" | "Suspended";
  lastLogin: string;
}

export interface Assessment {
  id: string;
  name: string;
  subject: string;
  duration: number; // in minutes
  questionsCount: number;
  assignedCount: number;
  status: "Draft" | "Scheduled" | "Active" | "Completed" | "Archived";
  createdDate: string; // YYYY-MM-DD
  date: string; // June 17, 2026
}

export interface ExamSession {
  id: string;
  studentRoll: string;
  assessmentId: string;
  questionOrder: string; // JSON array string of question IDs
  startedAt: string;
  submittedAt: string | null;
}

export interface Question {
  id: string;
  title: string;
  language: string;
  difficulty: "Easy" | "Medium" | "Hard";
  marks: number;
  topic: string;
  lastUpdated: string;
  status: "Active" | "Archived";
  timesUsed: number;
  avgScore: string;
  successRate: string;
  avgTime: string;
  createdBy: string;
  createdDate: string;
  version: number;
  tags: string[];
  description?: string;
  estimatedTime?: number;
  allowedLanguages?: string[];
  codeTemplates?: {
    c: string;
    cpp: string;
    java: string;
    python: string;
  };
  sampleInput?: string;
  sampleOutput?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  explanation?: string;
}

export interface FacultyProfile {
  fullName: string;
  employeeId: string;
  email: string;
  department: string;
  designation: string;
  collegeName: string;
}

export interface StudentProfile {
  roll: string;
  name: string;
  email: string;
  dept: string;
  year: string;
  section: string;
  ip: string;
  collegeName: string;
}

export interface ReportLog {
  id: string;
  name: string;
  category: "Assessment" | "Student" | "Question" | "Batch" | "Department" | "Semester" | "TopPerformers" | "AtRisk";
  generatedDate: string;
  generatedBy: string;
  exportType: "PDF" | "CSV" | "Excel";
  downloadCount: number;
}

// Default Seed Data (used as static fallback before db sync completes)
export const DEFAULT_STUDENTS: Student[] = [];
export const DEFAULT_ASSESSMENTS: Assessment[] = [];
export const DEFAULT_QUESTIONS: Question[] = [];
export const DEFAULT_FACULTY: FacultyProfile = {
  fullName: "",
  employeeId: "",
  email: "",
  department: "",
  designation: "",
  collegeName: ""
};
export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
  roll: "",
  name: "",
  email: "",
  dept: "",
  year: "",
  section: "",
  ip: "",
  collegeName: ""
};
export const DEFAULT_REPORTS: ReportLog[] = [];

// Storage Keys
const KEYS = {
  STUDENTS: "examcoder_students",
  ASSESSMENTS: "examcoder_assessments",
  QUESTIONS: "examcoder_questions",
  FACULTY_PROFILE: "examcoder_faculty_profile",
  STUDENT_PROFILE: "examcoder_student_profile"
};

const isClient = () => typeof window !== "undefined";

let hasSynced = false;

// Background Database Synchronization trigger
export function triggerDbSync() {
  if (!isClient() || hasSynced) return;
  hasSynced = true;


  fetch("/api/sync")
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        let hasChanges = false;
        
        const prevStudents = localStorage.getItem(KEYS.STUDENTS);
        if (data.students && JSON.stringify(data.students) !== prevStudents) {
          localStorage.setItem(KEYS.STUDENTS, JSON.stringify(data.students));
          hasChanges = true;
        }
        const prevAssessments = localStorage.getItem(KEYS.ASSESSMENTS);
        if (data.assessments && JSON.stringify(data.assessments) !== prevAssessments) {
          localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(data.assessments));
          hasChanges = true;
        }
        const prevQuestions = localStorage.getItem(KEYS.QUESTIONS);
        if (data.questions && JSON.stringify(data.questions) !== prevQuestions) {
          localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(data.questions));
          hasChanges = true;
        }
        const prevReports = localStorage.getItem("examcoder_reports");
        if (data.reports && JSON.stringify(data.reports) !== prevReports) {
          localStorage.setItem("examcoder_reports", JSON.stringify(data.reports));
          hasChanges = true;
        }
        const prevSessions = localStorage.getItem("examcoder_exam_sessions");
        if (data.examSessions && JSON.stringify(data.examSessions) !== prevSessions) {
          localStorage.setItem("examcoder_exam_sessions", JSON.stringify(data.examSessions));
          hasChanges = true;
        }

        // If there were actual changes between local storage and database, reload the page to update the UI
        if (hasChanges) {
          window.location.reload();
        } else {
          window.dispatchEvent(new Event("examcoder_db_synced"));
        }
      }
    })
    .catch((err) => console.error("Database fetch sync error:", err));
}

// Background database mutation sync
function syncSaveToDb(type: string, data: any) {
  if (!isClient()) return;
  fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, [type]: data }),
  }).catch((err) => console.error(`Database mutation sync error for ${type}:`, err));
}

export function loadStudents(): Student[] {
  triggerDbSync();
  if (!isClient()) return DEFAULT_STUDENTS;
  const data = localStorage.getItem(KEYS.STUDENTS);
  if (!data) {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
    syncSaveToDb("students", DEFAULT_STUDENTS);
    return DEFAULT_STUDENTS;
  }
  return JSON.parse(data);
}

export function saveStudents(students: Student[]): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  syncSaveToDb("students", students);
}

export function loadAssessments(): Assessment[] {
  triggerDbSync();
  if (!isClient()) return DEFAULT_ASSESSMENTS;
  const data = localStorage.getItem(KEYS.ASSESSMENTS);
  if (!data) {
    localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(DEFAULT_ASSESSMENTS));
    syncSaveToDb("assessments", DEFAULT_ASSESSMENTS);
    return DEFAULT_ASSESSMENTS;
  }
  return JSON.parse(data);
}

export function saveAssessments(assessments: Assessment[]): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(assessments));
  syncSaveToDb("assessments", assessments);
}

export function loadQuestions(): Question[] {
  triggerDbSync();
  if (!isClient()) return DEFAULT_QUESTIONS;
  const data = localStorage.getItem(KEYS.QUESTIONS);
  if (!data) {
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(DEFAULT_QUESTIONS));
    syncSaveToDb("questions", DEFAULT_QUESTIONS);
    return DEFAULT_QUESTIONS;
  }
  return JSON.parse(data);
}

export function saveQuestions(questions: Question[]): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(questions));
  syncSaveToDb("questions", questions);
}

export function loadFacultyProfile(): FacultyProfile {
  if (!isClient()) return DEFAULT_FACULTY;
  const data = localStorage.getItem(KEYS.FACULTY_PROFILE);
  if (!data) {
    localStorage.setItem(KEYS.FACULTY_PROFILE, JSON.stringify(DEFAULT_FACULTY));
    return DEFAULT_FACULTY;
  }
  const parsed = JSON.parse(data);
  if (parsed && parsed.collegeName === "PSG College of Technology") {
    parsed.collegeName = "GITAMW Tech Node";
    localStorage.setItem(KEYS.FACULTY_PROFILE, JSON.stringify(parsed));
  }
  return parsed;
}

export function saveFacultyProfile(profile: FacultyProfile): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.FACULTY_PROFILE, JSON.stringify(profile));
}

export function loadStudentProfile(): StudentProfile {
  if (!isClient()) return DEFAULT_STUDENT_PROFILE;
  const data = localStorage.getItem(KEYS.STUDENT_PROFILE);
  if (!data) {
    localStorage.setItem(KEYS.STUDENT_PROFILE, JSON.stringify(DEFAULT_STUDENT_PROFILE));
    return DEFAULT_STUDENT_PROFILE;
  }
  const parsed = JSON.parse(data);
  if (parsed && parsed.collegeName === "PSG College of Technology") {
    parsed.collegeName = "GITAMW Tech Node";
    localStorage.setItem(KEYS.STUDENT_PROFILE, JSON.stringify(parsed));
  }
  return parsed;
}

export function saveStudentProfile(profile: StudentProfile): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.STUDENT_PROFILE, JSON.stringify(profile));
}

export function loadReports(): ReportLog[] {
  triggerDbSync();
  if (!isClient()) return DEFAULT_REPORTS;
  const data = localStorage.getItem("examcoder_reports");
  if (!data) {
    localStorage.setItem("examcoder_reports", JSON.stringify(DEFAULT_REPORTS));
    syncSaveToDb("reports", DEFAULT_REPORTS);
    return DEFAULT_REPORTS;
  }
  return JSON.parse(data);
}

export function saveReports(reports: ReportLog[]): void {
  if (!isClient()) return;
  localStorage.setItem("examcoder_reports", JSON.stringify(reports));
  syncSaveToDb("reports", reports);
}

export function loadExamSessions(): ExamSession[] {
  triggerDbSync();
  if (!isClient()) return [];
  const data = localStorage.getItem("examcoder_exam_sessions");
  if (!data) {
    localStorage.setItem("examcoder_exam_sessions", JSON.stringify([]));
    syncSaveToDb("examSessions", []);
    return [];
  }
  return JSON.parse(data);
}

export function saveExamSessions(sessions: ExamSession[]): void {
  if (!isClient()) return;
  localStorage.setItem("examcoder_exam_sessions", JSON.stringify(sessions));
  syncSaveToDb("examSessions", sessions);
}

export function resetPlatformData(toEmpty: boolean = false): void {
  if (!isClient()) return;
  if (toEmpty) {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify([]));
    localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify([]));
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify([]));
    localStorage.setItem("examcoder_reports", JSON.stringify([]));
    localStorage.setItem("examcoder_exam_sessions", JSON.stringify([]));
    // Background reset could clear database
  } else {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
    localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(DEFAULT_ASSESSMENTS));
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(DEFAULT_QUESTIONS));
    localStorage.setItem(KEYS.FACULTY_PROFILE, JSON.stringify(DEFAULT_FACULTY));
    localStorage.setItem(KEYS.STUDENT_PROFILE, JSON.stringify(DEFAULT_STUDENT_PROFILE));
    localStorage.setItem("examcoder_reports", JSON.stringify(DEFAULT_REPORTS));
    localStorage.setItem("examcoder_exam_sessions", JSON.stringify([]));
  }
}
