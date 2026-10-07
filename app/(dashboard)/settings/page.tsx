"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Sliders, Cpu, Database, Save } from "lucide-react";

export default function SettingsPage() {
  const [provider, setProvider] = React.useState("mock");
  const [ollamaUrl, setOllamaUrl] = React.useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = React.useState("llama3.2");

  const [reqSkillWeight, setReqSkillWeight] = React.useState(50);
  const [expWeight, setExpWeight] = React.useState(25);
  const [prefSkillWeight, setPrefSkillWeight] = React.useState(15);
  const [evidenceWeight, setEvidenceWeight] = React.useState(10);

  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-nirman-border">
        <h1 className="text-2xl font-bold tracking-tight text-nirman-dark">
          Platform Settings & Configuration
        </h1>
        <p className="text-xs text-nirman-text-secondary mt-1">
          Configure extraction providers, scoring weights, and normalization policies.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-nirman-success-bg border border-nirman-success-border rounded-md text-xs text-nirman-success-text flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-nirman-success" />
          <span>Configuration saved successfully.</span>
        </div>
      )}

      {/* AI Extraction Layer Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-nirman-accent" />
            <CardTitle>AI Extraction Provider</CardTitle>
          </div>
          <Badge variant="success" size="sm">
            Zero Hosted LLM Lock-in
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-nirman-text-secondary">
            Nirman never uses proprietary cloud APIs (OpenAI, Anthropic, Gemini). Extraction runs via open-weight models or local deterministic pattern parsers.
          </p>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-nirman-dark">
              Select Active Provider:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setProvider("mock")}
                className={`p-3.5 rounded-lg border cursor-pointer text-xs transition-all ${
                  provider === "mock"
                    ? "bg-white border-nirman-accent ring-1 ring-nirman-accent"
                    : "bg-white border-nirman-border hover:bg-nirman-bg"
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-nirman-dark">
                  <span>Local Rule & Pattern Extractor</span>
                  {provider === "mock" && <span className="h-2 w-2 rounded-full bg-nirman-accent" />}
                </div>
                <p className="text-[11px] text-nirman-text-secondary mt-1">
                  100% offline, zero latency, runs without background daemon.
                </p>
              </div>

              <div
                onClick={() => setProvider("ollama")}
                className={`p-3.5 rounded-lg border cursor-pointer text-xs transition-all ${
                  provider === "ollama"
                    ? "bg-white border-nirman-accent ring-1 ring-nirman-accent"
                    : "bg-white border-nirman-border hover:bg-nirman-bg"
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-nirman-dark">
                  <span>Ollama Open-Weight LLM</span>
                  {provider === "ollama" && <span className="h-2 w-2 rounded-full bg-nirman-accent" />}
                </div>
                <p className="text-[11px] text-nirman-text-secondary mt-1">
                  Connects to local open models (Llama 3.2, Qwen 2.5, Gemma 2, Mistral).
                </p>
              </div>
            </div>
          </div>

          {provider === "ollama" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                label="Ollama Server Base URL"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
              />
              <Input
                label="Model Identifier"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default Scoring Engine Weights */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-nirman-accent" />
            <CardTitle>Default Scoring Weights</CardTitle>
          </div>
          <span className="text-xs font-mono font-semibold text-nirman-dark">
            Sum: {reqSkillWeight + expWeight + prefSkillWeight + evidenceWeight}%
          </span>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <p className="text-nirman-text-secondary">
            Sets standard baseline weighting across new screening runs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-nirman-text-primary mb-1">
                Required Mandatory Skills: {reqSkillWeight} pts
              </label>
              <input
                type="range"
                min={20}
                max={70}
                value={reqSkillWeight}
                onChange={(e) => setReqSkillWeight(Number(e.target.value))}
                className="w-full accent-nirman-accent cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-medium text-nirman-text-primary mb-1">
                Verified Experience: {expWeight} pts
              </label>
              <input
                type="range"
                min={10}
                max={50}
                value={expWeight}
                onChange={(e) => setExpWeight(Number(e.target.value))}
                className="w-full accent-nirman-accent cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-medium text-nirman-text-primary mb-1">
                Preferred / Bonus Skills: {prefSkillWeight} pts
              </label>
              <input
                type="range"
                min={5}
                max={30}
                value={prefSkillWeight}
                onChange={(e) => setPrefSkillWeight(Number(e.target.value))}
                className="w-full accent-nirman-accent cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-medium text-nirman-text-primary mb-1">
                Evidence Quality & Portfolio: {evidenceWeight} pts
              </label>
              <input
                type="range"
                min={0}
                max={20}
                value={evidenceWeight}
                onChange={(e) => setEvidenceWeight(Number(e.target.value))}
                className="w-full accent-nirman-accent cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" />
          Save Platform Settings
        </Button>
      </div>
    </div>
  );
}
