import { NewScreeningWorkflow } from "@/components/recruitment/NewScreeningWorkflow";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewScreeningPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New screening"
        description="Extract role requirements, stage candidate resumes, and run deterministic scoring."
      />
      <NewScreeningWorkflow />
    </div>
  );
}
