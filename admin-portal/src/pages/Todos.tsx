import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    CheckCircle2, Circle, Search, Plus, 
    User, Calendar, 
    LayoutGrid, List, MoreHorizontal, 
    Trash2, Tag, 
    CheckSquare, ClipboardList, Timer
} from 'lucide-react';
import { 
    PageLayout, Card, Button, StatusBadge, 
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
        <PageLayout
            title="Tasks"
            description="Manage project tasks, track progress, and organize team priorities."
            actions={
                <div className="flex items-center gap-4">
                    <div className="flex bg-surface-subtle border border-border p-1 rounded-xl shadow-inner">
                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx(
                                "p-2 rounded-lg transition-all",
                                viewMode === 'list' ? "bg-surface-solid text-primary shadow-sm border border-border" : "text-text-muted hover:text-text-primary"
                            )}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={clsx(
                                "p-2 rounded-lg transition-all",
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
                        className="shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                    </Button>
                </div>
            }
        >

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard 
                    label="Pending Tasks" 
                    value={todos.filter(t => t.status !== 'Done').length.toString()} 
                    icon={<Timer className="w-5 h-5 text-text-muted" />} 
                    sub="Assigned & backlog"
                />
                <KpiCard 
                    label="Completed" 
                    value={todos.filter(t => t.status === 'Done').length.toString()} 
                    icon={<CheckSquare className="w-5 h-5 text-text-muted" />} 
                    sub="Successfully finished"
                />
                <KpiCard 
                    label="Total Assigned" 
                    value={todos.filter(t => t.assignee_id).length.toString()} 
                    icon={<ClipboardList className="w-5 h-5 text-text-muted" />} 
                    sub="Current workload"
                />
            </div>

            <Card className="p-0 overflow-hidden border-border/60 shadow-xl">
                {/* Search & Filters */}
                <div className="p-6 border-b border-border bg-surface-subtle/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative group w-full max-w-md">
                        <Search className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search tasks, projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2 bg-surface-solid border border-border rounded-lg text-sm text-text-primary outline-none focus:border-primary transition-all"
                        />
                    </div>
                    
                    <div className="flex items-center bg-surface-solid border border-border rounded-lg p-1 shadow-sm">
                        {['All', 'Todo', 'In Progress', 'Done'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                                    statusFilter === s ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                {s === 'Done' ? 'Completed' : s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="py-20 text-center text-text-muted">
                            <LoadingState message="Loading tasks..." />
                        </div>
                    ) : filteredTodos.length === 0 ? (
                        <div className="py-20">
                            <EmptyState 
                                icon={<CheckCircle2 className="w-12 h-12 text-text-muted/20" />}
                                title={searchTerm ? "No tasks found" : "All caught up"}
                                description={searchTerm ? "Try adjusting your search filters." : "You have no pending tasks. Click 'Add Task' to get started."}
                                action={!searchTerm && !isViewer && (
                                    <Button onClick={handleOpenCreate} variant="secondary">
                                        Add First Task
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
                title={editTodo ? 'Edit Task' : 'New Task'}
                subtitle={editTodo ? 'Update task details and status' : 'Create a new task and assign it to a team member'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Task Title"
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Update project documentation"
                        leftIcon={<Tag className="w-4 h-4" />}
                    />
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-primary px-1">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Add more details about this task..."
                            className="w-full px-4 py-3 bg-surface-solid border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/50 outline-none focus:border-primary transition-all resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-text-primary px-1">
                                Project
                            </label>
                            <select
                                required
                                value={formData.project_id}
                                onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                                className="w-full px-4 py-2.5 bg-surface-solid border border-border rounded-xl text-sm text-text-primary outline-none focus:border-primary transition-all"
                            >
                                <option value="">Select Project</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-text-primary px-1">
                                Assignee
                            </label>
                            <select
                                value={formData.assignee_id}
                                onChange={e => setFormData({ ...formData, assignee_id: e.target.value })}
                                className="w-full px-4 py-2.5 bg-surface-solid border border-border rounded-xl text-sm text-text-primary outline-none focus:border-primary transition-all"
                            >
                                <option value="">Unassigned</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-text-primary px-1">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-4 py-2 bg-surface-solid border border-border rounded-xl text-sm text-text-primary outline-none focus:border-primary transition-all"
                            />
                        </div>
                        {editTodo && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-text-primary px-1">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-4 py-2.5 bg-surface-solid border border-border rounded-xl text-sm text-text-primary outline-none focus:border-primary transition-all"
                                >
                                    <option value="Todo">Todo</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Done">Completed</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button
                            type="button"
                            onClick={handleCloseModal}
                            variant="secondary"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving || !formData.project_id || isViewer}
                            variant="primary"
                            className="flex-1"
                        >
                            {saving ? 'Saving...' : (editTodo ? 'Save Changes' : 'Create Task')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* DELETE MODAL */}
            {deletingTodo && (
                <Modal
                    isOpen={!!deletingTodo}
                    onClose={() => setDeletingTodo(null)}
                    title="Delete Task"
                    subtitle="Are you sure you want to remove this task?"
                    maxWidth="max-w-md"
                >
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-text-secondary leading-relaxed">
                                This will permanently remove <span className="font-bold text-text-primary">"{deletingTodo.title}"</span>. This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={() => setDeletingTodo(null)}
                                variant="secondary"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDelete}
                                variant="danger"
                                className="flex-1 shadow-sm shadow-rose-100"
                            >
                                Delete Task
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </PageLayout>
    );
}

function TodoListItem({ todo, onToggle, onEdit, onDelete, isViewer }: { todo: Todo; onToggle: () => void; onEdit: () => void; onDelete: () => void; isViewer: boolean }) {
    return (
        <div className="py-4 px-4 hover:bg-surface-subtle transition-all group flex items-start gap-4 border-b border-border/40 last:border-0 rounded-xl">
            <button
                onClick={onToggle}
                disabled={isViewer}
                className={clsx(
                    "mt-1 shrink-0 transition-all",
                    todo.status === 'Done' ? "text-emerald-500" : "text-text-muted/40 hover:text-primary",
                    isViewer && "cursor-not-allowed opacity-50"
                )}
            >
                {todo.status === 'Done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                    <h4 className={clsx(
                        "text-sm font-semibold tracking-tight transition-all",
                        todo.status === 'Done' ? "text-text-muted/40 line-through" : "text-text-primary"
                    )}>
                        {todo.title}
                    </h4>
                    {todo.projects && (
                        <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                            style={{ backgroundColor: `${todo.projects.color}10`, color: todo.projects.color }}
                        >
                            {todo.projects.name}
                        </span>
                    )}
                </div>
                {todo.description && (
                    <p className={clsx(
                        "text-xs mb-3 line-clamp-1",
                        todo.status === 'Done' ? "text-text-muted/30" : "text-text-muted"
                    )}>
                        {todo.description}
                    </p>
                )}
                <div className="flex items-center gap-4">
                    {todo.members && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                            <User className="w-3 h-3 opacity-60" />
                            {todo.members.full_name}
                        </div>
                    )}
                    {todo.due_date && (
                        <div className={clsx(
                            "flex items-center gap-1.5 text-[11px] font-medium",
                            new Date(todo.due_date) < new Date() && todo.status !== 'Done' ? "text-rose-500" : "text-text-muted"
                        )}>
                            <Calendar className="w-3 h-3 opacity-60" />
                            {new Date(todo.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                    <StatusBadge 
                        variant={todo.status === 'Done' ? 'success' : todo.status === 'In Progress' ? 'warning' : 'default'}
                        className="px-2 py-0 text-[10px]"
                    >
                        {todo.status === 'Done' ? 'Completed' : todo.status}
                    </StatusBadge>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <Button 
                    onClick={onEdit}
                    variant="ghost"
                    size="sm"
                    className="p-1.5 text-text-muted"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
                <Button 
                    onClick={onDelete}
                    disabled={isViewer}
                    variant="ghost"
                    size="sm"
                    className="p-1.5 text-text-muted hover:text-rose-600"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function TodoGridItem({ todo, onToggle, onEdit, onDelete, isViewer }: { todo: Todo; onToggle: () => void; onEdit: () => void; onDelete: () => void; isViewer: boolean }) {
    return (
        <div className="bg-surface-solid border border-border rounded-xl p-6 hover:shadow-md transition-all group flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                    style={{ backgroundColor: `${todo.projects?.color}10`, color: todo.projects?.color }}
                >
                    {todo.projects?.name || 'General'}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggle}
                        disabled={isViewer}
                        className={clsx(
                            "transition-all",
                            todo.status === 'Done' ? "text-emerald-500" : "text-text-muted/30 hover:text-primary",
                            isViewer && "opacity-50"
                        )}
                    >
                        {todo.status === 'Done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    {!isViewer && (
                        <button 
                            onClick={onDelete}
                            className="p-1 text-text-muted/40 hover:text-rose-600 transition-all"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <button 
                onClick={onEdit}
                className={clsx(
                    "text-lg font-bold mb-2 tracking-tight transition-all text-left",
                    todo.status === 'Done' ? "text-text-muted/40 line-through" : "text-text-primary hover:text-primary"
                )}
            >
                {todo.title}
            </button>
            
            {todo.description && (
                <p className={clsx(
                    "text-xs text-text-muted mb-6 line-clamp-3 leading-relaxed",
                    todo.status === 'Done' && "opacity-40"
                )}>
                    {todo.description}
                </p>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-[10px] font-bold text-text-primary">
                        {todo.members?.full_name.charAt(0) || '?'}
                    </div>
                    <span className="text-[11px] font-medium text-text-muted">
                        {todo.members?.full_name.split(' ')[0] || 'Unassigned'}
                    </span>
                </div>
                {todo.due_date && (
                    <span className={clsx(
                        "text-[10px] font-medium flex items-center gap-1.5",
                        new Date(todo.due_date) < new Date() && todo.status !== 'Done' ? "text-rose-500" : "text-text-muted"
                    )}>
                        <Calendar className="w-3.5 h-3.5 opacity-60" />
                        {new Date(todo.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>
        </div>
    );
}
