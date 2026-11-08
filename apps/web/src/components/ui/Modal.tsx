import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

/**
 * Modal accesible básico: cierra con Escape y con clic en el fondo.
 * No usa portal porque la aplicación monta un único árbol y el z-index alto
 * es suficiente; se documenta como decisión de Fase 3.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-xl',
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2F2F2F] rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 pb-3 border-b border-[#EDEDEB] dark:border-[#2F2F2F]">
          <div>
            <h2 className="text-base font-bold text-[#37352F] dark:text-white leading-tight">{title}</h2>
            {subtitle && (
              <p className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white hover:bg-[#F7F6F3] dark:hover:bg-[#2A2A2A] transition"
            title="Cerrar (Esc)"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">{children}</div>

        {footer && (
          <div className="px-5 py-3 border-t border-[#EDEDEB] dark:border-[#2F2F2F]">{footer}</div>
        )}
      </div>
    </div>
  );
};
