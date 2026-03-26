import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    CheckCircle2, Circle, Search, Plus, 
    Clock, User, X, Calendar, 
    LayoutGrid, List, MoreHorizontal, 
    Trash2, Briefcase, Tag, AlertCircle,
    CheckSquare, ClipboardList, Timer
} from 'lucide-react';
import { 
    PageHeader, Card, Button, StatusBadge, 
    LoadingState, EmptyState, Modal, Input,
    KpiCard 
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

interface Todo {
    id: string;
    project_id: string;
    title: string;
    description: string;
    assignee_id: string;
    status: 'Todo' | 'In Progress' | 'Done';
    due_date: string;
    created_at: string;
    projects?: { name: string; color: string };
    members?: { full_name: string };
}

interface Project {
    id: string;
    name: string;
}

interface Member {
    id: string;
    full_name: string;
}

export function Todos() {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [todos, setTodos] = useState<Todo[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editTodo, setEditTodo] = useState<Todo | null>(null);
    const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        project_id: '',
        assignee_id: '',
        due_date: '',
        status: 'Todo' as 'Todo' | 'In Progress' | 'Done'
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        setLoading(true);

        const { data: todoData } = await supabase
            .from('todos')
            .select(`
                *,
                projects (name, color),
                members (full_name)
            `)
            .order('created_at', { ascending: false });

        const { data: projectData } = await supabase
            .from('projects')
            .select('id, name')
            .order('name');

        const { data: memberData } = await supabase
            .from('members')
            .select('id, full_name')
            .order('full_name');

        if (todoData) setTodos(todoData);
        if (projectData) setProjects(projectData);
        if (memberData) setMembers(memberData);

        setLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.project_id) return;

        setSaving(true);
        
        const payload = {
            title: formData.title,
            description: formData.description,
            project_id: formData.project_id,
            assignee_id: formData.assignee_id || null,
            due_date: formData.due_date || null,
            organization_id: profile?.organization_id
        };

        if (editTodo) {
            const { data, error } = await supabase
                .from('todos')
                .update({ ...payload, status: formData.status })
                .eq('id', editTodo.id)
                .select(`
                    *,
                    projects (name, color),
                    members (full_name)
                `)
                .single();

            if (!error && data) {
                setTodos(todos.map(t => t.id === data.id ? data : t));
                handleCloseModal();
            }
        } else {
            const { data, error } = await supabase
                .from('todos')
                .insert({ ...payload, status: 'Todo' })
                .select(`
                    *,
                    projects (name, color),
                    members (full_name)
                `)
                .single();

            if (!error && data) {
                setTodos([data, ...todos]);
                handleCloseModal();
            }
        }
        setSaving(false);
    }

    async function toggleStatus(todo: Todo) {
        if (isViewer) return;
        const nextStatus = todo.status === 'Done' ? 'Todo' : 'Done';
        const { error } = await supabase
            .from('todos')
            .update({ status: nextStatus })
            .eq('id', todo.id);

        if (!error) {
            setTodos(todos.map(t => t.id === todo.id ? { ...t, status: nextStatus } : t));
        }
    }

    async function handleDelete() {
        if (!deletingTodo) return;
        
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', deletingTodo.id);

        if (!error) {
            setTodos(todos.filter(t => t.id !== deletingTodo.id));
            setDeletingTodo(null);
        }
    }

    function handleOpenCreate() {
        setEditTodo(null);
        setFormData({
            title: '',
            description: '',
            project_id: '',
            assignee_id: '',
            due_date: '',
            status: 'Todo'
        });
        setShowModal(true);
    }

    function handleOpenEdit(todo: Todo) {
        setEditTodo(todo);
        setFormData({
            title: todo.title,
            description: todo.description || '',
            project_id: todo.project_id,
            assignee_id: todo.assignee_id || '',
            due_date: todo.due_date || '',
            status: todo.status
        });
        setShowModal(true);
    }

    function handleCloseModal() {
        setShowModal(false);
        setEditTodo(null);
    }

    const filteredTodos = todos.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.projects?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            <PageHeader
                title="Management To-dos"
                description="Coordinate organizational tasks, track project milestones, and monitor team commitments."
                actions={
                    <div className="flex items-center gap-4">
                        <div className="flex bg-surface-subtle border border-border p-1 rounded-2xl shadow-inner mr-2">
                            <button
                                onClick={() => setViewMode('list')}
                                className={clsx(
                                    "p-2.5 rounded-xl transition-all",
                                    viewMode === 'list' ? "bg-surface-solid text-primary shadow-sm border border-border" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={clsx(
                                    "p-2.5 rounded-xl transition-all",
                                    viewMode === 'grid' ? "bg-surface-solid text-primary shadow-sm border border-border" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                        <Button
                            onClick={handleOpenCreate}
                            disabled={isViewer}
                            variant="primary"
                            className="px-8 py-3.5 shadow-xl shadow-primary/20 scale-105"
                        >
                            <Plus className="w-4 h-4 mr-2" strokeWidth={3} />
                            Deploy Task
                        </Button>
                    </div>
                }
            />

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <KpiCard 
                    label="Backlog & Active" 
                    value={todos.filter(t => t.status !== 'Done').length} 
                    icon={<Timer className="w-5 h-5 text-orange-500" strokeWidth={2.5} />} 
                    description="Open requirements"
                />
                <KpiCard 
                    label="Execution Volume" 
                    value={todos.filter(t => t.status === 'Done').length} 
                    icon={<CheckSquare className="w-5 h-5 text-emerald-500" strokeWidth={2.5} />} 
                    description="Completed milestones"
                />
                <KpiCard 
                    label="Task Distribution" 
                    value={todos.filter(t => t.assignee_id).length} 
                    icon={<ClipboardList className="w-5 h-5 text-indigo-500" strokeWidth={2.5} />} 
                    description="Assigned personnel"
                />
            </div>

            <Card className="p-0 overflow-hidden border-border/60 shadow-xl">
                {/* Search & Filters */}
                <div className="p-8 border-b border-border bg-surface-subtle/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="relative group w-full max-w-md">
                        <Search className="w-4 h-4 text-text-muted absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" strokeWidth={3} />
                        <input
                            type="text"
                            placeholder="Find a to-do, project, or identifier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-13 pr-6 py-3.5 bg-surface-solid border border-border rounded-2xl text-[13px] font-bold text-text-primary placeholder:text-text-muted/40 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono uppercase"
                        />
                    </div>
                    
                    <div className="flex items-center bg-surface-solid border border-border rounded-2xl p-1 shadow-inner">
                        {['All', 'Todo', 'In Progress', 'Done'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 font-mono",
                                    statusFilter === s ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                {s === 'Done' ? 'Complete' : s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="py-32">
                            <LoadingState message="Retrieving organizational backlog..." />
                        </div>
                    ) : filteredTodos.length === 0 ? (
                        <div className="py-32">
                            <EmptyState 
                                icon={<CheckCircle2 className="w-16 h-16 text-text-muted/20" />}
                                title={searchTerm ? "No results found" : "Backlog clear"}
                                description={searchTerm ? "Try adjusting your search parameters." : "Your task list is currently empty. Initialize a new requirement to begin."}
                                action={!searchTerm && !isViewer && (
                                    <Button onClick={handleOpenCreate} variant="secondary">
                                        Initialize First Task
                                    </Button>
                                )}
                            />
                        </div>
                    ) : viewMode === 'list' ? (
                        <div className="divide-y divide-border/40">
                            {filteredTodos.map((todo) => (
                                <TodoListItem 
                                    key={todo.id} 
                                    todo={todo} 
                                    onToggle={() => toggleStatus(todo)} 
                                    onEdit={() => handleOpenEdit(todo)}
                                    onDelete={() => { if (!isViewer) setDeletingTodo(todo); }}
                                    isViewer={isViewer}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredTodos.map((todo) => (
                                <TodoGridItem 
                                    key={todo.id} 
                                    todo={todo} 
                                    onToggle={() => toggleStatus(todo)} 
                                    onEdit={() => handleOpenEdit(todo)}
                                    onDelete={() => { if (!isViewer) setDeletingTodo(todo); }}
                                    isViewer={isViewer}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* CREATE/EDIT MODAL */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editTodo ? 'Configure Task' : 'Initialize Task'}
                subtitle={editTodo ? 'Modify existing operational parameters' : 'Define a new organizational objective'}
            >
                <form onSubmit={handleSubmit} className="space-y-8">
                    <Input
                        label="Task Designation / Title"
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Milestone ALPHA Implementation"
                        leftIcon={<Tag className="w-4 h-4" />}
                    />
                    
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] px-1">
                            Objective Description
                        </label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detailed technical specifications and requirements..."
                            className="w-full px-6 py-4 bg-surface-subtle border border-border rounded-2xl text-[13px] font-bold text-text-primary placeholder:text-text-muted/30 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono italic resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] px-1">
                                Project Assignment
                            </label>
                            <select
                                required
                                value={formData.project_id}
                                onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                                className="w-full px-6 py-3.5 bg-surface-solid border border-border rounded-2xl text-[13px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono uppercase"
                            >
                                <option value="">Select Project</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] px-1">
                                Operational Lead
                            </label>
                            <select
                                value={formData.assignee_id}
                                onChange={e => setFormData({ ...formData, assignee_id: e.target.value })}
                                className="w-full px-6 py-3.5 bg-surface-solid border border-border rounded-2xl text-[13px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono uppercase"
                            >
                                <option value="">Unassigned</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] px-1">
                                Target Date
                            </label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-6 py-3.5 bg-surface-solid border border-border rounded-2xl text-[13px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                            />
                        </div>
                        {editTodo && (
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] px-1">
                                    Execution Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-6 py-3.5 bg-surface-solid border border-border rounded-2xl text-[13px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono uppercase"
                                >
                                    <option value="Todo">Todo</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Done">Complete</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex gap-4">
                        <Button
                            type="button"
                            onClick={handleCloseModal}
                            variant="secondary"
                            className="flex-1 py-4 font-mono text-[11px]"
                        >
                            CANCEL
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving || !formData.project_id || isViewer}
                            variant="primary"
                            className="flex-[2] py-4 shadow-xl font-mono text-[11px]"
                        >
                            {saving ? 'COMMITTING...' : (editTodo ? 'UPDATE OBJECTIVE' : 'INITIALIZE TASK')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* DELETE MODAL */}
            {deletingTodo && (
                <Modal
                    isOpen={!!deletingTodo}
                    onClose={() => setDeletingTodo(null)}
                    title="Dissolve Task"
                    subtitle="Critical Action Warning"
                    maxWidth="max-w-[480px]"
                >
                    <div className="text-center space-y-8">
                        <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center mx-auto shadow-inner border border-rose-500/10 rotate-3 group-hover:rotate-0 transition-transform">
                            <Trash2 className="w-10 h-10 text-rose-600" strokeWidth={2.5} />
                        </div>
                        <div className="space-y-4">
                            <p className="text-text-primary text-xl font-bold tracking-tight">Are you absolutely sure?</p>
                            <p className="text-text-muted font-bold uppercase tracking-widest leading-relaxed text-[11px] font-mono opacity-80 px-4">
                                This will permanently dissolve task <span className="text-rose-600">"{deletingTodo.title.toUpperCase()}"</span>. Historical progress will be lost.
                            </p>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <Button
                                onClick={() => setDeletingTodo(null)}
                                variant="secondary"
                                className="flex-1 py-4 font-mono text-[11px]"
                            >
                                ABORT
                            </Button>
                            <Button
                                onClick={handleDelete}
                                variant="danger"
                                className="flex-[1.5] py-4 shadow-xl shadow-rose-900/10 font-mono text-[11px]"
                            >
                                CONFIRM DISSOLUTION
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function TodoListItem({ todo, onToggle, onEdit, onDelete, isViewer }: { todo: Todo; onToggle: () => void; onEdit: () => void; onDelete: () => void; isViewer: boolean }) {
    return (
        <div className="py-6 px-4 hover:bg-primary/[0.01] transition-all group flex items-start gap-8 duration-500">
            <button
                onClick={onToggle}
                disabled={isViewer}
                className={clsx(
                    "mt-1 shrink-0 transition-all duration-500 scale-125",
                    todo.status === 'Done' ? "text-emerald-500" : "text-text-muted/30 hover:text-primary hover:scale-150 rotate-0 hover:rotate-12",
                    isViewer && "cursor-not-allowed opacity-50"
                )}
            >
                {todo.status === 'Done' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" strokeWidth={3} />}
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 mb-2">
                    <h4 className={clsx(
                        "text-lg font-bold tracking-tight transition-all duration-700",
                        todo.status === 'Done' ? "text-text-muted/40 line-through decoration-emerald-500/40" : "text-text-primary group-hover:text-primary"
                    )}>
                        {todo.title}
                    </h4>
                    {todo.projects && (
                        <span
                            className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest font-mono shadow-sm"
                            style={{ backgroundColor: `${todo.projects.color}15`, color: todo.projects.color, border: `1px solid ${todo.projects.color}20` }}
                        >
                            {todo.projects.name}
                        </span>
                    )}
                </div>
                {todo.description && (
                    <p className={clsx(
                        "text-[12px] font-bold italic line-clamp-1 mb-4 opacity-60 font-mono",
                        todo.status === 'Done' ? "opacity-20" : "text-text-muted"
                    )}>
                        {todo.description}
                    </p>
                )}
                <div className="flex items-center gap-6">
                    {todo.members && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
                            <User className="w-3.5 h-3.5 opacity-40" />
                            {todo.members.full_name}
                        </div>
                    )}
                    {todo.due_date && (
                        <div className={clsx(
                            "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest font-mono",
                            new Date(todo.due_date) < new Date() && todo.status !== 'Done' ? "text-rose-500" : "text-orange-500 opacity-70"
                        )}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(todo.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                    <StatusBadge 
                        variant={todo.status === 'Done' ? 'success' : todo.status === 'In Progress' ? 'warning' : 'default'}
                        className="px-3 py-0.5 text-[8px] font-mono italic"
                    >
                        {todo.status}
                    </StatusBadge>
                </div>
            </div>

            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                <Button 
                    onClick={onEdit}
                    variant="secondary"
                    size="sm"
                    className="p-3 bg-surface-solid border-border rounded-xl hover:bg-primary hover:text-white transition-all shadow-lg active:scale-90"
                    title="Configure"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
                <Button 
                    onClick={onDelete}
                    disabled={isViewer}
                    variant="danger"
                    size="sm"
                    className={clsx(
                        "p-3 rounded-xl transition-all shadow-lg active:scale-90",
                        isViewer ? "opacity-10 cursor-not-allowed" : "bg-surface-solid text-text-muted hover:bg-rose-600 hover:text-white"
                    )}
                    title="Dissolve"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function TodoGridItem({ todo, onToggle, onEdit, onDelete, isViewer }: { todo: Todo; onToggle: () => void; onEdit: () => void; onDelete: () => void; isViewer: boolean }) {
    return (
        <div className="bg-surface-solid border border-border rounded-[32px] p-8 hover:border-primary/20 transition-all group relative overflow-hidden shadow-sm hover:shadow-2xl duration-700 flex flex-col h-full">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.02] rounded-full translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform duration-1000" />
            
            <div className="flex justify-between items-start mb-6 mb-auto">
                <span
                    className="px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] font-mono shadow-sm border border-transparent"
                    style={{ backgroundColor: `${todo.projects?.color}15`, color: todo.projects?.color, border: `1px solid ${todo.projects?.color}20` }}
                >
                    {todo.projects?.name || 'General'}
                </span>
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <button 
                        onClick={onDelete}
                        disabled={isViewer}
                        className={clsx(
                            "p-2 rounded-lg transition-all active:scale-90",
                            isViewer ? "opacity-10 cursor-not-allowed" : "text-text-muted/40 hover:text-rose-600 hover:bg-rose-50"
                        )}
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={onToggle}
                        disabled={isViewer}
                        className={clsx(
                            "transition-all duration-500 hover:scale-125",
                            todo.status === 'Done' ? "text-emerald-500" : "text-text-muted/20 hover:text-primary",
                            isViewer && "opacity-50"
                        )}
                    >
                        {todo.status === 'Done' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" strokeWidth={3} />}
                    </button>
                </div>
            </div>

            <h4 className={clsx(
                "text-xl font-bold mb-4 tracking-tight leading-7 transition-all duration-700 italic group-hover:text-primary",
                todo.status === 'Done' && "text-text-muted/40 line-through decoration-emerald-500/20"
            )}>
                {todo.title}
            </h4>
            
            <p className={clsx(
                "text-[12px] font-bold text-text-muted mb-8 line-clamp-3 font-mono opacity-60 leading-relaxed",
                todo.status === 'Done' && "opacity-20"
            )}>
                {todo.description || 'System generated: task lacks extended documentation properties.'}
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-border/40 mt-auto">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-surface-subtle border border-border flex items-center justify-center text-[10px] font-bold text-text-primary shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-500 font-mono italic">
                        {todo.members?.full_name.charAt(0) || '?'}
                    </div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono opacity-50 group-hover:opacity-100 transition-all">
                        {todo.members?.full_name.split(' ')[0] || 'Unassigned'}
                    </span>
                </div>
                {todo.due_date && (
                    <span className={clsx(
                        "text-[10px] font-bold flex items-center gap-2 uppercase tracking-tighter font-mono italic",
                        new Date(todo.due_date) < new Date() && todo.status !== 'Done' ? "text-rose-500 bg-rose-500/5 px-3 py-1.5 rounded-lg" : "text-orange-500 opacity-60"
                    )}>
                        <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />
                        {new Date(todo.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>

            {/* Hover configuration button */}
            <Button 
                onClick={onEdit}
                variant="primary"
                size="sm"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-2xl scale-75 group-hover:scale-100 px-6 font-mono text-[9px] tracking-widest"
            >
                CONFIGURE OBJECTIVE
            </Button>
        </div>
    );
}
