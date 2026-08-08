"use client";

import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const app = useTranslations("app");
  const nav = useTranslations("nav");
  const { data: session, status } = useSession();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold">
          {app("name")}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/documents" className="text-muted-foreground hover:text-foreground">
            {nav("documents")}
          </Link>
          {status === "authenticated" ? (
            <>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                {nav("dashboard")}
              </Link>
              <span className="text-muted-foreground">{session.user?.email}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                {nav("login")}
              </Link>
              <Button asChild size="sm">
                <Link href="/register">{nav("signup")}</Link>
              </Button>
            </>
          )}
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
