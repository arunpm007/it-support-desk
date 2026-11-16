"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "./PersonAvatar";
import type { ShellData } from "./types";
import { useSwitchViewer } from "./useSwitchViewer";

type Props = Pick<ShellData, "viewer" | "people"> & {
  compact?: boolean;
  side?: "right" | "top" | "bottom";
  align?: "start" | "end";
};

export function UserSwitcher({ viewer, people, compact, side = "right", align = "end" }: Props) {
  const { switchTo, pending } = useSwitchViewer();
  const staff = people.find((p) => p.key === "staff");
  const employees = people.filter((p) => p.key !== "staff");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Viewing as ${viewer.name}. Switch user`}
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-foreground/5",
            compact && "justify-center",
          )}
        >
          <PersonAvatar personKey={viewer.key} name={viewer.name} className="size-9 rounded-xl" />
          {!compact && (
            <>
              <span className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-sm font-medium">{viewer.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {viewer.isStaff ? "IT staff · Admin" : `Employee · ${viewer.role}`}
                </span>
              </span>
              {pending ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <ChevronsUpDown className="size-4 text-muted-foreground transition-transform group-hover:scale-110" />
              )}
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} sideOffset={10} className="w-72">
        <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Demo · view the app as
        </DropdownMenuLabel>
        {staff && (
          <DropdownMenuItem onSelect={() => switchTo(staff)} className="gap-3 py-2">
            <PersonAvatar personKey="staff" name={staff.name} className="size-8" />
            <span className="grid flex-1 leading-tight">
              <span className="text-sm font-medium">IT Staff</span>
              <span className="text-xs text-muted-foreground">Sees every device and ticket</span>
            </span>
            {viewer.key === "staff" && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuGroup className="max-h-72 overflow-y-auto">
          <DropdownMenuLabel className="px-2 pt-1 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Employees
          </DropdownMenuLabel>
          {employees.map((p) => (
            <DropdownMenuItem key={p.key} onSelect={() => switchTo(p)} className="gap-3 py-1.5">
              <PersonAvatar personKey={p.key} name={p.name} className="size-8" />
              <span className="grid flex-1 leading-tight">
                <span className="text-sm">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.role}</span>
              </span>
              {viewer.key === p.key && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
