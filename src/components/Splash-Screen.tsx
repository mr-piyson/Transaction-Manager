"use client";

import type React from "react";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import Logo from "@/components/Logo";

export function SplashScreen(props: {
  children: React.ReactNode;
  minimumLoadingTime?: number;
}) {
  const { minimumLoadingTime = 1000 } = props;
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const initialResourceCount = useRef(0);
  const resourcesLoaded = useRef(0);
  const rafId = useRef<number | null>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    // Get initial count of resources that need to be loaded
    initialResourceCount.current =
      performance.getEntriesByType("resource").length;

    // Function to calculate and update progress
    const updateProgress = () => {
      // Get current resources
      const resources = performance.getEntriesByType("resource");

      // Count completed resources (those with a non-zero duration)
      const completedResources = resources.filter(
        (resource) => resource.duration > 0
      ).length;
      resourcesLoaded.current = completedResources;

      // Calculate progress percentage
      // We add 1 to account for the HTML document itself
      const totalResources =
        Math.max(initialResourceCount.current, resources.length) + 1;
      let calculatedProgress = Math.min(
        100,
        Math.round((completedResources / totalResources) * 100)
      );

      // Ensure progress never goes backwards and always reaches 100
      const elapsedTime = Date.now() - startTime.current;
      const timeProgress = Math.min(
        100,
        (elapsedTime / minimumLoadingTime) * 100
      );

      // Use the higher of the two progress values to ensure smooth progression
      calculatedProgress = Math.max(calculatedProgress, progress, timeProgress);

      // Update progress state
      setProgress(Math.floor(calculatedProgress));

      // Continue updating until we reach 100%
      if (calculatedProgress < 100 && loading) {
        rafId.current = requestAnimationFrame(updateProgress);
      } else if (calculatedProgress >= 100 && loading) {
        // When progress reaches 100%, wait for minimum loading time before hiding splash screen
        timeout = setTimeout(() => {
          setLoading(false);
        }, Math.max(0, minimumLoadingTime - elapsedTime));
      }
    };

    // Start tracking progress
    rafId.current = requestAnimationFrame(updateProgress);

    // Track when the page is fully loaded
    const handleLoad = () => {
      // Force progress to 100% when load event fires
      setProgress(100);
    };

    window.addEventListener("load", handleLoad);

    return () => {
      window.removeEventListener("load", handleLoad);
      if (timeout) clearTimeout(timeout);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [minimumLoadingTime, loading, progress]);

  return (
    <>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex w-full max-w-md flex-col items-center gap-4 px-4"
            >
              <Logo className="size-64" />
              <h1 className="text-2xl font-bold">Loading your application</h1>

              <div className=" space-y-2 w-[80%]">
                <div className="flex justify-between">
                  <p className="text-sm text-muted-foreground">
                    Loading resources...
                  </p>
                  <p className="text-sm font-medium">{progress}%</p>
                </div>
                <Progress value={progress} className="h-2 w-full " />
              </div>

              {/* <p className="text-center text-sm text-muted-foreground">
                {resourcesLoaded.current} resources loaded
              </p> */}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!loading && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="h-full"
          >
            {props.children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
