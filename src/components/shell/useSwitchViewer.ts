"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { switchViewer } from "@/app/actions";
import type { ShellPerson } from "./types";

export function useSwitchViewer() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function switchTo(person: ShellPerson) {
    startTransition(async () => {
      await switchViewer(person.key);
      router.refresh();
      toast.success(`Now viewing as ${person.name}`, { description: person.role });
    });
  }
  return { switchTo, pending };
}
