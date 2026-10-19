"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { cn } from "@/lib/utils";
import { RotateCcw, Save } from "lucide-react";

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
  { key: "requiredSkills", label: "Required skills", min: 20, max: 70 },
  { key: "experience", label: "Experience", min: 10, max: 50 },
  { key: "preferredSkills", label: "Preferred skills", min: 5, max: 30 },
  { key: "evidenceQuality", label: "Evidence quality", min: 0, max: 20 },
];

const PROVIDERS = [
  {
    id: "mock",
    name: "Local rule-based extractor",
    description: "Fully offline, deterministic, and available without any setup.",
  },
  {
    id: "ollama",
    name: "Ollama open-weight model",
    description: "Connects to a local model server such as Llama 3.2 or Qwen 2.5.",
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Choose how requirements are extracted and how scores are weighted."
      />

      {savedSuccess && (
        <Callout tone="success" className="animate-fade-in">
          Settings saved.
        </Callout>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Extraction provider</CardTitle>
            <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
              Role Fit only uses local or open-weight models. Extraction never
              produces a score.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    "rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nirman-accent focus-visible:ring-offset-2",
                    isActive
                      ? "border-nirman-dark bg-white"
                      : "border-nirman-border bg-white hover:border-[#d0d0cd]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-nirman-dark">
                      {p.name}
                    </span>
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        isActive ? "bg-nirman-accent" : "bg-[#e0e0de]"
                      )}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-nirman-text-secondary">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>

          {provider === "ollama" && (
            <div className="grid animate-fade-in grid-cols-1 gap-4 border-t border-nirman-border pt-4 sm:grid-cols-2">
              <Input
                label="Server URL"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
              />
              <Input
                label="Model"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Default scoring weights</CardTitle>
            <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
              Applied to new screenings. The four components must total 100.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "tabular-nums text-[13px] font-medium",
                weightsValid ? "text-nirman-text-secondary" : "text-nirman-danger-text"
              )}
            >
              {weightsTotal} / 100
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setWeights(DEFAULT_WEIGHTS)}
              aria-label="Reset weights to default"
              title="Reset to defaults"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {WEIGHT_FIELDS.map((field) => (
              <div key={field.key}>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor={`setting-${field.key}`}
                    className="text-[13px] font-medium text-nirman-text-primary"
                  >
                    {field.label}
                  </label>
                  <span className="tabular-nums text-[13px] font-medium text-nirman-dark">
                    {weights[field.key]}
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
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[#e6e6e4] accent-nirman-accent"
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
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 border-t border-nirman-border pt-5">
        <p className="text-xs text-nirman-text-muted">
          Scores are computed deterministically in application logic.
        </p>
        <Button variant="primary" onClick={handleSave} disabled={!weightsValid}>
          <Save className="h-4 w-4" />
          Save settings
        </Button>
      </div>
    </div>
  );
}
