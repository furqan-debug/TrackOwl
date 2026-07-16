import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

import { Receipt, Search, Filter, Check, X, Plus } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Expense {
    id: string;
    member_id: string;
    project_id: string | null;
    amount: number;
    category: string;
    description: string;
    date: string;
    status: string;
    members?: { full_name: string };
    projects?: { name: string };
}

export function Expenses() {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        fetchExpenses();
    }, []);

    async function fetchExpenses() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/expenses`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data);
            }
        } catch (err) {
            console.error('Failed to fetch expenses', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusChange(id: string, status: string) {
        try {
            const res = await fetch(`${API}/api/expenses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setExpenses(prev => prev.map(e => e.id === id ? { ...e, status } : e));
            }
        } catch (err) {
            console.error('Failed to update expense status', err);
        }
    }

    const filtered = expenses.filter(exp => {
        const term = search.toLowerCase();
        const matchesSearch =
            exp.members?.full_name?.toLowerCase().includes(term) ||
            exp.category.toLowerCase().includes(term) ||
            (exp.description && exp.description.toLowerCase().includes(term));
        const matchesStatus = statusFilter === 'All' || exp.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pendingTotal = expenses.reduce((sum, exp) => exp.status === 'Pending' ? sum + Number(exp.amount) : sum, 0);

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-text-main tracking-tight">Expenses</h1>
                    <p className="text-text-muted text-sm mt-1">Review and approve team expenses</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        disabled={isViewer}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isViewer ? 'bg-slate-300 text-slate-100 cursor-not-allowed grayscale opacity-60' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-shell-sm'}`}
                    >
                        <Plus className="w-4 h-4" /> Log Expense
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-surface rounded-xl border border-border p-5 shadow-shell-sm">
                    <div className="text-xs font-semibold text-text-muted mb-2">Pending Approvals</div>
                    <div className="text-3xl font-light text-amber-500">${pendingTotal.toFixed(2)}</div>
                </div>
                <div className="bg-surface rounded-xl border border-border p-5 shadow-shell-sm">
                    <div className="text-xs font-semibold text-text-muted mb-2">Total Expenses</div>
                    <div className="text-3xl font-light text-text-main">
                        {expenses.length}
                    </div>
                </div>
            </div>

            <div className="bg-surface rounded-xl border border-border shadow-shell-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface-hover/50">
                    <div className="relative w-full sm:w-72 shrink-0">
                        <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search description, member..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5">
                            <Filter className="w-4 h-4 text-text-muted" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-transparent border-none text-sm text-text-main font-medium focus:outline-none focus:ring-0 cursor-pointer"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-surface-hover text-text-muted font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-xs "></th>
                                <th className="px-6 py-4 font-semibold text-xs ">Member</th>
                                <th className="px-6 py-4 font-semibold text-xs ">Amount</th>
                                <th className="px-6 py-4 font-semibold text-xs ">Category / Desc</th>
                                <th className="px-6 py-4 font-semibold text-xs ">Project</th>
                                <th className="px-6 py-4 font-semibold text-xs ">Status</th>
                                <th className="px-6 py-4 font-semibold text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-text-muted">Loading expenses...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-text-muted">
                                            <Receipt className="w-12 h-12 mb-3 text-text-muted" />
                                            <p className="text-base font-medium text-text-muted">No expenses found</p>
                                            <p className="text-sm mt-1">Team expenses will appear here.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-surface-hover/50 transition-colors group">
                                        <td className="px-6 py-4 text-text-muted whitespace-nowrap">
                                            {new Date(exp.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-semibold text-text-main">{exp.members?.full_name || 'Unknown'}</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-text-main">
                                            ${Number(exp.amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-text-main">{exp.category}</div>
                                            <div className="text-text-muted text-xs mt-0.5 truncate max-w-[200px]" title={exp.description}>{exp.description || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-text-muted whitespace-nowrap">
                                            {exp.projects?.name || <span className="text-text-muted">—</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${exp.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                                exp.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-rose-100 text-rose-800'
                                                }`}>
                                                {exp.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {exp.status === 'Pending' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => { if (!isViewer) handleStatusChange(exp.id, 'Approved'); }} 
                                                        disabled={isViewer}
                                                        className={`p-1.5 rounded-md transition-all ${isViewer ? 'text-text-muted cursor-default' : 'text-emerald-500 hover:bg-emerald-50'}`} 
                                                        title={isViewer ? "Read-only" : "Approve"}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => { if (!isViewer) handleStatusChange(exp.id, 'Rejected'); }} 
                                                        disabled={isViewer}
                                                        className={`p-1.5 rounded-md transition-all ${isViewer ? 'text-text-muted cursor-default' : 'text-rose-500 hover:bg-rose-50'}`} 
                                                        title={isViewer ? "Read-only" : "Reject"}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
