import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-6xl font-bold tracking-tight text-foreground">404</h1>
      <p className="text-lg text-muted-foreground max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild className="mt-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]">
        <Link href="/">Go Home</Link>
      </Button>
    </main>
  );
}
