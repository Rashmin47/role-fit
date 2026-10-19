import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STEPS = [
  {
    title: "Extract",
    body: "Job descriptions and resumes are parsed by a local model into typed, structured facts.",
  },
  {
    title: "Normalize",
    body: "Skills, aliases, and timelines are mapped to one canonical vocabulary.",
  },
  {
    title: "Measure",
    body: "Deterministic weights score required skills, experience, preferences, and evidence.",
  },
  {
    title: "Review",
    body: "Every result cites its source. A recruiter reads the evidence and decides.",
  },
];

const PREVIEW_ROWS = [
  {
    label: "Python & FastAPI",
    evidence: "Built 12 FastAPI services",
    matched: true,
  },
  {
    label: "PostgreSQL",
    evidence: "Transactional schema design",
    matched: true,
  },
  {
    label: "3+ years experience",
    evidence: "2.4 years calculated",
    matched: false,
  },
];

const SCORE_ROWS = [
  { label: "Required", value: "44 / 50" },
  { label: "Experience", value: "15 / 25" },
  { label: "Preferred", value: "13 / 15" },
  { label: "Evidence", value: "4 / 10" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-nirman-bg text-nirman-dark">
      <header className="sticky top-0 z-50 border-b border-nirman-border bg-nirman-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-nirman-dark text-[12px] font-semibold text-white">
              R
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-nirman-dark">
              Role Fit
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-[13px] text-nirman-text-secondary md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-nirman-dark">
              How it works
            </a>
            <a href="#product" className="transition-colors hover:text-nirman-dark">
              Product
            </a>
            <a href="#principles" className="transition-colors hover:text-nirman-dark">
              Principles
            </a>
          </nav>

          <ButtonLink href="/dashboard" size="sm">
            Open platform
            <ArrowRight className="h-3.5 w-3.5" />
          </ButtonLink>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16 lg:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-[13px] font-medium text-nirman-text-muted">
              Career and recruitment intelligence
            </p>
            <h1 className="mt-4 max-w-xl text-[34px] font-semibold leading-[1.12] tracking-tight text-nirman-dark sm:text-[44px]">
              Know what the role requires. Prove what you can do.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-nirman-text-secondary">
              Role Fit turns job descriptions and candidate evidence into structured,
              explainable comparisons. Models extract facts. Deterministic code measures
              fit. People make the decision.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dashboard" size="lg">
                Open the platform
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="#how-it-works" size="lg" variant="secondary">
                See how it works
              </ButtonLink>
            </div>

            <p className="mt-6 text-xs text-nirman-text-muted">
              No hosted LLM. No automatic rejection. Every match is cited.
            </p>
          </div>

          {/* Product preview */}
          <div className="overflow-hidden rounded-xl border border-nirman-border bg-white shadow-popover">
            <div className="flex items-center justify-between gap-4 border-b border-nirman-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-nirman-dark">
                  Python Backend Developer
                </p>
                <p className="mt-0.5 text-xs text-nirman-text-muted">
                  6 candidates · 2 shortlisted
                </p>
              </div>
              <Badge variant="warning">76% · Review</Badge>
            </div>

            <div className="divide-y divide-nirman-border">
              {PREVIEW_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-nirman-dark">
                      {row.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-nirman-text-muted">
                      “{row.evidence}”
                    </p>
                  </div>
                  <span
                    className={
                      row.matched
                        ? "shrink-0 text-xs font-medium text-nirman-success-text"
                        : "shrink-0 text-xs font-medium text-nirman-warning-text"
                    }
                  >
                    {row.matched ? "Met" : "Gap"}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-nirman-border bg-nirman-inset px-4 py-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs text-nirman-text-muted">Score breakdown</span>
                <span className="text-xs text-nirman-text-muted">76 / 100</span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-3">
                {SCORE_ROWS.map((row) => (
                  <div key={row.label}>
                    <span className="block text-[12px] text-nirman-text-muted">
                      {row.label}
                    </span>
                    <span className="mt-0.5 block tabular-nums text-xs font-medium text-nirman-text-primary">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-nirman-border bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-nirman-dark">
              A transparent pipeline
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-nirman-text-secondary">
              Interpretation and evaluation are separate steps, with a validated
              boundary between them.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div key={step.title} className="border-t border-nirman-border pt-4">
                <span className="tabular-nums text-xs text-nirman-text-muted">
                  0{index + 1}
                </span>
                <h3 className="mt-2 text-[14px] font-semibold text-nirman-dark">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-nirman-text-secondary">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two products */}
      <section id="product" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="text-lg font-semibold text-nirman-dark">
              For candidates
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-nirman-text-secondary">
              See the requirements employers actually repeat for your target role,
              how much experience they expect, and which gaps are worth closing.
            </p>
            <ul className="mt-5 space-y-1.5 text-[13px] text-nirman-text-primary">
              <li>Requirement frequency across postings</li>
              <li>Experience bands by role</li>
              <li>Prioritized gaps with concrete next steps</li>
            </ul>
            <Link
              href="/career-intelligence"
              className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-nirman-accent hover:text-nirman-accent-hover"
            >
              Explore career intelligence
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-nirman-dark">
              For hiring teams
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-nirman-text-secondary">
              Screen candidates against one job description with cited evidence,
              consistent scoring, and a clear review queue. No candidate is rejected
              automatically.
            </p>
            <ul className="mt-5 space-y-1.5 text-[13px] text-nirman-text-primary">
              <li>Requirement-by-requirement evidence table</li>
              <li>Deterministic, auditable scores</li>
              <li>Human decisions with notes</li>
            </ul>
            <Link
              href="/recruitment"
              className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-nirman-accent hover:text-nirman-accent-hover"
            >
              Open recruitment workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section id="principles" className="border-t border-nirman-border bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-nirman-dark">
            What Role Fit will not do
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-3">
            {[
              {
                title: "No model-made scores",
                body: "Models only extract structured facts. Every number comes from deterministic code you can inspect.",
              },
              {
                title: "No uncited claims",
                body: "A matched requirement must point to a resume excerpt, a work history entry, or a stated skill.",
              },
              {
                title: "No automatic decisions",
                body: "Routing produces a review queue. A person always makes the final call.",
              },
            ].map((item) => (
              <div key={item.title} className="border-t border-nirman-border pt-4">
                <h3 className="text-[13px] font-semibold text-nirman-dark">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-nirman-text-secondary">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="flex flex-col items-start justify-between gap-5 rounded-xl border border-nirman-border bg-white px-6 py-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-nirman-dark">
              Start with evidence.
            </h2>
            <p className="mt-1 text-[13px] text-nirman-text-secondary">
              Open the dashboard or run a screening against a real job description.
            </p>
          </div>
          <ButtonLink href="/dashboard" size="md">
            Open Role Fit
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>

      <footer className="mt-auto border-t border-nirman-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-6 text-xs text-nirman-text-muted sm:flex-row sm:items-center">
          <span className="font-medium text-nirman-text-secondary">
            Role Fit — Career and recruitment intelligence
          </span>
          <span>Local open-weight models · deterministic scoring · human decisions</span>
        </div>
      </footer>
    </div>
  );
}
