import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
    CheckCircle2,
    Circle,
    Search,
    Plus,
    User,
    Calendar,
    LayoutGrid,
    List,
    MoreHorizontal,
    Trash2,
    Tag,
    CheckSquare,
    ClipboardList,
    Timer,
    RefreshCw
} from 'lucide-react';

import {
    PageLayout,
    Button,
    LoadingState,
    EmptyState,
    Modal,
    Input,
    StatMetric,
    DatePicker
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
    projects?: {
        name: string;
        color: string;
    };
    members?: {
        full_name: string;
    };
    todo_assignees?: Array<{
        member_id: string;
        members?: {
            id: string;
            full_name: string;
        };
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
    const [allMembers, setAllMembers] = useState<
        Array<{
            id: string;
            full_name: string;
            email: string;
        }>
    >([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [assigneeSearch, setAssigneeSearch] = useState('');

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
        if (!isSilent) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            const {
                data: todoData,
                error: todoError
            } = await supabase
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
                .order('created_at', {
                    ascending: false
                });

            let safeTodoData = todoData;

            if (todoError) {
                const {
                    data: legacyTodoData
                } = await supabase
                    .from('todos')
                    .select(`
                        *,
                        projects (name, color),
                        members!todos_assignee_id_fkey (full_name)
                    `)
                    .order('created_at', {
                        ascending: false
                    });

                safeTodoData = legacyTodoData;
            }

            const {
                data: pData
            } = await supabase
                .from('projects')
                .select('id, name')
                .order('name');

            const {
                data: mData
            } = await supabase
                .from('members')
                .select('id, full_name, email')
                .eq('status', 'Active')
                .order('full_name');

            if (safeTodoData) {
                setTodos(safeTodoData as Todo[]);
            }

            if (pData) {
                setProjects(pData);
            }

            if (mData) {
                setAllMembers(mData);
            }
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
        if (
            todo.todo_assignees &&
            todo.todo_assignees.length > 0
        ) {
            return [
                ...new Set(
                    todo.todo_assignees
                        .map(a => a.member_id)
                        .filter(Boolean)
                )
            ];
        }

        return todo.assignee_id
            ? [todo.assignee_id]
            : [];
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!formData.project_id || isViewer) {
            return;
        }

        setSaving(true);

        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                project_id: formData.project_id,
                assignee_id:
                    formData.assignee_ids[0] || null,
                due_date:
                    formData.due_date || null
            };

            const query = editTodo
                ? supabase
                    .from('todos')
                    .update({
                        ...payload,
                        status: formData.status
                    })
                    .eq('id', editTodo.id)
                : supabase
                    .from('todos')
                    .insert({
                        ...payload,
                        status: 'Todo'
                    });

            const {
                data,
                error
            } = await query
                .select(`
                    *,
                    projects (name, color),
                    members!todos_assignee_id_fkey (full_name)
                `)
                .single();

            if (error) {
                throw error;
            }

            if (data) {
                const uniqueIds = [
                    ...new Set(
                        formData.assignee_ids.filter(Boolean)
                    )
                ];

                await supabase
                    .from('todo_assignees')
                    .delete()
                    .eq('todo_id', data.id);

                if (uniqueIds.length > 0) {
                    await supabase
                        .from('todo_assignees')
                        .insert(
                            uniqueIds.map(member_id => ({
                                todo_id: data.id,
                                member_id
                            }))
                        );
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
        if (isViewer) {
            return;
        }

        const nextStatus =
            todo.status === 'Done'
                ? 'Todo'
                : 'Done';

        const {
            error
        } = await supabase
            .from('todos')
            .update({
                status: nextStatus
            })
            .eq('id', todo.id);

        if (!error) {
            fetchData(true);
        }
    }

    async function handleDelete() {
        if (!deletingTodo || isViewer) {
            return;
        }

        const {
            error
        } = await supabase
            .from('todos')
            .delete()
            .eq('id', deletingTodo.id);

        if (!error) {
            setTodos(
                todos.filter(
                    t => t.id !== deletingTodo.id
                )
            );

            setDeletingTodo(null);
        }
    }

    function handleOpenCreate() {
        setEditTodo(null);

        setFormData({
            title: '',
            description: '',
            project_id: '',
            assignee_ids: [],
            due_date: '',
            status: 'Todo'
        });

        setAssigneeSearch('');
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

        setAssigneeSearch('');
        setShowModal(true);
    }

    function handleCloseModal() {
        setShowModal(false);
        setEditTodo(null);
        setAssigneeSearch('');
    }

    const filteredTodos = useMemo(() => {
        return todos.filter(todo => {
            const query = searchTerm.toLowerCase();

            const matchesSearch =
                todo.title
                    .toLowerCase()
                    .includes(query) ||
                todo.description
                    ?.toLowerCase()
                    .includes(query) ||
                todo.projects?.name
                    .toLowerCase()
                    .includes(query);

            const matchesStatus =
                statusFilter === 'All' ||
                todo.status === statusFilter;

            return (
                matchesSearch &&
                matchesStatus
            );
        });
    }, [
        todos,
        searchTerm,
        statusFilter
    ]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface">
                <LoadingState />
            </div>
        );
    }

    return (
        <PageLayout
            maxWidth="full"
            title="Tasks & Objectives"
            description="Fine-grained management of project scope and team deliverables."
            actions={
                <div className="flex items-center gap-2 sm:gap-4 max-w-full min-w-0">
                    {/* View switcher */}
                    <div className="flex bg-surface border border-border rounded-xl p-1 shadow-shell-sm shrink-0">
                        <button
                            onClick={() =>
                                setViewMode('list')
                            }
                            className={clsx(
                                'p-2 rounded-lg transition-all',
                                viewMode === 'list'
                                    ? 'bg-slate-900 text-white shadow-shell-sm'
                                    : 'text-text-muted hover:text-slate-900 hover:bg-surface-hover'
                            )}
                        >
                            <List className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() =>
                                setViewMode('grid')
                            }
                            className={clsx(
                                'p-2 rounded-lg transition-all',
                                viewMode === 'grid'
                                    ? 'bg-slate-900 text-white shadow-shell-sm'
                                    : 'text-text-muted hover:text-slate-900 hover:bg-surface-hover'
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>

                    {!isViewer && (
                        <Button
                            onClick={handleOpenCreate}
                            variant="primary"
                            className="
                                shadow-shell-sm
                                h-10 sm:h-12
                                px-3 sm:px-5 lg:px-8
                                rounded-xl
                                font-bold
                                text-[12px] sm:text-[14px]
                                flex items-center gap-2 sm:gap-3
                                shrink-0
                                whitespace-nowrap
                            "
                        >
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Add Task</span>
                        </Button>
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-6 sm:gap-8 pb-20 min-w-0 max-w-full">

                {/* KPI Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-10 min-w-0">
                    <StatMetric
                        icon={
                            <Timer className="w-5 h-5" />
                        }
                        label="In Flight"
                        value={
                            todos.filter(
                                t => t.status !== 'Done'
                            ).length
                        }
                        sub="Pending objectives"
                        accent="brand-gradient"
                    />

                    <StatMetric
                        icon={
                            <CheckSquare className="w-5 h-5" />
                        }
                        label="Resolved"
                        value={
                            todos.filter(
                                t => t.status === 'Done'
                            ).length
                        }
                        sub="Successfully closed"
                        accent="brand-gradient"
                    />

                    <StatMetric
                        icon={
                            <ClipboardList className="w-5 h-5" />
                        }
                        label="Resource Load"
                        value={
                            todos.filter(
                                t =>
                                    getTodoAssigneeIds(t)
                                        .length > 0
                            ).length
                        }
                        sub="Tasks with owners"
                        accent="brand-gradient"
                    />
                </div>

                {/* Task Ledger */}
                <div
                    className="
                        bg-surface
                        border border-border
                        rounded-[20px] sm:rounded-[24px]
                        shadow-shell-sm
                        overflow-hidden
                        flex flex-col
                        min-h-[500px] sm:min-h-[600px]
                        w-full
                        max-w-full
                        min-w-0
                    "
                >
                    {/* Toolbar */}
                    <div
                        className="
                            px-4 sm:px-6 lg:px-8
                            py-4 sm:py-6
                            border-b border-border
                            flex flex-col
                            lg:flex-row
                            lg:items-center
                            lg:justify-between
                            gap-4
                            bg-surface
                            shrink-0
                            min-w-0
                        "
                    >
                        {/* Search */}
                        <div className="relative group/search w-full lg:w-[420px] max-w-full min-w-0">
                            <Search className="w-5 h-5 absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" />

                            <input
                                type="text"
                                placeholder="Filter objectives..."
                                value={searchTerm}
                                onChange={e =>
                                    setSearchTerm(
                                        e.target.value
                                    )
                                }
                                className="
                                    w-full
                                    min-w-0
                                    h-11 sm:h-12
                                    pl-12 sm:pl-14
                                    pr-4 sm:pr-6
                                    bg-surface-solid
                                    border border-border
                                    rounded-xl
                                    text-[13px] sm:text-[14px]
                                    font-medium
                                    text-text-main
                                    placeholder:text-text-muted/60
                                    outline-none
                                    focus:border-primary
                                    shadow-shell-sm
                                    focus:shadow-shell
                                    transition-all
                                "
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0 w-full lg:w-auto">
                            <div
                                className="
                                    bg-surface
                                    border border-border
                                    p-1
                                    rounded-2xl
                                    flex items-center
                                    shadow-shell-sm
                                    min-w-0
                                    flex-1
                                    overflow-x-auto
                                    scrollbar-hide
                                "
                            >
                                {[
                                    'All',
                                    'Todo',
                                    'In Progress',
                                    'Done'
                                ].map(status => (
                                    <button
                                        key={status}
                                        onClick={() =>
                                            setStatusFilter(
                                                status
                                            )
                                        }
                                        className={clsx(
                                            `
                                            px-3 sm:px-5 lg:px-6
                                            py-2.5
                                            rounded-xl
                                            text-[11px] sm:text-[13px]
                                            font-bold
                                            transition-all
                                            whitespace-nowrap
                                            shrink-0
                                            `,
                                            statusFilter ===
                                                status
                                                ? 'bg-slate-900 text-white shadow-shell-sm'
                                                : 'text-text-muted hover:text-slate-900 hover:bg-surface-hover'
                                        )}
                                    >
                                        {status === 'Done'
                                            ? 'Closed'
                                            : status}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() =>
                                    fetchData(true)
                                }
                                className={clsx(
                                    `
                                    w-10 h-10 sm:w-12 sm:h-12
                                    shrink-0
                                    flex items-center justify-center
                                    bg-surface
                                    border border-border
                                    rounded-xl
                                    hover:bg-surface-hover
                                    transition-all
                                    text-text-muted
                                    shadow-shell-sm
                                    active:scale-95
                                    duration-200
                                    `,
                                    refreshing &&
                                        'text-primary'
                                )}
                            >
                                <RefreshCw
                                    className={clsx(
                                        'w-4 h-4 sm:w-5 sm:h-5',
                                        refreshing &&
                                            'animate-spin'
                                    )}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-5 lg:p-8 min-w-0 max-w-full">
                        {filteredTodos.length === 0 ? (
                            <EmptyState
                                icon={
                                    <CheckCircle2 />
                                }
                                title="Objectives Cleared"
                                description="No tasks match your current criteria."
                            />
                        ) : viewMode === 'list' ? (
                            <div className="divide-y divide-slate-100/80 min-w-0">
                                {filteredTodos.map(todo => (
                                    <TodoListItem
                                        key={todo.id}
                                        todo={todo}
                                        onToggle={() =>
                                            toggleStatus(
                                                todo
                                            )
                                        }
                                        onEdit={() =>
                                            handleOpenEdit(
                                                todo
                                            )
                                        }
                                        onDelete={() =>
                                            setDeletingTodo(
                                                todo
                                            )
                                        }
                                        isViewer={isViewer}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                                {filteredTodos.map(todo => (
                                    <TodoGridItem
                                        key={todo.id}
                                        todo={todo}
                                        onToggle={() =>
                                            toggleStatus(
                                                todo
                                            )
                                        }
                                        onEdit={() =>
                                            handleOpenEdit(
                                                todo
                                            )
                                        }
                                        onDelete={() =>
                                            setDeletingTodo(
                                                todo
                                            )
                                        }
                                        isViewer={isViewer}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* =========================
                ADD / EDIT TASK MODAL
            ========================== */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={
                    editTodo
                        ? 'Refine Objective'
                        : 'New objective'
                }
                subtitle="Specify deliverables and resource allocation."
            >
                <form
                    onSubmit={handleSubmit}
                    className="
                        w-full
                        max-w-full
                        min-w-0
                        space-y-5 sm:space-y-6
                        overflow-x-hidden
                    "
                >
                    {/* Title */}
                    <div className="w-full min-w-0">
                        <Input
                            label="Title"
                            required
                            value={formData.title}
                            onChange={e =>
                                setFormData({
                                    ...formData,
                                    title: e.target.value
                                })
                            }
                            placeholder="Deliverable name..."
                            leftIcon={
                                <Tag className="w-4 h-4" />
                            }
                        />
                    </div>

                    {/* Assignees */}
                    <div className="space-y-2 w-full min-w-0">
                        <div
                            className="
                                flex
                                flex-col
                                sm:flex-row
                                sm:items-center
                                sm:justify-between
                                gap-2
                                px-1
                                min-w-0
                            "
                        >
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider shrink-0">
                                Assign Objectives To
                            </label>

                            <input
                                type="text"
                                placeholder="Search assignees..."
                                value={assigneeSearch}
                                onChange={e =>
                                    setAssigneeSearch(
                                        e.target.value
                                    )
                                }
                                className="
                                    w-full
                                    sm:w-48
                                    max-w-full
                                    min-w-0
                                    text-[11px]
                                    font-semibold
                                    text-text-main
                                    placeholder:text-slate-300
                                    outline-none
                                    border border-border
                                    rounded-lg
                                    px-2.5 py-2 sm:py-1
                                    bg-surface-hover
                                    shadow-inner
                                    focus:border-primary/50
                                    transition-colors
                                "
                            />
                        </div>

                        <div
                            className="
                                border border-border
                                rounded-xl
                                p-2 sm:p-3
                                bg-surface-hover
                                max-h-[160px]
                                overflow-y-auto
                                overflow-x-hidden
                                custom-scrollbar
                                space-y-1.5
                                shadow-inner
                                w-full
                                min-w-0
                            "
                        >
                            {allMembers
                                .filter(
                                    member =>
                                        member.full_name
                                            .toLowerCase()
                                            .includes(
                                                assigneeSearch.toLowerCase()
                                            ) ||
                                        member.email
                                            .toLowerCase()
                                            .includes(
                                                assigneeSearch.toLowerCase()
                                            )
                                )
                                .map(member => {
                                    const isAssigned =
                                        formData.assignee_ids.includes(
                                            member.id
                                        );

                                    return (
                                        <label
                                            key={member.id}
                                            className="
                                                flex
                                                items-center
                                                justify-between
                                                gap-2
                                                p-2
                                                rounded-lg
                                                hover:bg-surface/50
                                                cursor-pointer
                                                transition-all
                                                min-w-0
                                                w-full
                                            "
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                                    {getInitials(
                                                        member.full_name
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[12px] font-bold text-text-main leading-tight truncate">
                                                        {
                                                            member.full_name
                                                        }
                                                    </p>

                                                    <p className="text-[9px] text-text-muted font-mono truncate">
                                                        {
                                                            member.email
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <input
                                                type="checkbox"
                                                checked={
                                                    isAssigned
                                                }
                                                onChange={() => {
                                                    const next =
                                                        isAssigned
                                                            ? formData.assignee_ids.filter(
                                                                  id =>
                                                                      id !==
                                                                      member.id
                                                              )
                                                            : [
                                                                  ...formData.assignee_ids,
                                                                  member.id
                                                              ];

                                                    setFormData(
                                                        {
                                                            ...formData,
                                                            assignee_ids:
                                                                next
                                                        }
                                                    );
                                                }}
                                                className="
                                                    w-4 h-4
                                                    rounded
                                                    border-border
                                                    text-primary
                                                    focus:ring-primary
                                                    cursor-pointer
                                                    shrink-0
                                                "
                                            />
                                        </label>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5 w-full min-w-0">
                        <label className="text-[10px] font-black text-text-muted px-1">
                            Context / Details
                        </label>

                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e =>
                                setFormData({
                                    ...formData,
                                    description:
                                        e.target.value
                                })
                            }
                            className="
                                w-full
                                max-w-full
                                min-w-0
                                px-4 py-3
                                bg-surface-hover
                                border border-border
                                rounded-xl
                                text-sm
                                font-medium
                                text-text-main
                                placeholder:text-slate-300
                                outline-none
                                focus:border-primary
                                transition-all
                                resize-none
                                overflow-y-auto
                            "
                        />
                    </div>

                    {/* Project + Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                        <div className="space-y-1.5 min-w-0">
                            <label className="text-[10px] font-black text-text-muted px-1">
                                Host Project
                            </label>

                            <select
                                required
                                value={
                                    formData.project_id
                                }
                                onChange={e =>
                                    setFormData({
                                        ...formData,
                                        project_id:
                                            e.target.value
                                    })
                                }
                                className="
                                    w-full
                                    max-w-full
                                    min-w-0
                                    px-4 py-2.5
                                    bg-surface-hover
                                    border border-border
                                    rounded-xl
                                    text-sm
                                    font-semibold
                                    text-text-main
                                    outline-none
                                    focus:border-primary
                                    transition-all
                                    cursor-pointer
                                "
                            >
                                <option value="">
                                    Target...
                                </option>

                                {projects.map(project => (
                                    <option
                                        key={project.id}
                                        value={project.id}
                                    >
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5 min-w-0">
                            <label className="text-[10px] font-black text-text-muted px-1">
                                Resolution Date
                            </label>

                            <div className="w-full min-w-0 max-w-full">
                                <DatePicker
                                    value={
                                        formData.due_date
                                    }
                                    onChange={value =>
                                        setFormData({
                                            ...formData,
                                            due_date: value
                                        })
                                    }
                                    className="w-full max-w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Modal Actions */}
                    <div
                        className="
                            pt-3 sm:pt-4
                            flex
                            flex-col-reverse
                            sm:flex-row
                            gap-3
                            w-full
                            min-w-0
                        "
                    >
                        <Button
                            type="button"
                            onClick={
                                handleCloseModal
                            }
                            variant="secondary"
                            className="w-full sm:flex-1 min-w-0"
                        >
                            Discard
                        </Button>

                        <Button
                            type="submit"
                            disabled={
                                saving ||
                                !formData.project_id
                            }
                            variant="primary"
                            className="w-full sm:flex-1 min-w-0"
                        >
                            {saving
                                ? 'Syncing...'
                                : 'Commit Changes'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* =========================
                DELETE MODAL
            ========================== */}
            {deletingTodo && (
                <Modal
                    isOpen={!!deletingTodo}
                    onClose={() =>
                        setDeletingTodo(null)
                    }
                    title="Revoke Objective"
                    subtitle="This operation is destructive and irreversible."
                >
                    <div className="text-center space-y-6 w-full max-w-full min-w-0">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                            <Trash2 className="w-8 h-8" />
                        </div>

                        <p className="text-sm font-medium text-text-muted break-words">
                            Archive{' '}
                            <span className="font-black text-text-main tracking-tight break-all">
                                "{deletingTodo.title}"
                            </span>{' '}
                            permanently?
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4 w-full">
                            <Button
                                onClick={() =>
                                    setDeletingTodo(
                                        null
                                    )
                                }
                                variant="secondary"
                                className="w-full sm:flex-1"
                            >
                                Cancel
                            </Button>

                            <Button
                                onClick={handleDelete}
                                variant="danger"
                                className="w-full sm:flex-1"
                            >
                                Confirm Deletion
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </PageLayout>
    );
}

/* =========================================================
   HELPERS
========================================================= */

function getInitials(nameOrEmail: string) {
    if (!nameOrEmail) {
        return '?';
    }

    const clean = nameOrEmail.includes('@')
        ? nameOrEmail.split('@')[0]
        : nameOrEmail;

    const parts = clean
        .trim()
        .split(/[\s._-]+/);

    if (parts.length >= 2) {
        return (
            parts[0].charAt(0) +
            parts[parts.length - 1].charAt(0)
        ).toUpperCase();
    }

    return clean
        .charAt(0)
        .toUpperCase();
}

/* =========================================================
   LIST ITEM
========================================================= */

function TodoListItem({
    todo,
    onToggle,
    onEdit,
    onDelete,
    isViewer
}: {
    todo: Todo;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isViewer: boolean;
}) {
    const assigneeNames =
        todo.todo_assignees
            ?.map(
                a => a.members?.full_name
            )
            .filter(Boolean) as
        | string[]
        | undefined;

    return (
        <div
            className="
                py-4 sm:py-5
                px-1 sm:px-3 md:px-5 lg:px-6
                hover:bg-surface-hover/50
                transition-all
                group
                border-b border-slate-100
                last:border-0
                rounded-2xl
                min-w-0
                w-full
                max-w-full
                overflow-hidden
            "
        >
            <div className="flex items-start gap-2 sm:gap-4 min-w-0 w-full max-w-full">

                {/* Checkbox */}
                <button
                    onClick={onToggle}
                    disabled={isViewer}
                    className={clsx(
                        'shrink-0 mt-0.5 transition-all',
                        todo.status === 'Done'
                            ? 'text-emerald-500'
                            : 'text-text-muted hover:text-primary'
                    )}
                >
                    {todo.status === 'Done' ? (
                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                    ) : (
                        <Circle className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                    )}
                </button>

                {/* Main */}
                <div className="flex-1 min-w-0 w-0 max-w-full">

                    {/* Title + Project */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 min-w-0 w-full max-w-full">
                        <h4
                            className={clsx(
                                `
                                min-w-0
                                flex-1
                                max-w-full
                                text-[14px] sm:text-[15px]
                                font-bold
                                tracking-tight
                                leading-snug
                                break-words
                                whitespace-normal
                                overflow-wrap-anywhere
                                `,
                                todo.status === 'Done'
                                    ? 'text-text-muted line-through'
                                    : 'text-text-main'
                            )}
                        >
                            {todo.title}
                        </h4>

                        {todo.projects && (
                            <span
                                className="
                                    self-start
                                    max-w-full
                                    sm:max-w-[180px]
                                    shrink-0
                                    truncate
                                    px-2.5 py-1
                                    rounded-lg
                                    text-[9px] sm:text-[10px]
                                    font-bold
                                    border
                                "
                                style={{
                                    backgroundColor: `${todo.projects.color}10`,
                                    color: todo.projects.color,
                                    borderColor: `${todo.projects.color}20`
                                }}
                                title={
                                    todo.projects.name
                                }
                            >
                                {todo.projects.name}
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    {todo.description && (
                        <p
                            className={clsx(
                                `
                                w-full
                                max-w-full
                                mt-2
                                text-[11px] sm:text-[12px]
                                font-medium
                                text-text-muted
                                leading-relaxed
                                line-clamp-2
                                break-words
                                whitespace-normal
                                overflow-wrap-anywhere
                                `,
                                todo.status === 'Done' &&
                                    'line-through opacity-70'
                            )}
                        >
                            {todo.description}
                        </p>
                    )}

                    {/* Metadata */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 max-w-full">

                        {/* Assignee */}
                        {assigneeNames &&
                        assigneeNames.length >
                            0 ? (
                            <div className="flex items-center gap-2 min-w-0 max-w-full">
                                <div className="flex items-center -space-x-1.5 shrink-0">
                                    {assigneeNames
                                        .slice(0, 3)
                                        .map(
                                            (
                                                name,
                                                index
                                            ) => (
                                                <div
                                                    key={
                                                        index
                                                    }
                                                    className="
                                                        inline-flex
                                                        items-center
                                                        justify-center
                                                        w-6 h-6
                                                        rounded-full
                                                        border
                                                        border-surface
                                                        bg-primary/10
                                                        text-primary
                                                        text-[10px]
                                                        font-bold
                                                        shadow-shell-sm
                                                        shrink-0
                                                    "
                                                    title={
                                                        name
                                                    }
                                                >
                                                    {getInitials(
                                                        name
                                                    )}
                                                </div>
                                            )
                                        )}

                                    {assigneeNames.length >
                                        3 && (
                                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-surface bg-slate-900 text-white text-[9px] font-bold shadow-shell-sm shrink-0">
                                            +
                                            {assigneeNames.length -
                                                3}
                                        </div>
                                    )}
                                </div>

                                <span className="text-[10px] sm:text-[11px] font-bold text-text-muted truncate max-w-[100px] sm:max-w-[160px]">
                                    {
                                        assigneeNames[0].split(
                                            ' '
                                        )[0]
                                    }

                                    {assigneeNames.length >
                                        1
                                        ? ` +${
                                              assigneeNames.length -
                                              1
                                          }`
                                        : ''}
                                </span>
                            </div>
                        ) : todo.members?.full_name ? (
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-surface bg-primary/10 text-primary text-[10px] font-bold shadow-shell-sm shrink-0">
                                    {getInitials(
                                        todo.members
                                            .full_name
                                    )}
                                </div>

                                <span className="text-[10px] sm:text-[11px] font-bold text-text-muted truncate max-w-[100px]">
                                    {
                                        todo.members.full_name.split(
                                            ' '
                                        )[0]
                                    }
                                </span>
                            </div>
                        ) : null}

                        {/* Due date */}
                        {todo.due_date && (
                            <div
                                className={clsx(
                                    `
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    px-2 py-1
                                    rounded-lg
                                    border
                                    text-[10px] sm:text-[11px]
                                    font-semibold
                                    shrink-0
                                    `,
                                    new Date(
                                        todo.due_date
                                    ) < new Date() &&
                                        todo.status !==
                                            'Done'
                                        ? 'bg-rose-50 border-rose-100 text-rose-500'
                                        : 'bg-surface border-border text-text-muted'
                                )}
                            >
                                <Calendar className="w-3 h-3 shrink-0" />

                                {new Date(
                                    todo.due_date
                                ).toLocaleDateString(
                                    undefined,
                                    {
                                        month: 'short',
                                        day: 'numeric'
                                    }
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                        onClick={onEdit}
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 sm:w-9 sm:h-9 p-0 rounded-lg text-text-muted hover:text-primary hover:bg-surface-hover flex items-center justify-center"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>

                    <Button
                        onClick={() =>
                            !isViewer &&
                            onDelete()
                        }
                        disabled={isViewer}
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 sm:w-9 sm:h-9 p-0 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   GRID ITEM
========================================================= */

function TodoGridItem({
    todo,
    onToggle,
    onEdit,
    onDelete,
    isViewer
}: {
    todo: Todo;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isViewer: boolean;
}) {
    const assigneeNames =
        todo.todo_assignees
            ?.map(
                a => a.members?.full_name
            )
            .filter(Boolean) as
        | string[]
        | undefined;

    return (
        <div
            className="
                bg-surface
                border border-border
                rounded-2xl
                p-4 sm:p-5 lg:p-6
                hover:shadow-elevated
                hover:border-primary/20
                transition-all
                group
                flex flex-col
                h-full
                relative
                overflow-hidden
                min-w-0
                max-w-full
            "
        >
            <div className="flex justify-between items-start gap-3 mb-4 min-w-0">
                {todo.projects ? (
                    <span
                        className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border truncate max-w-[75%]"
                        style={{
                            backgroundColor: `${todo.projects.color}10`,
                            color: todo.projects.color,
                            borderColor: `${todo.projects.color}20`
                        }}
                    >
                        {todo.projects.name}
                    </span>
                ) : (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-surface-hover text-text-muted border border-border">
                        Sandbox
                    </span>
                )}

                <button
                    onClick={onToggle}
                    disabled={isViewer}
                    className={clsx(
                        'transition-all shrink-0',
                        todo.status === 'Done'
                            ? 'text-emerald-500'
                            : 'text-text-muted hover:text-primary'
                    )}
                >
                    {todo.status === 'Done' ? (
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                        <Circle className="w-5 h-5 stroke-[2.5]" />
                    )}
                </button>
            </div>

            <button
                onClick={onEdit}
                className={clsx(
                    `
                    text-base
                    font-bold
                    mb-3
                    tracking-tight
                    text-left
                    leading-tight
                    hover:text-primary
                    transition-all
                    break-words
                    whitespace-normal
                    overflow-wrap-anywhere
                    max-w-full
                    `,
                    todo.status === 'Done'
                        ? 'text-text-muted line-through'
                        : 'text-text-main'
                )}
            >
                {todo.title}
            </button>

            {todo.description && (
                <p
                    className={clsx(
                        `
                        text-[12px]
                        font-medium
                        text-text-muted
                        mb-4
                        line-clamp-3
                        leading-relaxed
                        break-words
                        overflow-wrap-anywhere
                        `,
                        todo.status === 'Done' &&
                            'line-through opacity-70'
                    )}
                >
                    {todo.description}
                </p>
            )}

            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {assigneeNames &&
                    assigneeNames.length > 0 ? (
                        <div className="flex items-center -space-x-1.5 overflow-hidden shrink-0">
                            {assigneeNames
                                .slice(0, 3)
                                .map(
                                    (
                                        name,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                index
                                            }
                                            className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-surface bg-primary/10 text-primary text-[10px] font-bold shadow-shell-sm shrink-0"
                                            title={
                                                name
                                            }
                                        >
                                            {getInitials(
                                                name
                                            )}
                                        </div>
                                    )
                                )}

                            {assigneeNames.length >
                                3 && (
                                <div
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-surface bg-slate-900 text-white text-[9px] font-bold shadow-shell-sm"
                                    title={assigneeNames
                                        .slice(
                                            3
                                        )
                                        .join(
                                            ', '
                                        )}
                                >
                                    +
                                    {assigneeNames.length -
                                        3}
                                </div>
                            )}
                        </div>
                    ) : todo.members?.full_name ? (
                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-surface bg-primary/10 text-primary text-[10px] font-bold shadow-shell-sm shrink-0">
                            {getInitials(
                                todo.members.full_name
                            )}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-main flex items-center justify-center shrink-0">
                            <User className="w-3 h-3 text-text-muted" />
                        </div>
                    )}

                    <span className="text-[11px] font-bold text-text-muted truncate max-w-[100px] sm:max-w-[140px]">
                        {assigneeNames &&
                        assigneeNames.length > 0
                            ? `${assigneeNames[0].split(' ')[0]}${
                                  assigneeNames.length >
                                  1
                                      ? ` +${
                                            assigneeNames.length -
                                            1
                                        }`
                                      : ''
                              }`
                            : todo.members?.full_name?.split(
                                  ' '
                              )[0] ||
                              'Unassigned'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {todo.due_date && (
                        <div
                            className={clsx(
                                'flex items-center gap-1 text-[10px] font-bold text-text-muted',
                                new Date(
                                    todo.due_date
                                ) <
                                    new Date() &&
                                    todo.status !==
                                        'Done' &&
                                    'text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100'
                            )}
                        >
                            <Calendar className="w-3 h-3" />

                            {new Date(
                                todo.due_date
                            ).toLocaleDateString(
                                undefined,
                                {
                                    month: 'short',
                                    day: 'numeric'
                                }
                            )}
                        </div>
                    )}

                    <button
                        onClick={() =>
                            !isViewer &&
                            onDelete()
                        }
                        className="
                            opacity-0
                            group-hover:opacity-100
                            p-1.5
                            text-text-muted
                            hover:text-rose-600
                            hover:bg-rose-50
                            rounded-lg
                            transition-all
                        "
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {todo.status === 'Done' && (
                <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
            )}
        </div>
    );
}
