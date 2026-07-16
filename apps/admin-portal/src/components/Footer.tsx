<<<<<<< HEAD
import { useNavigate, Link } from 'react-router-dom';
=======
import { useNavigate } from 'react-router-dom';
>>>>>>> 1a3f757750b6081d2d9ea002247c0a3995feabc4
import HeaderLogo from '../assets/branding/header-2.svg';

export function Footer() {
    const navigate = useNavigate();

    const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        if (path.startsWith('#')) {
            // If we are not on the landing page, navigate to home first with the hash
            if (window.location.pathname !== '/') {
                navigate('/' + path);
            } else {
                const element = document.getElementById(path.substring(1));
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }
        } else {
            navigate(path);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <footer className="bg-[#001338] pt-20 pb-10 relative z-10">
            <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                    <div>
                        <h4 className="text-white font-bold mb-6 tracking-wide">Product</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#features" onClick={(e) => handleAnchorClick(e, '#features')} className="hover:text-white transition-colors">Features</a></li>
                            <li><a href="#pricing" onClick={(e) => handleAnchorClick(e, '#pricing')} className="hover:text-white transition-colors">Pricing</a></li>
                            <li><a href="#security" onClick={(e) => handleAnchorClick(e, '#security')} className="hover:text-white transition-colors">Security</a></li>
<<<<<<< HEAD
                            <li><Link to="/support" className="hover:text-white transition-colors">Help Center</Link></li>
=======
                            <li><a href="/help" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Help Center</a></li>
>>>>>>> 1a3f757750b6081d2d9ea002247c0a3995feabc4
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6 tracking-wide">Company</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">About us</a></li>
                            <li><a href="mailto:contact@trackowl.io" className="hover:text-white transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6 tracking-wide">Legal</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">Privacy policy</a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/terms'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">Terms of service</a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/security'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">Security</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6 tracking-wide">Contact</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li>
                                <a href="mailto:contact@trackowl.io" className="hover:text-[#facc15] font-medium transition-colors flex items-center gap-2">
                                    contact@trackowl.io
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
                    <img src={HeaderLogo} className="h-6 object-contain opacity-50 hover:opacity-100 transition-opacity cursor-pointer" alt="TrackOwl" onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                    <p>TrackOwl™ , a product by DigiReps®</p>
                </div>
            </div>
        </footer>
    );
}
