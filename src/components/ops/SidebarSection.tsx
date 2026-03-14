import { ChevronDown } from "lucide-react";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export const SidebarSection = ({ title, description, children, defaultOpen = true }: SidebarSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="ops-panel p-4">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div>
          <h3 className="heading-tight text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <ChevronDown className={cn("mt-0.5 h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? <div className="mt-4 space-y-4">{children}</div> : null}
    </section>
  );
};
