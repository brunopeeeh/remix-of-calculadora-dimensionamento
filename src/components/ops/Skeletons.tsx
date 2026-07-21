/**
 * Skeleton components para estados de loading.
 * Usa `animate-skeleton` definido em index.css (shimmer GPU-only).
 */

/** Skeleton para a seção de KPI cards (6 cards) */
export const KPISkeleton = () => (
  <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="ops-panel p-4 flex flex-col gap-3"
        style={{ animationDelay: `${i * 55}ms` }}
      >
        {/* Icon + label */}
        <div className="flex items-center gap-2">
          <div className="skeleton-line h-6 w-6 rounded-md" />
          <div className="skeleton-line h-3 w-24 rounded" />
        </div>
        {/* Valor */}
        <div className="skeleton-line h-8 w-20 rounded" />
        {/* Subtítulo */}
        <div className="mt-auto skeleton-line h-3 w-32 rounded" />
      </div>
    ))}
  </section>
);

/** Skeleton genérico para seções de gráficos */
export const ChartsSkeleton = () => (
  <section className="grid gap-4 xl:grid-cols-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="ops-panel p-4 flex flex-col gap-3">
        {/* Título do card */}
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-line h-3.5 w-40 rounded" />
          <div className="skeleton-line h-3 w-56 rounded opacity-60" />
        </div>
        {/* Área do gráfico */}
        <div className="skeleton-line rounded h-[220px] w-full" />
      </div>
    ))}
  </section>
);

/** Skeleton para a tabela mensal */
export const TableSkeleton = () => (
  <div className="ops-panel overflow-hidden">
    {/* Header */}
    <div className="border-b p-3 flex gap-3">
      {[80, 60, 72, 60, 60, 60, 60].map((w, i) => (
        <div key={i} className={`skeleton-line h-3 rounded`} style={{ width: w }} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: 8 }).map((_, row) => (
      <div
        key={row}
        className="border-b px-3 py-2.5 flex gap-3"
        style={{ opacity: 1 - row * 0.08 }}
      >
        {[80, 60, 72, 60, 60, 60, 60].map((w, col) => (
          <div key={col} className="skeleton-line h-3 rounded" style={{ width: w }} />
        ))}
      </div>
    ))}
  </div>
);

/** Skeleton simples: spinner substituído por linha animada */
export const SectionSkeleton = () => (
  <div className="flex flex-col gap-3 py-6 px-2">
    <div className="skeleton-line h-4 w-48 rounded" />
    <div className="skeleton-line h-4 w-64 rounded opacity-70" />
    <div className="skeleton-line h-4 w-40 rounded opacity-50" />
  </div>
);
