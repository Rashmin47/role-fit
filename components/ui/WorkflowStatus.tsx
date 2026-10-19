"use client";

import * as React from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
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
          <h4 className="text-[13px] font-medium text-nirman-text-primary">
            {title}
          </h4>
          <span className="tabular-nums text-xs text-nirman-text-muted">
            {completed}/{stages.length}
          </span>
        </div>
      )}

      <div className="h-1 w-full overflow-hidden rounded-full bg-[#e6e6e4]">
        <div
          className="h-full rounded-full bg-nirman-accent transition-[width] duration-500 ease-out-quint"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="divide-y divide-nirman-borderSubtle">
        {stages.map((stage) => {
          const isCompleted = stage.status === "completed";
          const isInProgress = stage.status === "in_progress";
          const isError = stage.status === "error";

          return (
            <li
              key={stage.id}
              className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                    isCompleted && "bg-nirman-success text-white",
                    isInProgress && "bg-nirman-accent-light text-nirman-accent",
                    isError && "bg-nirman-danger-bg text-nirman-danger",
                    stage.status === "pending" && "border border-nirman-border"
                  )}
                  aria-hidden
                >
                  {isCompleted && <Check className="h-2.5 w-2.5" />}
                  {isInProgress && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {isError && <AlertCircle className="h-3 w-3" />}
                </span>

                <div className="min-w-0">
                  <span
                    className={cn(
                      "block truncate",
                      isCompleted && "text-nirman-text-secondary",
                      isInProgress && "font-medium text-nirman-dark",
                      isError && "font-medium text-nirman-danger-text",
                      stage.status === "pending" && "text-nirman-text-muted"
                    )}
                  >
                    {stage.label}
                  </span>
                  {stage.description && (
                    <p className="mt-0.5 truncate text-xs text-nirman-text-muted">
                      {stage.description}
                    </p>
                  )}
                </div>
              </div>

              <span
                className={cn(
                  "shrink-0 text-xs",
                  isCompleted && "text-nirman-text-muted",
                  isInProgress && "font-medium text-nirman-accent",
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
