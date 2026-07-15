import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Search, ChevronRight, BookOpen, Clock, Moon, Sun,
  Rocket, Building, Users, UsersRound, FolderKanban, CheckSquare,
  Monitor, Camera, Activity, CalendarClock, MapPin, DollarSign,
  CreditCard, FileText, Briefcase, Settings, Blocks, ShieldCheck, HelpCircle,
  Mail, ExternalLink
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
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const searchResults = useMemo(() => {
    if (!search) return [];
    return articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase())).slice(0, 5);
  }, [search]);

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="header-logo">
          <BookOpen color="var(--primary)" size={24} />
          TrackOwl Help Center
        </Link>

        <div className="search-container">
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

        <button onClick={() => setDarkMode(!darkMode)} className="theme-toggle">
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
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
      
      <footer className="footer">
         <p>© {new Date().getFullYear()} TrackOwl. All rights reserved.</p>
      </footer>
    </div>
  );
}

function ContactBanner() {
  const [copied, setCopied] = useState(false);

  const copyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText('support@trackowl.io').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="contact-banner">
      <div className="contact-banner-inner">
        <div className="contact-banner-text">
          <h2 className="contact-banner-title">Need help? We're here for you.</h2>
          <p className="contact-banner-subtitle">
            Our support team responds within 24 hours on business days (Mon–Fri).
          </p>
        </div>
        <div className="contact-banner-actions">
          <a
            href="mailto:support@trackowl.io"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="contact-btn contact-btn-primary"
          >
            <Mail size={18} />
            Email Support
          </a>
          <a
            href="https://trackowl.io"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="contact-btn contact-btn-secondary"
          >
            <ExternalLink size={18} />
            Visit trackowl.io
          </a>
        </div>
      </div>

      {/* Email address — prominent, copy-on-click */}
      <div className="contact-email-row">
        <Mail size={20} className="contact-channel-icon" />
        <span className="contact-email-address">support@trackowl.io</span>
        <button onClick={copyEmail} className="contact-copy-btn">
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      <div className="contact-channels">
        <div className="contact-channel">
          <Clock size={20} className="contact-channel-icon" />
          <div>
            <div className="contact-channel-label">Response Time</div>
            <div className="contact-channel-value">Within 24 hours (Mon–Fri)</div>
          </div>
        </div>
        <div className="contact-channel">
          <BookOpen size={20} className="contact-channel-icon" />
          <div>
            <div className="contact-channel-label">Documentation</div>
            <div className="contact-channel-value">Browse articles below</div>
          </div>
        </div>
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

      <ContactBanner />

      <div className="category-grid">
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
