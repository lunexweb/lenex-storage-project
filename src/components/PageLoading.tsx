import { Loader2 } from "lucide-react";

interface LoadingLineProps {
  message?: string;
  className?: string;
}

export function LoadingLine({ message = "Loading…", className = "" }: LoadingLineProps) {
  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
