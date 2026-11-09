"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { cn } from "@/lib/utils";
import { RotateCcw, Save } from "lucide-react";
import type { ScoringWeights } from "@/types";
import {
  DEFAULT_WORKSPACE_SETTINGS,
  weightsTotal,
  type WorkspaceSettings,
} from "@/lib/settings/types";
import {
  checkOllamaConnection,
  fetchSettings,
  saveSettings,
  type OllamaCheckResult,
} from "@/lib/api/settings-client";

const WEIGHT_FIELDS: Array<{
  key: keyof ScoringWeights;
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
  const [settings, setSettings] = React.useState<WorkspaceSettings | null>(null);
  const [persisted, setPersisted] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const [isCheckingOllama, setIsCheckingOllama] = React.useState(false);
  const [ollamaResult, setOllamaResult] =
    React.useState<OllamaCheckResult | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetchSettings()
      .then((response) => {
        if (cancelled) return;
        setSettings(response.settings);
        setPersisted(response.persisted);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "The settings could not be loaded."
        );
        setSettings(DEFAULT_WORKSPACE_SETTINGS);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const total = settings ? weightsTotal(settings.weights) : 0;
  const weightsValid = total === 100;

  const updateWeights = (key: keyof ScoringWeights, value: number) => {
    setSettings((current) =>
      current
        ? { ...current, weights: { ...current.weights, [key]: value } }
        : current
    );
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    if (!settings || !weightsValid || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    setSavedSuccess(false);

    try {
      const response = await saveSettings(settings);
      setSettings(response.settings);
      setPersisted(response.persisted);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "The settings could not be saved."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckOllama = async () => {
    if (!settings || isCheckingOllama) return;
    setIsCheckingOllama(true);
    setOllamaResult(null);

    try {
      const result = await checkOllamaConnection(
        settings.ollamaBaseUrl,
        settings.ollamaModel
      );
      setOllamaResult(result);
    } catch (error) {
      setOllamaResult({
        reachable: false,
        modelAvailable: false,
        models: [],
        error:
          error instanceof Error
            ? error.message
            : "The Ollama server could not be checked.",
      });
    } finally {
      setIsCheckingOllama(false);
    }
  };

  if (!settings) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Settings"
          description="Choose how requirements are extracted and how scores are weighted."
        />
        {loadError ? (
          <Callout tone="danger" title="Could not load settings">
            {loadError}
          </Callout>
        ) : (
          <Card className="p-10 text-center text-[13px] text-nirman-text-secondary">
            Loading workspace settings…
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Choose how requirements are extracted and how scores are weighted."
      />

      {loadError && (
        <Callout tone="warning" title="Using environment defaults">
          {loadError} Save the form to persist these values in the database.
        </Callout>
      )}

      {!persisted && !loadError && (
        <Callout tone="warning" title="Not persisted yet">
          These values come from the environment. Save once to store them in the
          workspace database.
        </Callout>
      )}

      {savedSuccess && (
        <Callout tone="success" className="animate-fade-in">
          Settings saved. New extractions and screenings will use them.
        </Callout>
      )}

      {saveError && (
        <Callout tone="danger" title="Settings were not saved">
          {saveError}
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
              const isActive = settings.provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => {
                    setSettings({ ...settings, provider: p.id });
                    setSavedSuccess(false);
                  }}
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

          {settings.provider === "ollama" && (
            <div className="animate-fade-in space-y-3 border-t border-nirman-border pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Server URL"
                  value={settings.ollamaBaseUrl}
                  onChange={(e) => {
                    setSettings({ ...settings, ollamaBaseUrl: e.target.value });
                    setOllamaResult(null);
                    setSavedSuccess(false);
                  }}
                />
                <Input
                  label="Model"
                  value={settings.ollamaModel}
                  onChange={(e) => {
                    setSettings({ ...settings, ollamaModel: e.target.value });
                    setOllamaResult(null);
                    setSavedSuccess(false);
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCheckOllama}
                  disabled={isCheckingOllama}
                >
                  {isCheckingOllama ? "Checking…" : "Test connection"}
                </Button>
                {ollamaResult && (
                  <p
                    className={cn(
                      "text-xs",
                      ollamaResult.reachable && ollamaResult.modelAvailable
                        ? "text-nirman-success-text"
                        : "text-nirman-warning-text"
                    )}
                  >
                    {ollamaResult.reachable && ollamaResult.modelAvailable
                      ? `Connected. ${settings.ollamaModel} is installed.`
                      : ollamaResult.error ??
                        "The server is reachable, but the model is not installed."}
                  </p>
                )}
              </div>

              {ollamaResult?.reachable && ollamaResult.models.length > 0 && (
                <p className="text-xs text-nirman-text-muted">
                  Installed models: {ollamaResult.models.join(", ")}
                </p>
              )}
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
              {total} / 100
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setSettings({
                  ...settings,
                  weights: DEFAULT_WORKSPACE_SETTINGS.weights,
                })
              }
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
                    {settings.weights[field.key]}
                  </span>
                </div>
                <input
                  id={`setting-${field.key}`}
                  type="range"
                  min={field.min}
                  max={field.max}
                  value={settings.weights[field.key]}
                  onChange={(e) =>
                    updateWeights(field.key, Number(e.target.value))
                  }
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[#e6e6e4] accent-nirman-accent"
                />
              </div>
            ))}
          </div>

          {!weightsValid && (
            <Callout tone="warning">
              Weights currently sum to <strong>{total}</strong>. Adjust by{" "}
              {total > 100
                ? `removing ${total - 100}`
                : `adding ${100 - total}`}{" "}
              points so the total equals 100.
            </Callout>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 border-t border-nirman-border pt-5">
        <p className="text-xs text-nirman-text-muted">
          Scores are computed deterministically in application logic. Settings
          are stored in the workspace database.
        </p>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!weightsValid || isSaving}
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
