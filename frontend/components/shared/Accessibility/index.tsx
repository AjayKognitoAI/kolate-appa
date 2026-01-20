/**
 * Accessibility Components
 *
 * Components for WCAG 2.1 AA compliance.
 */

"use client";

import React, { useEffect, useState, useRef } from "react";
import { Box, Link, Typography, styled } from "@mui/material";

// =============================================================================
// Skip Links
// =============================================================================

const SkipLinkContainer = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "-100%",
  left: 0,
  zIndex: 9999,
  "&:focus-within": {
    top: 0,
  },
}));

const SkipLinkItem = styled(Link)(({ theme }) => ({
  display: "block",
  padding: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  textDecoration: "none",
  "&:focus": {
    outline: `2px solid ${theme.palette.common.white}`,
    outlineOffset: -2,
  },
}));

interface SkipLink {
  href: string;
  label: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
}

export const SkipLinks: React.FC<SkipLinksProps> = ({
  links = [
    { href: "#main-content", label: "Skip to main content" },
    { href: "#main-nav", label: "Skip to navigation" },
  ],
}) => (
  <SkipLinkContainer component="nav" aria-label="Skip links">
    {links.map((link) => (
      <SkipLinkItem key={link.href} href={link.href}>
        {link.label}
      </SkipLinkItem>
    ))}
  </SkipLinkContainer>
);

// =============================================================================
// Screen Reader Only (Visually Hidden)
// =============================================================================

export const VisuallyHidden = styled("span")({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

// =============================================================================
// Live Region (for announcements)
// =============================================================================

interface LiveRegionProps {
  message: string;
  politeness?: "polite" | "assertive";
  atomic?: boolean;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  politeness = "polite",
  atomic = true,
}) => (
  <VisuallyHidden
    role="status"
    aria-live={politeness}
    aria-atomic={atomic}
  >
    {message}
  </VisuallyHidden>
);

// =============================================================================
// Loading Announcer
// =============================================================================

interface LoadingAnnouncerProps {
  isLoading: boolean;
  loadingMessage?: string;
  loadedMessage?: string;
}

export const LoadingAnnouncer: React.FC<LoadingAnnouncerProps> = ({
  isLoading,
  loadingMessage = "Loading content...",
  loadedMessage = "Content loaded",
}) => (
  <LiveRegion message={isLoading ? loadingMessage : loadedMessage} />
);

// =============================================================================
// Error Announcer
// =============================================================================

interface ErrorAnnouncerProps {
  errors: Record<string, { message?: string }>;
}

export const ErrorAnnouncer: React.FC<ErrorAnnouncerProps> = ({ errors }) => {
  const errorCount = Object.keys(errors).length;
  if (errorCount === 0) return null;

  const messages = Object.values(errors)
    .map((e) => e.message)
    .filter(Boolean)
    .join(". ");

  return (
    <VisuallyHidden role="alert" aria-live="assertive">
      Form has {errorCount} {errorCount === 1 ? "error" : "errors"}. {messages}
    </VisuallyHidden>
  );
};

// =============================================================================
// Focus Manager
// =============================================================================

interface FocusManagerProps {
  children: React.ReactNode;
  restoreFocus?: boolean;
}

export const FocusManager: React.FC<FocusManagerProps> = ({
  children,
  restoreFocus = true,
}) => {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (restoreFocus) {
      previousFocus.current = document.activeElement as HTMLElement;
    }

    return () => {
      if (restoreFocus && previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, [restoreFocus]);

  return <>{children}</>;
};

// =============================================================================
// Accessible Heading
// =============================================================================

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

const variantMap: Record<number, "h1" | "h2" | "h3" | "h4" | "h5" | "h6"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
};

export const Heading: React.FC<HeadingProps> = ({ level, children, id, className }) => (
  <Typography
    component={`h${level}` as "h1"}
    variant={variantMap[level]}
    id={id}
    className={className}
    gutterBottom
  >
    {children}
  </Typography>
);

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to detect reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to announce messages to screen readers
 */
export function useAnnounce() {
  const [message, setMessage] = useState("");

  const announce = (msg: string, delay = 100) => {
    // Clear and reset for re-announcement
    setMessage("");
    setTimeout(() => setMessage(msg), delay);
  };

  return { message, announce, LiveRegion: () => <LiveRegion message={message} /> };
}

/**
 * Hook for managing focus trap
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    firstElement?.focus();

    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, active]);
}

export default {
  SkipLinks,
  VisuallyHidden,
  LiveRegion,
  LoadingAnnouncer,
  ErrorAnnouncer,
  FocusManager,
  Heading,
};
