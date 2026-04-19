'use client';

import { motion } from 'framer-motion';
import { Check, Circle, PlayCircle, Flag } from 'lucide-react';
import { cn } from '@/lib/utils'; // Your existing tailwind merge utility

type JobStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

interface ProgressCardProps {
  currentStatus: JobStatus;
}

const STAGES = [
  { id: 'NOT_STARTED', label: 'Not Started', icon: Circle },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: PlayCircle },
  { id: 'COMPLETED', label: 'Completed', icon: Flag },
  { id: 'CANCELLED', label: 'Cancelled', icon: Circle },
  { id: 'INVOICED', label: 'Invoiced', icon: Circle },
];

export function JobProgressCard({ currentStatus }: ProgressCardProps) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStatus);

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Project Lifecycle
        </h3>
        <span className="text-xs font-medium px-2 py-1 bg-secondary rounded text-secondary-foreground">
          Stage {currentIndex + 1} of {STAGES.length}
        </span>
      </div>
      <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto">
        {/* Background Track */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />

        {/* Animated Progress Fill */}
        <motion.div
          className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />

        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const Icon = stage.icon;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center group">
              {/* Stage Circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isCompleted || isActive ? 'var(--primary)' : 'var(--card)',
                  borderColor: isCompleted || isActive ? 'var(--primary)' : 'var(--border)',
                }}
                className={cn(
                  'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors',
                  isActive && 'shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]',
                )}
              >
                {isCompleted ? (
                  <Check className="text-white" size={18} />
                ) : (
                  <Icon
                    className={cn(
                      'transition-colors',
                      isActive ? 'text-white' : 'text-muted-foreground',
                    )}
                    size={18}
                  />
                )}

                {/* Pulse Animation for Active Stage */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/30"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>

              {/* Stage Label */}
              <div className="absolute top-12 whitespace-nowrap text-center">
                <p
                  className={cn(
                    'text-xs font-bold transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {stage.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-8" /> {/* Spacer for labels */}
    </div>
  );
}
