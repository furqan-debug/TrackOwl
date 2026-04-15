import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, ImageOff } from 'lucide-react';
import { getCachedUrl, setCachedUrl } from '../../lib/urlCache';

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    path: string;
    bucket?: string;
}

const EXPIRY_SECONDS = 86400; // 24 hours

export function SecureImage({ path, bucket = 'screenshots', className, ...props }: SecureImageProps) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchSignedUrl = async () => {
            if (!path) return;
            
            // 1. If it's already a full URL AND NOT a Supabase storage URL, use it directly
            if (path.startsWith('http') && !path.includes('.supabase.co/storage/v1/object/')) {
                setUrl(path);
                setLoading(false);
                return;
            }

            // 2. Check internal cache first to avoid redundant Supabase API calls & egress
            const cached = getCachedUrl(bucket, path);
            if (cached) {
                setUrl(cached);
                setLoading(false);
                return;
            }

            // 3. Extract the final path if it's a full Supabase URL
            let finalPath = path;
            if (path.includes('.supabase.co/storage/v1/object/')) {
                const parts = path.split('/avatars/');
                if (parts.length > 1) {
                    finalPath = parts[1];
                }
            }

            try {
                setLoading(true);
                setError(false);
                
                const { data, error: storageError } = await supabase.storage
                    .from(bucket)
                    .createSignedUrl(finalPath, EXPIRY_SECONDS);

                if (storageError) throw storageError;
                
                if (data?.signedUrl) {
                    // Update cache and state
                    setCachedUrl(bucket, path, data.signedUrl, EXPIRY_SECONDS);
                    setUrl(data.signedUrl);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error(`Error loading secure image from ${bucket}:`, err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchSignedUrl();
    }, [path, bucket]);

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-slate-50/50 ${className}`}>
                <Loader2 className="w-5 h-5 animate-spin text-blue-600/20" />
            </div>
        );
    }

    if (error || !url) {
        return (
            <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}>
                <ImageOff className="w-5 h-5" />
            </div>
        );
    }

    return <img src={url} className={className} {...props} />;
}
