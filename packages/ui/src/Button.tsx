import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:   "bg-brand-orange hover:bg-brand-orange-light text-white",
  secondary: "bg-white border border-brand-border text-brand-navy hover:border-brand-navy hover:bg-brand-surface",
  danger:    "bg-white border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400",
  ghost:     "bg-transparent text-brand-orange hover:bg-brand-orange-pale",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium",
        "focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "transition-colors duration-[120ms] ease-in-out",
        "active:scale-[0.97] transition-transform",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
