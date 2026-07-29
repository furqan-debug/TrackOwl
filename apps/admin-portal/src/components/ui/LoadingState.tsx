import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface LoadingStateProps {
    /** Optional message (default: "Assembling operational data...") */
    message?: string;
    /** Optional custom content (e.g. skeleton) instead of message */
    children?: ReactNode;
    /** Min height (default: h-48) */
    className?: string;
}

export function LoadingState({
    message = 'Assembling operational data...',
    children,
    className = 'min-h-[12rem]',
}: LoadingStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-8 ${className}`}
        >
            {children ?? (
                <div className="flex flex-col items-center justify-center">
                    {/* Abstract Data Loader */}
                    <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                        {/* Outer Orbit */}
                        <motion.div 
                            className="absolute inset-0 rounded-full border border-dashed border-primary/30"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        >
                            <motion.div 
                                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full shadow-[0_0_15px_var(--color-primary)]"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                        </motion.div>

                        {/* Middle Orbit */}
                        <motion.div 
                            className="absolute inset-5 rounded-full border border-primary/20"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        >
                            <motion.div 
                                className="absolute bottom-0 left-1/4 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)]"
                                animate={{ scale: [1, 2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                            />
                        </motion.div>

                        {/* Inner Geometric Core */}
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            {[0, 45, 90, 135].map((rotation, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-full h-full border-2 border-primary/40 rounded-lg"
                                    style={{ rotate: rotation }}
                                    animate={{ 
                                        rotate: [rotation, rotation + 90],
                                        scale: [1, 1.1, 1],
                                        borderColor: ['var(--color-primary)', 'rgba(212, 175, 55, 0.2)', 'var(--color-primary)']
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                />
                            ))}
                            
                            <motion.div 
                                className="absolute w-4 h-4 bg-primary rounded-sm shadow-[0_0_20px_var(--color-primary)]"
                                animate={{ 
                                    rotate: [0, 90, 180, 270, 360],
                                    scale: [1, 1.4, 1, 1.4, 1]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            />
                        </div>
                    </div>

                    {/* Text Animation */}
                    <div className="flex flex-col items-center gap-2 relative">
                        {/* Ambient glow behind text */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-10 bg-primary/10 blur-xl rounded-full pointer-events-none" />
                        
                        <motion.div 
                            className="text-[13px] font-black tracking-[0.3em] uppercase text-primary"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                            Syncing Data
                        </motion.div>
                        
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] font-medium text-text-muted tracking-widest">{message}</span>
                            <motion.span
                                className="text-[11px] font-black text-primary"
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                                _
                            </motion.span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
