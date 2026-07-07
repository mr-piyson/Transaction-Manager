'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { authClient } from '@/auth/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc/client';

import { type SetupData, STEP_FIELDS, STEP_META, setupSchema } from './setup-types';
import { Step1Language } from './step1';
import { Step2Organization } from './step2';
import { Step3Admin } from './step3';

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

const STEP_COMPONENTS = [Step1Language, Step2Organization, Step3Admin];

export default function SetupWizard() {
  const router = useRouter();
  const setupMutation = trpc.setup.setup.useMutation();
  const isPending = setupMutation.isPending;

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const methods = useForm<SetupData>({
    resolver: zodResolver(setupSchema),
    mode: 'onChange',
    defaultValues: {
      language: 'en',
      currency: 'BHD',
      orgName: '',
      slug: '',
      website: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPassword: '',
    },
  });

  const { handleSubmit, trigger, watch } = methods;
  const formData = watch();

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isPending) {
        e.preventDefault();
        nextStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, formData, isPending]);

  const onFinalSubmit = async (data: SetupData) => {
    try {
      await setupMutation.mutateAsync(data);
      toast.success('Organization created! Signing you in...');
      const { error } = await authClient.signIn.email({
        email: data.adminEmail,
        password: data.adminPassword,
      });
      if (error) {
        toast.error('Account created but auto-sign-in failed. Please sign in manually.');
        router.push('/auth');
        return;
      }
      router.push('/erp');
    } catch (error: any) {
      toast.error(error.message ?? 'Setup failed. Please try again.');
    }
  };

  const StepComponent = STEP_COMPONENTS[step];
  const isLastStep = step === STEP_META.length - 1;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg">
        <div className="flex gap-2 mb-6">
          {STEP_META.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-primary/20'}`}
            />
          ))}
        </div>

        <Card className="shadow-xl relative overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{STEP_META[step].title}</CardTitle>
          </CardHeader>

          <CardContent className="min-h-75">
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
            <Button variant="outline" onClick={prevStep} disabled={step === 0 || isPending}>
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
