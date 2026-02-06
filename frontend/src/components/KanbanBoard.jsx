import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import TaskProgressChart from './TaskProgressChart';

const SOCKET_URL = 'http://localhost:5000';

function KanbanBoard() {
    const [tasks, setTasks] = useState([]);
    const [socket, setSocket] = useState(null);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'medium',
        category: 'feature',
        attachments: []
    });
    const [draggedTask, setDraggedTask] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadError, setUploadError] = useState('');

    // Initialize WebSocket connection
    useEffect(() => {
        const socketInstance = io(SOCKET_URL);
        setSocket(socketInstance);

        // Listen for initial task sync
        socketInstance.on('sync:tasks', (syncedTasks) => {
            setTasks(syncedTasks);
            setIsLoading(false);
            console.log('Tasks synced:', syncedTasks);
        });

        // Listen for task created
        socketInstance.on('task:created', (newTask) => {
            setTasks((prevTasks) => [...prevTasks, newTask]);
            console.log('Task created:', newTask);
        });

        // Listen for task updated
        socketInstance.on('task:updated', (updatedTask) => {
            setTasks((prevTasks) =>
                prevTasks.map((task) =>
                    task.id === updatedTask.id ? updatedTask : task
                )
            );
            console.log('Task updated:', updatedTask);
        });

        // Listen for task moved
        socketInstance.on('task:moved', (movedTask) => {
            setTasks((prevTasks) =>
                prevTasks.map((task) =>
                    task.id === movedTask.id ? movedTask : task
                )
            );
            console.log('Task moved:', movedTask);
        });

        // Listen for task deleted
        socketInstance.on('task:deleted', (taskId) => {
            setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
            console.log('Task deleted:', taskId);
        });

        // Listen for errors
        socketInstance.on('error', (error) => {
            console.error('Socket error:', error);
            alert(error.message);
        });

        // Cleanup on unmount
        return () => {
            socketInstance.disconnect();
        };
    }, []);

    // Create a new task
    const handleCreateTask = (e) => {
        e.preventDefault();
        if (socket && newTask.title.trim()) {
            socket.emit('task:create', {
                ...newTask,
                column: 'todo'
            });
            setNewTask({
                title: '',
                description: '',
                priority: 'medium',
                category: 'feature',
                attachments: []
            });
            setUploadError('');
        }
    };

    // Handle file upload
    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        const validFiles = [];
        let hasError = false;

        files.forEach(file => {
            if (!allowedTypes.includes(file.type)) {
                setUploadError(`Invalid file type: ${file.name}. Only images and PDFs allowed.`);
                hasError = true;
            } else if (file.size > maxSize) {
                setUploadError(`File too large: ${file.name}. Maximum size is 5MB.`);
                hasError = true;
            } else {
                // Convert to base64 for demo purposes (in production, upload to server)
                const reader = new FileReader();
                reader.onloadend = () => {
                    validFiles.push({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        url: reader.result
                    });
                    
                    if (validFiles.length === files.length && !hasError) {
                        setNewTask(prev => ({
                            ...prev,
                            attachments: [...prev.attachments, ...validFiles]
                        }));
                        setUploadError('');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    };

    // Handle file upload for existing task
    const handleTaskFileUpload = (taskId, e) => {
        const files = Array.from(e.target.files);
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        files.forEach(file => {
            if (!allowedTypes.includes(file.type)) {
                alert(`Invalid file type: ${file.name}. Only images and PDFs allowed.`);
                return;
            }
            if (file.size > maxSize) {
                alert(`File too large: ${file.name}. Maximum size is 5MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const task = tasks.find(t => t.id === taskId);
                if (task && socket) {
                    const newAttachment = {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        url: reader.result
                    };
                    socket.emit('task:update', {
                        ...task,
                        attachments: [...(task.attachments || []), newAttachment]
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    };

    // Remove attachment from new task
    const removeAttachment = (index) => {
        setNewTask(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    // Remove attachment from existing task
    const removeTaskAttachment = (taskId, attachmentIndex) => {
        const task = tasks.find(t => t.id === taskId);
        if (task && socket) {
            socket.emit('task:update', {
                ...task,
                attachments: task.attachments.filter((_, i) => i !== attachmentIndex)
            });
        }
    };

    // Delete a task
    const handleDeleteTask = (taskId) => {
        if (socket && window.confirm('Are you sure you want to delete this task?')) {
            socket.emit('task:delete', taskId);
        }
    };

    // Update task (priority/category)
    const handleUpdateTask = (taskId, field, value) => {
        if (socket) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                socket.emit('task:update', {
                    ...task,
                    [field]: value
                });
            }
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetColumn) => {
        e.preventDefault();
        if (draggedTask && socket && draggedTask.column !== targetColumn) {
            socket.emit('task:move', {
                id: draggedTask.id,
                column: targetColumn
            });
        }
        setDraggedTask(null);
    };

    // Get tasks by column
    const getTasksByColumn = (column) => {
        return tasks.filter((task) => task.column === column);
    };

    // Render a single task card
    const renderTask = (task) => (
        <div
            key={task.id}
            className="task-card"
            draggable
            onDragStart={(e) => handleDragStart(e, task)}
            style={{
                border: '1px solid #ddd',
                padding: '12px',
                marginBottom: '10px',
                borderRadius: '6px',
                backgroundColor: '#fff',
                cursor: 'move',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{task.title}</h4>
                <button
                    onClick={() => handleDeleteTask(task.id)}
                    style={{
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    Delete
                </button>
            </div>
            {task.description && (
                <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                    {task.description}
                </p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <select
                    value={task.priority}
                    onChange={(e) => handleUpdateTask(task.id, 'priority', e.target.value)}
                    style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '12px'
                    }}
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
                <select
                    value={task.category}
                    onChange={(e) => handleUpdateTask(task.id, 'category', e.target.value)}
                    style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '12px'
                    }}
                >
                    <option value="bug">Bug</option>
                    <option value="feature">Feature</option>
                    <option value="enhancement">Enhancement</option>
                </select>
            </div>

            {/* File Attachments */}
            {task.attachments && task.attachments.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}>
                        Attachments ({task.attachments.length}):
                    </div>
                    {task.attachments.map((file, index) => (
                        <div key={index} style={{ marginBottom: '8px' }}>
                            {file.type.startsWith('image/') ? (
                                <div>
                                    <img 
                                        src={file.url} 
                                        alt={file.name}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '150px',
                                            borderRadius: '4px',
                                            marginBottom: '4px'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '11px'
                                }}>
                                    <span>📄 {file.name}</span>
                                    <span style={{ color: '#999' }}>
                                        ({(file.size / 1024).toFixed(1)}KB)
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={() => removeTaskAttachment(task.id, index)}
                                style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    background: '#ff6b6b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    marginTop: '4px'
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add attachment button */}
            <div style={{ marginTop: '10px' }}>
                <label style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    background: '#4CAF50',
                    color: 'white',
                    fontSize: '11px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}>
                    📎 Add File
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => handleTaskFileUpload(task.id, e)}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
                ID: {task.id}
            </div>
        </div>
    );

    // Render a column
    const renderColumn = (column, title) => (
        <div
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column)}
            style={{
                flex: 1,
                minWidth: '300px',
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '8px',
                minHeight: '500px'
            }}
        >
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>
                {title} ({getTasksByColumn(column).length})
            </h3>
            {getTasksByColumn(column).map(renderTask)}
        </div>
    );

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '20px' }}>Loading tasks...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            {/* Task Creation Form */}
            <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px'
            }}>
                <h3 style={{ marginTop: 0 }}>Create New Task</h3>
                <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Task title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        required
                        style={{
                            flex: '1',
                            minWidth: '200px',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Description"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        style={{
                            flex: '1',
                            minWidth: '200px',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    />
                    <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                    </select>
                    <select
                        value={newTask.category}
                        onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    >
                        <option value="bug">Bug</option>
                        <option value="feature">Feature</option>
                        <option value="enhancement">Enhancement</option>
                    </select>

                    {/* File Upload Button */}
                    <label style={{
                        padding: '8px 12px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center'
                    }}>
                        📎 Attach Files
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            multiple
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                    </label>

                    <button
                        type="submit"
                        style={{
                            padding: '8px 20px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Add Task
                    </button>
                </form>

                {/* Display upload errors */}
                {uploadError && (
                    <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>
                        ⚠️ {uploadError}
                    </div>
                )}

                {/* Display attached files for new task */}
                {newTask.attachments && newTask.attachments.length > 0 && (
                    <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '4px'
                    }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                            Attached Files ({newTask.attachments.length}):
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {newTask.attachments.map((file, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '8px',
                                    backgroundColor: '#fff',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd'
                                }}>
                                    {file.type.startsWith('image/') ? (
                                        <img
                                            src={file.url}
                                            alt={file.name}
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                objectFit: 'cover',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    ) : (
                                        <div style={{ fontSize: '40px' }}>📄</div>
                                    )}
                                    <div style={{ fontSize: '11px', marginTop: '4px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {file.name}
                                    </div>
                                    <button
                                        onClick={() => removeAttachment(index)}
                                        style={{
                                            marginTop: '4px',
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            background: '#ff6b6b',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Kanban Board Columns */}
            <div style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto'
            }}>
                {renderColumn('todo', 'To Do')}
                {renderColumn('in-progress', 'In Progress')}
                {renderColumn('done', 'Done')}
            </div>

            {/* Progress Chart */}
            <TaskProgressChart tasks={tasks} />
        </div>
    );
}

export default KanbanBoard;
