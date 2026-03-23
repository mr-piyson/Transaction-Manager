'use client';

import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

import { useSetupApplication } from '@/hooks/data/use-organization';
import { useI18n } from '@/i18n/use-i18n';

import {
  setupSchema,
  SetupData,
  STEP_FIELDS,
  STEP_META,
} from './setup-wizard-types';
import { Step1Language } from './step1';
import { Step2Organization } from './step2';
import { Step3Admin } from './step3';

// ─── Animation ───────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

// ─── Step registry ────────────────────────────────────────────────────────────

const STEP_COMPONENTS = [Step1Language, Step2Organization, Step3Admin];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetupWizard() {
  const router = useRouter();
  const { locale } = useI18n();
  const { mutateAsync: submitSetup, isPending } = useSetupApplication();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  // ── Centralized form — shared across all steps via FormProvider ──
  const methods = useForm<SetupData>({
    resolver: zodResolver(setupSchema),
    mode: 'onChange',
    defaultValues: {
      language: locale,
      currency: 'BHD',
      orgName: '',
      website: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: '',
    },
  });

  const { handleSubmit, trigger, watch } = methods;
  const formData = watch();

  // ── Navigation ──────────────────────────────────────────────────

  const nextStep = async () => {
    const isStepValid = await trigger(STEP_FIELDS[step]);
    if (!isStepValid) return;

    if (step < STEP_META.length - 1) {
      setDirection(1);
      setStep((prev) => prev + 1);
    } else {
      handleSubmit(onFinalSubmit)();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((prev) => prev - 1);
    }
  };

  // ── Keyboard navigation ─────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isPending) {
        e.preventDefault();
        nextStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, formData, isPending]); // re-bind to capture fresh `step` and `formData`

  // ── Submission ──────────────────────────────────────────────────

  const onFinalSubmit = async (data: SetupData) => {
    try {
      await submitSetup(data);
      router.push('/auth');
    } catch (error) {
      console.error('Setup failed', error);
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  const StepComponent = STEP_COMPONENTS[step];
  const isLastStep = step === STEP_META.length - 1;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {STEP_META.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-primary/20'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <Card className="shadow-xl relative overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle>{STEP_META[step].title}</CardTitle>
          </CardHeader>

          <CardContent className="min-h-75">
            {/*
              FormProvider makes the form context available to every
              step component — they can all call useFormContext<SetupData>()
              and get the same centralized form instance.
            */}
            <FormProvider {...methods}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <StepComponent />
                </motion.div>
              </AnimatePresence>
            </FormProvider>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-4">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 0 || isPending}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            <Button onClick={nextStep} disabled={isPending}>
              {isLastStep ? (isPending ? 'Saving...' : 'Complete') : 'Next'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
