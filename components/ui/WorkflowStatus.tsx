"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStageStatus = "pending" | "in_progress" | "completed" | "error";

export interface WorkflowStageItem {
  id: string;
  label: string;
  description?: string;
  status: WorkflowStageStatus;
}

interface WorkflowStatusProps {
  stages: WorkflowStageItem[];
  className?: string;
  title?: string;
}

const STATUS_LABEL: Record<WorkflowStageStatus, string> = {
  pending: "Waiting",
  in_progress: "Running",
  completed: "Done",
  error: "Error",
};

export function WorkflowStatus({ stages, className, title }: WorkflowStatusProps) {
  const completed = stages.filter((s) => s.status === "completed").length;
  const progress = stages.length ? (completed / stages.length) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-2xs font-semibold uppercase tracking-[0.14em] text-nirman-text-secondary">
            {title}
          </h4>
          <span className="font-mono text-2xs text-nirman-text-muted">
            {completed}/{stages.length}
          </span>
        </div>
      )}

      <div className="h-1 w-full overflow-hidden rounded-full bg-nirman-border">
        <div
          className="h-full rounded-full bg-nirman-accent transition-[width] duration-500 ease-out-quint"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="space-y-1.5">
        {stages.map((stage) => {
          const isCompleted = stage.status === "completed";
          const isInProgress = stage.status === "in_progress";
          const isError = stage.status === "error";

          return (
            <li
              key={stage.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-xs transition-colors",
                isCompleted && "border-nirman-border bg-[#FAFAF8]",
                isInProgress &&
                  "border-nirman-accent/40 bg-nirman-accent-light/60",
                isError &&
                  "border-nirman-danger-border bg-nirman-danger-bg",
                stage.status === "pending" &&
                  "border-nirman-border bg-white"
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {isCompleted && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-nirman-success" aria-hidden />
                )}
                {isInProgress && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-nirman-accent" aria-hidden />
                )}
                {isError && (
                  <AlertCircle className="h-4 w-4 shrink-0 text-nirman-danger" aria-hidden />
                )}
                {stage.status === "pending" && (
                  <Circle className="h-4 w-4 shrink-0 text-nirman-border" aria-hidden />
                )}

                <div className="min-w-0">
                  <span
                    className={cn(
                      "block truncate",
                      isCompleted && "font-medium text-nirman-dark",
                      isInProgress && "font-medium text-nirman-accent",
                      isError && "font-medium text-nirman-danger-text",
                      stage.status === "pending" && "text-nirman-text-secondary"
                    )}
                  >
                    {stage.label}
                  </span>
                  {stage.description && (
                    <p className="mt-0.5 truncate text-2xs text-nirman-text-muted">
                      {stage.description}
                    </p>
                  )}
                </div>
              </div>

              <span
                className={cn(
                  "shrink-0 text-2xs font-medium",
                  isCompleted && "text-nirman-success-text",
                  isInProgress && "text-nirman-accent",
                  isError && "text-nirman-danger-text",
                  stage.status === "pending" && "text-nirman-text-muted"
                )}
              >
                {STATUS_LABEL[stage.status]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
