import { useState, useEffect, useCallback } from 'react';
import { supabase, type Task } from './lib/supabase';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Moon,
  Sun,
  ClipboardList,
  Loader2,
} from 'lucide-react';

function getSessionId(): string {
  const key = 'task_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

const SESSION_ID = getSessionId();

type Filter = 'all' | 'active' | 'completed';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('dark_mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'delete' | 'clear';
    taskId?: string;
  } | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('dark_mode', String(dark));
  }, [dark]);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_session', SESSION_ID)
      .order('created_at', { ascending: false });

    if (!error && data) setTasks(data as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = input.trim();
    if (!title) return;

    setAdding(true);
    const { data, error } = await supabase
      .from('tasks')
      .insert({ title, user_session: SESSION_ID, completed: false })
      .select()
      .single();

    if (!error && data) {
      setTasks((prev) => [data as Task, ...prev]);
      setInput('');
    }
    setAdding(false);
  }

  async function toggleTask(task: Task) {
    setTogglingId(task.id);
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', task.id);

    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      );
    }
    setTogglingId(null);
  }

  async function deleteTask(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
  }

  async function confirmDelete(id: string) {
    setConfirmDialog({ type: 'delete', taskId: id });
  }

  async function confirmClearCompleted() {
    setConfirmDialog({ type: 'clear' });
  }

  async function proceedWithDelete() {
    if (confirmDialog?.type === 'delete' && confirmDialog.taskId) {
      await deleteTask(confirmDialog.taskId);
    }
    setConfirmDialog(null);
  }

  async function proceedWithClear() {
    const completedIds = tasks.filter((t) => t.completed).map((t) => t.id);
    if (!completedIds.length) {
      setConfirmDialog(null);
      return;
    }
    await supabase.from('tasks').delete().in('id', completedIds);
    setTasks((prev) => prev.filter((t) => !t.completed));
    setConfirmDialog(null);
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Tasks
            </h1>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Add task form */}
        <form onSubmit={addTask} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={adding || !input.trim()}
              className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add
            </button>
          </div>
        </form>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 p-1 rounded-xl bg-gray-100 dark:bg-gray-900">
          {(['all', 'active', 'completed'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {f}
              {f === 'active' && activeCount > 0 && (
                <span className="ml-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-7 h-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {filter === 'completed'
                  ? 'No completed tasks yet'
                  : filter === 'active'
                  ? 'No active tasks'
                  : 'Add your first task above'}
              </p>
            </div>
          ) : (
            filtered.map((task) => (
              <div
                key={task.id}
                className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                  task.completed
                    ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleTask(task)}
                  disabled={togglingId === task.id}
                  className="flex-shrink-0 transition-transform active:scale-90 disabled:opacity-50"
                  aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {togglingId === task.id ? (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  ) : task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors" />
                  )}
                </button>

                <span
                  className={`flex-1 text-sm leading-relaxed transition-colors ${
                    task.completed
                      ? 'text-gray-400 dark:text-gray-500 line-through'
                      : 'text-gray-800 dark:text-gray-100'
                  }`}
                >
                  {task.title}
                </span>

                <button
                  onClick={() => confirmDelete(task.id)}
                  disabled={deletingId === task.id}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all disabled:opacity-30"
                  aria-label="Delete task"
                >
                  {deletingId === task.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {tasks.length > 0 && (
          <div className="flex items-center justify-between mt-6 px-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {activeCount} {activeCount === 1 ? 'task' : 'tasks'} remaining
            </span>
            {completedCount > 0 && (
              <button
                onClick={confirmClearCompleted}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                Clear completed ({completedCount})
              </button>
            )}
          </div>
        )}

        {/* Confirmation Dialog */}
        {confirmDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full animate-in fade-in zoom-in-95">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {confirmDialog.type === 'delete' ? 'Delete task?' : 'Clear completed tasks?'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {confirmDialog.type === 'delete'
                  ? 'This action cannot be undone.'
                  : `This will delete ${completedCount} completed ${completedCount === 1 ? 'task' : 'tasks'}. This action cannot be undone.`}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDialog.type === 'delete') proceedWithDelete();
                    else proceedWithClear();
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
