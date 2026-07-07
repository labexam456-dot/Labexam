"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Search, 
  FileSpreadsheet, 
  Activity, 
  Lock,
  ArrowRight
} from "lucide-react";
import { loadAssessments, loadStudents, loadQuestions, loadFacultyProfile, loadStudentProfile, loadExamSessions } from "@/lib/storage";

interface LogEntry {
  id: string;
  time: string;
  student: string;
  roll: string;
  event: string;
  status: "warning" | "critical" | "success" | "info";
}

interface DashboardMockupProps {
  collegeName?: string;
}

export default function DashboardMockup({ collegeName }: DashboardMockupProps) {
  const [activeTab, setActiveTab] = useState<"monitoring" | "exams">("monitoring");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [examSessions, setExamSessions] = useState<any[]>([]);

  const [facultyCollege, setFacultyCollege] = useState(collegeName || "Gouthami Institute of Technology and Management for Women");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const asms = loadAssessments();
      setAssessments(asms);
      const studs = loadStudents();
      setStudents(studs);
      const sessions = loadExamSessions();
      setExamSessions(sessions);

      if (collegeName) {
        setFacultyCollege(collegeName);
      } else {
        const profile = loadFacultyProfile();
        if (profile.collegeName) {
          setFacultyCollege(profile.collegeName);
        } else {
          const studentProfile = loadStudentProfile();
          if (studentProfile.collegeName) {
            setFacultyCollege(studentProfile.collegeName);
          }
        }
      }

      const active = asms.filter(a => a.status === "Active");
      const activeAssessmentIds = active.map(e => e.id);
      
      const parseLogs = (jsonStr: string | null | undefined): string[] => {
        if (!jsonStr) return [];
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.warningsLogs)) {
              return parsed.warningsLogs;
            }
          }
        } catch (e) {}
        return [];
      };

      const actualLogs: LogEntry[] = [];
      let logIdx = 0;
      studs.forEach(student => {
        const studentSessions = sessions.filter(es => es.studentRoll === student.roll && activeAssessmentIds.includes(es.assessmentId));
        studentSessions.forEach(session => {
          const wLogs = parseLogs(session.codeSubmissions);
          wLogs.forEach(log => {
            const parts = log.split(" - ");
            const timeStr = parts[0] || "";
            const eventStr = parts[1] || log;
            let status: "warning" | "critical" | "success" | "info" = "info";
            if (eventStr.toLowerCase().includes("warning") || eventStr.toLowerCase().includes("tab")) {
              status = "warning";
            }
            if (eventStr.toLowerCase().includes("suspended") || eventStr.toLowerCase().includes("disqualified")) {
              status = "critical";
            }
            actualLogs.push({
              id: `act-log-${logIdx++}`,
              time: timeStr,
              student: student.name,
              roll: student.roll,
              event: eventStr,
              status
            });
          });
        });
      });

      if (actualLogs.length === 0 && active.length > 0 && studs.length > 0) {
        const activeSessions = sessions.filter(s => activeAssessmentIds.includes(s.assessmentId));
        const generatedLogs: LogEntry[] = activeSessions.map((s, idx) => {
          const studentInfo = studs.find(st => st.roll === s.studentRoll);
          const timeStr = new Date(s.startedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            id: `log-${idx}`,
            time: timeStr,
            student: studentInfo ? studentInfo.name : "Student",
            roll: s.studentRoll,
            event: "Workspace session connected successfully",
            status: "info" as const
          };
        });
        setLogs(generatedLogs.slice(0, 5));
      } else {
        setLogs(actualLogs.slice(0, 5));
      }
    }
  }, [collegeName]);

  const activeExams = assessments.filter(a => a.status === "Active" || a.status === "In Progress");
  const hasActive = activeExams.length > 0;
  
  const parseWarnings = (jsonStr: string | null | undefined): number => {
    if (!jsonStr) return 0;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        if ('warningsCount' in parsed) {
          return parsed.warningsCount || 0;
        }
      }
    } catch (e) {}
    return 0;
  };

  const activeAssessmentIds = activeExams.map(e => e.id);
  const activeExamsSessions = examSessions.filter(s => activeAssessmentIds.includes(s.assessmentId));

  const totalStudentsCount = hasActive ? activeExams.reduce((sum: number, e: any) => sum + e.assignedCount, 0) : 0;
  const activeStudentsCount = hasActive ? activeExamsSessions.filter(s => s.submittedAt === null).length : 0;
  const activeStudentsStr = hasActive ? `${activeStudentsCount}/${totalStudentsCount}` : "0/0";
  const submissionsCount = hasActive ? activeExamsSessions.filter(s => s.submittedAt !== null).length : 0;
  const submissionsStr = hasActive ? `${submissionsCount}/${totalStudentsCount}` : "0/0";
  const warningsCount = hasActive ? activeExamsSessions.reduce((sum, s) => sum + parseWarnings(s.codeSubmissions), 0) : 0;
  const remainingTimeStr = hasActive 
    ? (activeExams[0].duration 
        ? `${Math.floor(activeExams[0].duration / 60).toString().padStart(2, '0')}h ${(activeExams[0].duration % 60).toString().padStart(2, '0')}m` 
        : "02h 00m") 
    : "00h 00m";

  const dynamicAnalytics = React.useMemo(() => {
    if (students.length === 0) {
      return {
        avgScore: "N/A",
        cheatingIndex: "0.00%",
        evalSpeed: "0.0 sec"
      };
    }
    const scores = students.map(s => {
      if (s.status === "Suspended") return 0;
      const hash = s.name.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      return Math.round(30 + (hash % 20));
    });
    const total = students.length || 1;
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / total;
    const avgPercentage = `${((avg / 50) * 100).toFixed(1)}%`;
    
    const suspendedCount = students.filter(s => s.status === "Suspended").length;
    const cheatingPct = `${((suspendedCount / total) * 100).toFixed(2)}%`;
    
    return {
      avgScore: avgPercentage,
      cheatingIndex: cheatingPct,
      evalSpeed: "1.2 sec"
    };
  }, [students]);

  const sortedAssessments = React.useMemo(() => {
    const statusOrder: Record<string, number> = {
      "Active": 1,
      "In Progress": 1,
      "Scheduled": 2,
      "Completed": 3,
      "Draft": 4,
      "Archived": 5
    };
    return [...assessments].sort((a, b) => {
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });
  }, [assessments]);

  const topicMastery = React.useMemo(() => {
    const qList = loadQuestions();
    if (qList.length === 0) {
      return [];
    }

    const topicGroups: Record<string, { total: number; sumSuccess: number }> = {};
    qList.forEach(q => {
      if (!q.topic) return;
      const rateStr = q.successRate || "";
      let rate = 75;
      if (rateStr && rateStr !== "N/A") {
        rate = parseInt(rateStr.replace("%", "")) || 75;
      }
      if (!topicGroups[q.topic]) {
        topicGroups[q.topic] = { total: 0, sumSuccess: 0 };
      }
      topicGroups[q.topic].total += 1;
      topicGroups[q.topic].sumSuccess += rate;
    });

    const results = Object.entries(topicGroups).map(([topic, data]) => {
      return {
        topic,
        correctness: Math.round(data.sumSuccess / data.total)
      };
    });

    if (results.length === 0) {
      return [];
    }

    return results.sort((a, b) => b.correctness - a.correctness);
  }, []);


  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col font-sans">
      {/* Platform Header */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-navy-600 p-2 rounded-lg text-white font-bold text-sm tracking-widest flex items-center justify-center w-8 h-8">
            ES
          </div>
          <div>
            <h3 className="font-semibold text-sm tracking-wide">EXAMCODER ADMIN</h3>
            <p className="text-slate-400 text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              {facultyCollege} • Server Node-3
            </p>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <button 
            onClick={() => setActiveTab("monitoring")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "monitoring" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Live Proctoring
            </span>
          </button>
          <button 
            onClick={() => setActiveTab("exams")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "exams" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Exams Control
            </span>
          </button>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 bg-slate-50 min-h-[420px] flex-1">
        
        {/* VIEW 1: LIVE PROCTORING & MONITORING */}
        {activeTab === "monitoring" && (
          <div className="space-y-6">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              
              {/* Card 1: Active Students */}
              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[76px] sm:min-h-[84px] md:min-h-[92px]">
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-slate-500 text-[9px] sm:text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider truncate leading-tight">
                    Active Students
                  </p>
                  <div className="p-1 sm:p-1.5 rounded bg-navy-50 text-navy-900 shrink-0">
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <p className="text-sm sm:text-base md:text-xl font-bold text-slate-900 font-mono leading-none mt-1.5 sm:mt-2">
                  {activeStudentsStr}
                </p>
              </div>

              {/* Card 2: Proctor Warnings */}
              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[76px] sm:min-h-[84px] md:min-h-[92px]">
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-slate-500 text-[9px] sm:text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider truncate leading-tight">
                    Proctor Warnings
                  </p>
                  <div className="p-1 sm:p-1.5 rounded bg-amber-50 text-amber-600 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <p className="text-sm sm:text-base md:text-xl font-bold text-slate-900 font-mono leading-none mt-1.5 sm:mt-2">
                  {warningsCount}
                </p>
              </div>

              {/* Card 3: Submissions */}
              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[76px] sm:min-h-[84px] md:min-h-[92px]">
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-slate-500 text-[9px] sm:text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider truncate leading-tight">
                    Submissions
                  </p>
                  <div className="p-1 sm:p-1.5 rounded bg-emerald-50 text-emerald-600 shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <p className="text-sm sm:text-base md:text-xl font-bold text-slate-900 font-mono leading-none mt-1.5 sm:mt-2">
                  {submissionsStr}
                </p>
              </div>

              {/* Card 4: Remaining Time */}
              <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[76px] sm:min-h-[84px] md:min-h-[92px]">
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-slate-500 text-[9px] sm:text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider truncate leading-tight">
                    Remaining Time
                  </p>
                  <div className="p-1 sm:p-1.5 rounded bg-blue-50 text-blue-600 shrink-0">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <p className="text-sm sm:text-base md:text-xl font-bold text-slate-900 font-mono leading-none mt-1.5 sm:mt-2">
                  {remainingTimeStr}
                </p>
              </div>

            </div>

            {/* Live Violation Logs & Telemetry */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${hasActive ? "bg-rose-500 animate-ping" : "bg-slate-400"}`}></span>
                  <span className="text-xs font-bold text-slate-950 uppercase tracking-wider">Live Security Logs Feed</span>
                </div>
                <span className="text-[11px] text-slate-500">Auto-refreshing every 5s</span>
              </div>
              <div className="divide-y divide-slate-150 max-h-[260px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 font-sans font-medium h-[180px]">
                    <Activity className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                    <p className="text-xs text-slate-500">No active proctoring feeds or violation incidents recorded.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Surveillance console is online and listening for node connection keys.</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-all text-xs">
                      <div className="flex items-start gap-3 flex-1 min-w-0 mr-4">
                        <div className="text-slate-400 font-mono pt-0.5">{log.time}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 truncate">{log.student}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-650 px-1.5 py-0.5 rounded font-mono font-medium">{log.roll}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5 truncate">{log.event}</p>
                        </div>
                      </div>
                      <div>
                        {log.status === "warning" && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            Warning Issued
                          </span>
                        )}
                        {log.status === "critical" && (
                          <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            Exam Paused
                          </span>
                        )}
                        {log.status === "success" && (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            Graded OK
                          </span>
                        )}
                        {log.status === "info" && (
                          <span className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            Connected
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: ACTIVE & SCHEDULED EXAMS */}
        {activeTab === "exams" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h4 className="text-sm font-semibold text-slate-900">Current Semester Exams Portfolio</h4>
              <button className="text-xs text-navy-800 hover:text-navy-950 font-medium flex items-center gap-1">
                + Create New Assessment
              </button>
            </div>

            <div className="grid gap-3">
              {sortedAssessments.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 font-sans font-medium h-[180px] bg-white border border-slate-200 rounded-lg shadow-xs">
                  <BookOpen className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                  <p className="text-xs text-slate-500">No assessments found in the portfolio.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Create a new assessment to begin.</p>
                </div>
              ) : (
                sortedAssessments.map((exam) => {
                  let badgeBg = "bg-slate-100 text-slate-700 border-slate-200";
                  let statusText = exam.status.toUpperCase();
                  if (exam.status === "Active" || exam.status === "In Progress") {
                    badgeBg = "bg-emerald-50 text-emerald-800 border border-emerald-200";
                    statusText = "IN PROGRESS";
                  } else if (exam.status === "Scheduled") {
                    badgeBg = "bg-blue-50 text-blue-800 border border-blue-200";
                  } else if (exam.status === "Completed") {
                    badgeBg = "bg-slate-100 text-slate-700 border-slate-200";
                  } else if (exam.status === "Draft") {
                    badgeBg = "bg-amber-50 text-amber-800 border-amber-200";
                  }

                  const getSubjectLabel = (subject: string) => {
                    if (subject === "CS201") return "Lab Terminal CS201";
                    if (subject === "IT305") return "Internal Assessment IT305";
                    if (subject === "CS304") return "End-Sem CS304";
                    return `Assessment ${subject}`;
                  };

                  const getEvaluators = (exam: any) => {
                    if (exam.status === "Completed") {
                      return `Evaluated on ${exam.date} • ${exam.assignedCount} Submissions graded automatically`;
                    }
                    if (exam.subject === "CS201") {
                      return `Evaluators: Prof. R. Ramanujan, Dr. S. Bose • ${exam.assignedCount} slots allocated`;
                    }
                    if (exam.subject === "IT305") {
                      return `Evaluators: Prof. A. Sen • ${exam.assignedCount} slots allocated`;
                    }
                    return `Evaluators: HOD & Course Faculty • ${exam.assignedCount} slots allocated`;
                  };

                  const hash = exam.name.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                  const avgGrade = (7.5 + (hash % 20) / 10).toFixed(2);

                  return (
                    <div key={exam.id} className={`bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${exam.status === "Completed" ? "opacity-75 hover:opacity-100 transition-opacity" : ""}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded ${badgeBg}`}>
                            {statusText}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">{getSubjectLabel(exam.subject)}</span>
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm">{exam.name}</h5>
                        <p className="text-xs text-slate-500">{getEvaluators(exam)}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          {exam.status === "Completed" ? (
                            <>
                              <p className="text-slate-500">Average Grade</p>
                              <p className="font-semibold text-emerald-700">{avgGrade} / 10.0</p>
                            </>
                          ) : exam.status === "Scheduled" ? (
                            <>
                              <p className="text-slate-500">Starts</p>
                              <p className="font-semibold text-slate-900">{exam.date}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-slate-500">Scheduled Duration</p>
                              <p className="font-semibold text-slate-900">{exam.duration} Minutes</p>
                            </>
                          )}
                        </div>
                        {exam.status === "Completed" ? (
                          <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 text-[11px]">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" /> Export PDF
                          </button>
                        ) : exam.status === "Scheduled" || exam.status === "Draft" ? (
                          <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 text-[11px]">
                            Configure
                          </button>
                        ) : (
                          <button className="bg-navy-900 hover:bg-navy-950 text-white px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 text-[11px]">
                            Manage <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}


      </div>

      {/* Footer statistics overlay */}
      <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-slate-500 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            ISO 27001 Certified Environment
          </span>
          <span className="hidden md:inline-block text-slate-300">•</span>
          <span className="hidden md:inline-flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
            NBA/NAAC Compliant Reporting
          </span>
        </div>

      </div>
    </div>
  );
}
