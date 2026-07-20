import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-2xl font-medium transition active:translate-y-px";
  const variants = {
    default: "bg-sq.primary/90 hover:bg-sq.primary text-white shadow-glow",
    ghost: "bg-transparent hover:bg-white/5",
    outline: "border border-white/20 hover:bg-white/5"
  } as const;
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-5", lg: "h-12 px-6 text-lg" } as const;
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
