import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Search, ChevronRight, BookOpen, Clock, Moon, Sun,
  Rocket, Building, Users, UsersRound, FolderKanban, CheckSquare,
  Monitor, Camera, Activity, CalendarClock, MapPin, DollarSign,
  CreditCard, FileText, Briefcase, Settings, Blocks, ShieldCheck, HelpCircle,
  Check, ChevronDown, Loader2
} from 'lucide-react';
import { marked } from 'marked';
import { motion, AnimatePresence } from 'framer-motion';

// Use Vite's glob import to get all markdown files
const modules = import.meta.glob('./content/*.md', { query: '?raw', eager: true });

function parseMarkdown(rawContent: string) {
  let title = 'Untitled Document';
  let category = 'Uncategorized';
  let content = rawContent;

  const match = rawContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match) {
    const frontmatter = match[1];
    content = match[2];
    
    const titleMatch = frontmatter.match(/title:\s*(.*)/);
    if (titleMatch) title = titleMatch[1].trim();

    const catMatch = frontmatter.match(/category:\s*(.*)/);
    if (catMatch) category = catMatch[1].trim();
  }

  // Pre-process GitHub style alerts for Marked
  content = content.replace(/> \[!NOTE\]\n>([\s\S]*?)(?=\n\n|\n*$)/g, '<div class="alert alert-note"><strong>Note:</strong>$1</div>');
  content = content.replace(/> \[!IMPORTANT\]\n>([\s\S]*?)(?=\n\n|\n*$)/g, '<div class="alert alert-important"><strong>Important:</strong>$1</div>');
  content = content.replace(/> \[!TIP\]\n>([\s\S]*?)(?=\n\n|\n*$)/g, '<div class="alert alert-tip"><strong>Tip:</strong>$1</div>');

  // Also remove the `>` from the captured alert bodies
  content = content.replace(/<div class="alert (.*?)"><strong>(.*?)<\/strong>([\s\S]*?)<\/div>/g, (_match, p1, p2, p3) => {
      const cleanMarkdown = p3.replace(/\n>\s?/g, '\n');
      return `<div class="alert ${p1}"><strong class="alert-title">${p2}</strong>${marked(cleanMarkdown)}</div>`;
  });

  let html = marked(content) as string;
  // Automatically add IDs to h2 tags for the Table of Contents anchor links
  html = html.replace(/<h2>(.*?)<\/h2>/g, (_match, p1) => {
      const id = p1.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `<h2 id="${id}">${p1}</h2>`;
  });

  return { title, category, content, html };
}

const articles = Object.keys(modules).map((path) => {
  const mod = modules[path] as any;
  const raw = (mod.default ? mod.default : mod) as string;
  const slug = path.replace('./content/', '').replace('.md', '');
  const { title, category, content, html } = parseMarkdown(raw);
  return { slug, title, category, content, html };
});

const categories = Array.from(new Set(articles.map(a => a.category))).sort();

const categoryMeta: Record<string, { icon: any, desc: string }> = {
  "Getting Started": { icon: Rocket, desc: "Learn how to set up your TrackOwl account and quickly onboard your team." },
  "Organizations": { icon: Building, desc: "Explore team management tools and key TrackOwl features." },
  "Users & Roles": { icon: Users, desc: "Manage members, assign roles, and configure access permissions." },
  "Teams": { icon: UsersRound, desc: "Group your workforce into teams for better reporting and management." },
  "Projects": { icon: FolderKanban, desc: "Organize tasks, track progress, and collaborate efficiently." },
  "Tasks": { icon: CheckSquare, desc: "Create, assign, and monitor tasks across your entire organization." },
  "Time Tracking": { icon: Clock, desc: "Log work hours, manage manual time entry, and track productivity." },
  "Desktop App": { icon: Monitor, desc: "Install and troubleshoot the lightweight tracking application." },
  "Screenshots": { icon: Camera, desc: "Configure screenshot frequency, blurring, and visibility." },
  "Activity & App Usage": { icon: Activity, desc: "Monitor keyboard/mouse activity, app usage, and URLs." },
  "Attendance & Schedules": { icon: CalendarClock, desc: "Streamline scheduling, shifts, and workforce attendance tasks." },
  "Locations & Job Sites": { icon: MapPin, desc: "Track team locations in real time for on-the-go projects." },
  "Financials": { icon: DollarSign, desc: "Review daily totals, payments, and track amounts owed." },
  "Billing & Subscriptions": { icon: CreditCard, desc: "Manage payments, invoices, and billing settings with ease." },
  "Reports": { icon: FileText, desc: "Generate powerful insights with time, activity, and custom reports." },
  "Clients": { icon: Briefcase, desc: "Manage client profiles and assign them to specific projects." },
  "Settings": { icon: Settings, desc: "Configure tracking policies, security, and global preferences." },
  "Integrations": { icon: Blocks, desc: "Connect TrackOwl with your favorite tools and build custom workflows." },
  "Security & Privacy": { icon: ShieldCheck, desc: "Learn about data encryption, GDPR compliance, and privacy policies." }
};

function Layout({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const searchResults = useMemo(() => {
    if (!search) return [];
    return articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase())).slice(0, 5);
  }, [search]);

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/support/header-2.svg" style={{ height: '32px', objectFit: 'contain' }} alt="TrackOwl" />
        </Link>

        <div className="search-container" style={{ marginLeft: 'auto' }}>
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search documentation..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && searchResults.length > 0 && (
            <div className="search-results-dropdown">
              {searchResults.map(res => (
                <div 
                  key={res.slug}
                  className="search-result-item"
                  onClick={() => {
                    setSearch('');
                    navigate(`/article/${encodeURIComponent(res.slug)}`);
                  }}
                >
                  <div className="search-result-title">{res.title}</div>
                  <div className="search-result-category">{res.category}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="content-wrapper">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      
      <footer className="footer-enterprise">
        <div className="footer-enterprise-container">
          <div className="footer-enterprise-col">
            <div className="footer-enterprise-heading">Product</div>
            <a href="https://trackowl.io#features" target="_blank" rel="noopener noreferrer">Features</a>
            <a href="https://trackowl.io#pricing" target="_blank" rel="noopener noreferrer">Pricing</a>
            <a href="https://trackowl.io#security" target="_blank" rel="noopener noreferrer">Security</a>
            <a href="https://trackowl.io#showcase" target="_blank" rel="noopener noreferrer">Integrations</a>
            <Link to="/">Help Center</Link>
          </div>
          
          <div className="footer-enterprise-col">
            <div className="footer-enterprise-heading">Company</div>
            <a href="https://trackowl.io/about" target="_blank" rel="noopener noreferrer">About us</a>
            <a href="mailto:contact@trackowl.io">Contact</a>
          </div>

          <div className="footer-enterprise-col">
            <div className="footer-enterprise-heading">Legal</div>
            <a href="https://trackowl.io/privacy" target="_blank" rel="noopener noreferrer">Privacy policy</a>
            <a href="https://trackowl.io/terms" target="_blank" rel="noopener noreferrer">Terms of service</a>
            <a href="https://trackowl.io/security" target="_blank" rel="noopener noreferrer">Security</a>
          </div>

          <div className="footer-enterprise-col">
            <div className="footer-enterprise-heading">Contact</div>
            <a href="mailto:contact@trackowl.io" style={{ color: '#facc15', fontWeight: '500' }}>
              contact@trackowl.io
            </a>
          </div>
        </div>
        
        <div className="footer-enterprise-bottom">
          <div className="footer-enterprise-bottom-container">
            <img 
              src="/support/header-2.svg" 
              className="footer-enterprise-logo-img" 
              alt="TrackOwl" 
              onClick={() => window.open('https://trackowl.io', '_blank')} 
            />
            <p>TrackOwl™ , a product by DigiReps®</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactBanner() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [teamSize, setTeamSize] = useState('1-5');
    const [message, setMessage] = useState('');
    const [requestType, setRequestType] = useState('general');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requestTypeOpen, setRequestTypeOpen] = useState(false);
    const [teamSizeOpen, setTeamSizeOpen] = useState(false);

    const requestTypeOptions = [
        { value: 'general', label: 'General Inquiry / Support' },
        { value: 'sales', label: 'Talk to Sales' },
        { value: 'demo', label: 'Book / Schedule a Demo' }
    ];

    const teamSizeOptions = [
        { value: '1-5', label: '1-5 members' },
        { value: '6-15', label: '6-15 members' },
        { value: '16-50', label: '16-50 members' },
        { value: '51-200', label: '51-200 members' },
        { value: '200+', label: '200+ members' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const rawKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
            const cleanKey = (rawKey || '').trim();
            
            if (!cleanKey) {
                throw new Error("Access Key configuration missing. Please report this to support@trackowl.io");
            }

            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    access_key: cleanKey,
                    name: name,
                    email: email,
                    subject: `TrackOwl Support/Lead (${requestType}): ${name} (${company || 'No Company'})`,
                    to: "nash@digireps.co",
                    from_name: "TrackOwl Support System",
                    message: `You have received a new support contact submission from TrackOwl Help Center.

Request Type: ${requestTypeOptions.find(o => o.value === requestType)?.label}
Name: ${name}
Email: ${email}
Company: ${company || 'N/A'}
Team Size: ${teamSize}

Message:
${message}`
                })
            });

            const web3Data = await response.json();

            if (!response.ok || !web3Data.success) {
                throw new Error(web3Data.message || "Failed to submit request.");
            }

            setSuccess(true);
        } catch (err: any) {
            console.error("Submission failed:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="support-form-container">
            <div className="support-form-header">
                <div>
                    <h3 className="support-form-title">Contact TrackOwl</h3>
                    <p className="support-form-subtitle">We'll get back to you shortly</p>
                </div>
            </div>

            {success ? (
                <div className="support-form-success">
                    <div className="success-icon-wrapper">
                        <Check className="success-check-icon" strokeWidth={3} />
                    </div>
                    <h4 className="success-title">Thank you!</h4>
                    <p className="success-desc">
                        Your details have been submitted. A TrackOwl support representative will email you at <span className="success-email-highlight">{email}</span> shortly.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSuccess(false);
                            setName('');
                            setEmail('');
                            setCompany('');
                            setTeamSize('1-5');
                            setMessage('');
                        }}
                        className="support-form-reset-btn"
                    >
                        Send Another Message
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="support-form-body">
                    {error && (
                        <div className="support-form-error">
                            {error}
                        </div>
                    )}

                    <div className="support-form-row">
                        <div className="support-form-field">
                            <label className="support-form-label">Request Type</label>
                            <div className="support-dropdown-wrapper">
                                <button
                                    type="button"
                                    onClick={() => setRequestTypeOpen(!requestTypeOpen)}
                                    className="support-dropdown-trigger"
                                >
                                    <span>{requestTypeOptions.find(o => o.value === requestType)?.label || 'Select request type'}</span>
                                    <ChevronDown className={`support-dropdown-chevron ${requestTypeOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {requestTypeOpen && (
                                    <>
                                        <div className="support-dropdown-backdrop" onClick={() => setRequestTypeOpen(false)} />
                                        <div className="support-dropdown-menu">
                                            {requestTypeOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setRequestType(opt.value);
                                                        setRequestTypeOpen(false);
                                                    }}
                                                    className={`support-dropdown-item ${requestType === opt.value ? 'active' : ''}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="support-form-grid">
                        <div className="support-form-field">
                            <label className="support-form-label">Full Name</label>
                            <input
                                type="text"
                                required
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="support-form-input"
                            />
                        </div>

                        <div className="support-form-field">
                            <label className="support-form-label">Business Email</label>
                            <input
                                type="email"
                                required
                                placeholder="john@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="support-form-input"
                            />
                        </div>
                    </div>

                    <div className="support-form-grid">
                        <div className="support-form-field">
                            <label className="support-form-label">Company Name</label>
                            <input
                                type="text"
                                placeholder="Acme Corp"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="support-form-input"
                            />
                        </div>

                        <div className="support-form-field">
                            <label className="support-form-label">Team Size</label>
                            <div className="support-dropdown-wrapper">
                                <button
                                    type="button"
                                    onClick={() => setTeamSizeOpen(!teamSizeOpen)}
                                    className="support-dropdown-trigger"
                                >
                                    <span>{teamSizeOptions.find(o => o.value === teamSize)?.label || 'Select team size'}</span>
                                    <ChevronDown className={`support-dropdown-chevron ${teamSizeOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {teamSizeOpen && (
                                    <>
                                        <div className="support-dropdown-backdrop" onClick={() => setTeamSizeOpen(false)} />
                                        <div className="support-dropdown-menu">
                                            {teamSizeOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setTeamSize(opt.value);
                                                        setTeamSizeOpen(false);
                                                    }}
                                                    className={`support-dropdown-item ${teamSize === opt.value ? 'active' : ''}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="support-form-field">
                        <label className="support-form-label">Your Message</label>
                        <textarea
                            required
                            rows={4}
                            placeholder="Describe what you're looking for..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="support-form-textarea"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="support-form-submit-btn"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5 mr-2" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Request'
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}


function FAQsAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "Why is the desktop app asking for Screen Recording permission?",
      a: "TrackOwl uses macOS's built-in screen capture capability to take periodic screenshots during your active tracked sessions. This is a core feature for team transparency and accountability. You can grant this in System Settings → Privacy & Security → Screen Recording."
    },
    {
      q: "How does offline tracking work?",
      a: "If you lose connection, TrackOwl keeps recording time, activity levels, and queueing screenshots locally in a secure SQLite database on your device. Once you're back online, it syncs everything automatically to the cloud."
    },
    {
      q: "Is my tracking data secure?",
      a: "Yes. All data transmitted between the desktop app and our servers is encrypted using TLS 1.3. Data at rest is stored in highly secure, isolated databases with Supabase. We do not track keystrokes (only counts) and screens can be optionally blurred under company settings."
    },
    {
      q: "How do I update the application?",
      a: "If you installed the application from the Mac App Store, updates are handled directly by the App Store. If you downloaded it from our website, the app will securely notify you and auto-update in the background."
    },
    {
      q: "How do I cancel my subscription or delete my account?",
      a: "You can manage or cancel your subscription at any time under Settings → Billing on the TrackOwl web portal. To permanently delete your account and all associated logs, contact support@digireps.io."
    }
  ];

  return (
    <div className="faq-section">
      <h2 className="faq-title">Frequently Asked Questions</h2>
      <div className="faq-accordion">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={index} className={`faq-item ${isOpen ? 'open' : ''}`}>
              <button 
                type="button" 
                onClick={() => setOpenIndex(isOpen ? null : index)} 
                className="faq-question"
              >
                <span>{faq.q}</span>
                <ChevronDown className="faq-chevron" />
              </button>
              {isOpen && (
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <div className="home-page animate-fade-in">
      <div className="home-hero">
        <h1 className="home-title">TrackOwl Support</h1>
        <p className="home-subtitle">Find help, articles, and step-by-step guides for everything TrackOwl.</p>
      </div>

      <div className="category-grid" style={{ marginBottom: '5rem' }}>
        {categories.map(cat => {
          const meta = categoryMeta[cat] || { icon: HelpCircle, desc: "Explore documentation and guides for this module." };
          const Icon = meta.icon;
          return (
            <Link key={cat} to={`/category/${encodeURIComponent(cat)}`} className="category-card">
              <div className="category-icon-wrapper">
                <Icon size={24} className="category-icon" />
              </div>
              <h3 className="category-card-title">{cat}</h3>
              <p className="category-card-desc">{meta.desc}</p>
            </Link>
          );
        })}
      </div>

      <FAQsAccordion />

      <ContactBanner />
    </div>
  );
}

function CategoryPage() {
  const { cat } = useParams();
  const categoryName = decodeURIComponent(cat || '');
  const categoryArticles = articles.filter(a => a.category === categoryName);

  if (!categoryArticles.length) {
    return (
      <div className="not-found">
        <h2>Category not found</h2>
        <Link to="/" className="btn-primary">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="category-page animate-fade-in">
      <div className="category-breadcrumbs">
        <Link to="/">Help center</Link>
        <ChevronRight size={14} />
        <span>{categoryName}</span>
      </div>

      <h1 className="category-page-title">{categoryName}</h1>

      <div className="article-list-grid">
        {categoryArticles.map(a => (
          <Link key={a.slug} to={`/article/${encodeURIComponent(a.slug)}`} className="article-list-item">
             <BookOpen size={16} className="article-list-icon" />
             {a.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ArticlePage() {
  const { slug } = useParams();
  const decodedSlug = decodeURIComponent(slug || '');
  const article = articles.find(a => a.slug === decodedSlug);

  if (!article) {
    return (
      <div className="not-found">
        <h2>Article not found</h2>
        <p>The document you're looking for might have been moved or deleted.</p>
        <Link to="/" className="btn-primary">Return to Home</Link>
      </div>
    );
  }

  const words = article.content.split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  const headings = Array.from(article.content.matchAll(/^##\s+(.*)$/gm)).map(m => m[1]);

  return (
    <div className="article-page animate-fade-in">
      <div className="article-hero">
        <div className="article-container">
          <div className="article-breadcrumbs">
            <Link to="/">Help center</Link>
            <ChevronRight size={14} />
            <Link to={`/category/${encodeURIComponent(article.category)}`}>{article.category}</Link>
            <ChevronRight size={14} />
            <span>{article.title}</span>
          </div>
          <h1 className="article-title">{article.title}</h1>
        </div>
      </div>

      <div className="article-container article-split">
        <div className="article-main">
          <div className="article-meta">
            <Clock size={16} />
            {readingTime} min read
          </div>

          <div 
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.html as string }} 
          />
        </div>
        
        {headings.length > 0 && (
          <div className="article-sidebar">
            <div className="toc-wrapper">
              <div className="toc-title">In this article</div>
              {headings.map((heading, i) => (
                <a key={i} href={`#${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="toc-link">
                  {heading}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/support">
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/category/:cat" element={<CategoryPage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
