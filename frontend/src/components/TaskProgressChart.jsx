import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
    todo: '#FF6B6B',
    'in-progress': '#4ECDC4',
    done: '#95E1D3'
};

function TaskProgressChart({ tasks }) {
    // Calculate task distribution by column
    const columnData = [
        { name: 'To Do', value: tasks.filter(t => t.column === 'todo').length, color: COLORS.todo },
        { name: 'In Progress', value: tasks.filter(t => t.column === 'in-progress').length, color: COLORS['in-progress'] },
        { name: 'Done', value: tasks.filter(t => t.column === 'done').length, color: COLORS.done }
    ];

    // Calculate completion percentage
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.column === 'done').length;
    const completionPercentage = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

    // Calculate by priority
    const priorityData = [
        { name: 'Low', value: tasks.filter(t => t.priority === 'low').length },
        { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length },
        { name: 'High', value: tasks.filter(t => t.priority === 'high').length }
    ];

    // Calculate by category
    const categoryData = [
        { name: 'Bug', value: tasks.filter(t => t.category === 'bug').length },
        { name: 'Feature', value: tasks.filter(t => t.category === 'feature').length },
        { name: 'Enhancement', value: tasks.filter(t => t.category === 'enhancement').length }
    ];

    return (
        <div style={{
            marginTop: '30px',
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>
                Task Progress Dashboard
            </h2>

            {/* Completion Stats */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                marginBottom: '30px',
                flexWrap: 'wrap',
                gap: '20px'
            }}>
                <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    minWidth: '150px'
                }}>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2c3e50' }}>
                        {totalTasks}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                        Total Tasks
                    </div>
                </div>
                <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    backgroundColor: '#d4edda',
                    borderRadius: '8px',
                    minWidth: '150px'
                }}>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#155724' }}>
                        {completedTasks}
                    </div>
                    <div style={{ fontSize: '14px', color: '#155724', marginTop: '8px' }}>
                        Completed
                    </div>
                </div>
                <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    backgroundColor: '#cce5ff',
                    borderRadius: '8px',
                    minWidth: '150px'
                }}>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#004085' }}>
                        {completionPercentage}%
                    </div>
                    <div style={{ fontSize: '14px', color: '#004085', marginTop: '8px' }}>
                        Completion Rate
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '30px',
                marginTop: '20px'
            }}>
                {/* Column Distribution Pie Chart */}
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '16px' }}>Task Distribution by Status</h3>
                    {totalTasks > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={columnData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {columnData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ padding: '80px', color: '#999' }}>No tasks to display</div>
                    )}
                </div>

                {/* Priority Distribution Bar Chart */}
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '16px' }}>Tasks by Priority</h3>
                    {totalTasks > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={priorityData}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ padding: '80px', color: '#999' }}>No tasks to display</div>
                    )}
                </div>

                {/* Category Distribution Bar Chart */}
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '16px' }}>Tasks by Category</h3>
                    {totalTasks > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={categoryData}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ padding: '80px', color: '#999' }}>No tasks to display</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TaskProgressChart;
