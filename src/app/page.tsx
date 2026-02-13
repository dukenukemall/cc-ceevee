import { AppLayout } from "@/components/layouts/AppLayout";
import { UploadZone } from "@/components/upload/UploadZone";

export default function Home() {
  return (
    <AppLayout>
      <div className="w-full flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Scan a CV
          </h1>
          <p className="text-muted-foreground max-w-md">
            Upload a resume and we will search the web for relevant insights about the candidate.
          </p>
        </div>
        <UploadZone />
      </div>
    </AppLayout>
  );
}
