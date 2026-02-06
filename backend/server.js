const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// In-memory task storage
let tasks = [];
let taskIdCounter = 1;

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Send all existing tasks to newly connected client
  socket.emit("sync:tasks", tasks);

  // Create a new task
  socket.on("task:create", (taskData) => {
    const newTask = {
      id: taskIdCounter++,
      title: taskData.title || "Untitled Task",
      description: taskData.description || "",
      column: taskData.column || "todo",
      priority: taskData.priority || "medium",
      category: taskData.category || "feature",
      attachments: taskData.attachments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    tasks.push(newTask);
    console.log("Task created:", newTask.id);
    
    // Broadcast to all connected clients
    io.emit("task:created", newTask);
  });

  // Update an existing task
  socket.on("task:update", (updateData) => {
    const taskIndex = tasks.findIndex(task => task.id === updateData.id);
    
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...updateData,
        id: tasks[taskIndex].id, // Preserve original ID
        createdAt: tasks[taskIndex].createdAt, // Preserve creation date
        updatedAt: new Date().toISOString(),
      };
      
      console.log("Task updated:", updateData.id);
      
      // Broadcast to all connected clients
      io.emit("task:updated", tasks[taskIndex]);
    } else {
      socket.emit("error", { message: "Task not found", taskId: updateData.id });
    }
  });

  // Move a task to a different column
  socket.on("task:move", (moveData) => {
    const { id, column } = moveData;
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex !== -1) {
      tasks[taskIndex].column = column;
      tasks[taskIndex].updatedAt = new Date().toISOString();
      
      console.log(`Task ${id} moved to ${column}`);
      
      // Broadcast to all connected clients
      io.emit("task:moved", tasks[taskIndex]);
    } else {
      socket.emit("error", { message: "Task not found", taskId: id });
    }
  });

  // Delete a task
  socket.on("task:delete", (taskId) => {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
      const deletedTask = tasks.splice(taskIndex, 1)[0];
      console.log("Task deleted:", taskId);
      
      // Broadcast to all connected clients
      io.emit("task:deleted", taskId);
    } else {
      socket.emit("error", { message: "Task not found", taskId });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
