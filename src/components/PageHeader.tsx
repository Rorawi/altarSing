import type { ReactNode } from 'react';

export default function PageHeader({
  title,
  description,
  actions,
  className = '',
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-7 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}
