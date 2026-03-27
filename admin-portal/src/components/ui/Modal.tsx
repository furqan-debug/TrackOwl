import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
    footer?: ReactNode;
    maxWidth?: string;
}

export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    maxWidth = 'max-w-lg',
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-text-primary/20 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={clsx(
                "bg-white rounded-[32px] w-full shadow-2xl flex flex-col border border-border overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500",
                maxWidth
            )}>
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-border bg-surface-subtle">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary tracking-tight leading-tight mb-2">
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">
                                    {subtitle}
                                </p>
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
                <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                    {children}
                </div>

                {/* Modal Footer */}
                {footer && (
                    <div className="px-8 py-6 border-t border-border bg-surface-subtle flex items-center justify-end gap-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
