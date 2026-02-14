"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, BarChart3, Loader2, AlertCircle } from "lucide-react"

interface Task {
  id: string
  title: string
  description: string
  points: number
  task_type: string
  verification_method: string
  status: string
  link: string
  icon: string
  verification_hint: string
  category: string
  completion_count: number
  total_points_distributed: number
  created_at: string
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Helper to get wallet address
  const getWalletAddress = () => {
    const stored = localStorage.getItem("kabbalah_wallet")
    if (!stored) return null
    try {
      const { address } = JSON.parse(stored)
      return address
    } catch {
      return null
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const wallet = getWalletAddress()
      if (!wallet) {
        setError("Please connect your wallet first")
        return
      }
      
      const res = await fetch(`/api/admin/tasks?wallet=${wallet}`, {
        method: "GET"
      })

      const data = await res.json()
      
      if (data.success) {
        setTasks(data.tasks)
      } else {
        setError(data.error || "Failed to load tasks")
      }
    } catch (err) {
      console.error("Error loading tasks:", err)
      setError("Failed to load tasks. Please check your admin permissions.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = () => {
    setShowCreateForm(true)
    setEditingTask(null)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowCreateForm(true)
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to archive this task? (It will be hidden but not deleted)")) return

    try {
      const wallet = getWalletAddress()
      if (!wallet) {
        alert("Please connect your wallet first")
        return
      }

      const res = await fetch(`/api/admin/tasks/${taskId}?wallet=${wallet}`, {
        method: "DELETE"
      })

      const data = await res.json()
      
      if (data.success) {
        await loadTasks() // Reload tasks
      } else {
        alert(data.error || "Failed to archive task")
      }
    } catch (err) {
      console.error("Error archiving task:", err)
      alert("Failed to archive task")
    }
  }

  const handlePermanentDelete = async (taskId: string, taskTitle: string) => {
    if (!confirm(`⚠️ PERMANENT DELETE\n\nAre you sure you want to PERMANENTLY delete "${taskTitle}"?\n\nThis will:\n- Delete the task\n- Delete ALL completions\n- Cannot be undone!\n\nType "DELETE" to confirm.`)) return

    const confirmation = prompt('Type "DELETE" to confirm permanent deletion:')
    if (confirmation !== 'DELETE') {
      alert('Deletion cancelled')
      return
    }

    try {
      const wallet = getWalletAddress()
      if (!wallet) {
        alert("Please connect your wallet first")
        return
      }

      const res = await fetch(`/api/admin/tasks/${taskId}?wallet=${wallet}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'delete-permanent',
          confirm: true
        })
      })

      const data = await res.json()
      
      if (data.success) {
        alert(`Task deleted successfully!\n${data.completions_deleted} completions removed.`)
        await loadTasks() // Reload tasks
      } else {
        alert(data.error || "Failed to delete task")
      }
    } catch (err) {
      console.error("Error deleting task:", err)
      alert("Failed to delete task")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[#FF9500]" />
          <span className="ml-3 text-xl">Loading admin panel...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin - Tasks Management</h1>
          <div className="p-6 bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
            <AlertCircle size={20} />
            <div>
              <p className="font-medium">Access Denied</p>
              <p className="text-sm text-red-300 mt-1">{error}</p>
              <button 
                onClick={loadTasks}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin - Tasks Management</h1>
          <button
            onClick={handleCreateTask}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF9500] text-black font-bold hover:bg-[#FFB340] transition-colors"
          >
            <Plus size={20} />
            Create Task
          </button>
        </div>

        {/* Tasks Table */}
        <div className="bg-[#0a0a0a] border border-[#FF9500]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FF9500]/10 border-b border-[#FF9500]/30">
                <tr>
                  <th className="text-left p-4 font-medium">Task</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">KCODE</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Completions</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-[#FF9500]/10 hover:bg-[#FF9500]/5">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-white">{task.title}</p>
                        <p className="text-sm text-white/60">{task.description}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                        {task.task_type}
                      </span>
                    </td>
                    <td className="p-4 text-green-400 font-bold">{task.tokens || 0}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        task.status === 'active' 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="p-4 text-white/80">{task.completion_count}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded"
                          title="Edit Task"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded"
                          title="Archive Task (Hide)"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(task.id, task.title)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                          title="⚠️ Permanent Delete"
                        >
                          <Trash2 size={16} className="fill-current" />
                        </button>
                        <button
                          onClick={() => window.location.href = `/admin/tasks/${task.id}/stats`}
                          className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded"
                          title="View Stats"
                        >
                          <BarChart3 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-12 text-white/60">
            <p>No tasks found. Create your first task to get started.</p>
          </div>
        )}

        {/* Simple Create/Edit Form Modal */}
        {showCreateForm && (
          <TaskFormModal
            task={editingTask}
            onClose={() => {
              setShowCreateForm(false)
              setEditingTask(null)
            }}
            onSave={() => {
              setShowCreateForm(false)
              setEditingTask(null)
              loadTasks()
            }}
          />
        )}
      </div>
    </div>
  )
}

// Simple Task Form Modal Component
function TaskFormModal({ 
  task, 
  onClose, 
  onSave 
}: { 
  task: Task | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    tokens: task?.tokens || 0,
    task_type: task?.task_type || "twitter_follow",
    link: task?.link || ""
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Get wallet from localStorage
      const stored = localStorage.getItem("kabbalah_wallet")
      if (!stored) {
        setError("Please connect your wallet first")
        return
      }
      
      const { address } = JSON.parse(stored)
      
      const url = task 
        ? `/api/admin/tasks/${task.id}?wallet=${address}` 
        : `/api/admin/tasks?wallet=${address}`
      const method = task ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      
      if (data.success) {
        onSave()
      } else {
        setError(data.error || "Failed to save task")
      }
    } catch (err) {
      console.error("Error saving task:", err)
      setError("Failed to save task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0a0a0a] border border-[#FF9500]/30 p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">
          {task ? "Edit Task" : "Create New Task"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-black border border-[#FF9500]/30 px-3 py-2 text-white focus:outline-none focus:border-[#FF9500]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-black border border-[#FF9500]/30 px-3 py-2 text-white focus:outline-none focus:border-[#FF9500] h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">KCODE Tokens</label>
            <input
              type="number"
              step="0.1"
              value={formData.tokens}
              onChange={(e) => setFormData({ ...formData, tokens: parseFloat(e.target.value) || 0 })}
              className="w-full bg-black border border-[#FF9500]/30 px-3 py-2 text-white focus:outline-none focus:border-[#FF9500]"
              min="0"
              placeholder="e.g. 0.5, 1, 10"
              required
            />
            <p className="text-xs text-white/50 mt-1">Supports decimals: 0.1, 0.5, 1, etc.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Task Type</label>
            <select
              value={formData.task_type}
              onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
              className="w-full bg-black border border-[#FF9500]/30 px-3 py-2 text-white focus:outline-none focus:border-[#FF9500]"
            >
              <optgroup label="Twitter Tasks">
                <option value="twitter_follow">Twitter Follow</option>
                <option value="twitter_engagement">Twitter Engagement (Like/Retweet/Comment)</option>
              </optgroup>
              <optgroup label="Social Tasks">
                <option value="telegram_channel">Telegram Channel</option>
                <option value="telegram_chat">Telegram Chat</option>
                <option value="discord">Discord</option>
              </optgroup>
              <optgroup label="Other">
                <option value="custom">Custom</option>
              </optgroup>
            </select>
            <p className="text-xs text-white/50 mt-1">
              {formData.task_type === 'twitter_engagement' && 
                'Verified by comment link (includes like & retweet)'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Link (Optional)</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="w-full bg-black border border-[#FF9500]/30 px-3 py-2 text-white focus:outline-none focus:border-[#FF9500]"
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#FF9500] text-black font-bold py-2 px-4 hover:bg-[#FFB340] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </div>
              ) : (
                task ? "Update Task" : "Create Task"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#FF9500]/30 text-white hover:bg-[#FF9500]/10"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}