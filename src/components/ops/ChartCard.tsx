import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const ChartCard = ({ title, subtitle, children }: ChartCardProps) => {
  return (
    <section className="ops-panel p-4">
      <header className="mb-3">
        <h3 className="heading-tight text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>
      <div className="h-64">{children}</div>
    </section>
  );
};
