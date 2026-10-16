import { NewScreeningWorkflow } from "@/components/recruitment/NewScreeningWorkflow";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewScreeningPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="New Screening"
        description="Extract role requirements, stage candidate resumes, and run deterministic scoring."
      />
      <NewScreeningWorkflow />
    </div>
  );
}
