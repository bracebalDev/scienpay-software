import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, actions }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 pb-2 border-b border-[#EDEDEB] dark:border-[#2F2F2F]">
    <div>
      <h2 className="text-xl font-bold text-[#37352F] dark:text-white flex items-center space-x-2">
        {icon}
        <span>{title}</span>
      </h2>
      {subtitle && (
        <p className="text-xs text-[#787774] dark:text-[#9B9A97] mt-0.5 max-w-3xl">{subtitle}</p>
      )}
    </div>
    {actions && <div className="flex items-center space-x-2">{actions}</div>}
  </div>
);

interface SectionBannerProps {
  tone: 'amber' | 'blue' | 'green';
  title: string;
  children: React.ReactNode;
}

const bannerTones = {
  amber:
    'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/50 text-amber-900 dark:text-amber-200',
  blue: 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/50 text-blue-950 dark:text-blue-200',
  green:
    'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-200',
};

export const SectionBanner: React.FC<SectionBannerProps> = ({ tone, title, children }) => (
  <div className={`p-4 rounded-xl border text-xs ${bannerTones[tone]}`}>
    <span className="font-bold">{title}</span>
    <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">{children}</p>
  </div>
);
