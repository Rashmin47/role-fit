import { NewScreeningWorkflow } from "@/components/recruitment/NewScreeningWorkflow";

export default function NewScreeningPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-nirman-dark">
          Create New Recruitment Screening
        </h1>
        <p className="text-xs text-nirman-text-secondary mt-1">
          Extract role requirements, parse candidate resumes, and execute deterministic scoring.
        </p>
      </div>

      <NewScreeningWorkflow />
    </div>
  );
}
