"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleLogout } from "@/lib/auth";

export interface NavbarProps {
  leftElement?: React.ReactNode;
  rightElements?: React.ReactNode[];
}

export default function Navbar({ leftElement, rightElements }: NavbarProps) {
  const router = useRouter();

  const defaultLeftElement = (
    <Link href="/feed" className="text-xl font-bold text-black">
      Nuvem
    </Link>
  );

  const defaultRightElements = [
    <Link
      key="new-post"
      href="/feed/new"
      className="text-black hover:text-black/70"
      title="Novo post"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    </Link>,
    <Link
      key="profile"
      href="/profile"
      className="text-black hover:text-black/70"
      title="Perfil"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </Link>,
    <button
      key="logout"
      onClick={() => {
        handleLogout();
        router.push("/login");
      }}
      className="text-black hover:text-black/70"
      title="Sair"
    >
      Sair
    </button>,
  ];

  return (
    <nav className="sticky top-0 z-10 border-b border-black bg-white">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {leftElement || defaultLeftElement}
          <div className="flex items-center gap-4">
            {rightElements || defaultRightElements}
          </div>
        </div>
      </div>
    </nav>
  );
}
