// Client-side LocalStorage Persistence Utility for ExamCoder

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

// Default Seed Data
export const DEFAULT_STUDENTS: Student[] = [
  { id: "1", roll: "22CSE102", name: "Aditya Verma", dept: "CSE", year: "3rd Year", section: "A", email: "aditya.22cse@psg.edu", status: "Active", lastLogin: "2026-06-17 10:42" },
  { id: "2", roll: "22CSE104", name: "Aravind Swaminathan", dept: "CSE", year: "3rd Year", section: "A", email: "aravind.22cse@psg.edu", status: "Active", lastLogin: "2026-06-17 11:35" },
  { id: "3", roll: "22CSE156", name: "Pooja Hegde", dept: "CSE", year: "3rd Year", section: "B", email: "pooja.22cse@psg.edu", status: "Inactive", lastLogin: "2026-06-12 14:10" },
  { id: "4", roll: "22ECE012", name: "Anjali Rao", dept: "ECE", year: "2nd Year", section: "A", email: "anjali.22ece@psg.edu", status: "Active", lastLogin: "2026-06-16 09:15" },
  { id: "5", roll: "22EEE045", name: "Vijay Krishnan", dept: "EEE", year: "4th Year", section: "C", email: "vijay.22eee@psg.edu", status: "Suspended", lastLogin: "2026-06-11 16:30" }
];

export const DEFAULT_ASSESSMENTS: Assessment[] = [
  { id: "1", name: "Data Structures Practical Lab Exam", subject: "CS201", duration: 180, questionsCount: 3, assignedCount: 132, status: "Active", createdDate: "2026-06-15", date: "June 17, 2026" },
  { id: "2", name: "Object Oriented Programming Final", subject: "IT305", duration: 120, questionsCount: 2, assignedCount: 65, status: "Scheduled", createdDate: "2026-06-16", date: "June 18, 2026" },
  { id: "3", name: "Design & Analysis of Algorithms Practical", subject: "CS304", duration: 180, questionsCount: 3, assignedCount: 120, status: "Completed", createdDate: "2026-06-10", date: "June 15, 2026" },
  { id: "4", name: "Database Systems Midterm Test", subject: "CS203", duration: 90, questionsCount: 2, assignedCount: 62, status: "Completed", createdDate: "2026-06-08", date: "June 12, 2026" },
  { id: "5", name: "Python Programming Laboratory", subject: "IT102", duration: 120, questionsCount: 4, assignedCount: 0, status: "Draft", createdDate: "2026-06-17", date: "June 20, 2026" }
];

export const DEFAULT_QUESTIONS: Question[] = [
  { id: "1", title: "Invert a Binary Tree", language: "C++", difficulty: "Medium", marks: 15, topic: "Data Structures", lastUpdated: "2026-06-16", status: "Active", timesUsed: 24, avgScore: "8.2/10", successRate: "76%", avgTime: "24m", createdBy: "Dr. R. Ramanujan", createdDate: "2026-01-15", version: 2, tags: ["Trees", "Recursion"] },
  { id: "2", title: "Validate Binary Search Tree", language: "Java", difficulty: "Medium", marks: 15, topic: "Data Structures", lastUpdated: "2026-06-12", status: "Active", timesUsed: 18, avgScore: "7.8/10", successRate: "68%", avgTime: "28m", createdBy: "Dr. R. Ramanujan", createdDate: "2026-01-16", version: 1, tags: ["Trees", "BST"] },
  { id: "3", title: "Method Overloading Simulation", language: "Java", difficulty: "Easy", marks: 10, topic: "OOP", lastUpdated: "2026-06-10", status: "Active", timesUsed: 32, avgScore: "9.1/10", successRate: "92%", avgTime: "12m", createdBy: "Prof. A. Sen", createdDate: "2026-02-10", version: 3, tags: ["Polymorphism", "Java"] },
  { id: "4", title: "Implement Dijkstra shortest path", language: "C++", difficulty: "Hard", marks: 20, topic: "Algorithms", lastUpdated: "2026-06-08", status: "Active", timesUsed: 8, avgScore: "6.4/10", successRate: "42%", avgTime: "45m", createdBy: "Dr. S. Bose", createdDate: "2026-03-01", version: 2, tags: ["Graphs", "Shortest Path"] },
  { id: "5", title: "Fibonacci Sequence recursion", language: "Python", difficulty: "Easy", marks: 10, topic: "Recursion", lastUpdated: "2026-05-28", status: "Active", timesUsed: 45, avgScore: "9.4/10", successRate: "95%", avgTime: "8m", createdBy: "Prof. A. Sen", createdDate: "2026-03-05", version: 1, tags: ["Recursion", "Python"] },
  { id: "6", title: "Matrix transpositions", language: "C", difficulty: "Easy", marks: 10, topic: "Arrays", lastUpdated: "2026-05-12", status: "Archived", timesUsed: 12, avgScore: "8.5/10", successRate: "88%", avgTime: "15m", createdBy: "Dr. K. Krishnan", createdDate: "2025-10-12", version: 1, tags: ["Arrays", "Matrix"] }
];

export const DEFAULT_FACULTY: FacultyProfile = {
  fullName: "Dr. Ramesh Sharma",
  employeeId: "FAC_102",
  email: "ramesh.sharma@psg.edu",
  department: "CSE",
  designation: "Professor & HOD",
  collegeName: "PSG College of Technology"
};

export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
  roll: "22CSE102",
  name: "Aditya Verma",
  dept: "Computer Science",
  year: "3rd Year",
  section: "A",
  email: "aditya.22cse@psg.edu",
  ip: "192.168.12.104"
};

export const DEFAULT_REPORTS: ReportLog[] = [
  { id: "rep-1", name: "Data Structures Practical Lab Exam Summary", category: "Assessment", generatedDate: "2026-06-17", generatedBy: "Dr. Ramesh Sharma", exportType: "PDF", downloadCount: 5 },
  { id: "rep-2", name: "CS201 Section A Student performance rank roster", category: "Student", generatedDate: "2026-06-16", generatedBy: "Dr. Ramesh Sharma", exportType: "Excel", downloadCount: 12 },
  { id: "rep-3", name: "Object Oriented Programming Final Question Difficulty Index", category: "Question", generatedDate: "2026-06-15", generatedBy: "Prof. A. Sen", exportType: "PDF", downloadCount: 3 },
  { id: "rep-4", name: "3rd Year CSE Batch Placement Eligibility report", category: "Batch", generatedDate: "2026-06-12", generatedBy: "Dr. Ramesh Sharma", exportType: "CSV", downloadCount: 8 }
];

// Storage Keys
const KEYS = {
  STUDENTS: "examcoder_students",
  ASSESSMENTS: "examcoder_assessments",
  QUESTIONS: "examcoder_questions",
  FACULTY_PROFILE: "examcoder_faculty_profile",
  STUDENT_PROFILE: "examcoder_student_profile"
};

// Helper to check if window is available (client-side)
const isClient = () => typeof window !== "undefined";

export function loadStudents(): Student[] {
  if (!isClient()) return DEFAULT_STUDENTS;
  const data = localStorage.getItem(KEYS.STUDENTS);
  if (!data) {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
    return DEFAULT_STUDENTS;
  }
  return JSON.parse(data);
}

export function saveStudents(students: Student[]): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
}

export function loadAssessments(): Assessment[] {
  if (!isClient()) return DEFAULT_ASSESSMENTS;
  const data = localStorage.getItem(KEYS.ASSESSMENTS);
  if (!data) {
    localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(DEFAULT_ASSESSMENTS));
    return DEFAULT_ASSESSMENTS;
  }
  return JSON.parse(data);
}

export function saveAssessments(assessments: Assessment[]): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(assessments));
}

export function loadQuestions(): Question[] {
  if (!isClient()) return DEFAULT_QUESTIONS;
  const data = localStorage.getItem(KEYS.QUESTIONS);
  if (!data) {
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(DEFAULT_QUESTIONS));
    return DEFAULT_QUESTIONS;
  }
  return JSON.parse(data);
}

export function saveQuestions(questions: Question[]): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(questions));
}

export function loadFacultyProfile(): FacultyProfile {
  if (!isClient()) return DEFAULT_FACULTY;
  const data = localStorage.getItem(KEYS.FACULTY_PROFILE);
  if (!data) {
    localStorage.setItem(KEYS.FACULTY_PROFILE, JSON.stringify(DEFAULT_FACULTY));
    return DEFAULT_FACULTY;
  }
  return JSON.parse(data);
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
  return JSON.parse(data);
}

export function saveStudentProfile(profile: StudentProfile): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.STUDENT_PROFILE, JSON.stringify(profile));
}

export function loadReports(): ReportLog[] {
  if (!isClient()) return DEFAULT_REPORTS;
  const data = localStorage.getItem("examcoder_reports");
  if (!data) {
    localStorage.setItem("examcoder_reports", JSON.stringify(DEFAULT_REPORTS));
    return DEFAULT_REPORTS;
  }
  return JSON.parse(data);
}

export function saveReports(reports: ReportLog[]): void {
  if (!isClient()) return;
  localStorage.setItem("examcoder_reports", JSON.stringify(reports));
}

export function resetPlatformData(toEmpty: boolean = false): void {
  if (!isClient()) return;
  if (toEmpty) {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify([]));
    localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify([]));
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify([]));
    localStorage.setItem("examcoder_reports", JSON.stringify([]));
  } else {
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
    localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(DEFAULT_ASSESSMENTS));
    localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(DEFAULT_QUESTIONS));
    localStorage.setItem(KEYS.FACULTY_PROFILE, JSON.stringify(DEFAULT_FACULTY));
    localStorage.setItem(KEYS.STUDENT_PROFILE, JSON.stringify(DEFAULT_STUDENT_PROFILE));
    localStorage.setItem("examcoder_reports", JSON.stringify(DEFAULT_REPORTS));
  }
}
