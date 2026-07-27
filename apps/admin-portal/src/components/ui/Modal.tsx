import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    maxWidth?: string;
    allowOverflow?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    maxWidth = 'max-w-lg',
    allowOverflow = false,
}: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className={clsx(
                "bg-surface rounded-[32px] w-full shadow-2xl flex flex-col border border-border animate-in zoom-in-95 slide-in-from-bottom-8 duration-500",
                allowOverflow ? "overflow-visible" : "overflow-hidden",
                maxWidth
            )}
            onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className={clsx("px-8 py-6 border-b border-border bg-surface-subtle", allowOverflow && "rounded-t-[32px]")}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary tracking-tight leading-tight mb-2">
                                {title}
                            </h2>
                            {subtitle && (
                                <div className="mt-1">
                                    {typeof subtitle === 'string' ? (
                                        <p className="text-[10px] font-bold text-text-muted font-mono">{subtitle}</p>
                                    ) : (
                                        subtitle
                                    )}
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-3 bg-black/5 hover:bg-black/10 rounded-2xl transition-all text-text-muted hover:text-text-primary"
                        >
                            <X className="w-5 h-5" strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className={clsx("flex-1 px-8 py-8 custom-scrollbar", allowOverflow ? "overflow-visible" : "overflow-y-auto")}>
                    {children}
                </div>

                {/* Modal Footer */}
                {footer && (
                    <div className={clsx("px-8 py-6 border-t border-border bg-surface-subtle flex items-center justify-end gap-4", allowOverflow && "rounded-b-[32px]")}>
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
