"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Plus, 
  Search, 
  Lock, 
  ShieldCheck, 
  Users, 
  BookOpen, 
  Clock, 
  Save, 
  PlusCircle, 
  Database,
  Trash2,
  AlertCircle
} from "lucide-react";
import EmptyState from "@/components/empty-state";
import { loadAssessments, saveAssessments } from "@/lib/storage";

interface Question {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  marks: number;
  language: string;
}

interface Batch {
  id: string;
  name: string;
}

export default function CreateAssessment() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // STEP 1: Assessment Info
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(180);
  const [totalMarks, setTotalMarks] = useState(50);

  // STEP 2: Questions Selection
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Mock Question bank data
  const questionBank: Question[] = [
    { id: "1", title: "Invert a Binary Tree", difficulty: "Medium", topic: "Data Structures", marks: 15, language: "C++" },
    { id: "2", title: "Validate Binary Search Tree", difficulty: "Medium", topic: "Data Structures", marks: 15, language: "Java" },
    { id: "3", title: "Method Overloading Simulation", difficulty: "Easy", topic: "OOP", marks: 10, language: "Java" },
    { id: "4", title: "Implement Dijkstra shortest path", difficulty: "Hard", topic: "Algorithms", marks: 20, language: "C++" },
    { id: "5", title: "Fibonacci Sequence recursion", difficulty: "Easy", topic: "Recursion", marks: 10, language: "Python" }
  ];

  // STEP 3: Security & Configs
  const [assessmentType, setAssessmentType] = useState("Lab Examination");
  const [navigationMode, setNavigationMode] = useState("Free"); // Free or Sequential
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [startTime, setStartTime] = useState("2026-06-18T10:00");
  const [endTime, setEndTime] = useState("2026-06-18T13:00");

  // Security Toggles
  const [fullscreenRequired, setFullscreenRequired] = useState(true);
  const [disableCopyPaste, setDisableCopyPaste] = useState(true);
  const [disableRightClick, setDisableRightClick] = useState(true);
  const [singleSession, setSingleSession] = useState(true);
  const [tabSwitchMonitoring, setTabSwitchMonitoring] = useState(true);
  const [warningThreshold, setWarningThreshold] = useState(2);
  const [autoSubmitThreshold, setAutoSubmitThreshold] = useState(3);

  // STEP 4: Assign Students
  const [assignmentMethod, setAssignmentMethod] = useState("Batch"); // Individual, Batch, Section
  const [selectedBatches, setSelectedBatches] = useState<string[]>(["CSE - 3rd Year - A"]);
  const [selectedStudentsCount, setSelectedStudentsCount] = useState(132);

  // Batches Mock lists
  const batchOptions = [
    "CSE - 3rd Year - A",
    "CSE - 3rd Year - B",
    "ECE - 2nd Year - A",
    "EEE - 4th Year - C"
  ];

  // Next / Back handlers
  const handleNext = () => {
    setErrors({});
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!name.trim()) newErrors.name = "Assessment Name is required";
      if (!subject.trim()) newErrors.subject = "Please select a subject";
      if (duration <= 0) newErrors.duration = "Enter a valid duration";
      if (totalMarks <= 0) newErrors.totalMarks = "Enter valid total marks";
    }

    if (step === 2) {
      if (selectedQuestions.length === 0) {
        newErrors.questions = "Please select at least one coding question";
      }
    }

    if (step === 4) {
      if (assignmentMethod === "Batch" && selectedBatches.length === 0) {
        newErrors.batches = "Please select at least one batch cohort";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  // Select question handler
  const handleToggleQuestion = (q: Question) => {
    if (selectedQuestions.some(item => item.id === q.id)) {
      setSelectedQuestions(selectedQuestions.filter(item => item.id !== q.id));
    } else {
      setSelectedQuestions([...selectedQuestions, q]);
    }
  };

  // Tag batch handler
  const handleToggleBatch = (b: string) => {
    if (selectedBatches.includes(b)) {
      setSelectedBatches(selectedBatches.filter(item => item !== b));
      setSelectedStudentsCount(prev => prev - 66); // Simulating student subtraction
    } else {
      setSelectedBatches([...selectedBatches, b]);
      setSelectedStudentsCount(prev => prev + 66); // Simulating student addition
    }
  };

  // Submit Publish handler
  const handlePublish = () => {
    setIsLoading(true);
    setTimeout(() => {
      const storageExam = {
        id: Date.now().toString(),
        name: name,
        subject: subject,
        duration: duration,
        questionsCount: selectedQuestions.length,
        assignedCount: selectedStudentsCount,
        status: "Scheduled" as const,
        createdDate: new Date().toISOString().split("T")[0],
        date: startTime
      };

      const allExams = [storageExam, ...loadAssessments()];
      saveAssessments(allExams);

      // Save initial questions to localStorage for this assessment
      localStorage.setItem("examcoder_assessment_questions_" + storageExam.id, JSON.stringify(selectedQuestions));

      setIsLoading(false);
      alert(`Secure assessment "${name}" published successfully and dispatched to sandboxed nodes.`);
      router.push(`/faculty/question-bank?action=add-questions&assessmentId=${storageExam.id}&assessmentName=${encodeURIComponent(storageExam.name)}`);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none text-xs text-slate-800">
      
      {/* Header bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link 
            href="/faculty/assessments" 
            className="text-slate-500 hover:text-slate-800 transition-colors mr-2 p-1.5 hover:bg-slate-100 rounded-md focus-ring flex items-center gap-1.5 font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="h-4 w-[1px] bg-slate-200"></div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Assessment Creator Wizard</h2>
        </div>

        {/* Action button */}
        {step === 5 ? (
          <button 
            onClick={handlePublish}
            disabled={isLoading}
            className="bg-navy-900 hover:bg-navy-950 text-white font-bold px-4 py-2 rounded-md flex items-center gap-1.5 transition-all focus-ring"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Dispatching Sandbox...
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" /> Publish secure Exam
              </>
            )}
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="bg-navy-900 hover:bg-navy-950 text-white font-bold px-4 py-2 rounded-md flex items-center gap-1.5 transition-all focus-ring"
          >
            Next Step <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      {/* Progress navigation tabs */}
      <div className="bg-white border-b border-slate-200 py-3 shadow-2xs">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between font-bold text-slate-500 text-[10px] uppercase tracking-wider">
          {[
            { stepNum: 1, label: "Info" },
            { stepNum: 2, label: "Questions" },
            { stepNum: 3, label: "Security Settings" },
            { stepNum: 4, label: "Assignees" },
            { stepNum: 5, label: "Publish" }
          ].map(s => (
            <div key={s.stepNum} className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold border transition-all ${
                step === s.stepNum 
                  ? "bg-navy-900 text-white border-navy-900" 
                  : step > s.stepNum 
                    ? "bg-slate-100 text-slate-700 border-slate-250 font-bold" 
                    : "bg-white text-slate-350 border-slate-200"
              }`}>
                {step > s.stepNum ? "✓" : s.stepNum}
              </span>
              <span className={step === s.stepNum ? "text-slate-900 font-extrabold" : "text-slate-400"}>{s.label}</span>
              {s.stepNum < 5 && <span className="text-slate-200 font-bold ml-4 font-sans">&#8250;</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Wizard Workspace Form */}
      <main className="max-w-5xl w-full mx-auto p-6 md:p-8 flex-1 flex flex-col justify-between">
        
        <div className="space-y-6">
          
          {/* STEP 1: Assessment Info */}
          {step === 1 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 space-y-6 shadow-2xs max-w-2xl mx-auto">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold text-navy-800 uppercase tracking-widest block">Step 1 of 5</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Configure Assessment Information</h3>
              </div>

              <div className="space-y-4">
                {/* Assessment Name */}
                <div className="space-y-1">
                  <label htmlFor="asmName" className="block font-bold text-slate-700">Assessment Title *</label>
                  <input 
                    type="text"
                    id="asmName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. CS201 Data Structures Lab Final Exam"
                    className={`w-full text-slate-900 border ${errors.name ? "border-rose-500" : "border-slate-200"} rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900`}
                  />
                  {errors.name && <p className="text-rose-600 text-[10px] mt-0.5 font-semibold">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Select Subject */}
                  <div className="space-y-1">
                    <label htmlFor="asmSubject" className="block font-bold text-slate-700">Select Subject *</label>
                    <select 
                      id="asmSubject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className={`w-full text-slate-900 border ${errors.subject ? "border-rose-500" : "border-slate-200"} rounded-md px-3 py-2 bg-white focus:outline-hidden focus:ring-1 focus:ring-navy-900`}
                    >
                      <option value="">-- Select Subject --</option>
                      <option value="IT101">Programming in C</option>
                      <option value="IT102">Python</option>
                      <option value="IT201">Java</option>
                    </select>
                    {errors.subject && <p className="text-rose-600 text-[10px] mt-0.5 font-semibold">{errors.subject}</p>}
                  </div>

                  {/* Duration */}
                  <div className="space-y-1">
                    <label htmlFor="asmDuration" className="block font-bold text-slate-700">Duration (Minutes) *</label>
                    <input 
                      type="number"
                      id="asmDuration"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  {/* Marks */}
                  <div className="space-y-1">
                    <label htmlFor="asmMarks" className="block font-bold text-slate-700">Total Marks *</label>
                    <input 
                      type="number"
                      id="asmMarks"
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(Number(e.target.value))}
                      className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label htmlFor="asmDesc" className="block font-bold text-slate-700">Assessment Syllabus Description</label>
                  <textarea 
                    id="asmDesc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide exam rules, instructions, or course outcome mapping..."
                    className="w-full text-slate-900 border border-slate-200 rounded-md px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-navy-900 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Select Questions */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Question list selector */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-navy-800 uppercase tracking-widest block">Step 2 of 5</span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Select Programming Questions</h3>
                </div>

                {errors.questions && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-md flex gap-2 items-center">
                    <AlertCircle className="w-4 h-4" /> <span className="font-bold">{errors.questions}</span>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search question repository..."
                    className="w-full text-slate-900 border border-slate-200 rounded-md pl-9 pr-3 py-2 focus:outline-hidden"
                  />
                </div>

                {/* Question items grid */}
                <div className="space-y-2">
                  {questionBank
                    .filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((q) => {
                      const isSelected = selectedQuestions.some(item => item.id === q.id);
                      return (
                        <div 
                          key={q.id}
                          onClick={() => handleToggleQuestion(q)}
                          className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected 
                              ? "bg-slate-50 border-navy-300 shadow-2xs" 
                              : "bg-white border-slate-200 hover:border-slate-350"
                          }`}
                        >
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 text-xs">{q.title}</h4>
                            <p className="text-slate-400 font-medium font-mono text-[9px] uppercase">
                              {q.language} • {q.topic}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                q.difficulty === "Easy" ? "bg-emerald-50 text-emerald-800" :
                                q.difficulty === "Medium" ? "bg-amber-50 text-amber-800" :
                                "bg-rose-50 text-rose-800"
                              }`}>
                                {q.difficulty}
                              </span>
                              <p className="text-[10px] font-bold text-slate-900 font-mono mt-1">{q.marks} Marks</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-navy-900 border-navy-900 text-white" : "border-slate-250 bg-white"
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Selected Sidebar panel */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Selected Questions Panel</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Summary of exam marks weight allocation.</p>
                </div>

                {selectedQuestions.length > 0 ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {selectedQuestions.map((q, idx) => (
                        <div key={q.id} className="bg-slate-50 p-2.5 rounded border border-slate-200 flex justify-between items-center text-slate-700">
                          <div>
                            <span className="font-bold font-mono text-slate-500 mr-1.5">Q{idx + 1}.</span>
                            <span className="font-bold text-slate-800">{q.title}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 shrink-0">{q.marks} pts</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-900 text-white p-3.5 rounded-lg border border-slate-950 font-mono flex justify-between items-center text-[10px] mt-2">
                      <span className="font-bold">TOTAL ALLOCATED MARKS:</span>
                      <span className="font-extrabold text-sm">{selectedQuestions.reduce((sum, item) => sum + item.marks, 0)} / {totalMarks} pts</span>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No Questions Selected"
                    description="Check the coding questions on the left grid panel to add them to this exam sheet."
                    icon={Database}
                  />
                )}
              </div>

            </div>
          )}

          {/* STEP 3: Config & Security Toggles */}
          {step === 3 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 space-y-6 shadow-2xs max-w-3xl mx-auto">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold text-navy-800 uppercase tracking-widest block">Step 3 of 5</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Configure security & Proctor Settings</h3>
              </div>

              {/* Security parameters forms */}
              <div className="space-y-6">
                
                {/* Exam type and timers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Assessment Type Classification</label>
                    <select 
                      value={assessmentType}
                      onChange={(e) => setAssessmentType(e.target.value)}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden"
                    >
                      <option value="Lab Examination">Lab Examination</option>
                      <option value="Internal Assessment">Internal Assessment</option>
                      <option value="Practice">Practice Session</option>
                      <option value="Placement Assessment">Placement Assessment</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Code Navigation Rules</label>
                    <select 
                      value={navigationMode}
                      onChange={(e) => setNavigationMode(e.target.value)}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-hidden"
                    >
                      <option value="Free">Free Navigation (Move between questions)</option>
                      <option value="Sequential">Sequential Navigation (Strict order {"Q1 -> Q2"})</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start time */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Exam Window Start Time</label>
                    <input 
                      type="datetime-local" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full border border-slate-200 rounded px-3 py-1.5 focus:outline-hidden"
                    />
                  </div>

                  {/* End time */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Exam Window Close Time</label>
                    <input 
                      type="datetime-local" 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border border-slate-200 rounded px-3 py-1.5 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Security Toggles Grid */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Proctor Integrity Safeguards</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div className="bg-slate-50/50 p-3.5 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">Fullscreen enforcement</p>
                        <p className="text-[10px] text-slate-400">Blocks exam display if browser exited</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={fullscreenRequired} 
                        onChange={(e) => setFullscreenRequired(e.target.checked)}
                        className="rounded border-slate-350 text-navy-900 w-4 h-4 shrink-0 cursor-pointer"
                      />
                    </div>

                    <div className="bg-slate-50/50 p-3.5 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">Disable copy paste</p>
                        <p className="text-[10px] text-slate-400">Locks local clipboard access inside IDE</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={disableCopyPaste} 
                        onChange={(e) => setDisableCopyPaste(e.target.checked)}
                        className="rounded border-slate-350 text-navy-900 w-4 h-4 shrink-0 cursor-pointer"
                      />
                    </div>

                    <div className="bg-slate-50/50 p-3.5 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">Disable right click</p>
                        <p className="text-[10px] text-slate-400">Restricts context menus inspection</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={disableRightClick} 
                        onChange={(e) => setDisableRightClick(e.target.checked)}
                        className="rounded border-slate-350 text-navy-900 w-4 h-4 shrink-0 cursor-pointer"
                      />
                    </div>

                    <div className="bg-slate-50/50 p-3.5 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">Single active session</p>
                        <p className="text-[10px] text-slate-400">Prevents concurrent logins by roll</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={singleSession} 
                        onChange={(e) => setSingleSession(e.target.checked)}
                        className="rounded border-slate-350 text-navy-900 w-4 h-4 shrink-0 cursor-pointer"
                      />
                    </div>

                    <div className="bg-slate-50/50 p-3.5 border border-slate-200 rounded-lg flex items-center justify-between gap-4 col-span-2">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">Tab Switch Focus monitoring</p>
                        <p className="text-[10px] text-slate-400">Flags logs warning when candidate unfocuses exam browser window</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={tabSwitchMonitoring} 
                        onChange={(e) => setTabSwitchMonitoring(e.target.checked)}
                        className="rounded border-slate-350 text-navy-900 w-4 h-4 shrink-0 cursor-pointer"
                      />
                    </div>

                  </div>
                </div>

                {/* Warning bounds */}
                {tabSwitchMonitoring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700">Tab warning threshold</label>
                      <input 
                        type="number" 
                        value={warningThreshold}
                        onChange={(e) => setWarningThreshold(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded px-2.5 py-1 bg-white focus:outline-hidden"
                      />
                      <p className="text-[9px] text-slate-400">Issues popups alerts inside IDE console.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700">Auto submit limit</label>
                      <input 
                        type="number" 
                        value={autoSubmitThreshold}
                        onChange={(e) => setAutoSubmitThreshold(Number(e.target.value))}
                        className="w-full border border-slate-200 rounded px-2.5 py-1 bg-white focus:outline-hidden"
                      />
                      <p className="text-[9px] text-slate-400">Exceeding this locks compiler and submits active files.</p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* STEP 4: Assign Students */}
          {step === 4 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 space-y-6 shadow-2xs max-w-2xl mx-auto">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold text-navy-800 uppercase tracking-widest block">Step 4 of 5</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Assign Class Roster Slots</h3>
              </div>

              {errors.batches && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-md flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span className="font-bold">{errors.batches}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Assignment Method Option</label>
                  <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 self-start">
                    {["Batch", "Individual"].map((method) => (
                      <button 
                        key={method}
                        type="button"
                        onClick={() => setAssignmentMethod(method)}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${
                          assignmentMethod === method ? "bg-white text-slate-950 shadow-2xs" : "text-slate-400"
                        }`}
                      >
                        {method} Selection
                      </button>
                    ))}
                  </div>
                </div>

                {assignmentMethod === "Batch" ? (
                  <div className="space-y-3 pt-2">
                    <label className="block font-bold text-slate-700">Select Departmental Batches</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {batchOptions.map((b) => {
                        const isSelected = selectedBatches.includes(b);
                        return (
                          <div 
                            key={b}
                            onClick={() => handleToggleBatch(b)}
                            className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected 
                                ? "bg-slate-50 border-navy-300 shadow-2xs" 
                                : "bg-white border-slate-200 hover:border-slate-350"
                            }`}
                          >
                            <span className="font-bold text-slate-800">{b}</span>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-navy-900 border-navy-900 text-white" : "border-slate-250 bg-white"
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-700">Individual Candidates allocation</label>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-center justify-between">
                      <p className="text-slate-650 leading-relaxed max-w-xs">
                        Enter candidate count to assign. By default, assigning to individual candidates requires matching their Roll Numbers manually in the roster sheet.
                      </p>
                      <input 
                        type="number"
                        value={selectedStudentsCount}
                        onChange={(e) => setSelectedStudentsCount(Number(e.target.value))}
                        className="w-24 text-slate-900 border border-slate-200 rounded px-3 py-1.5 bg-white text-center font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-950 font-mono flex justify-between items-center text-[10px] mt-4">
                  <span className="font-bold uppercase">Allocated Candidates Telemetry:</span>
                  <span className="font-extrabold text-sm">{selectedStudentsCount} Students Registered</span>
                </div>

              </div>
            </div>
          )}

          {/* STEP 5: Review & Publish Preview */}
          {step === 5 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 space-y-6 shadow-2xs max-w-3xl mx-auto">
              <div className="border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold text-navy-800 uppercase tracking-widest block">Step 5 of 5</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Review & Publish secure Assessment</h3>
              </div>

              {/* Preview parameters grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                
                {/* Details list */}
                <div className="space-y-4">
                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                    Assessment Details
                  </h4>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Title Name:</span>
                      <span className="font-bold text-slate-900">{name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Subject & Code:</span>
                      <span className="font-bold text-slate-900 font-mono">{subject} ({assessmentType})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Exam Duration:</span>
                      <span className="font-bold text-slate-900">{duration} minutes ({totalMarks} Marks)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Schedule window:</span>
                      <span className="font-bold text-slate-900 font-mono text-[10px] text-right truncate max-w-[180px]">
                        {startTime.replace("T", " ")} $\rightarrow$ {endTime.replace("T", " ")}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 pt-3 pb-1">
                    Assigned Roster Target
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Assigned Cohort:</span>
                    <span className="font-bold text-slate-900">
                      {assignmentMethod === "Batch" ? selectedBatches.join(", ") : `${selectedStudentsCount} Students`}
                    </span>
                  </div>
                </div>

                {/* Security and Questions counts */}
                <div className="space-y-4">
                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                    Security Configurations
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-700">
                    <div className={`p-2 rounded border ${fullscreenRequired ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-slate-100 border-slate-150 text-slate-450"}`}>
                      Fullscreen locked: {fullscreenRequired ? "YES" : "NO"}
                    </div>
                    <div className={`p-2 rounded border ${disableCopyPaste ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-slate-100 border-slate-150 text-slate-450"}`}>
                      Clipboard blocked: {disableCopyPaste ? "YES" : "NO"}
                    </div>
                    <div className={`p-2 rounded border ${tabSwitchMonitoring ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-slate-100 border-slate-150 text-slate-450"}`}>
                      Tab monitor warnings: {tabSwitchMonitoring ? `YES (${warningThreshold}x)` : "NO"}
                    </div>
                    <div className={`p-2 rounded border ${singleSession ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-slate-100 border-slate-150 text-slate-450"}`}>
                      IP session lock: {singleSession ? "YES" : "NO"}
                    </div>
                  </div>

                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 pt-3 pb-1">
                    Questions Selected ({selectedQuestions.length})
                  </h4>
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {selectedQuestions.map((q, idx) => (
                      <div key={q.id} className="bg-slate-50 border border-slate-200 p-2 rounded flex justify-between items-center text-[11px] text-slate-700">
                        <span>{idx + 1}. {q.title}</span>
                        <span className="font-mono font-bold">{q.marks} pts</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Navigation bottom buttons */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-md font-bold"
            >
              Previous Step
            </button>
          ) : (
            <div></div>
          )}

          {step < 5 && (
            <button
              onClick={handleNext}
              className="bg-navy-900 hover:bg-navy-950 text-white font-bold px-5 py-2 rounded-md"
            >
              Continue Configuration
            </button>
          )}
        </div>

      </main>

    </div>
  );
}
