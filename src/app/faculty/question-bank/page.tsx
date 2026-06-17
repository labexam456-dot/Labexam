"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadQuestions, saveQuestions, loadFacultyProfile, Question } from "@/lib/storage";
import { 
  Database, 
  Plus, 
  Upload, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Copy, 
  Archive, 
  Trash2, 
  Table, 
  LayoutGrid, 
  ArrowLeft,
  X,
  FileSpreadsheet,
  TrendingUp,
  History,
  CheckCircle,
  HelpCircle,
  Menu,
  Clock,
  ArrowRight,
  Sparkles,
  Download,
  AlertCircle,
  AlertTriangle
} from "lucide-react";
import EmptyState from "@/components/empty-state";

export default function QuestionBank() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLang, setFilterLang] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Empty states selector
  const [emptyStateMode, setEmptyStateMode] = useState<"none" | "no-created" | "no-search">("none");

  // Modals visibility
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

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
    };
    errors: string[];
    isValid: boolean;
  }

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

  // Mock Question Roster
  const [questions, setQuestions] = useState<Question[]>([]);

  // Load questions on mount
  useEffect(() => {
    setQuestions(loadQuestions());
  }, []);

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
          status
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
      "Question Title,Course Subject,Difficulty Rating,Question Description,Maximum Marks,Estimated Completion Time,Allowed Programming Languages,Question Status",
      'Invert a Binary Tree,Data Structures,Medium,"Given the root of a binary tree, invert the tree (swap left and right subtrees of every node) and return its root.",15,30,"C++, Java, Python",Active',
      'Fibonacci Sequence,Recursion,Easy,"Write a recursive function to compute the Nth Fibonacci number.",10,15,"Python, Java, C++",Active',
      'Validate Binary Search Tree,Data Structures,Medium,"Given the root of a binary tree, determine if it is a valid binary search tree (BST).",15,25,"Java, Python",Active',
      'Implement Dijkstra Shortest Path,Algorithms,Hard,"Given a weighted graph, find the shortest path from a source vertex S to all other vertices.",20,45,"C++, Java",Active'
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
    
    const csvHeaders = "Row,Question Title,Course Subject,Difficulty Rating,Question Description,Maximum Marks,Estimated Completion Time,Allowed Programming Languages,Question Status,Errors\n";
    const csvContent = invalid.map(r => {
      const titleEscaped = `"${(r.data.title || "").replace(/"/g, '""')}"`;
      const subjectEscaped = `"${(r.data.subject || "").replace(/"/g, '""')}"`;
      const diffEscaped = `"${(r.data.difficulty || "").replace(/"/g, '""')}"`;
      const descEscaped = `"${(r.data.description || "").replace(/"/g, '""')}"`;
      const marksEscaped = r.data.marks || "";
      const timeEscaped = r.data.estimatedTime || "";
      const langEscaped = `"${(r.data.allowedLanguages || []).join(", ").replace(/"/g, '""')}"`;
      const statusEscaped = `"${(r.data.status || "").replace(/"/g, '""')}"`;
      const errorsEscaped = `"${r.errors.join("; ").replace(/"/g, '""')}"`;
      return `${r.rowNum},${titleEscaped},${subjectEscaped},${diffEscaped},${descEscaped},${marksEscaped},${timeEscaped},${langEscaped},${statusEscaped},${errorsEscaped}`;
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
    
    const faculty = loadFacultyProfile();
    const newQuestions: Question[] = valid.map((row, idx) => ({
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
      createdBy: faculty.fullName || "Faculty HOD",
      createdDate: new Date().toISOString().split("T")[0],
      version: 1,
      tags: [row.data.subject, row.data.difficulty],
      description: row.data.description,
      estimatedTime: row.data.estimatedTime,
      allowedLanguages: row.data.allowedLanguages
    }));
    
    const updated = [...newQuestions, ...questions];
    setQuestions(updated);
    saveQuestions(updated);
    
    triggerToast(`Successfully imported ${newQuestions.length} questions.`);
    setShowImportModal(false);
    resetImportUploader();
  };

  const resetImportUploader = () => {
    setUploadedFile(null);
    setParsedRows([]);
    setValidationError(null);
  };

  // Actions
  const handleDuplicate = (q: Question) => {
    const dupe: Question = {
      ...q,
      id: Date.now().toString(),
      title: `${q.title} (Copy)`,
      lastUpdated: new Date().toISOString().split("T")[0],
      timesUsed: 0,
      avgScore: "N/A",
      successRate: "N/A",
      avgTime: "N/A",
      version: 1,
      createdDate: new Date().toISOString().split("T")[0]
    };
    const updated = [dupe, ...questions];
    setQuestions(updated);
    saveQuestions(updated);
  };

  const handleArchive = (id: string) => {
    const updated = questions.map(q => q.id === id ? { ...q, status: (q.status === "Active" ? "Archived" as const : "Active" as const) } : q);
    setQuestions(updated);
    saveQuestions(updated);
  };

  const handleDelete = (id: string) => {
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    saveQuestions(updated);
  };

  // Filters application
  const filteredQuestions = questions.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLang = filterLang === "all" || q.language.toLowerCase() === filterLang.toLowerCase();
    const matchDiff = filterDifficulty === "all" || q.difficulty.toLowerCase() === filterDifficulty.toLowerCase();
    const matchTopic = filterTopic === "all" || q.topic.toLowerCase().replace(" ", "").includes(filterTopic.toLowerCase().replace(" ", ""));
    const matchStatus = filterStatus === "all" || q.status.toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchLang && matchDiff && matchTopic && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none text-xs text-slate-800">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link 
            href="/faculty/dashboard" 
            className="text-slate-500 hover:text-slate-800 transition-colors mr-2 p-1.5 hover:bg-slate-100 rounded-md focus-ring flex items-center gap-1.5 font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="h-4 w-[1px] bg-slate-200"></div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Question Bank Management</h2>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-2 rounded-md flex items-center gap-1.5 transition-all focus-ring"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" /> Upload CSV
          </button>
          <Link 
            href="/faculty/question-bank/create"
            className="bg-navy-900 hover:bg-navy-950 text-white font-bold px-4 py-2 rounded-md flex items-center gap-1.5 transition-all focus-ring"
          >
            <Plus className="w-3.5 h-3.5" /> Add Question
          </Link>
        </div>
      </header>

      {/* Main Body content */}
      <main className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6 flex-1">
        
        {/* State Toggle Selector for Preview */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap gap-2 items-center justify-between">
          <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Empty State Preview Toggles:</span>
          <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <button 
              onClick={() => setEmptyStateMode("none")}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                emptyStateMode === "none" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-500"
              }`}
            >
              Default Populate
            </button>
            <button 
              onClick={() => setEmptyStateMode("no-created")}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                emptyStateMode === "no-created" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-500"
              }`}
            >
              Empty: No Questions
            </button>
            <button 
              onClick={() => setEmptyStateMode("no-search")}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                emptyStateMode === "no-search" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-500"
              }`}
            >
              Empty: No Results
            </button>
          </div>
        </div>

        {emptyStateMode === "none" && (
          <>
            {/* Stats Dashboard row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
                <p className="text-slate-400 font-bold uppercase text-[9px]">Total Questions</p>
                <p className="text-2xl font-extrabold text-slate-950 mt-1">{questions.length}</p>
              </div>
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
                <p className="text-slate-400 font-bold uppercase text-[9px]">Easy Questions</p>
                <p className="text-2xl font-extrabold text-emerald-800 mt-1">
                  {questions.filter(q => q.difficulty === "Easy").length}
                </p>
              </div>
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
                <p className="text-slate-400 font-bold uppercase text-[9px]">Medium Questions</p>
                <p className="text-2xl font-extrabold text-amber-800 mt-1">
                  {questions.filter(q => q.difficulty === "Medium").length}
                </p>
              </div>
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs">
                <p className="text-slate-400 font-bold uppercase text-[9px]">Hard Questions</p>
                <p className="text-2xl font-extrabold text-rose-800 mt-1">
                  {questions.filter(q => q.difficulty === "Hard").length}
                </p>
              </div>
              <div className="bg-slate-900 text-white p-4 border border-slate-950 rounded-lg shadow-xs">
                <p className="text-slate-400 font-bold uppercase text-[9px]">Updated (30d)</p>
                <p className="text-2xl font-extrabold text-white mt-1">5 items</p>
              </div>
            </div>

            {/* Search and Filter Area */}
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search questions by title or topic..."
                    className="w-full text-slate-900 border border-slate-200 rounded-md pl-9 pr-3 py-2 focus:outline-hidden focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                  />
                </div>

                {/* View togglers */}
                <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 self-start md:self-auto">
                  <button 
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded transition-all ${viewMode === "table" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-400"}`}
                    aria-label="Switch to table view"
                  >
                    <Table className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode("card")}
                    className={`p-1.5 rounded transition-all ${viewMode === "card" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-400"}`}
                    aria-label="Switch to card view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filters list */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                {/* Language filter */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase text-[9px]">Language</label>
                  <select 
                    value={filterLang}
                    onChange={(e) => setFilterLang(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                  >
                    <option value="all">All Languages</option>
                    <option value="c">C</option>
                    <option value="c++">C++</option>
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                  </select>
                </div>

                {/* Difficulty filter */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase text-[9px]">Difficulty</label>
                  <select 
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Topic filter */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase text-[9px]">Topic</label>
                  <select 
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                  >
                    <option value="all">All Topics</option>
                    <option value="arrays">Arrays</option>
                    <option value="recursion">Recursion</option>
                    <option value="oop">OOP Concepts</option>
                    <option value="data structures">Data Structures</option>
                    <option value="algorithms">Algorithms</option>
                  </select>
                </div>

                {/* Status filter */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase text-[9px]">Status</label>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full text-slate-900 border border-slate-200 rounded px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List viewport */}
            {filteredQuestions.length > 0 ? (
              viewMode === "table" ? (
                /* TABLE VIEW */
                <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                          <th className="py-3 px-4">Question Title</th>
                          <th className="py-3 px-4">Language</th>
                          <th className="py-3 px-4">Topic</th>
                          <th className="py-3 px-4 text-center">Marks</th>
                          <th className="py-3 px-4">Difficulty</th>
                          <th className="py-3 px-4">Last Updated</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredQuestions.map((q) => (
                          <tr key={q.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <button 
                                onClick={() => setSelectedQuestion(q)}
                                className="font-bold text-slate-900 hover:text-navy-950 text-left hover:underline focus:outline-none"
                              >
                                {q.title}
                              </button>
                              {q.status === "Archived" && (
                                <span className="ml-2 bg-slate-100 text-slate-550 border border-slate-200 text-[8px] font-bold px-1 py-0.5 rounded">
                                  ARCHIVED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-600">{q.language}</td>
                            <td className="py-3 px-4 text-slate-500 font-medium">{q.topic}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{q.marks} pts</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                q.difficulty === "Easy" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" :
                                q.difficulty === "Medium" ? "bg-amber-50 border border-amber-200 text-amber-800" :
                                "bg-rose-50 border border-rose-200 text-rose-800"
                              }`}>
                                {q.difficulty}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono">{q.lastUpdated}</td>
                            <td className="py-3 px-4 text-right space-x-1">
                              <button 
                                onClick={() => setSelectedQuestion(q)}
                                className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-55"
                                title="View Usage & logs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDuplicate(q)}
                                className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-55"
                                title="Duplicate"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleArchive(q.id)}
                                className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-55"
                                title={q.status === "Active" ? "Archive" : "Unarchive"}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(q.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                                title="Delete"
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
                /* CARD VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredQuestions.map((q) => (
                    <div key={q.id} className="academic-card flex flex-col justify-between h-full space-y-4">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono text-slate-400">{q.language} • {q.topic}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            q.difficulty === "Easy" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" :
                            q.difficulty === "Medium" ? "bg-amber-50 border border-amber-200 text-amber-800" :
                            "bg-rose-50 border border-rose-200 text-rose-800"
                          }`}>
                            {q.difficulty}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-2">{q.title}</h4>
                        <div className="flex items-center gap-4 text-slate-500 font-medium text-[10px] pt-1">
                          <span>Allocation: <span className="font-bold text-slate-800">{q.marks} Marks</span></span>
                          <span>•</span>
                          <span>Usage: <span className="font-bold text-slate-850">{q.timesUsed} Exams</span></span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Updated: {q.lastUpdated}</span>
                        <div className="space-x-1">
                          <button 
                            onClick={() => setSelectedQuestion(q)}
                            className="text-slate-400 hover:text-slate-800 p-1 hover:bg-slate-55 rounded"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDuplicate(q)}
                            className="text-slate-400 hover:text-slate-800 p-1 hover:bg-slate-55 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(q.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* EMPTY STATE: NO SEARCH RESULTS */
              <EmptyState
                title="No Search Results Matches"
                description="We couldn't find any questions matching your active search queries or select dropdown filters."
                secondaryDescription="Try clearing your filters or resetting the search text."
                icon={Search}
                actionLabel="Clear Search Filter"
                onAction={() => {
                  setSearchQuery("");
                  setFilterLang("all");
                  setFilterDifficulty("all");
                  setFilterTopic("all");
                  setFilterStatus("all");
                }}
              />
            )}
          </>
        )}

        {/* TAB EMPTY 1: NO QUESTIONS CREATED */}
        {emptyStateMode === "no-created" && (
          <EmptyState
            title="No Questions in Bank"
            description="Your college's departmental question bank is currently empty. Build assessments and practical sheets by authoring questions."
            secondaryDescription="Write problem statements, add compile constraints, and upload hidden test case files."
            icon={Database}
            actionLabel="Create First Question"
            onAction={() => router.push("/faculty/question-bank/create")}
          />
        )}

        {/* TAB EMPTY 2: NO SEARCH RESULTS */}
        {emptyStateMode === "no-search" && (
          <EmptyState
            title="No Search Matches"
            description="No programming question files match the selected filtration tags or query string."
            secondaryDescription="Reset the filters to view the full departmental repository list."
            icon={Filter}
            actionLabel="Reset Search Parameters"
            onAction={() => {
              setSearchQuery("");
              setFilterLang("all");
              setFilterDifficulty("all");
              setFilterTopic("all");
              setFilterStatus("all");
              setEmptyStateMode("none");
            }}
          />
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL SHEET 1: BULK IMPORT CSV */}
      {showImportModal && (() => {
        const fileInputRef = React.useRef<HTMLInputElement>(null);
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
            
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full relative z-[101] overflow-hidden flex flex-col font-sans">
              
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  resetImportUploader();
                }}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-100 rounded"
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
                      ref={fileInputRef}
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
                      onClick={() => fileInputRef.current?.click()}
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
                          fileInputRef.current?.click();
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
                    <div className="bg-slate-50 p-3 rounded border border-slate-150 space-y-2.5 text-[10px] text-slate-650">
                      <p className="font-bold text-slate-800 uppercase tracking-wider text-[9px]">Required Columns Schema:</p>
                      <div className="bg-slate-100 p-2 rounded border border-slate-250 font-mono text-[8.5px] text-slate-600 break-words leading-relaxed">
                        Question Title, Course Subject, Difficulty Rating, Question Description, Maximum Marks, Estimated Completion Time, Allowed Programming Languages, Question Status
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

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
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

      {/* ========================================================================= */}
      {/* DRAWER SHEET 2: QUESTION DETAILS - ANALYTICS & HISTORY */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setSelectedQuestion(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"></div>
          
          <div className="w-full max-w-md bg-white h-full relative z-10 shadow-2xl flex flex-col justify-between font-sans border-l border-slate-200">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <span className="text-[9px] font-bold text-navy-800 uppercase tracking-wider">Question Inspector</span>
                <h3 className="text-base font-bold text-slate-950 mt-1 truncate max-w-[280px]">{selectedQuestion.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedQuestion(null)}
                className="p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Question Description */}
              {selectedQuestion.description && (
                <div className="space-y-2">
                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                    Question Description
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedQuestion.description}
                  </p>
                </div>
              )}

              {/* Academic Parameters */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  Academic Parameters
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 border border-slate-150 rounded-md">
                    <p className="text-slate-400 font-semibold uppercase text-[9px]">Course Subject</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedQuestion.topic}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-150 rounded-md">
                    <p className="text-slate-400 font-semibold uppercase text-[9px]">Difficulty Rating</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedQuestion.difficulty}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-150 rounded-md">
                    <p className="text-slate-400 font-semibold uppercase text-[9px]">Maximum Marks</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedQuestion.marks} Marks</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-150 rounded-md">
                    <p className="text-slate-400 font-semibold uppercase text-[9px]">Est. Completion Time</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedQuestion.avgTime}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-150 rounded-md col-span-2">
                    <p className="text-slate-400 font-semibold uppercase text-[9px]">Allowed Programming Languages</p>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {selectedQuestion.allowedLanguages?.join(", ") || selectedQuestion.language}
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage analytics section */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <TrendingUp className="w-4 h-4 text-slate-500" /> Usage Analytics
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded border border-slate-150">
                    <p className="text-slate-400 font-semibold uppercase text-[9px]">Assessments Used</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-1">{selectedQuestion.timesUsed}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-150">
                    <p className="text-slate-400 font-semibold uppercase text-[9px]">Success Rate</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-1">{selectedQuestion.successRate}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-150">
                    <p className="text-slate-400 font-semibold uppercase text-[9px]">Avg Completion Time</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-1">{selectedQuestion.avgTime}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-150">
                    <p className="text-slate-400 font-semibold uppercase text-[9px]">Avg Student Score</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-1 text-emerald-700">{selectedQuestion.avgScore}</p>
                  </div>
                </div>
              </div>

              {/* Version History section */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <History className="w-4 h-4 text-slate-500" /> Version History
                </h4>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy-900 mt-1.5 relative">
                      <div className="absolute top-1.5 bottom-[-24px] left-[2px] w-[1px] bg-slate-200"></div>
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Version {selectedQuestion.version}.0</span>
                        <span className="text-[9px] bg-slate-100 px-1 rounded text-slate-500 font-medium">Latest</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">Updated by {selectedQuestion.createdBy} on {selectedQuestion.lastUpdated}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5"></div>
                    <div className="text-xs text-slate-400">
                      <p className="font-bold text-slate-500">Version 1.0</p>
                      <p className="text-[11px] mt-0.5">Created by {selectedQuestion.createdBy} on {selectedQuestion.createdDate}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Syllabus mapping */}
              <div className="bg-slate-50 p-4 border border-slate-150 rounded-lg space-y-1.5 text-[11px]">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[9px]">Syllabus Mapping Outcome:</p>
                <p className="text-slate-600 leading-normal">
                  This question matches core Course Outcomes (CO) mapping for **Algorithm Design and Implementation Correctness** certifications.
                </p>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setSelectedQuestion(null)}
                className="w-full bg-navy-900 hover:bg-navy-950 text-white font-bold py-2 rounded-md text-center focus-ring"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification overlay */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 z-[200] border text-white rounded-lg shadow-2xl px-4 py-3 flex items-center gap-2.5 animate-slide-in font-sans ${
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
