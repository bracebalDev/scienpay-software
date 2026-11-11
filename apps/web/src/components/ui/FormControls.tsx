import React from 'react';

export const inputClass =
  'w-full text-xs p-2 rounded-lg border border-[#E9E9E7] dark:border-[#383838] bg-[#F7F6F3] dark:bg-[#2A2A2A] text-[#37352F] dark:text-white focus:outline-none focus:border-primary disabled:opacity-60';

const errorClass =
  'w-full text-xs p-2 rounded-lg border border-rose-400 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/20 text-[#37352F] dark:text-white focus:outline-none focus:border-rose-500 disabled:opacity-60';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, hint, required, children }) => (
  <div className="space-y-1">
    <label className="block text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97]">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-[10px] text-[#9B9A97] dark:text-[#888886]">{hint}</p>}
    {error && <p className="text-[10px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}
  </div>
);

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean };

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ hasError, className, ...props }, ref) => (
    <input
      ref={ref}
      {...props}
      className={`${hasError ? errorClass : inputClass} ${className ?? ''}`}
    />
  ),
);
TextInput.displayName = 'TextInput';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean };

export const SelectInput = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError, className, children, ...props }, ref) => (
    <select
      ref={ref}
      {...props}
      className={`${hasError ? errorClass : inputClass} ${className ?? ''}`}
    >
      {children}
    </select>
  ),
);
SelectInput.displayName = 'SelectInput';

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean };

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ hasError, className, ...props }, ref) => (
    <textarea
      ref={ref}
      {...props}
      className={`${hasError ? errorClass : inputClass} ${className ?? ''}`}
    />
  ),
);
TextArea.displayName = 'TextArea';

export const FormActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center justify-end space-x-2 pt-2">{children}</div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md';
}

const buttonVariants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary hover:bg-primary-hover text-white shadow-sm',
  secondary:
    'bg-[#EAE9E5] dark:bg-[#2C2C2C] text-[#37352F] dark:text-white hover:bg-[#E2E1DC] dark:hover:bg-[#383838]',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  ghost:
    'text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white hover:bg-[#F7F6F3] dark:hover:bg-[#2A2A2A]',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center space-x-1.5 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
      size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-2 text-xs'
    } ${buttonVariants[variant]} ${className ?? ''}`}
  >
    {children}
  </button>
);
