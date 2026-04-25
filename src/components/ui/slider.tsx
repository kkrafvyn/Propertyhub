import * as React from "react"

import { cn } from "./utils"

// Mock Slider implementation for environments without @radix-ui/react-slider
const SliderPrimitive = {
  Root: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={className} {...props} />
    )
  ),
  Track: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={className} {...props} />
    )
  ),
  Range: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={className} {...props} />
    )
  ),
  Thumb: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={className} {...props} />
    )
  ),
}

interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  max?: number;
  min?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value = [0], onValueChange, max = 100, min = 0, step = 1, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <div 
        className="absolute h-full bg-primary"
        style={{ 
          width: `${max ? (value[0] / max) * 100 : 0}%` 
        }}
      />
    </div>
    <div 
      className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      style={{ 
        marginLeft: max ? `${(value[0] / max) * 100}%` : '0%',
        transform: 'translateX(-50%)'
      }}
    />
  </div>
))
Slider.displayName = "Slider"

export { Slider }