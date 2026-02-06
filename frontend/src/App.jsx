import React from "react";
import KanbanBoard from "./components/KanbanBoard";

function App() {
  return (
    <div className="App" style={{
      minHeight: '100vh',
      backgroundColor: '#e9ecef',
      fontFamily: 'Arial, sans-serif'
    }}>
      <header style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0 }}>Real-time Kanban Board</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
          Drag and drop tasks between columns
        </p>
      </header>
      <KanbanBoard />
    </div>
  );
}

export default App;
