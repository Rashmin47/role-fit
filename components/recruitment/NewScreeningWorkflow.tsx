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
  DEMO_JOB_DESCRIPTION,
  DEMO_RESUME_POOL,
  type DemoResume,
} from "@/lib/data/demo-resumes";
import {
  getAIProvider,
  StructuredJobRequirements,
  ExtractedRequirement,
} from "@/lib/ai/provider";
import {
  screenCandidateText,
  structuredJobToRequirements,
} from "@/lib/screening/screen-candidate";
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

const STEPS = [
  { id: 1, label: "Job details" },
  { id: 2, label: "Review requirements" },
  { id: 3, label: "Add resumes" },
  { id: 4, label: "Run screening" },
] as const;

const MAX_FILES = 20;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE = /\.(pdf|docx|txt|md)$/i;

interface StagedSource {
  id: string;
  name: string;
  sizeLabel: string;
  file?: File;
  sample?: DemoResume;
}

interface IngestResponse {
  documents: Array<{
    name: string;
    size: number;
    text: string;
    pages?: number;
    truncated: boolean;
  }>;
  failed: Array<{ name: string; size: number; error: string }>;
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createScreeningStages(): WorkflowStageItem[] {
  return [
    {
      id: "reading_documents",
      label: "Reading candidate documents",
      status: "pending",
    },
    {
      id: "extracting_profiles",
      label: "Extracting and validating structured profiles",
      status: "pending",
    },
    {
      id: "matching_scoring",
      label: "Matching requirements and calculating scores",
      status: "pending",
    },
    {
      id: "building_queue",
      label: "Building the explainable review queue",
      status: "pending",
    },
  ];
}

export function NewScreeningWorkflow() {
  const router = useRouter();
  const { addScreening } = useScreeningStore();

  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [jobTitle, setJobTitle] = React.useState("Python Backend Developer");
  const [department, setDepartment] = React.useState("Core Engineering");
  const [location, setLocation] = React.useState("Kathmandu / Remote");
  const [jobDescription, setJobDescription] =
    React.useState(DEMO_JOB_DESCRIPTION);
  const [minExperience, setMinExperience] = React.useState(3);

  const [extractedRequirements, setExtractedRequirements] =
    React.useState<StructuredJobRequirements | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractionError, setExtractionError] = React.useState<string | null>(
    null
  );
  const [newSkillInput, setNewSkillInput] = React.useState("");

  const [stagedSources, setStagedSources] = React.useState<StagedSource[]>([]);
  const [ingestErrors, setIngestErrors] = React.useState<
    Array<{ name: string; error: string }>
  >([]);
  const [runError, setRunError] = React.useState<string | null>(null);
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

  const [screeningStages, setScreeningStages] = React.useState<WorkflowStageItem[]>(
    createScreeningStages
  );

  const handleAnalyzeJob = async () => {
    setIsExtracting(true);
    setExtractionError(null);

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

    try {
      await new Promise((r) => setTimeout(r, 400));

      const provider = getAIProvider();
      const structured = await provider.extractJobRequirements(
        jobTitle,
        jobDescription
      );
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
      setStep(2);
    } catch {
      setWorkflowStages((previous) =>
        previous.map((stage) =>
          stage.status === "in_progress"
            ? { ...stage, status: "error" }
            : stage
        )
      );
      setExtractionError(
        "The local extractor could not read this description. Try again, or write a more specific job description."
      );
    } finally {
      setIsExtracting(false);
    }
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

    const errors: Array<{ name: string; error: string }> = [];
    const accepted: File[] = [];

    for (const file of Array.from(fileList)) {
      if (!ALLOWED_FILE.test(file.name)) {
        errors.push({
          name: file.name,
          error: "Unsupported type. Use PDF, DOCX, TXT, or MD.",
        });
        continue;
      }
      if (file.size === 0) {
        errors.push({ name: file.name, error: "The file is empty." });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        errors.push({
          name: file.name,
          error: "Files must be 10 MB or smaller.",
        });
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) {
      setIngestErrors(errors);
      return;
    }

    // Uploading real documents replaces the sample set so the run has one
    // unambiguous source. Existing uploaded files are kept and appended.
    const existing = stagedSources.filter((source) => !source.sample);
    const remainingSlots = Math.max(0, MAX_FILES - existing.length);

    if (accepted.length > remainingSlots) {
      errors.push({
        name: "Upload limit",
        error: `You can screen up to ${MAX_FILES} documents at once.`,
      });
    }

    const nextSources: StagedSource[] = accepted
      .slice(0, remainingSlots)
      .map((file, index) => ({
        id: `file-${Date.now()}-${index}`,
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        file,
      }));

    setStagedSources([...existing, ...nextSources]);
    setIngestErrors(errors);
    setRunError(null);
  };

  const loadSamplePool = () => {
    setStagedSources(
      DEMO_RESUME_POOL.map((sample, index) => ({
        id: `sample-${index}`,
        name: `${sample.name.replace(/\s+/g, "_")}_Resume.pdf`,
        sizeLabel: "Sample",
        sample,
      }))
    );
    setIngestErrors([]);
    setRunError(null);
  };

  const handleRemoveSource = (id: string) => {
    setStagedSources((previous) =>
      previous.filter((source) => source.id !== id)
    );
  };

  const handleRunScreening = async () => {
    if (!extractedRequirements) {
      setRunError("Extract the job requirements before screening.");
      setStep(4);
      return;
    }

    if (extractedRequirements.requiredSkills.length === 0) {
      setRunError("Add at least one required skill before screening.");
      setStep(4);
      return;
    }

    if (stagedSources.length === 0) return;

    setRunError(null);
    setIngestErrors([]);
    setStep(4);
    setScreeningStages(createScreeningStages());

    const updateStage = (
      stageId: string,
      status: WorkflowStageItem["status"]
    ) => {
      setScreeningStages((previous) =>
        previous.map((stage) =>
          stage.id === stageId ? { ...stage, status } : stage
        )
      );
    };

    const newJobId = `screening-${Date.now().toString(36)}`;
    const requirements = structuredJobToRequirements(extractedRequirements, {
      id: `job-req-${newJobId}`,
      title: jobTitle,
      department,
      location,
      rawDescription: jobDescription,
    });

    let currentStage = "reading_documents";

    try {
      // 1. Resolve candidate text. Sample entries are already text; uploaded
      // files are parsed server-side so the browser never has to read PDFs.
      updateStage("reading_documents", "in_progress");

      const sources: Array<{ name: string; text: string }> = stagedSources
        .filter((source) => source.sample)
        .map((source) => ({
          name: source.sample!.name,
          text: source.sample!.text,
        }));

      const fileSources = stagedSources.filter((source) => source.file);
      const parseFailures: Array<{ name: string; error: string }> = [];
      const truncatedDocuments: string[] = [];

      if (fileSources.length > 0) {
        const formData = new FormData();
        for (const source of fileSources) {
          if (source.file) {
            formData.append("files", source.file, source.file.name);
          }
        }

        const response = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as IngestResponse;

        if (!response.ok) {
          throw new Error(
            payload.error || "The uploaded documents could not be read."
          );
        }

        for (const document of payload.documents) {
          sources.push({ name: document.name, text: document.text });
          if (document.truncated) truncatedDocuments.push(document.name);
        }
        parseFailures.push(...payload.failed);
        if (parseFailures.length > 0) setIngestErrors(parseFailures);
      }

      if (sources.length === 0) {
        throw new Error(
          parseFailures.length > 0
            ? "None of the staged documents could be read. Review the errors below."
            : "No candidate text was available to screen."
        );
      }

      updateStage("reading_documents", "completed");

      // 2. Each candidate is extracted, validated, matched, and scored
      // independently. One malformed resume cannot abort the run.
      currentStage = "extracting_profiles";
      updateStage("extracting_profiles", "in_progress");

      const candidates: CandidateScoreResult[] = [];
      const candidateFailures: Array<{ name: string; error: string }> = [];

      for (let index = 0; index < sources.length; index++) {
        const source = sources[index];
        try {
          const candidate = await screenCandidateText({
            candidateId: `cand-${newJobId}-${index + 1}`,
            name: source.name.replace(/\.(pdf|docx|txt|md)$/i, ""),
            text: source.text,
            requirements,
          });
          candidates.push(candidate);
        } catch (error) {
          candidateFailures.push({
            name: source.name,
            error:
              error instanceof Error
                ? error.message
                : "Candidate extraction failed.",
          });
        }
      }

      if (candidates.length === 0) {
        throw new Error(
          "No candidates could be extracted from the staged documents."
        );
      }

      updateStage("extracting_profiles", "completed");

      // 3. Matching and scoring happened inside the deterministic engine for
      // each candidate. This stage records that the work is complete.
      currentStage = "matching_scoring";
      updateStage("matching_scoring", "in_progress");
      updateStage("matching_scoring", "completed");

      if (candidateFailures.length > 0) {
        setIngestErrors((previous) => [
          ...previous,
          ...candidateFailures.map((failure) => ({
            name: failure.name,
            error: `Could not score: ${failure.error}`,
          })),
        ]);
      }

      // 4. Sort and hand the queue to human review.
      currentStage = "building_queue";
      updateStage("building_queue", "in_progress");
      candidates.sort((a, b) => b.totalScore - a.totalScore);

      const processingNotes: string[] = [];
      if (parseFailures.length > 0) {
        processingNotes.push(
          `${parseFailures.length} document(s) could not be read: ${parseFailures
            .map((failure) => failure.name)
            .join(", ")}.`
        );
      }
      if (truncatedDocuments.length > 0) {
        processingNotes.push(
          `${truncatedDocuments.length} document(s) exceeded the text limit and were truncated: ${truncatedDocuments
            .join(", ")}.`
        );
      }
      if (candidateFailures.length > 0) {
        processingNotes.push(
          `${candidateFailures.length} candidate(s) could not be scored: ${candidateFailures
            .map((failure) => failure.name)
            .join(", ")}.`
        );
      }

      const newScreening: JobScreening = {
        id: newJobId,
        title: jobTitle,
        department,
        location,
        createdAt: new Date().toISOString(),
        status: "ready",
        candidateCount: candidates.length,
        reviewedCount: 0,
        shortlistedCount: 0,
        requirements,
        candidates,
        isSample: stagedSources.some((source) => source.sample) || undefined,
        processingNotes:
          processingNotes.length > 0 ? processingNotes : undefined,
      };

      addScreening(newScreening);
      updateStage("building_queue", "completed");
      await new Promise((resolve) => setTimeout(resolve, 250));
      router.push(`/recruitment/${newJobId}`);
    } catch (error) {
      setRunError(
        error instanceof Error
          ? error.message
          : "The screening run could not be completed."
      );
      setScreeningStages((previous) =>
        previous.map((stage) =>
          stage.id === currentStage ? { ...stage, status: "error" } : stage
        )
      );
    }
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
                onClick={() => setJobDescription(DEMO_JOB_DESCRIPTION)}
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

            {extractionError && (
              <Callout tone="danger">{extractionError}</Callout>
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
            {extractedRequirements.requiredSkills.length === 0 &&
              extractedRequirements.preferredSkills.length === 0 && (
                <Callout tone="warning" title="No requirements recognized">
                  The local extractor only reports what it can recognize. Add at
                  least one required skill below before screening.
                </Callout>
              )}

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
                Screening against{" "}
                <strong className="font-medium text-nirman-dark">{jobTitle}</strong> ·{" "}
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
                PDF, DOCX, TXT, or MD · up to {MAX_FILES} files · 10 MB each
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
                accept=".pdf,.docx,.txt,.md"
                aria-label="Choose resume files"
                className="sr-only"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </div>

            {ingestErrors.length > 0 && (
              <Callout tone="warning" title="Some documents were not accepted">
                <ul className="space-y-1">
                  {ingestErrors.map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      <span className="font-medium">{item.name}:</span>{" "}
                      {item.error}
                    </li>
                  ))}
                </ul>
              </Callout>
            )}

            {stagedSources.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-medium text-nirman-dark">
                    {stagedSources.length} document
                    {stagedSources.length === 1 ? "" : "s"} staged
                  </span>
                  <span className="text-xs text-nirman-text-muted">
                    {stagedSources.some((source) => source.sample)
                      ? "Sample candidate set · fictional demo data"
                      : "Parsed on the server at run time"}
                  </span>
                </div>
                <ul className="max-h-52 divide-y divide-nirman-border overflow-y-auto rounded-md border border-nirman-border">
                  {stagedSources.map((source) => (
                    <li
                      key={source.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText
                          className="h-3.5 w-3.5 shrink-0 text-nirman-text-muted"
                          aria-hidden
                        />
                        <span className="truncate text-nirman-dark">
                          {source.name}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs tabular-nums text-nirman-text-muted">
                          {source.sizeLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSource(source.id)}
                          aria-label={`Remove ${source.name}`}
                          className="rounded-sm p-1 text-nirman-text-muted transition-colors hover:bg-nirman-danger-bg hover:text-nirman-danger-text"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Callout tone="neutral" icon={Info}>
              Documents are parsed on the server. The configured local provider then
              extracts structured evidence, and deterministic code matches and scores
              each candidate. Files are not stored after the run.
            </Callout>

            <div className="flex items-center justify-between border-t border-nirman-border pt-4">
              <span className="text-xs text-nirman-text-muted">
                {stagedSources.length} staged ·{" "}
                {stagedSources.filter((source) => source.file).length} to parse
              </span>
              <Button
                variant="primary"
                onClick={handleRunScreening}
                disabled={
                  stagedSources.length === 0 ||
                  (extractedRequirements?.requiredSkills.length ?? 0) === 0
                }
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
              <CardTitle>
                {runError ? "Screening stopped" : "Running screening"}
              </CardTitle>
              <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
                {runError
                  ? "No results were saved. Fix the issue and run again."
                  : "Reading documents, extracting evidence, then matching and scoring deterministically."}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            <WorkflowStatus stages={screeningStages} title="Pipeline" />

            {ingestErrors.length > 0 && (
              <Callout tone="warning" title="Some documents were skipped">
                <ul className="space-y-1">
                  {ingestErrors.map((item, index) => (
                    <li key={`${item.name}-${index}`}>
                      <span className="font-medium">{item.name}:</span>{" "}
                      {item.error}
                    </li>
                  ))}
                </ul>
              </Callout>
            )}

            {runError ? (
              <div className="space-y-4">
                <Callout tone="danger" title="The screening run could not complete">
                  {runError}
                </Callout>
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setRunError(null);
                      setStep(3);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to documents
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-nirman-text-muted">
                Redirecting to the shortlist when complete…
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
