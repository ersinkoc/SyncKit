/**
 * React Todo App with SyncKit
 * Demonstrates offline-first todo list with background sync
 */

import React, { useState } from 'react'
import { SyncKitProvider, useSync, useSyncStatus, useSyncQueue, useOnline } from '@oxog/synckit/react'
import { analyticsPlugin } from '@oxog/synckit/plugins'

interface Todo {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
}

function TodoApp() {
  const { push, remove } = useSync<Todo, Todo>()
  const { pending, syncing, failed, total, isIdle } = useSyncStatus()
  const { operations, failedOperations } = useSyncQueue()
  const { isOnline } = useOnline()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [todos, setTodos] = useState<Todo[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const todo: Todo = {
      id: Date.now().toString(),
      title: title.trim(),
      completed: false,
      priority,
    }

    // Optimistic update
    setTodos((prev) => [...prev, todo])

    // Queue for sync
    const result = push({
      resource: 'todos',
      method: 'POST',
      payload: todo,
    })

    // Rollback if needed
    result.rollback = () => {
      setTodos((prev) => prev.filter((t) => t.id !== todo.id))
    }

    setTitle('')
    setPriority('medium')
  }

  const handleDelete = (id: string) => {
    // Optimistic update
    setTodos((prev) => prev.filter((t) => t.id !== id))

    // Queue for sync
    push({
      resource: `todos/${id}`,
      method: 'DELETE',
      payload: null,
    })
  }

  const handleToggle = (todo: Todo) => {
    const updated = { ...todo, completed: !todo.completed }

    // Optimistic update
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)))

    // Queue for sync
    push({
      resource: `todos/${todo.id}`,
      method: 'PUT',
      payload: updated,
    })
  }

  return (
    <div className="app">
      {/* Status Bar */}
      <div className={`status-bar ${isOnline ? 'online' : 'offline'}`}>
        <div className="status-indicator">
          <span className="dot"></span>
          {isOnline ? 'Online' : 'Offline'}
        </div>
        <div className="sync-stats">
          <span>Queue: {total}</span>
          <span>Pending: {pending}</span>
          <span>Syncing: {syncing}</span>
          {failed > 0 && <span className="error">Failed: {failed}</span>}
        </div>
      </div>

      {/* Add Todo Form */}
      <form onSubmit={handleSubmit} className="add-todo">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="todo-input"
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="priority-select">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit" className="add-button">
          Add Todo
        </button>
      </form>

      {/* Todo List */}
      <div className="todo-list">
        {todos.map((todo) => (
          <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority}`}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo)}
              className="todo-checkbox"
            />
            <span className="todo-title">{todo.title}</span>
            <span className="todo-priority">{todo.priority}</span>
            <button onClick={() => handleDelete(todo.id)} className="delete-button">
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Sync Queue Debug Panel */}
      {operations.length > 0 && (
        <div className="debug-panel">
          <h3>Sync Queue ({operations.length})</h3>
          {operations.map((op) => (
            <div key={op.id} className={`queue-item status-${op.status}`}>
              <span className="method">{op.method}</span>
              <span className="resource">{op.resource}</span>
              <span className="status">{op.status}</span>
              {op.attempts > 0 && <span className="attempts">Attempts: {op.attempts}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Failed Operations */}
      {failedOperations.length > 0 && (
        <div className="error-panel">
          <h3>Failed Operations</h3>
          {failedOperations.map((op) => (
            <div key={op.id} className="error-item">
              <span>{op.resource}</span>
              <span>{op.lastError}</span>
              <button onClick={() => remove(op.id)}>Dismiss</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <SyncKitProvider
      config={{
        name: 'todo-app',
        storage: 'indexeddb',
        executor: async (operation) => {
          // Simulate API call
          console.log('Syncing:', operation)
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Simulate success
          return { success: true, data: operation.payload }
        },
        conflictStrategy: 'last-write-wins',
        retry: {
          maxAttempts: 3,
          backoff: 'exponential',
          baseDelay: 1000,
          maxDelay: 10000,
        },
      }}
      plugins={[analyticsPlugin()]}
    >
      <TodoApp />
    </SyncKitProvider>
  )
}
