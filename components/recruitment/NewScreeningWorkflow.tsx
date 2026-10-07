"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { WorkflowStatus, WorkflowStageItem } from "@/components/ui/WorkflowStatus";
import { useScreeningStore } from "@/lib/store/screening-store";
import { getAIProvider, StructuredJobRequirements, ExtractedRequirement } from "@/lib/ai/provider";
import { calculateFinalMatchScore, DEFAULT_SCORING_WEIGHTS } from "@/lib/scoring";
import { JobScreening, CandidateScoreResult } from "@/types";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  Info,
  Layers,
  Circle,
} from "lucide-react";

const SAMPLE_JOB_TEXT = `We are looking for a Python Backend Developer with 3+ years of professional experience building scalable web APIs.
Key Requirements:
- Strong proficiency in Python and FastAPI or Django.
- Experience with PostgreSQL schema design, queries, and optimization.
- Containerization with Docker for development and deployment.
- Experience with Redis caching and asynchronous queues is preferred.
- Familiarity with unit testing (PyTest) and CI/CD pipelines.`;

const DEMO_RESUME_POOL = [
  {
    name: "Sanjay Thapa",
    years: 2.4,
    skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "Git"],
    text: "Backend Engineer with 2.4 years of experience building Python and FastAPI microservices. Designed PostgreSQL database schemas, implemented Docker containers for local and staging environments. Wrote PyTest unit test suites.",
  },
  {
    name: "Aarav Sharma",
    years: 4.2,
    skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis", "Git"],
    text: "Lead Backend Engineer with 4.2 years experience. Architected distributed FastAPI services with PostgreSQL cluster and Redis caching. Containerized all workflows via Docker and GitHub Actions.",
  },
  {
    name: "Priya Karki",
    years: 3.1,
    skills: ["Python", "Django", "PostgreSQL", "Docker"],
    text: "Python developer with 3.1 years experience specializing in Django REST framework and PostgreSQL database optimization. Basic Docker container experience.",
  },
  {
    name: "Bikash Adhikari",
    years: 5.2,
    skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis", "AWS", "PyTest"],
    text: "Senior Backend Specialist with 5.2 years building mission-critical services in Python and FastAPI. Expert in PostgreSQL tuning, Redis caching, AWS deployments, and Docker orchestration.",
  },
  {
    name: "Rohan Joshi",
    years: 1.8,
    skills: ["Python", "Flask", "PostgreSQL"],
    text: "Junior backend developer with 1.8 years in Python and Flask development. Basic SQL and database operations.",
  },
  {
    name: "Anjali Mehta",
    years: 3.8,
    skills: ["Python", "FastAPI", "PostgreSQL", "Docker"],
    text: "Software Engineer with 3.8 years of backend development. Built asynchronous API endpoints with FastAPI, PostgreSQL, and Dockerized build systems.",
  },
];

export function NewScreeningWorkflow() {
  const router = useRouter();
  const { addScreening } = useScreeningStore();

  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [jobTitle, setJobTitle] = React.useState("Python Backend Developer");
  const [department, setDepartment] = React.useState("Core Engineering");
  const [location, setLocation] = React.useState("Kathmandu / Remote");
  const [jobDescription, setJobDescription] = React.useState(SAMPLE_JOB_TEXT);
  const [minExperience, setMinExperience] = React.useState(3);

  const [extractedRequirements, setExtractedRequirements] = React.useState<StructuredJobRequirements | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [newSkillInput, setNewSkillInput] = React.useState("");

  // Resume Upload State
  const [uploadedFiles, setUploadedFiles] = React.useState<Array<{ name: string; size: string }>>([]);
  const [useSamplePool, setUseSamplePool] = React.useState(true);

  // Workflow Pipeline Stages
  const [workflowStages, setWorkflowStages] = React.useState<WorkflowStageItem[]>([
    { id: "job_received", label: "Job description received", status: "completed" },
    { id: "extracting", label: "Extracting structured requirements", status: "pending" },
    { id: "normalizing", label: "Normalizing skills and experience taxonomy", status: "pending" },
    { id: "retrieving", label: "Grounding against market requirements", status: "pending" },
  ]);

  const [screeningStages, setScreeningStages] = React.useState<WorkflowStageItem[]>([
    { id: "processing_resumes", label: "Processing candidate resumes independently", status: "pending" },
    { id: "matching_candidates", label: "Matching candidates against requirements", status: "pending" },
    { id: "calculating_scores", label: "Calculating deterministic scores", status: "pending" },
    { id: "building_queue", label: "Building explainable review queue", status: "pending" },
  ]);

  const handleAnalyzeJob = async () => {
    setIsExtracting(true);

    // Update stages progression
    setWorkflowStages([
      { id: "job_received", label: "Job description received", status: "completed" },
      { id: "extracting", label: "Extracting structured requirements", status: "in_progress" },
      { id: "normalizing", label: "Normalizing skills and experience taxonomy", status: "pending" },
      { id: "retrieving", label: "Grounding against market requirements", status: "pending" },
    ]);

    await new Promise((r) => setTimeout(r, 400));

    const provider = getAIProvider();
    const structured = await provider.extractJobRequirements(jobTitle, jobDescription);
    structured.minimumExperienceYears = minExperience;

    setWorkflowStages([
      { id: "job_received", label: "Job description received", status: "completed" },
      { id: "extracting", label: "Extracting structured requirements", status: "completed" },
      { id: "normalizing", label: "Normalizing skills and experience taxonomy", status: "completed" },
      { id: "retrieving", label: "Grounding against market requirements", status: "completed" },
    ]);

    setExtractedRequirements(structured);
    setIsExtracting(false);
    setStep(2); // Review extracted requirements screen
  };

  const handleRemoveRequirement = (id: string, isRequired: boolean) => {
    if (!extractedRequirements) return;
    if (isRequired) {
      setExtractedRequirements({
        ...extractedRequirements,
        requiredSkills: extractedRequirements.requiredSkills.filter((r) => r.id !== id),
      });
    } else {
      setExtractedRequirements({
        ...extractedRequirements,
        preferredSkills: extractedRequirements.preferredSkills.filter((r) => r.id !== id),
      });
    }
  };

  const handleToggleImportance = (req: ExtractedRequirement, fromRequired: boolean) => {
    if (!extractedRequirements) return;
    if (fromRequired) {
      setExtractedRequirements({
        ...extractedRequirements,
        requiredSkills: extractedRequirements.requiredSkills.filter((r) => r.id !== req.id),
        preferredSkills: [...extractedRequirements.preferredSkills, { ...req, importance: "preferred" }],
      });
    } else {
      setExtractedRequirements({
        ...extractedRequirements,
        preferredSkills: extractedRequirements.preferredSkills.filter((r) => r.id !== req.id),
        requiredSkills: [...extractedRequirements.requiredSkills, { ...req, importance: "required" }],
      });
    }
  };

  const handleAddCustomSkill = () => {
    if (!newSkillInput.trim() || !extractedRequirements) return;
    const newReq: ExtractedRequirement = {
      id: `req-custom-${Date.now()}`,
      name: newSkillInput.trim(),
      type: "skill",
      importance: "required",
      confidence: 1.0,
      description: "Custom requirement added during human review",
    };
    setExtractedRequirements({
      ...extractedRequirements,
      requiredSkills: [...extractedRequirements.requiredSkills, newReq],
    });
    setNewSkillInput("");
  };

  const handleRunScreening = async () => {
    setStep(4);

    const updateStage = (idx: number, status: "in_progress" | "completed") => {
      setScreeningStages((prev) =>
        prev.map((stage, i) => (i === idx ? { ...stage, status } : stage))
      );
    };

    updateStage(0, "in_progress");
    await new Promise((r) => setTimeout(r, 600));
    updateStage(0, "completed");

    updateStage(1, "in_progress");
    await new Promise((r) => setTimeout(r, 700));
    updateStage(1, "completed");

    updateStage(2, "in_progress");
    await new Promise((r) => setTimeout(r, 600));
    updateStage(2, "completed");

    // Compute deterministic match scores
    const reqsToMatch = {
      id: `job-req-${Date.now()}`,
      title: jobTitle,
      rawDescription: jobDescription,
      minimumExperienceYears: minExperience,
      requiredSkills: extractedRequirements?.requiredSkills.map((r) => ({
        id: r.id,
        name: r.name,
        type: "required_skill" as const,
      })) || [],
      preferredSkills: extractedRequirements?.preferredSkills.map((r) => ({
        id: r.id,
        name: r.name,
        type: "preferred_skill" as const,
      })) || [],
      responsibilities: extractedRequirements?.responsibilities || [],
    };

    const calculatedCandidates: CandidateScoreResult[] = DEMO_RESUME_POOL.map((c, i) => {
      const extraction = {
        id: `cand-${i + 1}`,
        name: c.name,
        totalExperienceYears: c.years,
        skills: c.skills.map((s) => ({ name: s, level: "Strong" as const })),
        experience: [
          {
            company: "Tech Org",
            title: "Software Engineer",
            startDate: "2023-01",
            years: c.years,
            description: c.text,
            technologies: c.skills,
          },
        ],
        education: [{ institution: "University", degree: "BE", field: "Computer Science" }],
        rawResumeText: c.text,
      };

      return calculateFinalMatchScore(extraction, reqsToMatch, DEFAULT_SCORING_WEIGHTS);
    }).sort((a, b) => b.totalScore - a.totalScore);

    updateStage(3, "in_progress");
    await new Promise((r) => setTimeout(r, 500));
    updateStage(3, "completed");

    const newJobId = `screening-${Date.now().toString(36)}`;
    const newScreening: JobScreening = {
      id: newJobId,
      title: jobTitle,
      department,
      location,
      createdAt: new Date().toISOString(),
      status: "ready",
      candidateCount: calculatedCandidates.length,
      reviewedCount: 0,
      shortlistedCount: 0,
      requirements: reqsToMatch,
      candidates: calculatedCandidates,
    };

    addScreening(newScreening);

    setTimeout(() => {
      router.push(`/recruitment/${newJobId}`);
    }, 700);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Workflow Step Breadcrumb */}
      <div className="flex items-center justify-between border-b border-nirman-border pb-4 text-xs">
        <div className="flex items-center gap-4">
          <span className={`font-medium ${step === 1 ? "text-nirman-accent font-semibold" : "text-nirman-dark"}`}>
            1. Job Details
          </span>
          <span className="text-nirman-border">/</span>
          <span className={`font-medium ${step === 2 ? "text-nirman-accent font-semibold" : step > 2 ? "text-nirman-dark" : "text-nirman-text-muted"}`}>
            2. Structured Review
          </span>
          <span className="text-nirman-border">/</span>
          <span className={`font-medium ${step === 3 ? "text-nirman-accent font-semibold" : step > 3 ? "text-nirman-dark" : "text-nirman-text-muted"}`}>
            3. Upload Resumes
          </span>
          <span className="text-nirman-border">/</span>
          <span className={`font-medium ${step === 4 ? "text-nirman-accent font-semibold" : "text-nirman-text-muted"}`}>
            4. Deterministic Pipeline
          </span>
        </div>
        <span className="font-mono text-nirman-text-muted">Step {step} of 4</span>
      </div>

      {/* STEP 1: JOB DESCRIPTION INPUT */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Define Job & Trigger Structured Extraction</CardTitle>
              <p className="text-xs text-nirman-text-secondary mt-0.5">
                AI parses unstructured job requirements into a typed schema. Scoring runs deterministically downstream.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Job Title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Python Backend Developer"
                />
              </div>
              <div>
                <Input
                  label="Minimum Experience (Years)"
                  type="number"
                  value={minExperience}
                  onChange={(e) => setMinExperience(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-nirman-text-primary">
                  Job Description Text
                </label>
                <button
                  type="button"
                  onClick={() => setJobDescription(SAMPLE_JOB_TEXT)}
                  className="text-[11px] text-nirman-accent hover:underline"
                >
                  Insert Sample Description
                </button>
              </div>
              <Textarea
                rows={7}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste full job description with requirements, technologies, and experience expectations..."
              />
            </div>

            {isExtracting && (
              <div className="p-4 rounded-md border border-nirman-border bg-[#FAFAF8] space-y-3">
                <WorkflowStatus stages={workflowStages} title="Extraction Pipeline Progress" />
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-nirman-border">
              <Button
                variant="primary"
                onClick={handleAnalyzeJob}
                disabled={isExtracting || !jobTitle || !jobDescription}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Extracting Requirements...
                  </>
                ) : (
                  <>
                    <span>Analyze Requirements</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: STRUCTURED REQUIREMENTS REVIEW SCREEN */}
      {step === 2 && extractedRequirements && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>{extractedRequirements.title}</CardTitle>
                <Badge variant="accent" size="sm">
                  AI extracted · Review before continuing
                </Badge>
              </div>
              <p className="text-xs text-nirman-text-secondary mt-0.5">
                Verify and edit mandatory vs preferred requirements before proceeding to screening.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Re-enter Job
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Required Skills Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-nirman-dark uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-nirman-success" />
                  REQUIRED (Mandatory Core Skills)
                </span>
                <span className="text-nirman-text-muted font-mono text-[11px]">
                  {extractedRequirements.requiredSkills.length} items
                </span>
              </div>
              <div className="divide-y divide-nirman-border border border-nirman-border rounded-md bg-white">
                {extractedRequirements.requiredSkills.map((req) => (
                  <div key={req.id} className="p-3 flex items-center justify-between text-xs hover:bg-nirman-bg/40">
                    <div className="flex items-center gap-2.5">
                      <span className="text-nirman-success font-bold">✓</span>
                      <div>
                        <span className="font-semibold text-nirman-dark">{req.name}</span>
                        {req.extractedEvidence && (
                          <span className="block text-[10px] text-nirman-text-muted">
                            Evidence: "{req.extractedEvidence}"
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleImportance(req, true)}
                        className="text-[11px] text-nirman-text-secondary hover:text-nirman-dark px-2 py-0.5 rounded border border-nirman-border"
                      >
                        Make Preferred
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(req.id, true)}
                        className="text-nirman-danger hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferred Skills Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-nirman-dark uppercase tracking-wider flex items-center gap-1.5">
                  <Circle className="h-3.5 w-3.5 text-nirman-accent" />
                  PREFERRED (Nice-to-Have Capabilities)
                </span>
                <span className="text-nirman-text-muted font-mono text-[11px]">
                  {extractedRequirements.preferredSkills.length} items
                </span>
              </div>
              <div className="divide-y divide-nirman-border border border-nirman-border rounded-md bg-white">
                {extractedRequirements.preferredSkills.map((req) => (
                  <div key={req.id} className="p-3 flex items-center justify-between text-xs hover:bg-nirman-bg/40">
                    <div className="flex items-center gap-2.5">
                      <span className="text-nirman-accent font-bold">○</span>
                      <div>
                        <span className="font-medium text-nirman-dark">{req.name}</span>
                        {req.extractedEvidence && (
                          <span className="block text-[10px] text-nirman-text-muted">
                            Evidence: "{req.extractedEvidence}"
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleImportance(req, false)}
                        className="text-[11px] text-nirman-text-secondary hover:text-nirman-dark px-2 py-0.5 rounded border border-nirman-border"
                      >
                        Make Required
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(req.id, false)}
                        className="text-nirman-danger hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Experience & Add Custom Skill */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3 rounded border border-nirman-border bg-[#FAFAF8] text-xs">
                <span className="font-semibold text-nirman-dark block mb-1">
                  Experience Requirement
                </span>
                <p className="text-nirman-text-secondary">
                  <strong>{extractedRequirements.minimumExperienceYears}+ years</strong> relevant industry experience
                </p>
              </div>

              <div className="p-3 rounded border border-nirman-border bg-[#FAFAF8] text-xs">
                <span className="font-semibold text-nirman-dark block mb-1">
                  Add Custom Requirement
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <input
                    type="text"
                    placeholder="e.g. GraphQL, Kafka..."
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    className="flex-1 h-7 text-xs px-2 rounded border border-nirman-border bg-white"
                  />
                  <Button size="sm" variant="secondary" onClick={handleAddCustomSkill}>
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Advance Button */}
            <div className="flex items-center justify-between pt-4 border-t border-nirman-border">
              <span className="text-xs text-nirman-text-secondary">
                {extractedRequirements.requiredSkills.length} required · {extractedRequirements.preferredSkills.length} preferred
              </span>
              <Button variant="primary" onClick={() => setStep(3)}>
                <span>Confirm & Proceed to Resumes</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: UPLOAD RESUMES */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upload Candidate Resumes for Screening</CardTitle>
              <p className="text-xs text-nirman-text-secondary mt-0.5">
                Target Role: <strong className="text-nirman-dark">{jobTitle}</strong> ({minExperience}+ years)
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Edit Requirements
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="border-2 border-dashed border-nirman-border rounded-lg p-8 text-center hover:border-nirman-accent/60 transition-colors bg-white">
              <UploadCloud className="h-8 w-8 mx-auto text-nirman-text-muted mb-2" />
              <h4 className="text-xs font-semibold text-nirman-dark">
                Drag & drop candidate resumes (PDF, DOCX, TXT)
              </h4>
              <p className="text-[11px] text-nirman-text-secondary mt-1">
                Supports batch uploading of 10 to 200+ resumes simultaneously.
              </p>

              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  size="sm"
                  variant={useSamplePool ? "primary" : "secondary"}
                  onClick={() => {
                    setUseSamplePool(true);
                    setUploadedFiles(
                      DEMO_RESUME_POOL.map((p) => ({
                        name: `${p.name.replace(/\s+/g, "_")}_Resume.pdf`,
                        size: "48 KB",
                      }))
                    );
                  }}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Load 6 Verified Sample Resumes
                </Button>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-nirman-dark">
                    Staged Resumes ({uploadedFiles.length})
                  </span>
                  <span className="text-nirman-text-muted font-mono text-[11px]">Ready for batch evaluation</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {uploadedFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-[#FAFAF8] rounded border border-nirman-border flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-nirman-text-muted" />
                        <span className="font-medium text-nirman-dark">{f.name}</span>
                      </div>
                      <span className="text-[11px] text-nirman-text-muted font-mono">{f.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-nirman-border">
              <span className="text-xs text-nirman-text-secondary">
                {uploadedFiles.length} candidate documents ready
              </span>
              <Button
                variant="primary"
                onClick={handleRunScreening}
                disabled={uploadedFiles.length === 0}
              >
                <span>Run Screening Pipeline</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: DETERMINISTIC SCREENING PIPELINE */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Processing Screening Pipeline</CardTitle>
              <p className="text-xs text-nirman-text-secondary mt-0.5">
                Executing deterministic matching and score derivation across all candidates.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            <WorkflowStatus stages={screeningStages} title="Screening Execution Progress" />
            <p className="text-[11px] text-center text-nirman-text-secondary">
              Redirecting to explainable shortlist table upon pipeline completion...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
