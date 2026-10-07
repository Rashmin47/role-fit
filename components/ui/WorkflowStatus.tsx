"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";
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

export function WorkflowStatus({ stages, className, title }: WorkflowStatusProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h4 className="text-xs font-semibold text-nirman-dark uppercase tracking-wider">
          {title}
        </h4>
      )}
      <div className="space-y-2">
        {stages.map((stage) => {
          const isCompleted = stage.status === "completed";
          const isInProgress = stage.status === "in_progress";
          const isError = stage.status === "error";

          return (
            <div
              key={stage.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-md border text-xs transition-colors",
                isCompleted && "bg-[#FAFAF8] border-nirman-border text-nirman-dark",
                isInProgress && "bg-nirman-accent-light/50 border-nirman-accent/40 text-nirman-accent font-medium",
                isError && "bg-nirman-danger-bg border-nirman-danger-border text-nirman-danger-text",
                stage.status === "pending" && "bg-white border-nirman-border text-nirman-text-muted"
              )}
            >
              <div className="flex items-center gap-3">
                {isCompleted && (
                  <CheckCircle2 className="h-4 w-4 text-nirman-success shrink-0" />
                )}
                {isInProgress && (
                  <Loader2 className="h-4 w-4 text-nirman-accent animate-spin shrink-0" />
                )}
                {isError && (
                  <AlertCircle className="h-4 w-4 text-nirman-danger shrink-0" />
                )}
                {stage.status === "pending" && (
                  <Circle className="h-4 w-4 text-nirman-border shrink-0" />
                )}

                <div>
                  <span className={cn(
                    "font-medium",
                    isCompleted && "text-nirman-dark",
                    isInProgress && "text-nirman-accent font-semibold",
                    stage.status === "pending" && "text-nirman-text-secondary"
                  )}>
                    {stage.label}
                  </span>
                  {stage.description && (
                    <p className="text-[10px] text-nirman-text-muted mt-0.5">
                      {stage.description}
                    </p>
                  )}
                </div>
              </div>

              <span className="text-[11px] font-mono capitalize">
                {stage.status.replace("_", " ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
