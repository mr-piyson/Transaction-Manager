import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type DynamicHeaderTextProps = {
  isSticky?: boolean;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

export const StickyHeaderText = ({
  isSticky,
  children,
  className,
  ...props
}: DynamicHeaderTextProps) => {
  return (
    <span
      className={cn(
        `
        transition-all duration-300 ease-in-out
        ${
          isSticky
            ? "text-xl font-semibold" // Style when sticky
            : "text-4xl font-bold" // Style when not sticky
        }
      `,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export const StickyHeader = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { root: null, rootMargin: "0px", threshold: 0 },
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Invisible sentinel for the IntersectionObserver */}
      <div ref={sentinelRef} className="h-px"></div>

      {/* The main sticky container. Note it no longer has font-size classes. */}
      <div
        className={cn(
          `
          sticky top-0 z-50 p-4 
          flex items-center justify-between
          transition-colors duration-300 ease-in-out
        `,
          props.className,
        )}
      >
        {/* We map over children to find and inject props into DynamicHeaderText */}
        {React.Children.map(props.children, (child) => {
          // Check if the child is a valid React element and its type is DynamicHeaderText
          if (React.isValidElement(child) && child.type === StickyHeaderText) {
            // If it is, clone it and inject the isSticky prop
            return React.cloneElement(
              child as React.ReactElement<DynamicHeaderTextProps>,
              { isSticky: isSticky },
            );
          }
          // Otherwise, return the child unmodified (e.g., a button, icon, etc.)
          return child;
        })}
      </div>
    </>
  );
};
