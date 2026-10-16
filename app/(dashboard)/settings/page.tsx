"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { cn } from "@/lib/utils";
import { Cpu, RotateCcw, Save, ShieldCheck, Sliders } from "lucide-react";

const DEFAULT_WEIGHTS = {
  requiredSkills: 50,
  experience: 25,
  preferredSkills: 15,
  evidenceQuality: 10,
};

const WEIGHT_FIELDS: Array<{
  key: keyof typeof DEFAULT_WEIGHTS;
  label: string;
  min: number;
  max: number;
}> = [
  { key: "requiredSkills", label: "Required mandatory skills", min: 20, max: 70 },
  { key: "experience", label: "Verified experience", min: 10, max: 50 },
  { key: "preferredSkills", label: "Preferred / bonus skills", min: 5, max: 30 },
  { key: "evidenceQuality", label: "Evidence quality & portfolio", min: 0, max: 20 },
];

const PROVIDERS = [
  {
    id: "mock",
    name: "Local rule & pattern extractor",
    description: "100% offline, zero latency, runs without a background daemon.",
  },
  {
    id: "ollama",
    name: "Ollama open-weight LLM",
    description: "Connects to local models (Llama 3.2, Qwen 2.5, Gemma 2, Mistral).",
  },
] as const;

export default function SettingsPage() {
  const [provider, setProvider] = React.useState<"mock" | "ollama">("mock");
  const [ollamaUrl, setOllamaUrl] = React.useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = React.useState("llama3.2");
  const [weights, setWeights] = React.useState(DEFAULT_WEIGHTS);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const weightsTotal = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightsValid = weightsTotal === 100;

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Platform Settings"
        description="Configure extraction providers, scoring weights, and normalization policies."
      />

      {savedSuccess && (
        <Callout tone="success" className="animate-fade-in">
          Configuration saved successfully.
        </Callout>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-nirman-accent" aria-hidden />
            <CardTitle>AI Extraction Provider</CardTitle>
          </div>
          <Badge variant="success" size="sm" dot>
            Zero hosted LLM lock-in
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs leading-relaxed text-nirman-text-secondary">
            Role Fit never depends on proprietary cloud APIs for extraction.
            Requirements are parsed via open-weight models or local deterministic
            pattern parsers.
          </p>

          <div
            role="radiogroup"
            aria-label="Active extraction provider"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {PROVIDERS.map((p) => {
              const isActive = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setProvider(p.id)}
                  className={cn(
                    "rounded-lg border p-3.5 text-left text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nirman-accent focus-visible:ring-offset-2",
                    isActive
                      ? "border-nirman-accent bg-white ring-1 ring-nirman-accent"
                      : "border-nirman-border bg-white hover:border-nirman-text-muted/40 hover:bg-nirman-bg/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-nirman-dark">{p.name}</span>
                    {isActive && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-nirman-accent" />
                    )}
                  </div>
                  <p className="mt-1 text-2xs leading-relaxed text-nirman-text-secondary">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>

          {provider === "ollama" && (
            <div className="grid animate-fade-in grid-cols-1 gap-4 border-t border-nirman-border pt-4 sm:grid-cols-2">
              <Input
                label="Ollama server base URL"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
              />
              <Input
                label="Model identifier"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-nirman-accent" aria-hidden />
            <CardTitle>Default Scoring Weights</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={weightsValid ? "success" : "danger"} size="sm" mono>
              Total {weightsTotal}/100
            </Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setWeights(DEFAULT_WEIGHTS)}
              aria-label="Reset weights to default"
              title="Reset to defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs leading-relaxed text-nirman-text-secondary">
            Sets the baseline weighting applied to every new screening run.
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {WEIGHT_FIELDS.map((field) => (
              <div key={field.key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor={`setting-${field.key}`}
                    className="text-xs font-medium text-nirman-text-primary"
                  >
                    {field.label}
                  </label>
                  <span className="tabular-nums font-mono text-xs font-semibold text-nirman-dark">
                    {weights[field.key]} pts
                  </span>
                </div>
                <input
                  id={`setting-${field.key}`}
                  type="range"
                  min={field.min}
                  max={field.max}
                  value={weights[field.key]}
                  onChange={(e) =>
                    setWeights({ ...weights, [field.key]: Number(e.target.value) })
                  }
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-nirman-border accent-nirman-accent"
                />
              </div>
            ))}
          </div>

          {!weightsValid && (
            <Callout tone="warning">
              Weights currently sum to <strong>{weightsTotal}</strong>. Adjust by{" "}
              {weightsTotal > 100
                ? `removing ${weightsTotal - 100}`
                : `adding ${100 - weightsTotal}`}{" "}
              points so the total equals 100.
            </Callout>
          )}

          <div className="flex items-center gap-2 border-t border-nirman-border pt-4 text-2xs text-nirman-text-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-nirman-success" aria-hidden />
            All scoring is computed deterministically in application logic.
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} disabled={!weightsValid}>
          <Save className="h-4 w-4" />
          Save Platform Settings
        </Button>
      </div>
    </div>
  );
}
