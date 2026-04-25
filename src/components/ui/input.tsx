import * as React from "react";

import { cn } from "./utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 flex h-14 w-full min-w-0 rounded-[999px] border border-transparent bg-input-background px-5 py-3 text-base shadow-[0_2px_10px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.08)] transition-[color,box-shadow,background-color,transform] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:shadow-[0_2px_12px_rgba(15,23,42,0.05),0_14px_34px_rgba(15,23,42,0.10)]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
