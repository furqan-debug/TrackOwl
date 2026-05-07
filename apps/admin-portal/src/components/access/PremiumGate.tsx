import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { FeatureLockOverlay } from './FeatureLockOverlay';
import { LoadingState } from '../ui';

interface PremiumGateProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

export function PremiumGate({ children, title, description }: PremiumGateProps) {
    const { organization, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12">
                <LoadingState />
            </div>
        );
    }

    const isPremium = organization?.plan_type === 'Premium' || organization?.subscription_status === 'Trial';

    if (!isPremium) {
        return (
            <div className="relative min-h-[400px]">
                {/* Blurry version of children for aesthetic effect */}
                <div className="blur-sm grayscale opacity-30 pointer-events-none">
                    {children}
                </div>
                <FeatureLockOverlay title={title} description={description} />
            </div>
        );
    }

    return <>{children}</>;
}
