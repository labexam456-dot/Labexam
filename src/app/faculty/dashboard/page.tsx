"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, 
  BookOpen, 
  Database, 
  Activity, 
  FileSpreadsheet, 
  TrendingUp, 
  Settings as SettingsIcon, 
  LayoutDashboard,
  Shield, 
  Plus, 
  Upload, 
  Trash2, 
  Edit3, 
  Eye, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertOctagon, 
  Download,
  AlertCircle,
  HelpCircle,
  Menu,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  AlertTriangle
} from "lucide-react";
import { 
  loadAssessments, 
  saveAssessments, 
  loadStudents, 
  saveStudents, 
  loadQuestions, 
  saveQuestions, 
  resetPlatformData, 
  loadFacultyProfile,
  getAssessmentStatus,
  FacultyProfile
} from "@/lib/storage";

import FacultySidebar from "@/components/faculty-sidebar";
import EmptyState from "@/components/empty-state";
import DashboardMockup from "@/components/dashboard-mockup";
import ReportsDashboardView from "@/components/reports-dashboard-view";
import AnalyticsDashboardView from "@/components/analytics-dashboard-view";

// Type definitions
interface Assessment {
  id: string;
  name: string;
  subject: string;
  duration: string;
  assignedCount: number;
  status: "In Progress" | "Scheduled" | "Completed";
  date: string;
}

interface Student {
  id: string;
  roll: string;
  name: string;
  email: string;
  dept: string;
  section: string;
  status: "Active" | "Inactive";
}

interface Question {
  id: string;
  title: string;
  subject: string;
  difficulty: "Easy" | "Medium" | "Hard";
  usageCount: number;
  tags: string[];
}

export default function FacultyDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Toggle Empty State Previews
  const [showEmptyAssessments, setShowEmptyAssessments] = useState(false);
  const [showEmptyStudents, setShowEmptyStudents] = useState(false);
  const [showEmptyQuestions, setShowEmptyQuestions] = useState(false);

  // Modals visibility state
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [showUploadStudentsModal, setShowUploadStudentsModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  // CSV Import States
  interface ParsedRow {
    rowNum: number;
    data: {
      title: string;
      subject: string;
      difficulty: "Easy" | "Medium" | "Hard";
      description: string;
      marks: number;
      estimatedTime: number;
      allowedLanguages: string[];
      status: "Active" | "Archived";
      sampleInput: string;
      sampleOutput: string;
    };
    errors: string[];
    isValid: boolean;
  }

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  // CSV Import Helpers
  const parseCSV = (csvText: string): ParsedRow[] => {
    const lines: string[][] = [];
    let row: string[] = [""];
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    
    if (lines.length === 0) return [];
    
    // Header parsing - case-insensitive mapping
    const rawHeaders = lines[0].map(h => h.trim().toLowerCase());
    
    const requiredHeaders = [
      "question title",
      "course subject",
      "difficulty rating",
      "question description",
      "maximum marks",
      "estimated completion time",
      "allowed programming languages",
      "question status"
    ];
    
    const missingHeaders: string[] = [];
    requiredHeaders.forEach(req => {
      if (rawHeaders.indexOf(req) === -1) {
        missingHeaders.push(req.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
      }
    });
    
    if (missingHeaders.length > 0) {
      throw new Error(`CSV structure validation failed. Missing required columns: ${missingHeaders.join(", ")}`);
    }

    const titleIdx = rawHeaders.indexOf("question title");
    const subjectIdx = rawHeaders.indexOf("course subject");
    const difficultyIdx = rawHeaders.indexOf("difficulty rating");
    const descriptionIdx = rawHeaders.indexOf("question description");
    const marksIdx = rawHeaders.indexOf("maximum marks");
    const timeIdx = rawHeaders.indexOf("estimated completion time");
    const langIdx = rawHeaders.indexOf("allowed programming languages");
    const statusIdx = rawHeaders.indexOf("question status");
    const sampleInputIdx = rawHeaders.indexOf("sample input");
    let expectedOutcomeIdx = rawHeaders.indexOf("expected outcome");
    if (expectedOutcomeIdx === -1) {
      expectedOutcomeIdx = rawHeaders.indexOf("expected output");
    }

    const results: ParsedRow[] = [];
    
    for (let r = 1; r < lines.length; r++) {
      const line = lines[r];
      if (line.length === 0 || (line.length === 1 && line[0].trim() === "")) continue;
      
      const errors: string[] = [];
      const title = titleIdx !== -1 && line[titleIdx] ? line[titleIdx].trim() : "";
      const subject = subjectIdx !== -1 && line[subjectIdx] ? line[subjectIdx].trim() : "";
      const difficultyRaw = difficultyIdx !== -1 && line[difficultyIdx] ? line[difficultyIdx].trim() : "";
      const description = descriptionIdx !== -1 && line[descriptionIdx] ? line[descriptionIdx].trim() : "";
      const marksRaw = marksIdx !== -1 && line[marksIdx] ? line[marksIdx].trim() : "";
      const timeRaw = timeIdx !== -1 && line[timeIdx] ? line[timeIdx].trim() : "";
      const langRaw = langIdx !== -1 && line[langIdx] ? line[langIdx].trim() : "";
      const statusRaw = statusIdx !== -1 && line[statusIdx] ? line[statusIdx].trim() : "";
      const sampleInput = sampleInputIdx !== -1 && line[sampleInputIdx] ? line[sampleInputIdx].trim() : "";
      const sampleOutput = expectedOutcomeIdx !== -1 && line[expectedOutcomeIdx] ? line[expectedOutcomeIdx].trim() : "";
      
      if (!title) {
        errors.push("Question Title is required and cannot be empty.");
      }
      if (!subject) {
        errors.push("Course Subject is required and cannot be empty.");
      }
      
      let difficulty: "Easy" | "Medium" | "Hard" = "Medium";
      if (!difficultyRaw) {
        errors.push("Difficulty Rating is required.");
      } else {
        const diffLower = difficultyRaw.toLowerCase();
        if (diffLower === "easy") {
          difficulty = "Easy";
        } else if (diffLower === "medium") {
          difficulty = "Medium";
        } else if (diffLower === "hard") {
          difficulty = "Hard";
        } else {
          errors.push(`Invalid Difficulty Rating '${difficultyRaw}'. Must be one of: Easy, Medium, Hard.`);
        }
      }
      
      if (!description) {
        errors.push("Question Description is required and cannot be empty.");
      }
      
      let marks = 0;
      if (!marksRaw) {
        errors.push("Maximum Marks is required.");
      } else {
        const parsedMarks = Number(marksRaw);
        if (isNaN(parsedMarks) || parsedMarks <= 0) {
          errors.push(`Invalid Maximum Marks '${marksRaw}'. Must be a positive number.`);
        } else {
          marks = Math.floor(parsedMarks);
        }
      }

      let estimatedTime = 0;
      if (!timeRaw) {
        errors.push("Estimated Completion Time is required.");
      } else {
        const cleanTime = timeRaw.replace(/[^0-9.]/g, "");
        const parsedTime = Number(cleanTime);
        if (isNaN(parsedTime) || parsedTime <= 0) {
          errors.push(`Invalid Estimated Completion Time '${timeRaw}'. Must be a positive integer.`);
        } else {
          estimatedTime = Math.floor(parsedTime);
        }
      }

      let allowedLanguages: string[] = [];
      if (!langRaw) {
        errors.push("Allowed Programming Languages is required.");
      } else {
        allowedLanguages = langRaw.split(/[,;\/|]/).map(l => l.trim()).filter(Boolean);
        if (allowedLanguages.length === 0) {
          errors.push("Allowed Programming Languages must contain at least one language.");
        }
      }

      let status: "Active" | "Archived" = "Active";
      if (statusRaw) {
        const statusLower = statusRaw.toLowerCase();
        if (statusLower === "active") {
          status = "Active";
        } else if (statusLower === "archived" || statusLower === "inactive") {
          status = "Archived";
        } else {
          errors.push(`Invalid Question Status '${statusRaw}'. Must be Active or Archived.`);
        }
      }
      
      results.push({
        rowNum: r + 1,
        data: {
          title,
          subject,
          difficulty,
          description,
          marks,
          estimatedTime,
          allowedLanguages,
          status,
          sampleInput,
          sampleOutput
        },
        errors,
        isValid: errors.length === 0
      });
    }
    
    return results;
  };

  const handleCSVFile = (file: File) => {
    setValidationError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setValidationError("File format not supported. Please select a valid CSV file.");
      setUploadedFile(null);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const results = parseCSV(text);
        if (results.length === 0) {
          setValidationError("The uploaded CSV file contains no question records.");
          setParsedRows([]);
          setUploadedFile(null);
        } else {
          setUploadedFile(file);
          setParsedRows(results);
        }
      } catch (err: any) {
        setValidationError(err.message || "Failed to parse CSV file. Please verify file integrity.");
        setParsedRows([]);
        setUploadedFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const csvContent = [
      "Question Title,Course Subject,Difficulty Rating,Question Description,Maximum Marks,Estimated Completion Time,Allowed Programming Languages,Question Status,Sample Input,Expected Outcome",
      'Invert a Binary Tree,Data Structures,Medium,"Given the root of a binary tree, invert the tree (swap left and right subtrees of every node) and return its root.",15,30,"C++, Java, Python",Active,"[4,2,7,1,3,6,9]","[4,7,2,9,6,3,1]"',
      'Fibonacci Sequence,Recursion,Easy,"Write a recursive function to compute the Nth Fibonacci number.",10,15,"Python, Java, C++",Active,"5","5"',
      'Validate Binary Search Tree,Data Structures,Medium,"Given the root of a binary tree, determine if it is a valid binary search tree (BST).",15,25,"Java, Python",Active,"[2,1,3]","true"',
      'Implement Dijkstra Shortest Path,Algorithms,Hard,"Given a weighted graph, find the shortest path from a source vertex S to all other vertices.",20,45,"C++, Java",Active,"4\n0 1 1\n0 2 4\n1 2 2\n1 3 6","0 1 3 7"'
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_questions.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadErrorReport = () => {
    if (parsedRows.length === 0) return;
    const invalid = parsedRows.filter(r => !r.isValid);
    if (invalid.length === 0) return;
    
    const csvHeaders = "Row,Question Title,Course Subject,Difficulty Rating,Question Description,Maximum Marks,Estimated Completion Time,Allowed Programming Languages,Question Status,Sample Input,Expected Outcome,Errors\n";
    const csvContent = invalid.map(r => {
      const titleEscaped = `"${(r.data.title || "").replace(/"/g, '""')}"`;
      const subjectEscaped = `"${(r.data.subject || "").replace(/"/g, '""')}"`;
      const diffEscaped = `"${(r.data.difficulty || "").replace(/"/g, '""')}"`;
      const descEscaped = `"${(r.data.description || "").replace(/"/g, '""')}"`;
      const marksEscaped = r.data.marks || "";
      const timeEscaped = r.data.estimatedTime || "";
      const langEscaped = `"${(r.data.allowedLanguages || []).join(", ").replace(/"/g, '""')}"`;
      const statusEscaped = `"${(r.data.status || "").replace(/"/g, '""')}"`;
      const sampleInputEscaped = `"${(r.data.sampleInput || "").replace(/"/g, '""')}"`;
      const sampleOutputEscaped = `"${(r.data.sampleOutput || "").replace(/"/g, '""')}"`;
      const errorsEscaped = `"${r.errors.join("; ").replace(/"/g, '""')}"`;
      return `${r.rowNum},${titleEscaped},${subjectEscaped},${diffEscaped},${descEscaped},${marksEscaped},${timeEscaped},${langEscaped},${statusEscaped},${sampleInputEscaped},${sampleOutputEscaped},${errorsEscaped}`;
    }).join("\n");
    
    const blob = new Blob([csvHeaders + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${uploadedFile?.name.replace(".csv", "")}_error_report.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeImportValid = () => {
    const valid = parsedRows.filter(r => r.isValid);
    if (valid.length === 0) {
      triggerToast("No valid questions to import.", "error");
      return;
    }
    
    const facultyProfile = loadFacultyProfile();
    const newQuestions: any[] = valid.map((row, idx) => ({
      id: (Date.now() + idx).toString(),
      title: row.data.title,
      language: row.data.allowedLanguages.join(", "),
      difficulty: row.data.difficulty,
      marks: row.data.marks,
      topic: row.data.subject,
      lastUpdated: new Date().toISOString().split("T")[0],
      status: row.data.status,
      timesUsed: 0,
      avgScore: "N/A",
      successRate: "N/A",
      avgTime: `${row.data.estimatedTime}m`,
      createdBy: facultyProfile.fullName || "Faculty HOD",
      createdDate: new Date().toISOString().split("T")[0],
      version: 1,
      tags: [row.data.subject, row.data.difficulty],
      description: row.data.description,
      estimatedTime: row.data.estimatedTime,
      allowedLanguages: row.data.allowedLanguages,
      sampleInput: row.data.sampleInput,
      sampleOutput: row.data.sampleOutput
    }));
    
    const updated = [...newQuestions, ...loadQuestions()];
    saveQuestions(updated);
    
    // Reload state questions
    setQuestions(updated.map(q => ({
      id: q.id,
      title: q.title,
      subject: `${q.language}: ${q.topic}`,
      difficulty: q.difficulty,
      usageCount: q.timesUsed,
      tags: q.tags
    })));
    
    triggerToast(`Successfully imported ${newQuestions.length} questions.`);
    setShowImportModal(false);
    resetImportUploader();
  };

  const resetImportUploader = () => {
    setUploadedFile(null);
    setParsedRows([]);
    setValidationError(null);
  };

  // 1. Dynamic State Data synchronized from local storage
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Derived Dynamic Statistics
  const totalStudentsCount = students.length;
  const totalAssessmentsCount = assessments.length;
  const activeExamsCount = assessments.filter(a => a.status === "In Progress").length;
  const completedExamsCount = assessments.filter(a => a.status === "Completed").length;

  const totalQuestionsCount = questions.length;
  const codingCoreQuestionsCount = questions.filter(q => q.subject.toLowerCase().includes("structures") || q.subject.toLowerCase().includes("algorithm") || q.subject.toLowerCase().includes("code") || q.subject.toLowerCase().includes("python") || q.subject.toLowerCase().includes("java") || q.subject.toLowerCase().includes("programming")).length;
  const addedRecentlyQuestionsCount = questions.length > 0 ? Math.min(12, questions.length) : 0;
  const frequentlyUsedQuestionsCount = questions.filter(q => q.usageCount > 0).length;

  const activeTelemetryStudents = activeExamsCount > 0 ? 64 : 0;
  const activeTelemetryRooms = activeExamsCount > 0 ? "1 active room" : "0 active rooms";
  const activeTelemetrySubmissions = activeExamsCount > 0 ? "42 compiled" : "0 compiled";
  const activeTelemetryWarnings = activeExamsCount > 0 ? "6 incidents flagged" : "0 incidents flagged";
  
  const [faculty, setFaculty] = useState<FacultyProfile>({
    fullName: "",
    department: "",
    designation: "",
    employeeId: "",
    email: "",
    collegeName: ""
  });

  // Load from local storage inside mount effect
  useEffect(() => {
    const loadedAsms = loadAssessments().map(a => {
      const comp = getAssessmentStatus(a, "", []);
      const displayStatus = comp === "Active" ? "In Progress" as const : comp === "Completed" ? "Completed" as const : "Scheduled" as const;
      return {
        id: a.id,
        name: a.name,
        subject: a.subject,
        duration: `${a.duration} mins`,
        assignedCount: a.assignedCount,
        status: displayStatus,
        date: a.date
      };
    });
    setAssessments(loadedAsms);
    
    setStudents(loadStudents().map(s => ({
      id: s.id,
      roll: s.roll,
      name: s.name,
      email: s.email,
      dept: s.dept,
      section: s.section,
      status: s.status === "Active" ? "Active" as const : "Inactive" as const
    })));

    setQuestions(loadQuestions().map(q => ({
      id: q.id,
      title: q.title,
      subject: `${q.language}: ${q.topic}`,
      difficulty: q.difficulty,
      usageCount: q.timesUsed,
      tags: q.tags
    })));

    setFaculty(loadFacultyProfile());
  }, []);

  // New Exam form inputs
  const [newExam, setNewExam] = useState({
    name: "",
    subject: "",
    duration: "180 mins",
    assignedCount: 60,
    date: "2026-06-20",
    time: "10:00",
    status: "Scheduled" as const
  });

  // New Student input
  const [newStudent, setNewStudent] = useState({
    roll: "",
    name: "",
    email: "",
    dept: "CSE",
    section: "A"
  });

  // New Question inputs
  const [newQuestion, setNewQuestion] = useState({
    title: "",
    subject: "CS201: Data Structures",
    difficulty: "Medium" as const,
    description: "",
    maxMarks: 10,
    estimatedTime: 30,
    allowedLanguages: ["C", "C++", "Java", "Python", "JavaScript"] as string[],
    sampleInput: "",
    sampleOutput: ""
  });

  // Action: Add New Exam
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.name || !newExam.subject) return;

    const durationNum = parseInt(newExam.duration) || 180;

    // Format the date selected by the user
    const formattedDate = (() => {
      if (!newExam.date) return "June 20, 2026";
      const parts = newExam.date.split("-");
      if (parts.length !== 3) return newExam.date;
      const year = parts[0];
      const monthIdx = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "June",
        "July", "Aug", "Sept", "Oct", "Nov", "Dec"
      ];
      return `${months[monthIdx]} ${day}, ${year}`;
    })();

    // Format the time selected by the user
    const formattedTime = (() => {
      if (!newExam.time) return "10:00 AM";
      const parts = newExam.time.split(":");
      if (parts.length < 2) return newExam.time;
      let hours = parseInt(parts[0]);
      const minutes = parts[1];
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    })();

    const combinedDateTime = `${formattedDate}, ${formattedTime}`;

    const storageExam = {
      id: Date.now().toString(),
      name: newExam.name,
      subject: newExam.subject,
      duration: durationNum,
      questionsCount: 0,
      assignedCount: newExam.assignedCount,
      status: "Scheduled" as const,
      createdDate: new Date().toISOString().split("T")[0],
      date: combinedDateTime
    };

    const allExams = [storageExam, ...loadAssessments()];
    saveAssessments(allExams);

    const created: Assessment = {
      id: storageExam.id,
      name: storageExam.name,
      subject: storageExam.subject,
      duration: newExam.duration,
      assignedCount: storageExam.assignedCount,
      status: "Scheduled",
      date: storageExam.date
    };

    setAssessments([created, ...assessments]);
    setShowCreateExamModal(false);
    setNewExam({ name: "", subject: "", duration: "180 mins", assignedCount: 60, date: "2026-06-20", time: "10:00", status: "Scheduled" });
    
    // Redirect to Question Bank to add questions
    router.push(`/faculty/question-bank?action=add-questions&assessmentId=${storageExam.id}&assessmentName=${encodeURIComponent(storageExam.name)}`);
  };

  // Action: Upload Mock Student Roster
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.roll || !newStudent.name || !newStudent.email) return;

    const addedStorage = {
      id: Date.now().toString(),
      roll: newStudent.roll.toUpperCase(),
      name: newStudent.name,
      email: newStudent.email,
      dept: newStudent.dept,
      year: "3rd Year",
      section: newStudent.section,
      status: "Active" as const,
      lastLogin: new Date().toISOString().slice(0, 16).replace("T", " ")
    };

    const allStudents = [addedStorage, ...loadStudents()];
    saveStudents(allStudents);

    const added: Student = {
      id: addedStorage.id,
      roll: addedStorage.roll,
      name: addedStorage.name,
      email: addedStorage.email,
      dept: addedStorage.dept,
      section: addedStorage.section,
      status: "Active"
    };

    setStudents([added, ...students]);
    setShowUploadStudentsModal(false);
    setNewStudent({ roll: "", name: "", email: "", dept: "CSE", section: "A" });
  };

  // Action: Add new question
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.title) return;

    const tags: string[] = [];
    const addedStorage = {
      id: Date.now().toString(),
      title: newQuestion.title,
      language: newQuestion.allowedLanguages.join(", ") || newQuestion.subject.split(":")[0]?.trim() || "C++",
      difficulty: newQuestion.difficulty,
      marks: newQuestion.maxMarks,
      topic: newQuestion.subject.split(":")[1]?.trim() || "Core",
      lastUpdated: new Date().toISOString().split("T")[0],
      status: "Active" as const,
      timesUsed: 0,
      avgScore: "N/A",
      successRate: "N/A",
      avgTime: "N/A",
      createdBy: faculty.fullName,
      createdDate: new Date().toISOString().split("T")[0],
      version: 1,
      tags: tags,
      description: newQuestion.description,
      estimatedTime: newQuestion.estimatedTime,
      allowedLanguages: newQuestion.allowedLanguages,
      sampleInput: newQuestion.sampleInput,
      sampleOutput: newQuestion.sampleOutput
    };

    const allQuestions = [addedStorage, ...loadQuestions()];
    saveQuestions(allQuestions);

    const added: Question = {
      id: addedStorage.id,
      title: addedStorage.title,
      subject: newQuestion.subject,
      difficulty: addedStorage.difficulty,
      usageCount: 0,
      tags: tags
    };

    setQuestions([added, ...questions]);
    setShowAddQuestionModal(false);
    setNewQuestion({ 
      title: "", 
      subject: "CS201: Data Structures", 
      difficulty: "Medium", 
      description: "",
      maxMarks: 10,
      estimatedTime: 30,
      allowedLanguages: ["C", "C++", "Java", "Python", "JavaScript"],
      sampleInput: "",
      sampleOutput: ""
    });
  };

  // Action: Delete Assessment
  const handleDeleteAssessment = (id: string) => {
    const updated = loadAssessments().filter(a => a.id !== id);
    saveAssessments(updated);
    setAssessments(assessments.filter(a => a.id !== id));
  };

  // Action: Delete Student
  const handleDeleteStudent = (id: string) => {
    const updated = loadStudents().filter(s => s.id !== id);
    saveStudents(updated);
    setStudents(students.filter(s => s.id !== id));
  };

  // Action: Delete Question
  const handleDeleteQuestion = (id: string) => {
    const updated = loadQuestions().filter(q => q.id !== id);
    saveQuestions(updated);
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleResetAllData = () => {
    if (confirm("Are you sure you want to reset all platform data to the default seeded demo state? Any custom additions will be lost.")) {
      resetPlatformData(false);
      
      // Reload states
      setAssessments(loadAssessments().map(a => {
        const comp = getAssessmentStatus(a, "", []);
        const displayStatus = comp === "Active" ? "In Progress" as const : comp === "Completed" ? "Completed" as const : "Scheduled" as const;
        return {
          id: a.id,
          name: a.name,
          subject: a.subject,
          duration: `${a.duration} mins`,
          assignedCount: a.assignedCount,
          status: displayStatus,
          date: a.date
        };
      }));
      setStudents(loadStudents().map(s => ({
        id: s.id,
        roll: s.roll,
        name: s.name,
        email: s.email,
        dept: s.dept,
        section: s.section,
        status: s.status === "Active" ? "Active" as const : "Inactive" as const
      })));
      setQuestions(loadQuestions().map(q => ({
        id: q.id,
        title: q.title,
        subject: `${q.language}: ${q.topic}`,
        difficulty: q.difficulty,
        usageCount: q.timesUsed,
        tags: q.tags
      })));
      setFaculty(loadFacultyProfile());
      alert("Platform data has been reset to default seeded values.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans select-none text-xs">
      
      {/* Sidebar Navigation */}
      <FacultySidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Panel Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        
        {/* Top Navbar Header */}
        <header className="no-print bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1 rounded-md text-slate-500 hover:text-slate-800 focus-ring"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-slate-900 capitalize tracking-tight">
              {activeTab === "questions" ? "Question Bank" : activeTab} Panel
            </h2>
          </div>

          {/* User profile dropdown menu */}
          <div className="relative">
            <div 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
            >
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                {faculty.collegeName || "Gouthami Institute of Technology and Management for Women"}
              </span>
              <div className="text-right hidden sm:block border-r border-slate-200 pr-3">
                <p className="font-bold text-slate-800">{faculty.fullName}</p>
                <p className="text-[10px] text-slate-400 font-medium">{faculty.designation} • Department of {faculty.department}</p>
              </div>
              <div className="bg-navy-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs">
                {faculty.fullName.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "FC"}
              </div>
            </div>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-4 px-4 z-50 text-xs font-sans text-slate-700 space-y-3">
                <div className="border-b border-slate-150 pb-2">
                  <p className="font-extrabold text-slate-900 text-sm">{faculty.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{faculty.designation}</p>
                </div>
                <div className="space-y-2 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-450">Employee ID:</span>
                    <span className="text-slate-800 font-bold">{faculty.employeeId || "FAC_102"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">Email:</span>
                    <span className="text-slate-850 font-medium">{faculty.email || "rama@psgtech.edu"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">Department:</span>
                    <span className="text-slate-800 font-bold">{faculty.department || "CSE"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-455">Institution:</span>
                    <span className="text-slate-800 font-medium">{faculty.collegeName || "Gouthami Institute of Technology and Management for Women"}</span>
                  </div>
                </div>
                <div className="border-t border-slate-150 pt-2 flex justify-end">
                  <button 
                    onClick={() => {
                      localStorage.removeItem("examcoder_auth_token");
                      router.push("/faculty/login");
                    }}
                    className="text-rose-600 hover:text-rose-700 font-bold hover:underline"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Body viewport */}
        <div className="p-6 md:p-8 flex-1 space-y-6">
          
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Statistics row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-4">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-md text-slate-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Students</p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalStudentsCount}</p>
                  </div>
                </div>

                <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-4">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-md text-slate-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Assessments</p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalAssessmentsCount}</p>
                  </div>
                </div>

                <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-4">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Active Exams</p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{activeExamsCount}</p>
                  </div>
                </div>

                <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-4">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-md text-slate-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Completed Exams</p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{completedExamsCount}</p>
                  </div>
                </div>
              </div>

              {/* Main Content Layout splits */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left panel: Recent Assessments & Question summary */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Recent Assessments Card */}
                  <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-250 bg-white flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Recent Examinations Portfolio</h3>
                      <button 
                        onClick={() => setActiveTab("assessments")}
                        className="text-[11px] text-navy-800 hover:text-navy-950 font-bold hover:underline flex items-center gap-1"
                      >
                        Manage All <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <th className="py-3 px-4">Assessment Name</th>
                            <th className="py-3 px-4">Subject</th>
                            <th className="py-3 px-4">Duration</th>
                            <th className="py-3 px-4">Allocated</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {assessments.slice(0, 3).map((asm) => (
                            <tr key={asm.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-bold text-slate-900">{asm.name}</td>
                              <td className="py-3 px-4 font-mono font-medium text-slate-500">{asm.subject}</td>
                              <td className="py-3 px-4 text-slate-650">{asm.duration}</td>
                              <td className="py-3 px-4 text-slate-650 font-mono font-medium">{asm.assignedCount} slots</td>
                              <td className="py-3 px-4">
                                {asm.status === "In Progress" && (
                                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded">
                                    IN PROGRESS
                                  </span>
                                )}
                                {asm.status === "Scheduled" && (
                                  <span className="bg-blue-50 border border-blue-200 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded">
                                    SCHEDULED
                                  </span>
                                )}
                                {asm.status === "Completed" && (
                                  <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded">
                                    COMPLETED
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right space-x-1.5 shrink-0">
                                {asm.status === "In Progress" ? (
                                  <Link 
                                    href={`/faculty/monitoring/${asm.id}`}
                                    className="text-[10px] bg-rose-50 text-rose-800 border border-rose-250 font-bold px-2 py-1 rounded hover:bg-rose-100 transition-colors inline-block"
                                  >
                                    Monitor
                                  </Link>
                                ) : (
                                  <button 
                                    onClick={() => alert(`Details for ${asm.name}`)}
                                    className="text-[10px] text-slate-600 hover:text-slate-900 font-bold"
                                  >
                                    View
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Question Bank summary cards */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Question Bank Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
                        <p className="text-slate-400 font-semibold uppercase text-[9px]">Total Questions</p>
                        <p className="text-xl font-extrabold text-slate-900 mt-1">{totalQuestionsCount}</p>
                      </div>
                      <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
                        <p className="text-slate-400 font-semibold uppercase text-[9px]">Coding Core</p>
                        <p className="text-xl font-extrabold text-slate-900 mt-1">{codingCoreQuestionsCount}</p>
                      </div>
                      <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
                        <p className="text-slate-400 font-semibold uppercase text-[9px]">Frequently Used</p>
                        <p className="text-xl font-extrabold text-slate-900 mt-1">{frequentlyUsedQuestionsCount}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right panel: Upcoming exams, live monitoring telemetry logs & Quick actions */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Quick actions panel */}
                  <div className="bg-slate-900 text-white rounded-lg p-5 border border-slate-950 shadow-md space-y-4">
                    <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">
                      Quick Operations
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                      <button 
                        onClick={() => setShowCreateExamModal(true)}
                        className="bg-slate-800 hover:bg-slate-750 text-white p-2.5 rounded border border-slate-700 flex items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400" /> Create Exam
                      </button>
                      <button 
                        onClick={() => setShowAddQuestionModal(true)}
                        className="bg-slate-800 hover:bg-slate-750 text-white p-2.5 rounded border border-slate-700 flex items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-400" /> Add Question
                      </button>
                      <button 
                        onClick={() => setShowUploadStudentsModal(true)}
                        className="bg-slate-800 hover:bg-slate-750 text-white p-2.5 rounded border border-slate-700 flex items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-400" /> Upload Roster
                      </button>
                      <button 
                        onClick={() => setActiveTab("reports")}
                        className="bg-slate-800 hover:bg-slate-750 text-white p-2.5 rounded border border-slate-700 flex items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" /> Get Reports
                      </button>
                      <button 
                        onClick={handleResetAllData}
                        className="bg-slate-800 hover:bg-slate-750 text-rose-450 p-2.5 rounded border border-slate-700 flex items-center justify-center gap-1.5 transition-all text-center col-span-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-rose-400" /> Reset Platform Data
                      </button>
                    </div>
                  </div>

                  {/* Upcoming Assessments Widget */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Upcoming assessments</h3>
                    <div className="divide-y divide-slate-100">
                      {assessments.filter(a => a.status === "Scheduled").length > 0 ? (
                        assessments.filter(a => a.status === "Scheduled").slice(0, 2).map((asm) => (
                          <div key={asm.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-slate-900">{asm.name}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Assigned: {asm.subject} • {asm.duration}</p>
                            </div>
                            <div className="text-right text-[10px] font-bold text-slate-750 font-mono">
                              <p>{asm.date.split(",")[0]}</p>
                              <p className="text-slate-400 mt-0.5">{asm.date.split(",")[1]?.trim() || "10:00 AM"}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 py-2.5 text-center">No upcoming assessments scheduled.</p>
                      )}
                    </div>
                  </div>



                </div>

              </div>

            </div>
          )}

          {/* TAB 2: STUDENTS ROSTER */}
          {activeTab === "students" && (
            <div className="space-y-6">
              
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Candidate Student Roster</h3>
                  {/* Empty state toggle */}
                  <label className="inline-flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded text-[10px] font-bold text-slate-600">
                    <input 
                      type="checkbox" 
                      checked={showEmptyStudents}
                      onChange={(e) => setShowEmptyStudents(e.target.checked)}
                      className="rounded border-slate-350 text-navy-900 focus:ring-navy-900 w-3 h-3"
                    />
                    Mock Empty State
                  </label>
                </div>
                <button 
                  onClick={() => setShowUploadStudentsModal(true)}
                  className="bg-navy-900 hover:bg-navy-950 text-white font-bold px-3 py-2 rounded-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Student
                </button>
              </div>

              {!showEmptyStudents ? (
                <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                          <th className="py-3 px-4">Roll Number</th>
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Official Email</th>
                          <th className="py-3 px-4">Dept</th>
                          <th className="py-3 px-4">Section</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {students.map((std) => (
                          <tr key={std.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{std.roll}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{std.name}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{std.email}</td>
                            <td className="py-3 px-4 text-slate-650">{std.dept}</td>
                            <td className="py-3 px-4 text-slate-650 font-bold">{std.section}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                std.status === "Active" 
                                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800" 
                                  : "bg-slate-100 border border-slate-200 text-slate-600"
                              }`}>
                                {std.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button 
                                onClick={() => handleDeleteStudent(std.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                aria-label={`Delete student ${std.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No Students Enrolled"
                  description="Your departmental class roster is empty. Upload student credentials to register them on the compiler server nodes."
                  secondaryDescription="Supports import from standard Excel / CSV rosters templates."
                  icon={Users}
                  actionLabel="Upload Student Roster"
                  onAction={() => setShowUploadStudentsModal(true)}
                />
              )}

            </div>
          )}

          {/* TAB 3: QUESTION BANK */}
          {activeTab === "questions" && (
            <div className="space-y-6">
              
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Repository Questions</h3>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded text-[10px] font-bold text-slate-600">
                    <input 
                      type="checkbox" 
                      checked={showEmptyQuestions}
                      onChange={(e) => setShowEmptyQuestions(e.target.checked)}
                      className="rounded border-slate-350 text-navy-900 focus:ring-navy-900 w-3 h-3"
                    />
                    Mock Empty State
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowImportModal(true)}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-2 rounded-md flex items-center gap-1.5 transition-all text-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" /> Upload CSV
                  </button>
                  <button 
                    onClick={() => setShowAddQuestionModal(true)}
                    className="bg-navy-900 hover:bg-navy-950 text-white font-bold px-3 py-2 rounded-md flex items-center gap-1.5 text-xs"
                  >
                    <Plus className="w-4 h-4" /> Add Question
                  </button>
                </div>
              </div>

              {!showEmptyQuestions ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questions.map((q) => (
                    <div key={q.id} className="academic-card flex flex-col justify-between h-full space-y-4">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono text-slate-500">{q.subject}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            q.difficulty === "Easy" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" :
                            q.difficulty === "Medium" ? "bg-amber-50 border border-amber-200 text-amber-800" :
                            "bg-rose-50 border border-rose-200 text-rose-800"
                          }`}>
                            {q.difficulty}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-2">{q.title}</h4>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {q.tags.map(t => (
                            <span key={t} className="bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Used in <span className="font-bold text-slate-800">{q.usageCount} assessments</span></span>
                        <button 
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                          aria-label={`Delete question ${q.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No Questions in Repository"
                  description="Your departmental question repository is empty. Add reusable coding questions with custom hidden validation test scripts."
                  secondaryDescription="Questions can be categorized by subject, unit, and difficulty levels."
                  icon={Database}
                  actionLabel="Add Programming Question"
                  onAction={() => setShowAddQuestionModal(true)}
                />
              )}

            </div>
          )}

          {/* TAB 4: ASSESSMENTS LIST */}
          {activeTab === "assessments" && (
            <div className="space-y-6">
              
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Scheduled Programming Exams</h3>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded text-[10px] font-bold text-slate-600">
                    <input 
                      type="checkbox" 
                      checked={showEmptyAssessments}
                      onChange={(e) => setShowEmptyAssessments(e.target.checked)}
                      className="rounded border-slate-350 text-navy-900 focus:ring-navy-900 w-3 h-3"
                    />
                    Mock Empty State
                  </label>
                </div>
                <button 
                  onClick={() => setShowCreateExamModal(true)}
                  className="bg-navy-900 hover:bg-navy-950 text-white font-bold px-3 py-2 rounded-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Assessment
                </button>
              </div>

              {!showEmptyAssessments ? (
                <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                          <th className="py-3 px-4">Assessment Name</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Duration</th>
                          <th className="py-3 px-4">Allocated Students</th>
                          <th className="py-3 px-4">Scheduled Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {assessments.map((asm) => (
                          <tr key={asm.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-bold text-slate-900">{asm.name}</td>
                            <td className="py-3 px-4 font-mono font-medium text-slate-500">{asm.subject}</td>
                            <td className="py-3 px-4 text-slate-650">{asm.duration}</td>
                            <td className="py-3 px-4 text-slate-650 font-mono font-medium">{asm.assignedCount} slots</td>
                            <td className="py-3 px-4 text-slate-500 font-medium">{asm.date}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                asm.status === "In Progress" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" :
                                asm.status === "Scheduled" ? "bg-blue-50 border border-blue-200 text-blue-800" :
                                "bg-slate-100 border border-slate-200 text-slate-600"
                              }`}>
                                {asm.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-1">
                              {asm.status === "In Progress" && (
                                <Link 
                                  href={`/faculty/monitoring/${asm.id}`}
                                  className="text-[10px] bg-rose-50 text-rose-800 border border-rose-250 font-bold px-2 py-1 rounded hover:bg-rose-100 transition-colors inline-block"
                                >
                                  Monitor
                                </Link>
                              )}
                              {asm.status === "Completed" && (
                                <button 
                                  onClick={() => setActiveTab("reports")}
                                  className="text-[10px] text-navy-800 hover:text-navy-950 font-bold"
                                >
                                  Reports
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteAssessment(asm.id)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50"
                                aria-label={`Delete assessment ${asm.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No Scheduled Assessments"
                  description="You have not created any programming examinations for the current semester roster slots."
                  secondaryDescription="Create assessments with code constraints, compilers, and active timers."
                  icon={BookOpen}
                  actionLabel="Create Assessment Slot"
                  onAction={() => setShowCreateExamModal(true)}
                />
              )}

            </div>
          )}

          {/* TAB 5: LIVE MONITORING */}
          {activeTab === "monitoring" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-lg shadow-2xs">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Live Proctoring Control Console</h3>
                  <p className="text-slate-500 mt-0.5">Real-time surveillance updates of candidate computer nodes and violation warnings.</p>
                </div>
                <Link 
                  href="/faculty/monitoring"
                  className="bg-navy-900 hover:bg-navy-950 text-white font-bold px-4 py-2 rounded-md transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-2xs animate-pulse"
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Open Surveillance Control Room
                </Link>
              </div>
              <DashboardMockup collegeName={faculty.collegeName} />
            </div>
          )}

          {/* TAB 6: REPORTS & EXPORTS */}
          {activeTab === "reports" && (
            <ReportsDashboardView />
          )}

          {/* TAB 7: GRADE ANALYTICS */}
          {activeTab === "analytics" && (
            <AnalyticsDashboardView initialRole="HOD" />
          )}

          {/* TAB 8: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-2xs max-w-2xl">
                <h3 className="font-bold text-slate-900 text-sm tracking-tight border-b border-slate-100 pb-2">
                  Institutional Proctor Configurations
                </h3>
                
                <div className="space-y-4">
                  {/* Warning bounds */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700">Max Warnings Allowed before lock</label>
                      <select className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900">
                        <option>2 warnings</option>
                        <option>3 warnings (Default)</option>
                        <option>5 warnings</option>
                      </select>
                      <p className="text-[10px] text-slate-400">Exceeding this locks candidate console IDE.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700">Compiler Timeout limits</label>
                      <select defaultValue="30 seconds (Default)" className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900">
                        <option>2 seconds</option>
                        <option>5 seconds</option>
                        <option>10 seconds</option>
                        <option>30 seconds (Default)</option>
                        <option>60 seconds</option>
                      </select>
                      <p className="text-[10px] text-slate-400">Halts infinite loop solutions automatically.</p>
                    </div>
                  </div>

                  {/* Subnet whitelist info */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Authorized Subnet whitelist</label>
                    <input 
                      type="text" 
                      defaultValue="192.168.12.*, 10.96.157.*"
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                    <p className="text-[10px] text-slate-400">Filters client IP access to college computer lab hosts.</p>
                  </div>

                  {/* Features checkboxes */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked id="restrictCopy" className="rounded border-slate-300 text-navy-900 focus:ring-navy-900 w-3.5 h-3.5" />
                      <label htmlFor="restrictCopy" className="font-semibold text-slate-700">Enforce clipboard restrictions (block copy-paste)</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked id="lockFullscreen" className="rounded border-slate-300 text-navy-900 focus:ring-navy-900 w-3.5 h-3.5" />
                      <label htmlFor="lockFullscreen" className="font-semibold text-slate-700">Block exam navigation if fullscreen wrapper is exited</label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-150 flex justify-end">
                  <button 
                    onClick={() => alert("Simulation: Configurations saved.")}
                    className="bg-navy-900 hover:bg-navy-950 text-white font-bold px-4 py-2 rounded-md"
                  >
                    Save configurations
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL SHEET 1: CREATE ASSESSMENT */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowCreateExamModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"></div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full relative z-10 overflow-hidden flex flex-col font-sans">
            <form onSubmit={handleCreateExam}>
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-bold text-navy-800 tracking-wider uppercase">Exam Configuration Wizard</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Schedule New Programming Exam</h3>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Exam Name */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Assessment Title *</label>
                  <input
                    type="text"
                    required
                    value={newExam.name}
                    onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                    placeholder="e.g. Midterm Laboratory Practical"
                    className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Select Subject */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Select Subject *</label>
                    <select
                      required
                      value={newExam.subject}
                      onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="">-- Select Subject --</option>
                      <option value="IT101">Programming in C</option>
                      <option value="IT102">Python</option>
                      <option value="IT201">Java</option>
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Exam Duration</label>
                    <select
                      value={newExam.duration}
                      onChange={(e) => setNewExam({ ...newExam, duration: e.target.value })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="60 mins">60 mins</option>
                      <option value="90 mins">90 mins</option>
                      <option value="120 mins">120 mins</option>
                      <option value="180 mins">180 mins</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Slots */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Roster slots allocation</label>
                    <input
                      type="number"
                      value={newExam.assignedCount}
                      onChange={(e) => setNewExam({ ...newExam, assignedCount: Number(e.target.value) })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  {/* Exam Date */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Exam Date *</label>
                    <input
                      type="date"
                      required
                      value={newExam.date}
                      onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Exam Time */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Exam Time *</label>
                    <input
                      type="time"
                      required
                      value={newExam.time}
                      onChange={(e) => setNewExam({ ...newExam, time: e.target.value })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExamModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-md font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-md font-bold"
                >
                  Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SHEET 2: UPLOAD STUDENTS */}
      {showUploadStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowUploadStudentsModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"></div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full relative z-10 overflow-hidden flex flex-col font-sans">
            <form onSubmit={handleAddStudent}>
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-bold text-navy-800 tracking-wider uppercase">Student Roster Enrollment</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Register Student Credentials</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Roll number */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Roll Number *</label>
                    <input
                      type="text"
                      required
                      value={newStudent.roll}
                      onChange={(e) => setNewStudent({ ...newStudent, roll: e.target.value })}
                      placeholder="e.g. 22CSE104"
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      placeholder="e.g. Aravind S"
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    placeholder="e.g. student@college.edu"
                    className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Dept */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Department</label>
                    <select
                      value={newStudent.dept}
                      onChange={(e) => setNewStudent({ ...newStudent, dept: e.target.value })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="CSE">CSE</option>
                      <option value="IT">IT</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                    </select>
                  </div>

                  {/* Section */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Section</label>
                    <input
                      type="text"
                      value={newStudent.section}
                      onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value.toUpperCase() })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadStudentsModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-md font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-md font-bold"
                >
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SHEET 3: ADD QUESTION */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowAddQuestionModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"></div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full relative z-10 overflow-hidden flex flex-col font-sans">
            <form onSubmit={handleAddQuestion}>
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-bold text-navy-800 tracking-wider uppercase">Question Authoring Panel</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Add Custom Programming Question</h3>
              </div>
              
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Title */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Question Title *</label>
                  <input
                    type="text"
                    required
                    value={newQuestion.title}
                    onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                    placeholder="e.g. Reverse elements in singly linked list"
                    className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Subject category */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Course Subject</label>
                    <select
                      value={newQuestion.subject}
                      onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="CS201: Data Structures">Data Structures</option>
                      <option value="IT305: OOPs">OOPs Concepts</option>
                      <option value="CS304: Algorithms">Design & Algorithms</option>
                      <option value="CS203: DBMS">Database Systems</option>
                      <option value="CS101: Python">Python Programming</option>
                      <option value="CS102: Java">Java Programming</option>
                      <option value="CS103: C/C++">C/C++ Programming</option>
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Difficulty Rating</label>
                    <select
                      value={newQuestion.difficulty}
                      onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value as any })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="Easy">Easy Rating</option>
                      <option value="Medium">Medium Rating</option>
                      <option value="Hard">Hard Rating</option>
                    </select>
                  </div>
                </div>


                {/* 1. Question Description */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Question Description *</label>
                  <textarea
                    required
                    value={newQuestion.description}
                    onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
                    placeholder="Describe the complete question statement (supports paragraphs, bullet points, lists)..."
                    rows={4}
                    className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                  />
                </div>


                {/* 5 & 6. Max Marks & Estimated Completion Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Maximum Marks</label>
                    <input
                      type="number"
                      min={0}
                      value={newQuestion.maxMarks}
                      onChange={(e) => setNewQuestion({ ...newQuestion, maxMarks: parseInt(e.target.value) || 0 })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Estimated Time (Min)</label>
                    <input
                      type="number"
                      min={1}
                      value={newQuestion.estimatedTime}
                      onChange={(e) => setNewQuestion({ ...newQuestion, estimatedTime: parseInt(e.target.value) || 0 })}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                </div>

                {/* 7. Allowed Programming Languages */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Allowed Programming Languages</label>
                  <div className="grid grid-cols-3 gap-2 p-3 border border-slate-200 rounded-md bg-slate-50/50">
                    {["C", "C++", "Java", "Python", "JavaScript"].map((lang) => (
                      <label key={lang} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-750">
                        <input
                          type="checkbox"
                          checked={newQuestion.allowedLanguages.includes(lang)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const languages = isChecked
                              ? [...newQuestion.allowedLanguages, lang]
                              : newQuestion.allowedLanguages.filter((l) => l !== lang);
                            setNewQuestion({ ...newQuestion, allowedLanguages: languages });
                          }}
                          className="rounded border-slate-300 text-navy-900 focus:ring-navy-900 w-4 h-4 cursor-pointer"
                        />
                        <span>{lang}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 8. Input and Expected Outcome */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 font-sans">Sample Input</label>
                    <textarea
                      value={newQuestion.sampleInput}
                      onChange={(e) => setNewQuestion({ ...newQuestion, sampleInput: e.target.value })}
                      placeholder="e.g. root = [4,2,7]"
                      rows={2}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-navy-900 font-mono text-[10px] resize-y"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 font-sans">Expected Outcome *</label>
                    <textarea
                      required
                      value={newQuestion.sampleOutput}
                      onChange={(e) => setNewQuestion({ ...newQuestion, sampleOutput: e.target.value })}
                      placeholder="e.g. [4,7,2]"
                      rows={2}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-navy-900 font-mono text-[10px] resize-y"
                    />
                  </div>
                </div>

              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-md font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-md font-bold"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SHEET: BULK IMPORT CSV */}
      {showImportModal && (() => {
        const validCount = parsedRows.filter(r => r.isValid).length;
        const invalidCount = parsedRows.filter(r => !r.isValid).length;
        
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              onClick={() => {
                setShowImportModal(false);
                resetImportUploader();
              }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            ></div>
            
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full relative z-[101] overflow-hidden flex flex-col font-sans text-xs">
              
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  resetImportUploader();
                }}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-655 p-1 hover:bg-slate-100 rounded"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[10px] font-bold text-navy-800 tracking-wider uppercase">CSV Bulk Uploader</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Upload Questions Spreadsheet</h3>
              </div>

              <div className="p-6 space-y-4">
                {uploadedFile === null ? (
                  <>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Quickly add multiple coding questions at once by uploading an institutional CSV file.
                    </p>

                    <input 
                      type="file" 
                      ref={csvInputRef}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleCSVFile(e.target.files[0]);
                        }
                      }}
                      accept=".csv"
                      className="hidden"
                    />

                    {/* Drag and Drop zone */}
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragActive(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setIsDragActive(true);
                      }}
                      onDragLeave={() => setIsDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragActive(false);
                        if (e.dataTransfer.files?.[0]) {
                          handleCSVFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => csvInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                        isDragActive 
                          ? "border-blue-500 bg-blue-50/30" 
                          : "border-slate-200 hover:border-slate-350 bg-slate-50"
                      }`}
                    >
                      <FileSpreadsheet className={`w-8 h-8 mb-2 transition-colors ${isDragActive ? "text-blue-500" : "text-slate-400"}`} />
                      <p className="font-bold text-slate-700 text-xs">Drag and drop your CSV file here</p>
                      <p className="text-[10px] text-slate-400 mt-1">or use the button below to browse</p>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          csvInputRef.current?.click();
                        }}
                        className="mt-3 bg-navy-900 hover:bg-navy-950 text-white font-bold px-3 py-1.5 rounded-md transition-all text-[10px] shadow-sm"
                      >
                        Choose File
                      </button>

                      <span className="text-[8px] font-bold text-slate-500 mt-3.5 uppercase tracking-wide bg-slate-200/60 border border-slate-300 px-2 py-0.5 rounded">
                        .csv only supported
                      </span>
                    </div>

                    {validationError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded text-[10px] flex items-center gap-2 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{validationError}</span>
                      </div>
                    )}

                    {/* Template details */}
                    <div className="bg-slate-50 p-3 rounded border border-slate-150 space-y-2.5 text-[10px] text-slate-655">
                      <p className="font-bold text-slate-800 uppercase tracking-wider text-[9px]">Required Columns Schema:</p>
                      <div className="bg-slate-100 p-2 rounded border border-slate-250 font-mono text-[8.5px] text-slate-600 break-words leading-relaxed">
                        Question Title, Course Subject, Difficulty Rating, Question Description, Maximum Marks, Estimated Completion Time, Allowed Programming Languages, Question Status, Sample Input, Expected Outcome
                      </div>
                      
                      <button 
                        type="button"
                        onClick={handleDownloadSample}
                        className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold py-2 rounded-md flex items-center justify-center gap-1.5 transition-all text-[10px]"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" /> Download Sample CSV
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center text-[10px] border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500 font-bold uppercase truncate max-w-[200px]" title={uploadedFile.name}>
                          File: {uploadedFile.name}
                        </span>
                        <span className="text-slate-400 font-mono font-medium">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </span>
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-3 gap-2 py-1">
                        <div className="text-center bg-white p-2 border border-slate-150 rounded">
                          <p className="text-[8px] uppercase text-slate-400 font-bold">Total Rows</p>
                          <p className="text-base font-extrabold text-slate-800 mt-0.5">{parsedRows.length}</p>
                        </div>
                        <div className="text-center bg-emerald-50/50 p-2 border border-emerald-150 rounded">
                          <p className="text-[8px] uppercase text-emerald-650 font-bold">Valid Rows</p>
                          <p className="text-base font-extrabold text-emerald-700 mt-0.5">{validCount}</p>
                        </div>
                        <div className="text-center bg-rose-50/50 p-2 border border-rose-150 rounded">
                          <p className="text-[8px] uppercase text-rose-650 font-bold">Errors Found</p>
                          <p className="text-base font-extrabold text-rose-750 mt-0.5">{invalidCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Validation Error Reports scrollable list */}
                    {invalidCount > 0 && (
                      <div className="bg-rose-50/40 border border-rose-150 rounded-lg p-3 max-h-[140px] overflow-y-auto text-[10px] space-y-1.5 text-rose-800 leading-normal">
                        <p className="font-extrabold uppercase tracking-wider text-[8px] border-b border-rose-200 pb-1.5 flex items-center gap-1.5 font-sans">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> 
                          Validation Error Logs
                        </p>
                        {parsedRows.filter(r => !r.isValid).map(row => (
                          <div key={row.rowNum} className="font-mono">
                            <span className="font-bold">Row {row.rowNum}:</span>
                            <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                              {row.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions block */}
                    <div className="flex gap-2">
                      {invalidCount > 0 && (
                        <button
                          type="button"
                          onClick={handleDownloadErrorReport}
                          className="flex-1 bg-white hover:bg-slate-50 border border-rose-200 text-rose-800 py-2 rounded-md font-bold transition-all flex items-center justify-center gap-1 text-[10px]"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Error Report
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={resetImportUploader}
                        className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-2 rounded-md font-bold transition-all text-[10px]"
                      >
                        Upload Another File
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    resetImportUploader();
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-md font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={uploadedFile === null || validCount === 0}
                  onClick={executeImportValid}
                  className={`px-4 py-2 text-white rounded-md font-bold transition-all ${
                    uploadedFile === null || validCount === 0
                      ? "bg-slate-300 text-slate-505 cursor-not-allowed border border-slate-200"
                      : "bg-navy-900 hover:bg-navy-950"
                  }`}
                >
                  Upload {validCount > 0 ? `(${validCount} Valid)` : ""}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Toast Notification overlay */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 z-[200] border text-white rounded-lg shadow-2xl px-4 py-3 flex items-center gap-2.5 animate-slide-in font-sans text-xs ${
            toast.type === "success" 
              ? "bg-slate-900 border-slate-800" 
              : "bg-rose-950 border-rose-900 text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <div className="text-xs font-semibold">
            {toast.message}
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white font-bold ml-1.5"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
