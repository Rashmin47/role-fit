"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { WorkflowStatus, WorkflowStageItem } from "@/components/ui/WorkflowStatus";
import { useScreeningStore } from "@/lib/store/screening-store";
import {
  getAIProvider,
  StructuredJobRequirements,
  ExtractedRequirement,
} from "@/lib/ai/provider";
import { calculateFinalMatchScore, DEFAULT_SCORING_WEIGHTS } from "@/lib/scoring";
import { JobScreening, CandidateScoreResult } from "@/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  FileText,
  Info,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
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

const STEPS = [
  { id: 1, label: "Job Details" },
  { id: 2, label: "Structured Review" },
  { id: 3, label: "Upload Resumes" },
  { id: 4, label: "Deterministic Pipeline" },
] as const;

export function NewScreeningWorkflow() {
  const router = useRouter();
  const { addScreening } = useScreeningStore();

  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [jobTitle, setJobTitle] = React.useState("Python Backend Developer");
  const [department, setDepartment] = React.useState("Core Engineering");
  const [location, setLocation] = React.useState("Kathmandu / Remote");
  const [jobDescription, setJobDescription] = React.useState(SAMPLE_JOB_TEXT);
  const [minExperience, setMinExperience] = React.useState(3);

  const [extractedRequirements, setExtractedRequirements] =
    React.useState<StructuredJobRequirements | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [newSkillInput, setNewSkillInput] = React.useState("");

  const [uploadedFiles, setUploadedFiles] = React.useState<
    Array<{ name: string; size: string }>
  >([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [workflowStages, setWorkflowStages] = React.useState<WorkflowStageItem[]>([
    { id: "job_received", label: "Job description received", status: "completed" },
    { id: "extracting", label: "Extracting structured requirements", status: "pending" },
    {
      id: "normalizing",
      label: "Normalizing skills and experience taxonomy",
      status: "pending",
    },
    {
      id: "retrieving",
      label: "Grounding against market requirements",
      status: "pending",
    },
  ]);

  const [screeningStages, setScreeningStages] = React.useState<WorkflowStageItem[]>([
    {
      id: "processing_resumes",
      label: "Processing candidate resumes independently",
      status: "pending",
    },
    {
      id: "matching_candidates",
      label: "Matching candidates against requirements",
      status: "pending",
    },
    {
      id: "calculating_scores",
      label: "Calculating deterministic scores",
      status: "pending",
    },
    {
      id: "building_queue",
      label: "Building explainable review queue",
      status: "pending",
    },
  ]);

  const handleAnalyzeJob = async () => {
    setIsExtracting(true);

    setWorkflowStages([
      { id: "job_received", label: "Job description received", status: "completed" },
      {
        id: "extracting",
        label: "Extracting structured requirements",
        status: "in_progress",
      },
      {
        id: "normalizing",
        label: "Normalizing skills and experience taxonomy",
        status: "pending",
      },
      {
        id: "retrieving",
        label: "Grounding against market requirements",
        status: "pending",
      },
    ]);

    await new Promise((r) => setTimeout(r, 400));

    const provider = getAIProvider();
    const structured = await provider.extractJobRequirements(jobTitle, jobDescription);
    structured.minimumExperienceYears = minExperience;

    setWorkflowStages([
      { id: "job_received", label: "Job description received", status: "completed" },
      {
        id: "extracting",
        label: "Extracting structured requirements",
        status: "completed",
      },
      {
        id: "normalizing",
        label: "Normalizing skills and experience taxonomy",
        status: "completed",
      },
      {
        id: "retrieving",
        label: "Grounding against market requirements",
        status: "completed",
      },
    ]);

    setExtractedRequirements(structured);
    setIsExtracting(false);
    setStep(2);
  };

  const handleRemoveRequirement = (id: string, isRequired: boolean) => {
    if (!extractedRequirements) return;
    if (isRequired) {
      setExtractedRequirements({
        ...extractedRequirements,
        requiredSkills: extractedRequirements.requiredSkills.filter(
          (r) => r.id !== id
        ),
      });
    } else {
      setExtractedRequirements({
        ...extractedRequirements,
        preferredSkills: extractedRequirements.preferredSkills.filter(
          (r) => r.id !== id
        ),
      });
    }
  };

  const handleToggleImportance = (
    req: ExtractedRequirement,
    fromRequired: boolean
  ) => {
    if (!extractedRequirements) return;
    if (fromRequired) {
      setExtractedRequirements({
        ...extractedRequirements,
        requiredSkills: extractedRequirements.requiredSkills.filter(
          (r) => r.id !== req.id
        ),
        preferredSkills: [
          ...extractedRequirements.preferredSkills,
          { ...req, importance: "preferred" },
        ],
      });
    } else {
      setExtractedRequirements({
        ...extractedRequirements,
        preferredSkills: extractedRequirements.preferredSkills.filter(
          (r) => r.id !== req.id
        ),
        requiredSkills: [
          ...extractedRequirements.requiredSkills,
          { ...req, importance: "required" },
        ],
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

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const staged = Array.from(fileList).map((f) => ({
      name: f.name,
      size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
    }));
    setUploadedFiles(staged);
  };

  const loadSamplePool = () => {
    setUploadedFiles(
      DEMO_RESUME_POOL.map((p) => ({
        name: `${p.name.replace(/\s+/g, "_")}_Resume.pdf`,
        size: "48 KB",
      }))
    );
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

    const reqsToMatch = {
      id: `job-req-${Date.now()}`,
      title: jobTitle,
      rawDescription: jobDescription,
      minimumExperienceYears: minExperience,
      requiredSkills:
        extractedRequirements?.requiredSkills.map((r) => ({
          id: r.id,
          name: r.name,
          type: "required_skill" as const,
        })) || [],
      preferredSkills:
        extractedRequirements?.preferredSkills.map((r) => ({
          id: r.id,
          name: r.name,
          type: "preferred_skill" as const,
        })) || [],
      responsibilities: extractedRequirements?.responsibilities || [],
    };

    const calculatedCandidates: CandidateScoreResult[] = DEMO_RESUME_POOL.map(
      (c, i) => {
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
          education: [
            { institution: "University", degree: "BE", field: "Computer Science" },
          ],
          rawResumeText: c.text,
        };

        return calculateFinalMatchScore(
          extraction,
          reqsToMatch,
          DEFAULT_SCORING_WEIGHTS
        );
      }
    ).sort((a, b) => b.totalScore - a.totalScore);

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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Stepper */}
      <nav aria-label="Screening steps" className="border-b border-nirman-border pb-4">
        <ol className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {STEPS.map((s, index) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <li className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border text-2xs font-semibold transition-colors",
                      isDone &&
                        "border-nirman-success bg-nirman-success text-white",
                      isActive &&
                        "border-nirman-accent bg-nirman-accent-light text-nirman-accent",
                      !isActive && !isDone && "border-nirman-border bg-white text-nirman-text-muted"
                    )}
                    aria-hidden
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : s.id}
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-xs font-medium",
                      isActive
                        ? "text-nirman-dark"
                        : isDone
                        ? "text-nirman-text-secondary"
                        : "text-nirman-text-muted"
                    )}
                  >
                    {s.label}
                  </span>
                </li>
                {index < STEPS.length - 1 && (
                  <span
                    className={cn(
                      "h-px min-w-4 flex-1",
                      step > s.id ? "bg-nirman-success/40" : "bg-nirman-border"
                    )}
                    aria-hidden
                  />
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </nav>

      {/* STEP 1 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Define Job &amp; Extract Requirements</CardTitle>
              <p className="mt-0.5 text-xs text-nirman-text-secondary">
                AI parses the unstructured job description into a typed schema.
                Scoring runs deterministically downstream.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Input
                  label="Job Title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Python Backend Developer"
                />
              </div>
              <Input
                label="Min. Experience (years)"
                type="number"
                min={0}
                value={minExperience}
                onChange={(e) => setMinExperience(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <Textarea
              label="Job Description"
              rows={7}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description with requirements, technologies, and experience expectations…"
              helperText="Use the sample description to see the extraction pipeline end to end."
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setJobDescription(SAMPLE_JOB_TEXT)}
                className="text-2xs font-medium text-nirman-accent hover:text-nirman-accent-hover"
              >
                Insert sample description
              </button>
            </div>

            {isExtracting && (
              <div className="animate-fade-in rounded-lg border border-nirman-border bg-[#FAFAF8] p-4">
                <WorkflowStatus
                  stages={workflowStages}
                  title="Extraction pipeline"
                />
              </div>
            )}

            <div className="flex items-center justify-end border-t border-nirman-border pt-4">
              <Button
                variant="primary"
                onClick={handleAnalyzeJob}
                disabled={isExtracting || !jobTitle || !jobDescription}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting…
                  </>
                ) : (
                  <>
                    Analyze Requirements
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 */}
      {step === 2 && extractedRequirements && (
        <Card>
          <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{extractedRequirements.title}</CardTitle>
                <Badge variant="accent" size="sm">
                  AI extracted · review
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-nirman-text-secondary">
                Verify and edit mandatory vs preferred requirements before
                screening.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-3.5 w-3.5" /> Re-enter Job
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              {
                title: "Required",
                hint: "Mandatory core skills",
                items: extractedRequirements.requiredSkills,
                isRequired: true,
                tone: "success" as const,
              },
              {
                title: "Preferred",
                hint: "Nice-to-have capabilities",
                items: extractedRequirements.preferredSkills,
                isRequired: false,
                tone: "accent" as const,
              },
            ].map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-nirman-text-secondary">
                    {group.isRequired ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-nirman-success" aria-hidden />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-nirman-accent" aria-hidden />
                    )}
                    {group.title} · {group.hint}
                  </span>
                  <span className="font-mono text-2xs text-nirman-text-muted">
                    {group.items.length}
                  </span>
                </div>

                <ul className="divide-y divide-nirman-border overflow-hidden rounded-lg border border-nirman-border bg-white">
                  {group.items.length === 0 && (
                    <li className="px-3 py-4 text-center text-2xs text-nirman-text-muted">
                      No {group.title.toLowerCase()} requirements.
                    </li>
                  )}
                  {group.items.map((req) => (
                    <li
                      key={req.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-nirman-bg/40"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-nirman-dark">
                          {req.name}
                        </span>
                        {req.extractedEvidence && (
                          <span className="mt-0.5 block truncate text-2xs text-nirman-text-muted">
                            Evidence: “{req.extractedEvidence}”
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-2xs"
                          onClick={() => handleToggleImportance(req, group.isRequired)}
                        >
                          Make {group.isRequired ? "Preferred" : "Required"}
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-nirman-danger hover:bg-nirman-danger-bg"
                          onClick={() => handleRemoveRequirement(req.id, group.isRequired)}
                          aria-label={`Remove ${req.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-nirman-border bg-[#FAFAF8] p-3.5">
                <span className="mb-1 block text-2xs font-semibold uppercase tracking-wide text-nirman-text-muted">
                  Experience requirement
                </span>
                <p className="text-xs text-nirman-text-secondary">
                  <strong className="text-nirman-dark">
                    {extractedRequirements.minimumExperienceYears}+ years
                  </strong>{" "}
                  relevant industry experience
                </p>
              </div>

              <div className="rounded-lg border border-nirman-border bg-[#FAFAF8] p-3.5">
                <span className="mb-1.5 block text-2xs font-semibold uppercase tracking-wide text-nirman-text-muted">
                  Add custom requirement
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. GraphQL, Kafka…"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomSkill();
                      }
                    }}
                    aria-label="Add custom requirement"
                    className="h-8 flex-1 rounded-md border border-nirman-border bg-white px-2 text-xs text-nirman-dark placeholder:text-nirman-text-muted focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/25"
                  />
                  <Button size="sm" variant="secondary" onClick={handleAddCustomSkill}>
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-nirman-border pt-4">
              <span className="text-2xs text-nirman-text-secondary">
                {extractedRequirements.requiredSkills.length} required ·{" "}
                {extractedRequirements.preferredSkills.length} preferred
              </span>
              <Button variant="primary" onClick={() => setStep(3)}>
                Confirm &amp; Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <Card>
          <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Upload Candidate Resumes</CardTitle>
              <p className="mt-0.5 text-xs text-nirman-text-secondary">
                Target role:{" "}
                <strong className="text-nirman-dark">{jobTitle}</strong> (
                {minExperience}+ years)
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-3.5 w-3.5" /> Edit Requirements
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              className="flex flex-col items-center rounded-xl border-2 border-dashed border-nirman-border bg-white p-8 text-center transition-colors hover:border-nirman-accent/60"
            >
              <UploadCloud
                className="mb-2 h-8 w-8 text-nirman-text-muted"
                aria-hidden
              />
              <span className="text-xs font-semibold text-nirman-dark">
                Drag &amp; drop resumes here
              </span>
              <span className="mt-1 text-2xs text-nirman-text-secondary">
                PDF, DOCX, or TXT · supports 10–200+ files
              </span>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Browse files
                </Button>
                <Button size="sm" variant="secondary" onClick={loadSamplePool}>
                  <FileText className="h-3.5 w-3.5" />
                  Load 6 sample resumes
                </Button>
              </div>

              <input
                ref={fileInputRef}
                id="resume-upload"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                className="sr-only"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-nirman-dark">
                    Staged resumes ({uploadedFiles.length})
                  </span>
                  <span className="font-mono text-2xs text-nirman-text-muted">
                    Ready for batch evaluation
                  </span>
                </div>
                <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {uploadedFiles.map((f, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-md border border-nirman-border bg-[#FAFAF8] px-3 py-2 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText
                          className="h-3.5 w-3.5 shrink-0 text-nirman-text-muted"
                          aria-hidden
                        />
                        <span className="truncate font-medium text-nirman-dark">
                          {f.name}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-2xs text-nirman-text-muted">
                        {f.size}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Callout tone="neutral" icon={Info}>
              The demo pipeline evaluates the bundled sample candidate set. Wire an
              extraction provider in Settings to process uploaded files.
            </Callout>

            <div className="flex items-center justify-between border-t border-nirman-border pt-4">
              <span className="text-2xs text-nirman-text-secondary">
                {uploadedFiles.length} candidate documents staged
              </span>
              <Button
                variant="primary"
                onClick={handleRunScreening}
                disabled={uploadedFiles.length === 0}
              >
                Run Screening Pipeline
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Processing Screening Pipeline</CardTitle>
              <p className="mt-0.5 text-xs text-nirman-text-secondary">
                Executing deterministic matching and score derivation across all
                candidates.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            <WorkflowStatus stages={screeningStages} title="Screening execution" />
            <p className="text-center text-2xs text-nirman-text-secondary">
              Redirecting to the explainable shortlist when complete…
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
