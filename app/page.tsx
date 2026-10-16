import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Compass,
  Database,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STEPS = [
  {
    title: "Ingest & extract",
    body: "Job descriptions and resumes are parsed by local, open-weight extractors into typed schemas.",
    icon: Layers,
  },
  {
    title: "Normalize",
    body: "Aliases, titles, and technologies are mapped into a canonical taxonomy with verified timelines.",
    icon: Database,
  },
  {
    title: "Score deterministically",
    body: "Configurable mathematical weights calculate scores for required skills, experience, and evidence.",
    icon: BarChart3,
  },
  {
    title: "Review & decide",
    body: "Shortlists present gap analyses and cited excerpts so recruiters can decide quickly and reliably.",
    icon: ShieldCheck,
  },
];

const PREVIEW_ROWS = [
  {
    label: "Python & FastAPI",
    matched: true,
    evidence: "“Built 12 FastAPI microservices” · Resume p.1",
  },
  {
    label: "PostgreSQL schema & queries",
    matched: true,
    evidence: "“Engineered transactional tables & indexes”",
  },
  {
    label: "3.0+ years experience",
    matched: false,
    evidence: "2.4 yrs calculated from work history",
  },
];

const SCORE_ROWS = [
  { label: "Required skills", weight: "50%", value: "44 / 50" },
  { label: "Experience", weight: "25%", value: "15 / 25" },
  { label: "Preferred", weight: "15%", value: "13 / 15" },
  { label: "Evidence", weight: "10%", value: "10 / 10" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-nirman-bg font-sans text-nirman-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-nirman-border bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-nirman-accent text-sm font-bold text-white">
              R
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[13px] font-semibold tracking-tight text-nirman-dark">
                Role Fit
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-nirman-text-muted">
                Intelligence
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-xs font-medium text-nirman-text-secondary md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-nirman-dark">
              How it works
            </a>
            <a href="#career" className="transition-colors hover:text-nirman-dark">
              Career Intelligence
            </a>
            <a href="#recruitment" className="transition-colors hover:text-nirman-dark">
              Recruitment Intelligence
            </a>
            <a href="#principles" className="transition-colors hover:text-nirman-dark">
              Deterministic scoring
            </a>
          </nav>

          <ButtonLink href="/dashboard" size="sm">
            Open Platform
            <ArrowRight className="h-3.5 w-3.5" />
          </ButtonLink>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-nirman-border bg-white px-3 py-1 text-xs text-nirman-text-secondary shadow-subtle">
          <span className="h-1.5 w-1.5 rounded-full bg-nirman-accent" />
          Evidence-based career &amp; hiring intelligence
        </div>

        <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-[1.12] tracking-tight text-nirman-dark sm:text-5xl">
          Make better career and hiring decisions from real evidence.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-nirman-text-secondary sm:text-lg">
          Role Fit turns job requirements and candidate evidence into structured,
          explainable insights — helping engineers understand what employers need and
          helping teams screen candidates consistently.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/dashboard" size="lg" className="w-full sm:w-auto">
            Explore Role Fit
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink
            href="#how-it-works"
            size="lg"
            variant="secondary"
            className="w-full sm:w-auto"
          >
            See how it works
          </ButtonLink>
        </div>

        <p className="mt-4 text-2xs text-nirman-text-muted">
          AI understands. Role Fit measures. Humans decide.
        </p>

        {/* Product preview */}
        <div className="mx-auto mt-14 max-w-4xl text-left">
          <div className="overflow-hidden rounded-2xl border border-nirman-border bg-white shadow-popover">
            <div className="flex items-center justify-between gap-3 border-b border-nirman-border bg-[#FAFAF8] px-4 py-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                <span className="ml-2 font-medium text-nirman-dark">
                  Screening · Python Backend Developer
                </span>
              </div>
              <Badge variant="success" size="sm" dot>
                82% match
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-6 bg-white p-6 md:grid-cols-3">
              <div className="space-y-3 md:col-span-2">
                <div className="text-2xs font-semibold uppercase tracking-[0.14em] text-nirman-text-muted">
                  Requirement comparison
                </div>
                <div className="space-y-2">
                  {PREVIEW_ROWS.map((row) => (
                    <div
                      key={row.label}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 text-xs ${
                        row.matched
                          ? "border-nirman-border bg-nirman-bg/40"
                          : "border-nirman-danger-border bg-nirman-danger-bg/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            row.matched ? "text-nirman-success" : "text-nirman-danger"
                          }`}
                        >
                          {row.matched ? "✓" : "✕"}
                        </span>
                        <span className="font-semibold text-nirman-dark">
                          {row.label}
                        </span>
                      </span>
                      <span
                        className={`hidden text-[11px] sm:block ${
                          row.matched
                            ? "text-nirman-text-secondary"
                            : "font-medium text-nirman-danger-text"
                        }`}
                      >
                        {row.evidence}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-nirman-border bg-[#FAFAF8] p-4 text-xs">
                <div className="font-semibold text-nirman-dark">Score breakdown</div>
                <div className="space-y-2">
                  {SCORE_ROWS.map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-nirman-text-secondary">
                        {row.label}{" "}
                        <span className="font-mono text-[10px] text-nirman-text-muted">
                          {row.weight}
                        </span>
                      </span>
                      <strong className="tabular-nums text-nirman-dark">
                        {row.value}
                      </strong>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-nirman-border pt-2 font-semibold">
                    <span>Total score</span>
                    <span className="tabular-nums text-nirman-accent">82%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section
        id="principles"
        className="border-t border-nirman-border bg-white px-6 py-16"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-2 text-2xs font-semibold uppercase tracking-[0.16em] text-nirman-accent">
            The problem
          </div>
          <h2 className="mb-4 max-w-2xl text-2xl font-bold tracking-tight text-nirman-dark sm:text-3xl">
            Hiring decisions shouldn’t come from black-box hallucinations.
          </h2>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-nirman-text-secondary sm:text-base">
            Modern hiring is broken on both sides. Candidates don’t know what skills
            are genuinely required in the market. Recruiters are overwhelmed by
            hundreds of resumes and rely on opaque generative tools that invent
            qualifications or reject qualified applicants arbitrarily.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                title: "No hallucinated scores",
                body: "AI structures and extracts evidence. Pure deterministic mathematics calculates match percentages.",
              },
              {
                title: "Citations on every claim",
                body: "Every matched skill links directly to an excerpt in the candidate’s resume or work history.",
              },
              {
                title: "A human decides",
                body: "Role Fit presents an explainable shortlist with identified gaps. The recruiter makes the final call.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-nirman-border bg-[#FAFAF8] p-5"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-nirman-accent shadow-subtle">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="mb-1.5 text-xs font-semibold text-nirman-dark">
                  {card.title}
                </h3>
                <p className="text-xs leading-relaxed text-nirman-text-secondary">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-2 text-2xs font-semibold uppercase tracking-[0.16em] text-nirman-accent">
            Core architecture
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-nirman-dark sm:text-3xl">
            How Role Fit processes evidence
          </h2>
          <p className="mt-2 text-xs text-nirman-text-secondary sm:text-sm">
            A transparent pipeline separating semantic interpretation from
            deterministic evaluation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative space-y-3 rounded-xl border border-nirman-border bg-white p-5 shadow-subtle"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-nirman-accent-light text-nirman-accent">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="font-mono text-2xs text-nirman-text-muted">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-nirman-dark">
                  {step.title}
                </h3>
                <p className="text-xs leading-relaxed text-nirman-text-secondary">
                  {step.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dual pillars */}
      <section className="border-y border-nirman-border bg-white px-6 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          <div
            id="career"
            className="flex flex-col gap-4 rounded-2xl border border-nirman-border bg-[#FAFAF8] p-6"
          >
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-nirman-accent" aria-hidden />
              <h3 className="text-lg font-bold tracking-tight text-nirman-dark">
                Career Intelligence
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-nirman-text-secondary">
              Analyze structured job-market requirements across target engineering
              roles. See requirement frequencies, experience expectations, and
              prioritize skills that bridge real market gaps.
            </p>
            <ul className="space-y-2 text-xs text-nirman-text-primary">
              {[
                "Requirement frequency distribution (e.g. Python 87%, PostgreSQL 71%)",
                "Experience expectation brackets (0–1y, 1–3y, 3–5y, 5y+)",
                "Prioritized skill gaps with concrete learning directions",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nirman-success"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <ButtonLink
              href="/career-intelligence"
              variant="secondary"
              size="sm"
              className="mt-2 self-start"
            >
              Explore Career Intelligence
            </ButtonLink>
          </div>

          <div
            id="recruitment"
            className="flex flex-col gap-4 rounded-2xl border border-nirman-border bg-[#FAFAF8] p-6"
          >
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-nirman-accent" aria-hidden />
              <h3 className="text-lg font-bold tracking-tight text-nirman-dark">
                Recruitment Intelligence
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-nirman-text-secondary">
              Screen 10 to 200+ resumes against a single job description. Role Fit
              extracts qualifications, normalizes skills, evaluates experience
              timelines, and generates cited candidate comparisons.
            </p>
            <ul className="space-y-2 text-xs text-nirman-text-primary">
              {[
                "Requirement-by-requirement verification table",
                "Direct resume citations for every verified skill",
                "Explainable shortlist with human decision flags",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nirman-success"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <ButtonLink
              href="/recruitment"
              size="sm"
              className="mt-2 self-start"
            >
              Launch Recruitment Workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-nirman-dark sm:text-3xl">
          Ready to review evidence, not hallucinations?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-xs text-nirman-text-secondary sm:text-sm">
          Start exploring role market requirements or run a candidate screening
          today.
        </p>
        <div className="mt-6 flex justify-center">
          <ButtonLink href="/dashboard" size="lg">
            Open Role Fit Dashboard
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>

      <footer className="mt-auto border-t border-nirman-border bg-white px-6 py-6 text-xs text-nirman-text-secondary">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-nirman-dark">Role Fit</span>
            <span className="text-nirman-text-muted">
              — Career &amp; Hiring Intelligence
            </span>
          </div>
          <span className="text-[11px] text-nirman-text-muted">
            Built with local open-weight AI abstractions and deterministic scoring.
          </span>
        </div>
      </footer>
    </div>
  );
}
