"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  loadReports, 
  saveReports, 
  loadAssessments, 
  loadStudents, 
  loadFacultyProfile,
  ReportLog,
  Assessment,
  Student,
  getAssessmentStatus
} from "@/lib/storage";
import { 
  FileSpreadsheet, 
  Download, 
  RefreshCw, 
  Plus, 
  Users, 
  BookOpen, 
  Activity, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  ChevronRight, 
  CheckCircle, 
  TrendingUp, 
  AlertCircle, 
  Trash2,
  SlidersHorizontal,
  Mail,
  Printer
} from "lucide-react";
import EmptyState from "@/components/empty-state";

interface ReportsDashboardProps {
  isStandalone?: boolean;
}

export default function ReportsDashboardView({ isStandalone = false }: ReportsDashboardProps) {
  const router = useRouter();

  // Loaders
  const [reports, setReports] = useState<ReportLog[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [facultyName, setFacultyName] = useState("Dr. Ramesh Sharma");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFormat, setFilterFormat] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("");

  // UI Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  
  // Empty State Toggle for Demo Previewing
  const [emptyStateMode, setEmptyStateMode] = useState<"none" | "no-reports" | "no-data">("none");

  // Scheduling Form State
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    category: "Assessment",
    assessmentId: "",
    frequency: "once",
    emailList: "",
    autoGenerate: false
  });

  // Load storage states
  useEffect(() => {
    setReports(loadReports());
    const asms = loadAssessments();
    setAssessments(asms.filter(a => {
      const dynamicStatus = getAssessmentStatus(a, "", []);
      return dynamicStatus === "Completed";
    }));
    setStudentCount(loadStudents().length);
    setFacultyName(loadFacultyProfile().fullName);
  }, []);

  // Handler: Generate Custom Report Now
  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.title) {
      alert("Please specify a report title.");
      return;
    }

    const newReport: ReportLog = {
      id: "rep-" + Date.now(),
      name: scheduleForm.title,
      category: scheduleForm.category as any,
      generatedDate: new Date().toISOString().split("T")[0],
      generatedBy: facultyName || "Faculty HOD",
      exportType: "PDF",
      downloadCount: 0,
      assessmentId: scheduleForm.assessmentId || undefined
    };

    const updated = [newReport, ...reports];
    setReports(updated);
    saveReports(updated);
    setShowGenerateModal(false);
    
    // Clear form
    setScheduleForm({
      title: "",
      category: "Assessment",
      assessmentId: "",
      frequency: "once",
      emailList: "",
      autoGenerate: false
    });
    setSelectedSubject("");

    // Automatically navigate to view details
    router.push(`/faculty/reports/${newReport.id}`);
  };

  // Handler: Schedule Report
  const handleScheduleReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.title) {
      alert("Please specify a report title.");
      return;
    }

    alert(`Successfully scheduled report: "${scheduleForm.title}"\nFrequency: ${scheduleForm.frequency.toUpperCase()}\nNotification emails: ${scheduleForm.emailList || "None"}`);
    
    // Also save a log
    const newReport: ReportLog = {
      id: "rep-" + Date.now(),
      name: scheduleForm.title + " (Scheduled)",
      category: scheduleForm.category as any,
      generatedDate: new Date().toISOString().split("T")[0] + " [Pending]",
      generatedBy: facultyName || "Faculty HOD",
      exportType: "PDF",
      downloadCount: 0
    };

    const updated = [newReport, ...reports];
    setReports(updated);
    saveReports(updated);
    setShowScheduleModal(false);
  };

  const handleDeleteReport = (id: string) => {
    const updated = reports.filter(r => r.id !== id);
    setReports(updated);
    saveReports(updated);
  };

  const handleDownloadReport = (name: string, format: string) => {
    const repObj = reports.find(r => r.name === name);
    const category = repObj?.category || "Assessment";

    let csvContent = "";
    csvContent += `Report Name,${name}\n`;
    csvContent += `Category,${category}\n`;
    csvContent += `Export Format,${format}\n\n`;

    if (category === "Student" || category === "TopPerformers") {
      csvContent += "Rank,Roll Number,Student Name,Grader Score,Percentage\n";
      csvContent += `1,22CSE102,Aditya Verma,48 / 50,96%\n`;
      csvContent += `2,22CSE104,Aravind Swaminathan,42 / 50,84%\n`;
      csvContent += `3,22ECE012,Anjali Rao,38 / 50,76%\n`;
    } else if (category === "Question") {
      csvContent += "Question Description,Attempts,Success Rate,Avg Time\n";
      csvContent += `"Q1: Invert a Binary Tree",132,76.5%,24 mins\n`;
      csvContent += `"Q2: Validate Binary Search Tree",128,67.9%,28 mins\n`;
    } else {
      csvContent += "Metric,Value\n";
      csvContent += "Average Score,78.4%\n";
      csvContent += "Pass Percentage,92.4%\n";
      csvContent += "Total Audited Students,132\n";
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `${name.replace(/\s+/g, "_")}.${format.toLowerCase() === "csv" ? "csv" : "xlsx"}`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Increment download count
    const updated = reports.map(r => r.name === name ? { ...r, downloadCount: r.downloadCount + 1 } : r);
    setReports(updated);
    saveReports(updated);
  };

  // Categories list metadata
  const categoriesList = [
    { id: "Assessment", title: "Subject wise", desc: "Detailed summary statistics and performance index grouped by subject.", slug: "subject-wise-report" },
    { id: "Student", title: "Individual Report", desc: "Comprehensive scorecard and evaluation details for individual students.", slug: "individual-report" }
  ];

  // Filters logic
  const displayReports = reports.filter(r => {
    if (emptyStateMode === "no-reports") return false;
    
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === "all" || r.category.toLowerCase() === filterCategory.toLowerCase();
    const matchesFormat = filterFormat === "all" || r.exportType.toLowerCase() === filterFormat.toLowerCase();

    return matchesSearch && matchesCat && matchesFormat;
  });

  const uniqueSubjects = ["Python", "Java"];

  const totalDownloads = reports.reduce((acc, curr) => acc + curr.downloadCount, 0);

  return (
    <div className="space-y-6">
      
      {/* Demo Empty States Selector Panel */}
      <div className="bg-white border border-slate-250 rounded-lg p-3 shadow-2xs flex flex-wrap gap-2 items-center justify-between no-print">
        <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Reports Database Previews:</span>
        <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
          <button 
            onClick={() => setEmptyStateMode("none")}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
              emptyStateMode === "none" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-500"
            }`}
          >
            Seeded Database
          </button>
          <button 
            onClick={() => setEmptyStateMode("no-reports")}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
              emptyStateMode === "no-reports" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-500"
            }`}
          >
            Empty History
          </button>
          <button 
            onClick={() => setEmptyStateMode("no-data")}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
              emptyStateMode === "no-data" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-500"
            }`}
          >
            No Assessment Data
          </button>
        </div>
      </div>

      {emptyStateMode === "no-data" ? (
        <EmptyState
          title="No Assessment Data Available"
          description="We couldn't detect any evaluations marked as completed in the database roster yet."
          secondaryDescription="Complete active tests inside the Student workspace or verify the schedule timeline to generate audits."
          icon={AlertCircle}
        />
      ) : (
        <>
          {/* Statistics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1 */}
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-md text-slate-650">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Reports Logged</p>
                <p className="text-2xl font-extrabold text-slate-950 mt-0.5">
                  {emptyStateMode === "no-reports" ? 0 : reports.length}
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-md text-slate-650">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Assessments Reported</p>
                <p className="text-2xl font-extrabold text-slate-950 mt-0.5">{assessments.length}</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-md text-slate-650">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Students Evaluated</p>
                <p className="text-2xl font-extrabold text-slate-950 mt-0.5">{studentCount}</p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-4">
              <div className="p-2.5 bg-slate-900 text-white rounded-md">
                <Download className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Total Downloads</p>
                <p className="text-2xl font-extrabold text-slate-950 mt-0.5">
                  {emptyStateMode === "no-reports" ? 0 : totalDownloads}
                </p>
              </div>
            </div>

          </div>

          {/* Quick Generate Templates Grid */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-[10px] text-slate-450 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" /> Institution Report Templates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
              {categoriesList.map(cat => (
                <div 
                  key={cat.id} 
                  className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between hover:border-blue-300 hover:shadow-xs transition-all"
                >
                  <div className="space-y-1.5">
                    <span className="bg-slate-50 border border-slate-150 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-slate-500">
                      {cat.id.replace("List", "Report").toUpperCase()}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-[11px]">{cat.title}</h4>
                    <p className="text-slate-400 text-[10px] leading-relaxed">{cat.desc}</p>
                  </div>

                  <button 
                    onClick={() => {
                      setScheduleForm(prev => ({
                        ...prev,
                        category: cat.id,
                        title: `${facultyName.split(" ").slice(-1)[0]}'s ${cat.title}`
                      }));
                      setShowGenerateModal(true);
                    }}
                    className="mt-4 border border-slate-250 hover:bg-slate-50 text-slate-700 font-bold py-1.5 rounded flex items-center justify-center gap-1.5 w-full transition-colors text-[10px]"
                  >
                    Generate Report <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Search, Filter & History Block */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs p-5 space-y-4">
            
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search generation history logs by name..."
                  className="w-full text-slate-900 border border-slate-250 rounded-md pl-9 pr-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900 text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-2 items-center text-xs">
                {/* Category filter */}
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-white border border-slate-250 text-slate-800 rounded px-2.5 py-1.5 focus:outline-hidden"
                >
                  <option value="all">All Categories</option>
                  <option value="Assessment">Assessments</option>
                  <option value="Student">Students</option>
                  <option value="Question">Questions</option>
                  <option value="Batch">Batches</option>
                  <option value="Department">Departments</option>
                  <option value="Semester">Semesters</option>
                </select>

                {/* Format Filter */}
                <select 
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
                  className="bg-white border border-slate-250 text-slate-800 rounded px-2.5 py-1.5 focus:outline-hidden"
                >
                  <option value="all">All Export Formats</option>
                  <option value="PDF">PDF Only</option>
                  <option value="Excel">Excel Only</option>
                  <option value="CSV">CSV Only</option>
                </select>

                <button 
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-navy-900 hover:bg-navy-950 text-white font-bold px-4 py-2 rounded-md flex items-center gap-1.5 transition-colors focus-ring"
                >
                  <Clock className="w-3.5 h-3.5" /> Schedule Report
                </button>
              </div>
            </div>

            {/* Generated Reports list viewport */}
            {displayReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-200">
                      <th className="py-2.5 px-4">Report Description</th>
                      <th className="py-2.5 px-4">Report Type</th>
                      <th className="py-2.5 px-4">Date Generated</th>
                      <th className="py-2.5 px-4">Created By</th>
                      <th className="py-2.5 px-4 text-center">Format</th>
                      <th className="py-2.5 px-4 text-center">Downloads</th>
                      <th className="py-2.5 px-4 text-right">Audits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {displayReports.map(rep => (
                      <tr key={rep.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <button 
                            onClick={() => router.push(`/faculty/reports/${rep.id}`)}
                            className="font-bold text-slate-900 hover:text-blue-700 hover:underline text-left outline-hidden"
                          >
                            {rep.name}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 border border-slate-200 text-slate-650 px-2 py-0.5 rounded text-[8px] font-bold uppercase">
                            {rep.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{rep.generatedDate}</td>
                        <td className="py-3 px-4 text-slate-500 font-medium">{rep.generatedBy}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold font-mono ${
                            rep.exportType === "PDF" ? "bg-red-50 text-red-700 border border-red-200" :
                            rep.exportType === "Excel" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {rep.exportType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-slate-800">{rep.downloadCount}</td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button 
                            onClick={() => router.push(`/faculty/reports/${rep.id}`)}
                            className="text-slate-450 hover:text-slate-800 p-1 hover:bg-slate-100 rounded"
                            title="Open layout inspector"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDownloadReport(rep.name, rep.exportType)}
                            className="text-slate-450 hover:text-slate-800 p-1 hover:bg-slate-100 rounded"
                            title="Download format"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteReport(rep.id)}
                            className="text-slate-450 hover:text-rose-600 p-1 hover:bg-rose-50 rounded"
                            title="Delete log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No Generation Logs Matched"
                description="We couldn't find any reports in history matching the search queries or select filters."
                secondaryDescription="Clear the queries to view all generated outputs."
                icon={Search}
                actionLabel="Reset Active Filters"
                onAction={() => {
                  setSearchQuery("");
                  setFilterCategory("all");
                  setFilterFormat("all");
                }}
              />
            )}

          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: GENERATE CUSTOM REPORT NOW */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
          <div onClick={() => setShowGenerateModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"></div>
          <form 
            onSubmit={handleGenerateReport} 
            className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full relative z-[101] overflow-hidden flex flex-col font-sans text-xs"
          >
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[10px] font-bold text-navy-800 tracking-wider uppercase">Institutional Report Wizard</span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">Configure & Compile Audit</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-650">Report Output Name *</label>
                <input 
                  type="text"
                  required
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  placeholder="e.g. CS201 Section A Exam performance summary"
                  className="w-full text-slate-900 border border-slate-250 rounded-md px-3 py-2 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-650">Select Subject</label>
                  <select 
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setScheduleForm(prev => ({ ...prev, assessmentId: "" }));
                    }}
                    className="w-full text-slate-900 border border-slate-250 rounded px-2.5 py-1.5 bg-white focus:outline-hidden"
                  >
                    <option value="">All Subjects</option>
                    {uniqueSubjects.map(subj => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-650">Assessment Source</label>
                  <select 
                    value={scheduleForm.assessmentId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, assessmentId: e.target.value })}
                    className="w-full text-slate-900 border border-slate-250 rounded px-2.5 py-1.5 bg-white focus:outline-hidden"
                  >
                    <option value="">-- Choose Completed Exam --</option>
                    {assessments
                      .filter(a => {
                        if (!selectedSubject) return true;
                        const subUpper = a.subject.toUpperCase();
                        if (selectedSubject === "Python") {
                          return subUpper.includes("PYT") || subUpper.includes("PYTHON");
                        }
                        if (selectedSubject === "Java") {
                          return subUpper.includes("JAV") || subUpper.includes("JAVA");
                        }
                        return false;
                      })
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1 bg-slate-50 border border-slate-150 p-3 rounded">
                <p className="font-extrabold text-slate-800 text-[10px] uppercase">PDF Template Design Specifications:</p>
                <p className="text-slate-500 mt-1 leading-normal text-[10px]">
                  Generates an accreditation-ready A4 document containing the institution logo, student rank lists, faculty signature areas, and a cryptographic security hash.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-md font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-md font-bold"
              >
                Generate & Inspect Page
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SCHEDULE RECURRING AUDIT REPORTS */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
          <div onClick={() => setShowScheduleModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"></div>
          <form 
            onSubmit={handleScheduleReport} 
            className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full relative z-[101] overflow-hidden flex flex-col font-sans text-xs"
          >
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[10px] font-bold text-navy-800 tracking-wider uppercase">Auto Scheduler Engine</span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">Schedule Automated Assessment Audits</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-650">Job Schedule Title *</label>
                <input 
                  type="text"
                  required
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  placeholder="e.g. CSE 3rd Year Section B Weekly outcome compilation"
                  className="w-full text-slate-900 border border-slate-250 rounded-md px-3 py-2 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-650">Template Category</label>
                  <select 
                    value={scheduleForm.category}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, category: e.target.value })}
                    className="w-full text-slate-900 border border-slate-250 rounded px-2.5 py-1.5 bg-white focus:outline-hidden font-medium"
                  >
                    <option value="Assessment">Assessment Summary</option>
                    <option value="Student">Student Performance</option>
                    <option value="Question">Question Analysis</option>
                    <option value="Batch">Batch Report</option>
                    <option value="Department">Department Report</option>
                    <option value="Semester">Semester Report</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-650">Scheduling Frequency</label>
                  <select 
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                    className="w-full text-slate-900 border border-slate-250 rounded px-2.5 py-1.5 bg-white focus:outline-hidden font-medium"
                  >
                    <option value="once">Run Once (Generate Now)</option>
                    <option value="weekly">Every Saturday 5:00 PM</option>
                    <option value="monthly">1st of Every Month 9:00 AM</option>
                    <option value="completion">Auto-compile on exam completion</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-650 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" /> Dispatch Email Notifications list
                </label>
                <input 
                  type="text"
                  value={scheduleForm.emailList}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, emailList: e.target.value })}
                  placeholder="e.g. hod.cse@gouthamitmw.edu, principal@gouthamitmw.edu"
                  className="w-full text-slate-900 border border-slate-250 rounded-md px-3 py-2 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2.5 items-start pt-1.5">
                <input 
                  type="checkbox" 
                  id="autoCheck"
                  checked={scheduleForm.autoGenerate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, autoGenerate: e.target.checked })}
                  className="rounded border-slate-350 text-blue-600 w-4 h-4 cursor-pointer mt-0.5"
                />
                <label htmlFor="autoCheck" className="font-bold text-slate-700 cursor-pointer leading-normal">
                  Auto-publish outcomes to Placement and Accreditation boards.
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-md font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-md font-bold"
              >
                Schedule Job
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
