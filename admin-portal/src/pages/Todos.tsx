import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Circle, Search, Plus, Clock, User, X, Loader2, Calendar, LayoutGrid, List, MoreHorizontal } from 'lucide-react';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [todos, setTodos] = useState<Todo[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newTodo, setNewTodo] = useState({
        title: '',
        description: '',
        project_id: '',
        assignee_id: '',
        due_date: '',
        status: 'Todo' as const
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        setLoading(true);

        // Fetch Todos with joins
        const { data: todoData } = await supabase
            .from('todos')
            .select(`
                *,
                projects (name, color),
                members (full_name)
            `)
            .order('created_at', { ascending: false });

        // Fetch Projects for dropdown
        const { data: projectData } = await supabase
            .from('projects')
            .select('id, name')
            .order('name');

        // Fetch Members for dropdown
        const { data: memberData } = await supabase
            .from('members')
            .select('id, full_name')
            .order('full_name');

        if (todoData) setTodos(todoData);
        if (projectData) setProjects(projectData);
        if (memberData) setMembers(memberData);

        setLoading(false);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!newTodo.project_id) return;

        setSaving(true);
        const { data, error } = await supabase
            .from('todos')
            .insert({
                title: newTodo.title,
                description: newTodo.description,
                project_id: newTodo.project_id,
                assignee_id: newTodo.assignee_id || null,
                due_date: newTodo.due_date || null,
                status: 'Todo'
            })
            .select(`
                *,
                projects (name, color),
                members (full_name)
            `)
            .single();

        if (!error && data) {
            setTodos([data, ...todos]);
            setShowModal(false);
            setNewTodo({
                title: '',
                description: '',
                project_id: '',
                assignee_id: '',
                due_date: '',
                status: 'Todo'
            });
        }
        setSaving(false);
    }

    async function toggleStatus(todo: Todo) {
        const nextStatus = todo.status === 'Done' ? 'Todo' : 'Done';
        const { error } = await supabase
            .from('todos')
            .update({ status: nextStatus })
            .eq('id', todo.id);

        if (!error) {
            setTodos(todos.map(t => t.id === todo.id ? { ...t, status: nextStatus } : t));
        }
    }

    const filteredTodos = todos.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.projects?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full fade-in">
            {/* Header Area */}
            <div className="flex justify-between items-end mb-8 relative z-20">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">To-dos</h1>
                    <p className="text-slate-500">Manage tasks across projects and track their progress.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New To-do
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between group cursor-pointer hover:border-orange-200 transition-colors">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Open Tasks</p>
                        <p className="text-3xl font-bold text-slate-800">{loading ? '-' : todos.filter(t => t.status !== 'Done').length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between group cursor-pointer hover:border-emerald-200 transition-colors">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Completed</p>
                        <p className="text-3xl font-bold text-slate-800">{loading ? '-' : todos.filter(t => t.status === 'Done').length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between group cursor-pointer hover:border-blue-200 transition-colors">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Assigned</p>
                        <p className="text-3xl font-bold text-slate-800">
                            {loading ? '-' : todos.filter(t => t.assignee_id).length}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <User className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div className="relative w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Find a to-do..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-slate-200 rounded-lg text-sm px-3 py-2 bg-white text-slate-700 outline-none hover:bg-slate-50"
                        >
                            <option value="All">All Tasks</option>
                            <option value="Todo">To-do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Completed</option>
                        </select>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="py-20 text-center text-slate-500">Loading your list...</div>
                    ) : filteredTodos.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-400 mb-4 border border-slate-100">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">Clear as a whistle!</h3>
                            <p className="text-slate-500 text-sm">No to-dos found here. Time to plan something new.</p>
                        </div>
                    ) : viewMode === 'list' ? (
                        <div className="divide-y divide-slate-100">
                            {filteredTodos.map((todo) => (
                                <div key={todo.id} className="p-4 hover:bg-slate-50/50 transition-colors group flex items-start gap-4">
                                    <button
                                        onClick={() => toggleStatus(todo)}
                                        className={`mt-0.5 shrink-0 transition-colors ${todo.status === 'Done' ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                                    >
                                        {todo.status === 'Done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`text-sm font-semibold truncate ${todo.status === 'Done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                {todo.title}
                                            </h4>
                                            {todo.projects && (
                                                <span
                                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                                    style={{ backgroundColor: `${todo.projects.color}15`, color: todo.projects.color }}
                                                >
                                                    {todo.projects.name}
                                                </span>
                                            )}
                                        </div>
                                        {todo.description && (
                                            <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                                                {todo.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4">
                                            {todo.members && (
                                                <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                                                    <User className="w-3 h-3" />
                                                    {todo.members.full_name}
                                                </div>
                                            )}
                                            {todo.due_date && (
                                                <div className="flex items-center gap-1 text-[10px] font-medium text-orange-400">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(todo.due_date).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                            {filteredTodos.map((todo) => (
                                <div key={todo.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                        <span
                                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm"
                                            style={{ backgroundColor: `${todo.projects?.color}20`, color: todo.projects?.color }}
                                        >
                                            {todo.projects?.name || 'General'}
                                        </span>
                                        <button
                                            onClick={() => toggleStatus(todo)}
                                            className={`transition-colors ${todo.status === 'Done' ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                                        >
                                            {todo.status === 'Done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <h4 className={`text-sm font-bold mb-1 ${todo.status === 'Done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {todo.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 h-8">
                                        {todo.description || 'No description provided.'}
                                    </p>
                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {todo.members?.full_name.charAt(0) || '?'}
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[80px]">
                                                {todo.members?.full_name.split(' ')[0] || 'Unassigned'}
                                            </span>
                                        </div>
                                        {todo.due_date && (
                                            <span className="text-[10px] font-bold text-orange-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(todo.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Todo Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col scale-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" />
                                Create New To-do
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Task Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTodo.title}
                                        onChange={e => setNewTodo({ ...newTodo, title: e.target.value })}
                                        placeholder="What needs to be done?"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                                    <textarea
                                        rows={2}
                                        value={newTodo.description}
                                        onChange={e => setNewTodo({ ...newTodo, description: e.target.value })}
                                        placeholder="Optional details..."
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project</label>
                                        <select
                                            required
                                            value={newTodo.project_id}
                                            onChange={e => setNewTodo({ ...newTodo, project_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Project</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assignee</label>
                                        <select
                                            value={newTodo.assignee_id}
                                            onChange={e => setNewTodo({ ...newTodo, assignee_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Unassigned</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id}>{m.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
                                    <input
                                        type="date"
                                        value={newTodo.due_date}
                                        onChange={e => setNewTodo({ ...newTodo, due_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !newTodo.project_id}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
