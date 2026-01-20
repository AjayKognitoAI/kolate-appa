"use client";
import { createContext, useState, ReactNode, useEffect } from "react";
import config from "./config";
import React from "react";

// LocalStorage keys for persistence
const THEME_MODE_KEY = "kolate_theme_mode";
const LANGUAGE_KEY = "kolate_language";

// Helper functions for safe localStorage access (SSR compatible)
const getStoredValue = (key: string, fallback: string): string => {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const setStoredValue = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage errors
  }
};

// Define the shape of the context state
interface CustomizerContextState {
  activeDir: string;
  setActiveDir: (dir: string) => void;
  activeMode: string;
  setActiveMode: (mode: string) => void;
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
  activeLayout: string;
  setActiveLayout: (layout: string) => void;
  isCardShadow: boolean;
  setIsCardShadow: (shadow: boolean) => void;
  isLayout: string;
  setIsLayout: (layout: string) => void;
  isBorderRadius: number;
  setIsBorderRadius: (radius: number) => void;
  isCollapse: string;
  setIsCollapse: (collapse: string) => void;
  isSidebarHover: boolean;
  setIsSidebarHover: (isHover: boolean) => void;
  isMobileSidebar: boolean;
  setIsMobileSidebar: (isMobileSidebar: boolean) => void;
  isLanguage: string;
  setIsLanguage: (language: string) => void;
}

// Create the context with an initial value
export const CustomizerContext = createContext<CustomizerContextState | any>(
  undefined
);

// Define the type for the children prop
interface CustomizerContextProps {
  children: ReactNode;
}

// Create the provider component
export const CustomizerContextProvider: React.FC<CustomizerContextProps> = ({
  children,
}) => {
  // Initialize state with config defaults (will be updated from localStorage on mount)
  const [activeDir, setActiveDir] = useState<string>(config.activeDir);
  const [activeMode, setActiveModeState] = useState<string>(config.activeMode);
  const [activeTheme, setActiveTheme] = useState<string>(config.activeTheme);
  const [activeLayout, setActiveLayout] = useState<string>(config.activeLayout);
  const [isCardShadow, setIsCardShadow] = useState<boolean>(config.isCardShadow);
  const [isLayout, setIsLayout] = useState<string>(config.isLayout);
  const [isBorderRadius, setIsBorderRadius] = useState<number>(config.isBorderRadius);
  const [isCollapse, setIsCollapse] = useState<string>(config.isCollapse);
  const [isLanguage, setIsLanguageState] = useState<string>(config.isLanguage);
  const [isSidebarHover, setIsSidebarHover] = useState<boolean>(false);
  const [isMobileSidebar, setIsMobileSidebar] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Load persisted values from localStorage on mount
  useEffect(() => {
    const storedMode = getStoredValue(THEME_MODE_KEY, config.activeMode);
    const storedLanguage = getStoredValue(LANGUAGE_KEY, config.isLanguage);

    setActiveModeState(storedMode);
    setIsLanguageState(storedLanguage);
    setIsHydrated(true);
  }, []);

  // Wrapper for setActiveMode that also persists to localStorage
  const setActiveMode = (mode: string) => {
    setActiveModeState(mode);
    setStoredValue(THEME_MODE_KEY, mode);
  };

  // Wrapper for setIsLanguage that also persists to localStorage
  const setIsLanguage = (language: string) => {
    setIsLanguageState(language);
    setStoredValue(LANGUAGE_KEY, language);
  };

  // Set attributes immediately after hydration
  useEffect(() => {
    if (!isHydrated) return;

    document.documentElement.setAttribute("class", activeMode);
    document.documentElement.setAttribute("dir", activeDir);
    document.documentElement.setAttribute("data-color-theme", activeTheme);
    document.documentElement.setAttribute("data-layout", activeLayout);
    document.documentElement.setAttribute("data-boxed-layout", isLayout);
    document.documentElement.setAttribute("data-sidebar-type", isCollapse);
  }, [activeMode, activeDir, activeTheme, activeLayout, isLayout, isCollapse, isHydrated]);

  return (
    <CustomizerContext.Provider
      value={{
        activeDir,
        setActiveDir,
        activeMode,
        setActiveMode,
        activeTheme,
        setActiveTheme,
        activeLayout,
        setActiveLayout,
        isCardShadow,
        setIsCardShadow,
        isLayout,
        setIsLayout,
        isBorderRadius,
        setIsBorderRadius,
        isCollapse,
        setIsCollapse,
        isLanguage,
        setIsLanguage,
        isSidebarHover,
        setIsSidebarHover,
        isMobileSidebar,
        setIsMobileSidebar,
      }}
    >
      {children}
    </CustomizerContext.Provider>
  );
};
