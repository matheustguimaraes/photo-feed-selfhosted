"use client";

import Navbar, { NavbarProps } from "@/components/Navbar";

interface PageLayoutProps extends NavbarProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "full";
  showNavbar?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  full: "max-w-full",
};

export default function PageLayout({
  children,
  leftElement,
  rightElements,
  maxWidth = "4xl",
  showNavbar = true,
}: PageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {showNavbar && (
        <Navbar leftElement={leftElement} rightElements={rightElements} />
      )}
      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className={`mx-auto w-full ${maxWidthClasses[maxWidth]}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
