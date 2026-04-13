import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
    CheckCircle2, Circle, Search, Plus, 
    User, Calendar, 
    LayoutGrid, List, MoreHorizontal, 
    Trash2, Tag, 
    CheckSquare, ClipboardList, Timer, RefreshCw, 
    Users
} from 'lucide-react';
import { 
    PageLayout, Button, 
    LoadingState, EmptyState, Modal, Input,
    StatMetric
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
    todo_assignees?: Array<{
        member_id: string;
        members?: { id: string; full_name: string };
    }>;
}

interface Project {
    id: string;
    name: string;
}


export function Todos() {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [todos, setTodos] = useState<Todo[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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
        assignee_ids: [] as string[],
        due_date: '',
        status: 'Todo' as 'Todo' | 'In Progress' | 'Done'
    });

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const { data: todoData, error: todoError } = await supabase
                .from('todos')
                .select(`
                    *,
                    projects (name, color),
                    members!todos_assignee_id_fkey (full_name),
                    todo_assignees (
                        member_id,
                        members (id, full_name)
                    )
                `)
                .order('created_at', { ascending: false });

            let safeTodoData = todoData;
            if (todoError) {
                const { data: legacyTodoData } = await supabase
                    .from('todos')
                    .select(`
                        *,
                        projects (name, color),
                        members!todos_assignee_id_fkey (full_name)
                    `)
                    .order('created_at', { ascending: false });
                safeTodoData = legacyTodoData;
            }

            const { data: pData } = await supabase.from('projects').select('id, name').order('name');
            if (safeTodoData) setTodos(safeTodoData as Todo[]);
            if (pData) setProjects(pData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getTodoAssigneeIds = (todo: Todo): string[] => {
        if (todo.todo_assignees && todo.todo_assignees.length > 0) {
            return [...new Set(todo.todo_assignees.map(a => a.member_id).filter(Boolean))];
        }
        return todo.assignee_id ? [todo.assignee_id] : [];
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.project_id || isViewer) return;

        setSaving(true);
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                project_id: formData.project_id,
                assignee_id: formData.assignee_ids[0] || null,
                due_date: formData.due_date || null
            };

            const query = editTodo 
                ? supabase.from('todos').update({ ...payload, status: formData.status }).eq('id', editTodo.id)
                : supabase.from('todos').insert({ ...payload, status: 'Todo' });

            const { data, error } = await (query.select(`*, projects (name, color), members!todos_assignee_id_fkey (full_name)`)).single();

            if (error) throw error;
            if (data) {
                // Sync multi-assignees
                const uniqueIds = [...new Set(formData.assignee_ids.filter(Boolean))];
                await supabase.from('todo_assignees').delete().eq('todo_id', data.id);
                if (uniqueIds.length > 0) {
                    await supabase.from('todo_assignees').insert(uniqueIds.map(member_id => ({ todo_id: data.id, member_id })));
                }
                await fetchData(true);
                handleCloseModal();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    }

    async function toggleStatus(todo: Todo) {
        if (isViewer) return;
        const nextStatus = todo.status === 'Done' ? 'Todo' : 'Done';
        const { error } = await supabase.from('todos').update({ status: nextStatus }).eq('id', todo.id);
        if (!error) fetchData(true);
    }

    async function handleDelete() {
        if (!deletingTodo || isViewer) return;
        const { error } = await supabase.from('todos').delete().eq('id', deletingTodo.id);
        if (!error) {
            setTodos(todos.filter(t => t.id !== deletingTodo.id));
            setDeletingTodo(null);
        }
    }

    function handleOpenCreate() {
        setEditTodo(null);
        setFormData({ title: '', description: '', project_id: '', assignee_ids: [], due_date: '', status: 'Todo' });
        setShowModal(true);
    }

    function handleOpenEdit(todo: Todo) {
        setEditTodo(todo);
        setFormData({
            title: todo.title,
            description: todo.description || '',
            project_id: todo.project_id,
            assignee_ids: getTodoAssigneeIds(todo),
            due_date: todo.due_date || '',
            status: todo.status
        });
        setShowModal(true);
    }

    function handleCloseModal() {
        setShowModal(false);
        setEditTodo(null);
    }

    const filteredTodos = useMemo(() => {
        return todos.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.projects?.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [todos, searchTerm, statusFilter]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><LoadingState /></div>;

    return (
        <PageLayout
            maxWidth="full"
            title="Tasks & Objectives"
            description="Fine-grained management of project scope and team deliverables."
            actions={
                <div className="flex items-center gap-4">
                    <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <button onClick={() => setViewMode('list')} className={clsx("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}>
                            <List className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('grid')} className={clsx("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}>
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    {!isViewer && (
                        <Button onClick={handleOpenCreate} variant="primary" className="shadow-sm px-6">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Task
                        </Button>
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-6 pb-20">
                
                {/* 📊 KPI Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatMetric icon={<Timer className="w-5 h-5" />} label="In Flight" value={todos.filter(t => t.status !== 'Done').length} sub="Pending objectives" />
                    <StatMetric icon={<CheckSquare className="w-5 h-5" />} label="Resolved" value={todos.filter(t => t.status === 'Done').length} sub="Successfully closed" />
                    <StatMetric icon={<ClipboardList className="w-5 h-5" />} label="Resource Load" value={todos.filter(t => getTodoAssigneeIds(t).length > 0).length} sub="Tasks with owners" />
                </div>

                {/* 🏛️ Task Ledger Container */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                    <div className="px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                                <Search className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="relative group min-w-[320px]">
                                <input
                                    type="text"
                                    placeholder="Filter objectives..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-transparent border-none text-sm font-black text-slate-900 uppercase tracking-tight placeholder:text-slate-300 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200 shadow-inner">
                                {['All', 'Todo', 'In Progress', 'Done'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={clsx(
                                            "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                                            statusFilter === s ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        {s === 'Done' ? 'Closed' : s}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => fetchData(true)} className={clsx("p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-slate-500 shadow-sm", refreshing && "animate-spin text-primary")}>
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="p-8">
                        {filteredTodos.length === 0 ? (
                            <EmptyState icon={<CheckCircle2 />} title="Objectives Cleared" description="No tasks match your current criteria." />
                        ) : viewMode === 'list' ? (
                            <div className="divide-y divide-slate-50">
                                {filteredTodos.map((todo) => (
                                    <TodoListItem key={todo.id} todo={todo} onToggle={() => toggleStatus(todo)} onEdit={() => handleOpenEdit(todo)} onDelete={() => setDeletingTodo(todo)} isViewer={isViewer} />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredTodos.map((todo) => (
                                    <TodoGridItem key={todo.id} todo={todo} onToggle={() => toggleStatus(todo)} onEdit={() => handleOpenEdit(todo)} onDelete={() => setDeletingTodo(todo)} isViewer={isViewer} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS remain similar in logic but use the new Input styles */}
            <Modal isOpen={showModal} onClose={handleCloseModal} title={editTodo ? 'Refine Objective' : 'New objective'} subtitle="Specify deliverables and resource allocation.">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input label="Title" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Deliverable name..." leftIcon={<Tag className="w-4 h-4" />} />
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Context / Details</label>
                        <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-300 outline-none focus:border-primary transition-all resize-none" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Host Project</label>
                            <select required value={formData.project_id} onChange={e => setFormData({ ...formData, project_id: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:border-primary transition-all cursor-pointer">
                                <option value="">Target...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resolution Date</label>
                            <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-primary transition-all" />
                        </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <Button type="button" onClick={handleCloseModal} variant="secondary" className="flex-1">Discard</Button>
                        <Button type="submit" disabled={saving || !formData.project_id} variant="primary" className="flex-1">{saving ? 'Syncing...' : 'Commit Changes'}</Button>
                    </div>
                </form>
            </Modal>

            {deletingTodo && (
                <Modal isOpen={!!deletingTodo} onClose={() => setDeletingTodo(null)} title="Revoke Objective" subtitle="This operation is destructive and irreversible.">
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100"><Trash2 className="w-8 h-8" /></div>
                        <p className="text-sm font-medium text-slate-600">Archive <span className="font-black text-slate-900 tracking-tight">"{deletingTodo.title}"</span> permanently?</p>
                        <div className="flex gap-3 pt-4">
                            <Button onClick={() => setDeletingTodo(null)} variant="secondary" className="flex-1">Cancel</Button>
                            <Button onClick={handleDelete} variant="danger" className="flex-1">Confirm Deletion</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </PageLayout>
    );
}

function TodoListItem({ todo, onToggle, onEdit, onDelete, isViewer }: { todo: Todo; onToggle: () => void; onEdit: () => void; onDelete: () => void; isViewer: boolean }) {
    const assigneeNames = todo.todo_assignees?.map(a => a.members?.full_name).filter(Boolean) as string[] | undefined;
    const assigneeLabel = assigneeNames && assigneeNames.length > 0 ? assigneeNames.join(', ') : todo.members?.full_name;

    return (
        <div className="py-5 px-4 hover:bg-slate-50/50 transition-all group flex items-start gap-5 rounded-xl border-b border-slate-50 last:border-0">
            <button onClick={onToggle} disabled={isViewer} className={clsx("mt-1.5 shrink-0 transition-all", todo.status === 'Done' ? "text-emerald-500" : "text-slate-300 hover:text-primary")}>
                {todo.status === 'Done' ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : <Circle className="w-5 h-5 stroke-[2.5]" />}
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                    <h4 className={clsx("text-sm font-black tracking-tight uppercase transition-all", todo.status === 'Done' ? "text-slate-300 line-through" : "text-slate-900")}>
                        {todo.title}
                    </h4>
                    {todo.projects && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: `${todo.projects.color}10`, color: todo.projects.color }}>
                            {todo.projects.name}
                        </span>
                    )}
                </div>
                {todo.description && <p className={clsx("text-[11px] font-medium mb-3 line-clamp-1", todo.status === 'Done' ? "text-slate-200" : "text-slate-500")}>{todo.description}</p>}
                <div className="flex items-center gap-5">
                    {assigneeLabel && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tight">
                            <Users className="w-3.5 h-3.5" /> {assigneeLabel}
                        </div>
                    )}
                    {todo.due_date && (
                        <div className={clsx("flex items-center gap-2 text-[10px] font-black uppercase tracking-tight", new Date(todo.due_date) < new Date() && todo.status !== 'Done' ? "text-rose-500" : "text-slate-400")}>
                            <Calendar className="w-3.5 h-3.5" /> {new Date(todo.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button onClick={onEdit} className="p-2 text-slate-300 hover:text-slate-900" title="Modify"><MoreHorizontal className="w-4 h-4" /></button>
                <button onClick={onDelete} className="p-2 text-slate-100 hover:text-rose-500 transition-colors" title="Remove"><Trash2 className="w-4 h-4" /></button>
            </div>
        </div>
    );
}

function TodoGridItem({ todo, onToggle, onEdit, onDelete, isViewer }: { todo: Todo; onToggle: () => void; onEdit: () => void; onDelete: () => void; isViewer: boolean }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-primary/20 transition-all group flex flex-col h-full relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border border-slate-100">
                    {todo.projects?.name || 'Sandbox'}
                </span>
                <button onClick={onToggle} disabled={isViewer} className={clsx("transition-all", todo.status === 'Done' ? "text-emerald-500" : "text-slate-200 hover:text-primary")}>
                    {todo.status === 'Done' ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : <Circle className="w-5 h-5 stroke-[2.5]" />}
                </button>
            </div>
            <button onClick={onEdit} className={clsx("text-base font-black mb-3 tracking-tight text-left uppercase leading-tight", todo.status === 'Done' ? "text-slate-300 line-through" : "text-slate-900 hover:text-primary")}>
                {todo.title}
            </button>
            <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><User className="w-3 h-3 text-slate-400" /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">{todo.members?.full_name?.split(' ')[0] || 'User'}</span>
                </div>
                <button onClick={() => !isViewer && onDelete()} className="opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-500 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            {todo.status === 'Done' && <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 [clip-path:polygon(100%_0,0_0,100%_100%)]" />}
        </div>
    );
}
