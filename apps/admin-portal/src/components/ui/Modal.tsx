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
            className="
                fixed inset-0 z-[100]
                flex items-center justify-center
                overflow-y-auto
                p-3 sm:p-6
                bg-slate-900/60
                backdrop-blur-md
                animate-in fade-in duration-300
            "
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={clsx(
                    `
                    bg-surface
                    rounded-2xl sm:rounded-[32px]
                    w-full
                    max-w-[calc(100vw-24px)]
                    sm:max-w-[calc(100vw-48px)]
                    max-h-[calc(100dvh-24px)]
                    sm:max-h-[calc(100dvh-48px)]
                    min-w-0
                    shadow-2xl
                    flex flex-col
                    border border-border
                    animate-in
                    zoom-in-95
                    slide-in-from-bottom-8
                    duration-500
                    `,
                    allowOverflow
                        ? "overflow-visible"
                        : "overflow-hidden",
                    maxWidth
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div
                    className={clsx(
                        `
                        shrink-0
                        px-4 py-4
                        sm:px-8 sm:py-6
                        border-b border-border
                        bg-surface-subtle
                        min-w-0
                        `,
                        allowOverflow &&
                            "rounded-t-2xl sm:rounded-t-[32px]"
                    )}
                >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="min-w-0 flex-1">
                            <h2 className="
                                text-xl sm:text-2xl
                                font-bold
                                text-text-primary
                                tracking-tight
                                leading-tight
                                mb-1 sm:mb-2
                                break-words
                            ">
                                {title}
                            </h2>

                            {subtitle && (
                                <div className="mt-1 min-w-0">
                                    {typeof subtitle === 'string' ? (
                                        <p className="text-[10px] font-bold text-text-muted font-mono break-words">
                                            {subtitle}
                                        </p>
                                    ) : (
                                        subtitle
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="
                                p-2.5 sm:p-3
                                shrink-0
                                bg-black/5
                                hover:bg-black/10
                                rounded-xl sm:rounded-2xl
                                transition-all
                                text-text-muted
                                hover:text-text-primary
                            "
                        >
                            <X className="w-5 h-5" strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div
                    className={clsx(
                        `
                        flex-1
                        min-h-0
                        min-w-0
                        px-4 py-5
                        sm:px-8 sm:py-8
                        custom-scrollbar
                        `,
                        allowOverflow
                            ? "overflow-visible"
                            : "overflow-y-auto"
                    )}
                >
                    {children}
                </div>

                {/* Modal Footer */}
                {footer && (
                    <div
                        className={clsx(
                            `
                            shrink-0
                            px-4 py-4
                            sm:px-8 sm:py-6
                            border-t border-border
                            bg-surface-subtle
                            flex flex-col
                            sm:flex-row
                            items-stretch
                            sm:items-center
                            justify-end
                            gap-3
                            sm:gap-4
                            `,
                            allowOverflow &&
                                "rounded-b-2xl sm:rounded-b-[32px]"
                        )}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
