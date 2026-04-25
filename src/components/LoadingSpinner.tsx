import React from 'react';
import { motion } from 'motion/react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 64, className = "", fullScreen = false }: LoadingSpinnerProps) {
  const Container = fullScreen ? 'div' : 'div';
  const containerClass = fullScreen 
    ? "min-h-screen flex items-center justify-center bg-background" 
    : "flex items-center justify-center";

  const baseSize = size;
  const middleSize = Math.round(baseSize * 0.75);
  const innerSize = Math.round(baseSize * 0.5);
  const borderWidth = Math.max(2, Math.round(baseSize / 16));

  return (
    <Container className={`${containerClass} ${className}`}>
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ width: baseSize, height: baseSize }}
      >
        <motion.div
          className="border-primary/30 border-t-primary rounded-full absolute inset-0"
          style={{ 
            borderWidth: borderWidth,
            borderStyle: 'solid',
            borderTopColor: 'hsl(var(--primary))',
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="border-secondary/30 border-b-secondary rounded-full absolute"
          style={{ 
            top: Math.round(baseSize * 0.125),
            left: Math.round(baseSize * 0.125),
            width: middleSize,
            height: middleSize,
            borderWidth: borderWidth,
            borderStyle: 'solid',
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: 'hsl(var(--secondary))',
            borderLeftColor: 'transparent',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="border-accent/30 border-r-accent rounded-full absolute"
          style={{ 
            top: Math.round(baseSize * 0.25),
            left: Math.round(baseSize * 0.25),
            width: innerSize,
            height: innerSize,
            borderWidth: borderWidth,
            borderStyle: 'solid',
            borderTopColor: 'transparent',
            borderRightColor: 'hsl(var(--accent))',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </Container>
  );
}