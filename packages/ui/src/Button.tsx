import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:   "bg-brand-orange hover:bg-brand-orange-light text-white font-medium focus:ring-brand-orange",
  secondary: "border border-brand-navy-light text-white hover:border-brand-orange bg-transparent focus:ring-brand-orange",
  danger:    "border border-red-500 text-red-400 hover:bg-red-500/10 bg-transparent focus:ring-red-500",
  ghost:     "text-brand-orange hover:bg-brand-orange/10 bg-transparent focus:ring-brand-orange",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "transition-colors duration-150",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
