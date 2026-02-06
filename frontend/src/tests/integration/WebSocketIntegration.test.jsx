import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import KanbanBoard from "../../components/KanbanBoard";

// Mock socket.io-client with more detailed event handling
let mockSocketInstance;
const createMockSocket = () => {
  const eventHandlers = {};
  
  return {
    on: vi.fn((event, callback) => {
      eventHandlers[event] = callback;
    }),
    emit: vi.fn((event, data) => {
      // Simulate server response for different events
      if (event === "task:create") {
        setTimeout(() => {
          if (eventHandlers["task:created"]) {
            eventHandlers["task:created"]({ ...data, id: Date.now() });
          }
        }, 10);
      } else if (event === "task:move") {
        setTimeout(() => {
          if (eventHandlers["task:moved"]) {
            eventHandlers["task:moved"]({ id: data.id, column: data.column });
          }
        }, 10);
      } else if (event === "task:update") {
        setTimeout(() => {
          if (eventHandlers["task:updated"]) {
            eventHandlers["task:updated"](data);
          }
        }, 10);
      } else if (event === "task:delete") {
        setTimeout(() => {
          if (eventHandlers["task:deleted"]) {
            eventHandlers["task:deleted"](data);
          }
        }, 10);
      }
    }),
    disconnect: vi.fn(),
    _getEventHandlers: () => eventHandlers,
  };
};

vi.mock("socket.io-client", () => ({
  default: vi.fn(() => {
    mockSocketInstance = createMockSocket();
    return mockSocketInstance;
  }),
}));

describe("WebSocket Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("connects to WebSocket server on mount", () => {
    render(<KanbanBoard />);
    expect(mockSocketInstance.on).toHaveBeenCalledWith("sync:tasks", expect.any(Function));
  });

  test("registers all WebSocket event listeners", () => {
    render(<KanbanBoard />);

    const expectedEvents = [
      "sync:tasks",
      "task:created",
      "task:updated",
      "task:moved",
      "task:deleted",
      "error",
    ];

    expectedEvents.forEach((event) => {
      expect(mockSocketInstance.on).toHaveBeenCalledWith(event, expect.any(Function));
    });
  });

  test("receives and displays initial tasks via sync:tasks", async () => {
    const mockTasks = [
      {
        id: 1,
        title: "Synced Task 1",
        description: "Description 1",
        column: "todo",
        priority: "high",
        category: "bug",
        attachments: [],
      },
      {
        id: 2,
        title: "Synced Task 2",
        description: "Description 2",
        column: "done",
        priority: "low",
        category: "feature",
        attachments: [],
      },
    ];

    render(<KanbanBoard />);

    const eventHandlers = mockSocketInstance._getEventHandlers();
    eventHandlers["sync:tasks"](mockTasks);

    await waitFor(() => {
      expect(screen.getByText("Synced Task 1")).toBeInTheDocument();
      expect(screen.getByText("Synced Task 2")).toBeInTheDocument();
    });
  });

  test("handles task:created event from other clients", async () => {
    render(<KanbanBoard />);

    const eventHandlers = mockSocketInstance._getEventHandlers();
    
    // Initialize with empty tasks
    eventHandlers["sync:tasks"]([]);

    await waitFor(() => {
      expect(screen.getByText("Create New Task")).toBeInTheDocument();
    });

    // Simulate another client creating a task
    const newTask = {
      id: 100,
      title: "Remote Task",
      description: "Created by another client",
      column: "todo",
      priority: "medium",
      category: "feature",
      attachments: [],
    };

    eventHandlers["task:created"](newTask);

    await waitFor(() => {
      expect(screen.getByText("Remote Task")).toBeInTheDocument();
      expect(screen.getByText("Created by another client")).toBeInTheDocument();
    });
  });

  test("handles task:moved event and updates task column", async () => {
    const initialTasks = [
      {
        id: 1,
        title: "Task to Move",
        description: "Description",
        column: "todo",
        priority: "high",
        category: "bug",
        attachments: [],
      },
    ];

    render(<KanbanBoard />);

    const eventHandlers = mockSocketInstance._getEventHandlers();
    eventHandlers["sync:tasks"](initialTasks);

    await waitFor(() => {
      expect(screen.getByText("Task to Move")).toBeInTheDocument();
    });

    // Simulate task being moved by another client
    const movedTask = {
      ...initialTasks[0],
      column: "done",
      updatedAt: new Date().toISOString(),
    };

    eventHandlers["task:moved"](movedTask);

    await waitFor(() => {
      // Check that the Done column count increased
      expect(screen.getByText(/Done \(1\)/)).toBeInTheDocument();
    });
  });

  test("handles task:updated event and updates task properties", async () => {
    const initialTasks = [
      {
        id: 1,
        title: "Task to Update",
        description: "Original description",
        column: "todo",
        priority: "low",
        category: "bug",
        attachments: [],
      },
    ];

    render(<KanbanBoard />);

    const eventHandlers = mockSocketInstance._getEventHandlers();
    eventHandlers["sync:tasks"](initialTasks);

    await waitFor(() => {
      expect(screen.getByText("Original description")).toBeInTheDocument();
    });

    // Simulate task being updated by another client
    const updatedTask = {
      ...initialTasks[0],
      description: "Updated description",
      priority: "high",
      category: "feature",
      updatedAt: new Date().toISOString(),
    };

    eventHandlers["task:updated"](updatedTask);

    await waitFor(() => {
      expect(screen.getByText("Updated description")).toBeInTheDocument();
    });
  });

  test("handles task:deleted event and removes task from UI", async () => {
    const initialTasks = [
      {
        id: 1,
        title: "Task to Delete",
        description: "Description",
        column: "todo",
        priority: "high",
        category: "bug",
        attachments: [],
      },
      {
        id: 2,
        title: "Task to Keep",
        description: "Description",
        column: "todo",
        priority: "low",
        category: "feature",
        attachments: [],
      },
    ];

    render(<KanbanBoard />);

    const eventHandlers = mockSocketInstance._getEventHandlers();
    eventHandlers["sync:tasks"](initialTasks);

    await waitFor(() => {
      expect(screen.getByText("Task to Delete")).toBeInTheDocument();
      expect(screen.getByText("Task to Keep")).toBeInTheDocument();
    });

    // Simulate task being deleted by another client
    eventHandlers["task:deleted"](1);

    await waitFor(() => {
      expect(screen.queryByText("Task to Delete")).not.toBeInTheDocument();
      expect(screen.getByText("Task to Keep")).toBeInTheDocument();
    });
  });

  test("multiple clients can sync task updates", async () => {
    render(<KanbanBoard />);

    const eventHandlers = mockSocketInstance._getEventHandlers();
    
    // Client 1 syncs initial state
    eventHandlers["sync:tasks"]([]);

    await waitFor(() => {
      expect(screen.getByText("Create New Task")).toBeInTheDocument();
    });

    // Client 2 creates a task
    const task1 = {
      id: 1,
      title: "Client 2 Task",
      column: "todo",
      priority: "high",
      category: "bug",
      attachments: [],
    };
    eventHandlers["task:created"](task1);

    await waitFor(() => {
      expect(screen.getByText("Client 2 Task")).toBeInTheDocument();
    });

    // Client 3 creates another task
    const task2 = {
      id: 2,
      title: "Client 3 Task",
      column: "in-progress",
      priority: "medium",
      category: "feature",
      attachments: [],
    };
    eventHandlers["task:created"](task2);

    await waitFor(() => {
      expect(screen.getByText("Client 3 Task")).toBeInTheDocument();
    });

    // Client 2 moves their task
    eventHandlers["task:moved"]({ ...task1, column: "done" });

    await waitFor(() => {
      expect(screen.getByText(/Done \(1\)/)).toBeInTheDocument();
    });
  });

  test("handles WebSocket errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<KanbanBoard />);

    const eventHandlers = mockSocketInstance._getEventHandlers();
    eventHandlers["sync:tasks"]([]);

    // Simulate an error from the server
    const errorData = {
      message: "Task not found",
      taskId: 999,
    };

    eventHandlers["error"](errorData);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Socket error:", errorData);
      expect(alertSpy).toHaveBeenCalledWith("Task not found");
    });

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  test("real-time update of progress chart on task changes", async () => {
    render(<KanbanBoard />);

    const eventHandlers = mockSocketInstance._getEventHandlers();
    
    // Start with some tasks
    const initialTasks = [
      { id: 1, title: "Task 1", column: "todo", priority: "high", category: "bug", attachments: [] },
      { id: 2, title: "Task 2", column: "todo", priority: "medium", category: "feature", attachments: [] },
    ];
    
    eventHandlers["sync:tasks"](initialTasks);

    await waitFor(() => {
      expect(screen.getByText("Task Progress Dashboard")).toBeInTheDocument();
    });

    // Move a task to done
    eventHandlers["task:moved"]({ ...initialTasks[0], column: "done" });

    await waitFor(() => {
      // Check completion percentage updated
      expect(screen.getByText(/50.0%/)).toBeInTheDocument();
    });
  });

  test("handles rapid successive updates", async () => {
    render(<KanbanBoard />);

    const eventHandlers = mockSocketInstance._getEventHandlers();
    eventHandlers["sync:tasks"]([]);

    // Rapidly create multiple tasks
    for (let i = 1; i <= 5; i++) {
      eventHandlers["task:created"]({
        id: i,
        title: `Rapid Task ${i}`,
        column: "todo",
        priority: "medium",
        category: "feature",
        attachments: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText("Rapid Task 1")).toBeInTheDocument();
      expect(screen.getByText("Rapid Task 5")).toBeInTheDocument();
      expect(screen.getByText(/To Do \(5\)/)).toBeInTheDocument();
    });
  });
});
