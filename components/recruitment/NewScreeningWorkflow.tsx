"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
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
  FileText,
  Info,
  Loader2,
  Plus,
  UploadCloud,
  X,
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
  { id: 1, label: "Job details" },
  { id: 2, label: "Review requirements" },
  { id: 3, label: "Add resumes" },
  { id: 4, label: "Run screening" },
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

  const requirementGroups = extractedRequirements
    ? [
        {
          title: "Required",
          items: extractedRequirements.requiredSkills,
          isRequired: true,
        },
        {
          title: "Preferred",
          items: extractedRequirements.preferredSkills,
          isRequired: false,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <nav aria-label="Screening steps" className="border-b border-nirman-border pb-5">
        <ol className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {STEPS.map((s, index) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <li className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border text-[12px] font-medium",
                      isDone &&
                        "border-nirman-dark bg-nirman-dark text-white",
                      isActive &&
                        "border-nirman-accent text-nirman-accent",
                      !isActive && !isDone && "border-nirman-border text-nirman-text-muted"
                    )}
                    aria-hidden
                  >
                    {isDone ? <Check className="h-3 w-3" /> : s.id}
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-[13px]",
                      isActive
                        ? "font-medium text-nirman-dark"
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
                      step > s.id ? "bg-nirman-text-muted/40" : "bg-nirman-border"
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
              <CardTitle>Job details</CardTitle>
              <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
                The description is parsed into structured requirements. Scoring
                happens separately.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Input
                  label="Job title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Python Backend Developer"
                />
              </div>
              <Input
                label="Minimum experience (years)"
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
              label="Job description"
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description with requirements, technologies, and experience expectations…"
            />

            <div>
              <button
                type="button"
                onClick={() => setJobDescription(SAMPLE_JOB_TEXT)}
                className="rounded-sm text-[13px] font-medium text-nirman-accent hover:text-nirman-accent-hover"
              >
                Use the sample description
              </button>
            </div>

            {isExtracting && (
              <div className="animate-fade-in rounded-lg bg-nirman-inset p-4">
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
                    Extract requirements
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
              <CardTitle>Review requirements</CardTitle>
              <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
                Confirm what is mandatory, what is preferred, and what to remove
                before screening.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </CardHeader>
          <CardContent className="space-y-7">
            {requirementGroups.map((group) => (
              <div key={group.title} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-nirman-dark">
                    {group.title}{" "}
                    <span className="font-normal text-nirman-text-muted">
                      {group.items.length}
                    </span>
                  </h3>
                </div>

                <ul className="divide-y divide-nirman-border rounded-md border border-nirman-border">
                  {group.items.length === 0 && (
                    <li className="px-3 py-4 text-center text-[13px] text-nirman-text-muted">
                      No {group.title.toLowerCase()} requirements.
                    </li>
                  )}
                  {group.items.map((req) => (
                    <li
                      key={req.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <span className="text-[13px] font-medium text-nirman-dark">
                          {req.name}
                        </span>
                        {req.extractedEvidence && (
                          <span className="mt-0.5 block truncate text-xs text-nirman-text-muted">
                            “{req.extractedEvidence}”
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleImportance(req, group.isRequired)}
                          className="rounded-sm px-2 py-1 text-xs text-nirman-text-secondary transition-colors hover:bg-black/[0.04] hover:text-nirman-dark"
                        >
                          Make {group.isRequired ? "preferred" : "required"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(req.id, group.isRequired)}
                          aria-label={`Remove ${req.name}`}
                          className="rounded-sm p-1 text-nirman-text-muted transition-colors hover:bg-nirman-danger-bg hover:text-nirman-danger-text"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="grid grid-cols-1 gap-4 border-t border-nirman-border pt-5 sm:grid-cols-2">
              <div>
                <span className="block text-[13px] font-medium text-nirman-text-primary">
                  Experience requirement
                </span>
                <p className="mt-1 text-[13px] text-nirman-text-secondary">
                  {extractedRequirements.minimumExperienceYears}+ years of relevant
                  experience
                </p>
              </div>

              <div>
                <label
                  htmlFor="custom-skill"
                  className="mb-1.5 block text-[13px] font-medium text-nirman-text-primary"
                >
                  Add a requirement
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="custom-skill"
                    type="text"
                    placeholder="e.g. GraphQL"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomSkill();
                      }
                    }}
                    className="h-9 flex-1 rounded-md border border-nirman-border bg-white px-3 text-[13px] text-nirman-dark placeholder:text-nirman-text-muted focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/20"
                  />
                  <Button size="sm" variant="secondary" onClick={handleAddCustomSkill}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-nirman-border pt-4">
              <span className="text-xs text-nirman-text-muted">
                {extractedRequirements.requiredSkills.length} required ·{" "}
                {extractedRequirements.preferredSkills.length} preferred
              </span>
              <Button variant="primary" onClick={() => setStep(3)}>
                Continue
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
              <CardTitle>Add resumes</CardTitle>
              <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
                Screening against <strong className="font-medium text-nirman-dark">{jobTitle}</strong> ·{" "}
                {minExperience}+ years
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              className="flex flex-col items-center rounded-lg border border-dashed border-nirman-border bg-nirman-inset px-6 py-10 text-center"
            >
              <UploadCloud className="mb-3 h-6 w-6 text-nirman-text-muted" aria-hidden />
              <span className="text-[13px] font-medium text-nirman-dark">
                Drop resumes here
              </span>
              <span className="mt-1 text-xs text-nirman-text-muted">
                PDF, DOCX, or TXT
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
                <Button size="sm" variant="ghost" onClick={loadSamplePool}>
                  Use 6 sample resumes
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
                  <span className="text-[13px] font-medium text-nirman-dark">
                    {uploadedFiles.length} documents staged
                  </span>
                </div>
                <ul className="max-h-44 divide-y divide-nirman-border overflow-y-auto rounded-md border border-nirman-border">
                  {uploadedFiles.map((f, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText
                          className="h-3.5 w-3.5 shrink-0 text-nirman-text-muted"
                          aria-hidden
                        />
                        <span className="truncate text-nirman-dark">{f.name}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-nirman-text-muted">
                        {f.size}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Callout tone="neutral" icon={Info}>
              This demo evaluates a bundled sample candidate set. Uploaded files are
              staged but not parsed yet.
            </Callout>

            <div className="flex items-center justify-between border-t border-nirman-border pt-4">
              <span className="text-xs text-nirman-text-muted">
                {uploadedFiles.length} staged
              </span>
              <Button
                variant="primary"
                onClick={handleRunScreening}
                disabled={uploadedFiles.length === 0}
              >
                Run screening
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
              <CardTitle>Running screening</CardTitle>
              <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
                Matching and scoring every candidate deterministically.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            <WorkflowStatus stages={screeningStages} title="Pipeline" />
            <p className="text-center text-xs text-nirman-text-muted">
              Redirecting to the shortlist when complete…
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
