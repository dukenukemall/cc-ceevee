import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Ceevee
          </CardTitle>
          <CardDescription className="text-base">
            Your project is ready. Start building something amazing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            <StatusItem label="Next.js 16" />
            <StatusItem label="React 19" />
            <StatusItem label="Tailwind v4" />
            <StatusItem label="shadcn/ui" />
            <StatusItem label="Supabase" />
            <StatusItem label="TypeScript" />
            <StatusItem label="Redux Toolkit" />
            <StatusItem label="React Query" />
          </div>
          <Button
            className="w-full mt-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
            size="lg"
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function StatusItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-emerald-500" />
      <span>{label}</span>
    </div>
  );
}
