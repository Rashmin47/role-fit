import Link from "next/link";
import {
  Compass,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Layers,
  FileCheck2,
  Database,
  BarChart3,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F4] text-nirman-dark flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="h-16 border-b border-nirman-border bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded bg-nirman-accent flex items-center justify-center text-white font-semibold text-sm">
              N
            </div>
            <span className="font-semibold text-base tracking-tight text-nirman-dark">
              NIRMAN
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-nirman-text-secondary">
            <a href="#how-it-works" className="hover:text-nirman-dark transition-colors">
              How it works
            </a>
            <a href="#career-intelligence" className="hover:text-nirman-dark transition-colors">
              Career Intelligence
            </a>
            <a href="#recruitment-intelligence" className="hover:text-nirman-dark transition-colors">
              Recruitment Intelligence
            </a>
            <a href="#architecture" className="hover:text-nirman-dark transition-colors">
              Deterministic Scoring
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button size="sm" variant="primary">
                Open Platform
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-nirman-border bg-white text-xs text-nirman-text-secondary mb-6 shadow-subtle">
          <span className="h-1.5 w-1.5 rounded-full bg-nirman-accent" />
          <span>Evidence-Based Career & Hiring Intelligence</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-nirman-dark max-w-3xl mx-auto leading-[1.15]">
          Make better career and hiring decisions from real evidence.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-nirman-text-secondary max-w-2xl mx-auto leading-relaxed">
          Nirman turns job requirements and candidate evidence into structured, explainable insights — helping engineers understand what employers need and helping teams screen candidates consistently.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button size="lg" variant="primary" className="w-full sm:w-auto">
              <span>Explore Nirman</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              See how it works
            </Button>
          </a>
        </div>

        {/* Realistic Interface Preview */}
        <div className="mt-14 max-w-4xl mx-auto text-left">
          <div className="rounded-xl border border-nirman-border bg-white shadow-card overflow-hidden">
            {/* Window title bar */}
            <div className="px-4 py-3 border-b border-nirman-border bg-[#FAFAF8] flex items-center justify-between text-xs text-nirman-text-secondary">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]" />
                <span className="font-medium text-nirman-dark ml-2">
                  Screening Run #41 • Python Backend Developer
                </span>
              </div>
              <Badge variant="success" size="sm">
                Deterministic Match: 82%
              </Badge>
            </div>

            {/* Content Mockup */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
              <div className="space-y-3 md:col-span-2">
                <div className="text-xs font-semibold text-nirman-dark uppercase tracking-wider text-nirman-text-muted">
                  Requirement Comparison Matrix
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded border border-nirman-border bg-nirman-bg/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-nirman-success font-bold">✓</span>
                      <span className="font-semibold text-nirman-dark">Python & FastAPI</span>
                    </div>
                    <span className="text-[11px] text-nirman-text-secondary">
                      "Built 12 FastAPI microservices" (Resume P.1)
                    </span>
                  </div>
                  <div className="p-2.5 rounded border border-nirman-border bg-nirman-bg/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-nirman-success font-bold">✓</span>
                      <span className="font-semibold text-nirman-dark">PostgreSQL Schema & Queries</span>
                    </div>
                    <span className="text-[11px] text-nirman-text-secondary">
                      "Engineered transactional tables & indexes"
                    </span>
                  </div>
                  <div className="p-2.5 rounded border border-nirman-border bg-nirman-danger-bg/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-nirman-danger font-bold">✕</span>
                      <span className="font-semibold text-nirman-dark">3.0+ Years Experience</span>
                    </div>
                    <span className="text-[11px] text-nirman-danger font-medium">
                      2.4 yrs calculated from work history
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-lg border border-nirman-border bg-[#FAFAF8] text-xs">
                <div className="font-semibold text-nirman-dark">Score Breakdown</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-nirman-text-secondary">Required Skills (50%)</span>
                    <strong className="text-nirman-dark">44 / 50</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nirman-text-secondary">Experience (25%)</span>
                    <strong className="text-nirman-dark">15 / 25</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nirman-text-secondary">Preferred (15%)</span>
                    <strong className="text-nirman-dark">13 / 15</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nirman-text-secondary">Evidence (10%)</span>
                    <strong className="text-nirman-dark">10 / 10</strong>
                  </div>
                  <div className="pt-2 border-t border-nirman-border flex justify-between font-semibold">
                    <span>Total Score</span>
                    <span className="text-nirman-accent">82%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-6 bg-white border-t border-nirman-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-wider text-nirman-accent mb-2">
            The Problem
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-nirman-dark tracking-tight mb-4">
            Hiring decisions shouldn't come from black-box LLM hallucinations.
          </h2>
          <p className="text-sm sm:text-base text-nirman-text-secondary leading-relaxed mb-8">
            Modern hiring is broken on both sides. Candidates don't know what skills are genuinely required in the market. Recruiters are overwhelmed by hundreds of resumes and rely on opaque generative AI tools that invent qualifications or reject qualified applicants arbitrarily.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg border border-nirman-border bg-[#FAFAF8]">
              <h4 className="font-semibold text-xs text-nirman-dark mb-1.5">No Hallucinated Scores</h4>
              <p className="text-xs text-nirman-text-secondary leading-relaxed">
                AI structures and extracts evidence. Pure deterministic mathematical logic calculates match percentages.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-nirman-border bg-[#FAFAF8]">
              <h4 className="font-semibold text-xs text-nirman-dark mb-1.5">Citations on Every Claim</h4>
              <p className="text-xs text-nirman-text-secondary leading-relaxed">
                Every matched skill links directly to an excerpt in the candidate's resume or work history.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-nirman-border bg-[#FAFAF8]">
              <h4 className="font-semibold text-xs text-nirman-dark mb-1.5">Human Decision Maker</h4>
              <p className="text-xs text-nirman-text-secondary leading-relaxed">
                Nirman presents an explainable shortlist with identified gaps. The recruiter makes the final call.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How Nirman Works */}
      <section id="how-it-works" className="py-16 px-6 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-nirman-accent mb-2">
            Core Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-nirman-dark tracking-tight">
            How Nirman Processes Evidence
          </h2>
          <p className="text-xs sm:text-sm text-nirman-text-secondary mt-2">
            A transparent pipeline separating semantic interpretation from deterministic evaluation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-lg border border-nirman-border bg-white shadow-subtle space-y-2">
            <div className="h-6 w-6 rounded bg-nirman-bg border border-nirman-border flex items-center justify-center text-xs font-bold text-nirman-dark">
              1
            </div>
            <h4 className="font-semibold text-xs text-nirman-dark">Real Input & Extraction</h4>
            <p className="text-xs text-nirman-text-secondary leading-relaxed">
              Job descriptions and candidate resumes are parsed by local open-weight extractors into structured schemas.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-nirman-border bg-white shadow-subtle space-y-2">
            <div className="h-6 w-6 rounded bg-nirman-bg border border-nirman-border flex items-center justify-center text-xs font-bold text-nirman-dark">
              2
            </div>
            <h4 className="font-semibold text-xs text-nirman-dark">Canonical Normalization</h4>
            <p className="text-xs text-nirman-text-secondary leading-relaxed">
              Aliases, titles, and technologies are mapped into standardized taxonomy entities and verified timelines.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-nirman-border bg-white shadow-subtle space-y-2">
            <div className="h-6 w-6 rounded bg-nirman-bg border border-nirman-border flex items-center justify-center text-xs font-bold text-nirman-dark">
              3
            </div>
            <h4 className="font-semibold text-xs text-nirman-dark">Deterministic Scoring</h4>
            <p className="text-xs text-nirman-text-secondary leading-relaxed">
              Configurable mathematical weights calculate scores for required skills, experience, and evidence quality.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-nirman-border bg-white shadow-subtle space-y-2">
            <div className="h-6 w-6 rounded bg-nirman-bg border border-nirman-border flex items-center justify-center text-xs font-bold text-nirman-dark">
              4
            </div>
            <h4 className="font-semibold text-xs text-nirman-dark">Explainable Human Review</h4>
            <p className="text-xs text-nirman-text-secondary leading-relaxed">
              Shortlists present clear gap analyses and cited excerpts, enabling recruiters to make fast, reliable decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Career & Recruitment Dual Features */}
      <section className="py-16 px-6 bg-white border-t border-b border-nirman-border">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Career Intelligence */}
          <div id="career-intelligence" className="p-6 rounded-xl border border-nirman-border bg-[#FAFAF8] space-y-4">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-nirman-accent" />
              <h3 className="text-lg font-bold text-nirman-dark">Career Intelligence</h3>
            </div>
            <p className="text-xs text-nirman-text-secondary leading-relaxed">
              Analyze structured job-market requirements across target engineering positions. See requirement frequencies, experience expectations, and prioritize skills that bridge real market gaps.
            </p>
            <ul className="space-y-2 text-xs text-nirman-text-primary">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-nirman-success" />
                <span>Observed requirement frequency distribution (e.g. Python 87%, PostgreSQL 71%)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-nirman-success" />
                <span>Experience expectation brackets (0-1y, 1-3y, 3-5y, 5+y)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-nirman-success" />
                <span>Prioritized skill gaps with concrete learning directions</span>
              </li>
            </ul>
            <Link href="/career-intelligence">
              <Button size="sm" variant="secondary" className="mt-2">
                Explore Career Intelligence
              </Button>
            </Link>
          </div>

          {/* Recruitment Intelligence */}
          <div id="recruitment-intelligence" className="p-6 rounded-xl border border-nirman-border bg-[#FAFAF8] space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-nirman-accent" />
              <h3 className="text-lg font-bold text-nirman-dark">Recruitment Intelligence</h3>
            </div>
            <p className="text-xs text-nirman-text-secondary leading-relaxed">
              Screen 10 to 200+ resumes against a single job description. Nirman extracts qualifications, normalizes skills, evaluates experience timelines, and generates cited candidate comparisons.
            </p>
            <ul className="space-y-2 text-xs text-nirman-text-primary">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-nirman-success" />
                <span>Requirement-by-requirement verification table</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-nirman-success" />
                <span>Direct resume citations for every verified skill</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-nirman-success" />
                <span>Explainable shortlist with non-binary human decision flags</span>
              </li>
            </ul>
            <Link href="/recruitment">
              <Button size="sm" variant="primary" className="mt-2">
                Launch Recruitment Workspace
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-16 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-nirman-dark tracking-tight">
          Ready to review evidence, not hallucinations?
        </h2>
        <p className="text-xs sm:text-sm text-nirman-text-secondary mt-2 max-w-xl mx-auto">
          Start exploring role market requirements or run a candidate screening today.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard">
            <Button size="md" variant="primary">
              Open Nirman Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-nirman-border bg-white py-6 px-6 text-xs text-nirman-text-secondary">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-nirman-dark">NIRMAN</span>
            <span>— Career & Hiring Intelligence Platform</span>
          </div>
          <span className="text-[11px] text-nirman-text-muted">
            Built with local open-weight AI abstractions and deterministic scoring.
          </span>
        </div>
      </footer>
    </div>
  );
}
