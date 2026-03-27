import { Camera, Maximize2, ShieldCheck } from 'lucide-react';
import { Card } from '../ui';
import { SecureImage } from '../ui/SecureImage';

interface ScreenshotGalleryProps {
    screenshots: any[];
    onSelectImage: (screenshot: any) => void;
}

export function ScreenshotGallery({ screenshots, onSelectImage }: ScreenshotGalleryProps) {
    return (
        <Card title="Screenshots">
            {screenshots.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center text-text-muted opacity-40">
                    <Camera className="w-16 h-16 mb-6" />
                    <h3 className="text-2xl font-bold text-text-primary tracking-tighter mb-2">No Screenshots</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] font-mono">No screenshots recorded for this period</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                    {screenshots.map((ss) => (
                        <div 
                            key={ss.id}
                            onClick={() => onSelectImage(ss)}
                            className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all aspect-video cursor-pointer shadow-sm hover:shadow-md"
                        >
                            <SecureImage 
                                path={ss.file_url} 
                                alt="Surveillance Capture" 
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5">
                                <p className="text-xs font-semibold text-white tracking-wider uppercase mb-1 drop-shadow-md">
                                    {new Date(ss.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <div className="flex items-center gap-1.5 text-white/90">
                                    <Maximize2 className="w-4 h-4" strokeWidth={2.5} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">VIEW</span>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 w-7 h-7 rounded-xl bg-white/40 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
