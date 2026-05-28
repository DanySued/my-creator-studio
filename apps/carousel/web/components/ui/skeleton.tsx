import { cn } from "@/lib/utils"

function Skeleton({
  className,
  variant = "pulse",
  ...props
}: React.ComponentProps<"div"> & { variant?: "pulse" | "shimmer" }) {
  if (variant === "shimmer") {
    return (
      <div
        data-slot="skeleton"
        className={cn("relative overflow-hidden rounded-md bg-muted", className)}
        {...props}
      >
        <span className="absolute inset-0 -translate-x-full animate-[shimmer-sweep_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      </div>
    )
  }
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
