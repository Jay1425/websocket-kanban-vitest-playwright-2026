import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import KanbanBoard from "../../components/KanbanBoard";

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  default: vi.fn(() => mockSocket),
}));

describe("KanbanBoard Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("renders loading state initially", () => {
    render(<KanbanBoard />);
    expect(screen.getByText("Loading tasks...")).toBeInTheDocument();
  });

  test("renders Kanban board after receiving tasks", async () => {
    render(<KanbanBoard />);

    // Simulate socket connection and sync
    const syncCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    if (syncCallback) {
      syncCallback([]);
    }

    await waitFor(() => {
      expect(screen.getByText("Create New Task")).toBeInTheDocument();
    });
  });

  test("renders all three columns", async () => {
    render(<KanbanBoard />);

    const syncCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    if (syncCallback) {
      syncCallback([]);
    }

    await waitFor(() => {
      expect(screen.getByText(/To Do/)).toBeInTheDocument();
      expect(screen.getByText(/In Progress/)).toBeInTheDocument();
      expect(screen.getByText(/Done/)).toBeInTheDocument();
    });
  });

  test("displays tasks in correct columns", async () => {
    const mockTasks = [
      {
        id: 1,
        title: "Task 1",
        description: "Description 1",
        column: "todo",
        priority: "high",
        category: "bug",
        attachments: [],
      },
      {
        id: 2,
        title: "Task 2",
        description: "Description 2",
        column: "in-progress",
        priority: "medium",
        category: "feature",
        attachments: [],
      },
      {
        id: 3,
        title: "Task 3",
        description: "Description 3",
        column: "done",
        priority: "low",
        category: "enhancement",
        attachments: [],
      },
    ];

    render(<KanbanBoard />);

    const syncCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    if (syncCallback) {
      syncCallback(mockTasks);
    }

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
      expect(screen.getByText("Task 2")).toBeInTheDocument();
      expect(screen.getByText("Task 3")).toBeInTheDocument();
    });
  });

  test("can create a new task", async () => {
    render(<KanbanBoard />);

    const syncCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    if (syncCallback) {
      syncCallback([]);
    }

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Task title")).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText("Task title");
    const descriptionInput = screen.getByPlaceholderText("Description");
    const submitButton = screen.getByText("Add Task");

    fireEvent.change(titleInput, { target: { value: "New Task" } });
    fireEvent.change(descriptionInput, { target: { value: "Task description" } });
    fireEvent.click(submitButton);

    expect(mockSocket.emit).toHaveBeenCalledWith("task:create", expect.objectContaining({
      title: "New Task",
      description: "Task description",
      column: "todo",
    }));
  });

  test("can delete a task", async () => {
    const mockTasks = [
      {
        id: 1,
        title: "Task to Delete",
        description: "Description",
        column: "todo",
        priority: "high",
        category: "bug",
        attachments: [],
      },
    ];

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(<KanbanBoard />);

    const syncCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    if (syncCallback) {
      syncCallback(mockTasks);
    }

    await waitFor(() => {
      expect(screen.getByText("Task to Delete")).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByText("Delete")[0];
    fireEvent.click(deleteButton);

    expect(mockSocket.emit).toHaveBeenCalledWith("task:delete", 1);
  });

  test("can update task priority", async () => {
    const mockTasks = [
      {
        id: 1,
        title: "Task 1",
        description: "Description",
        column: "todo",
        priority: "low",
        category: "bug",
        attachments: [],
      },
    ];

    render(<KanbanBoard />);

    const syncCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    if (syncCallback) {
      syncCallback(mockTasks);
    }

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    const prioritySelects = screen.getAllByDisplayValue("Low");
    fireEvent.change(prioritySelects[0], { target: { value: "high" } });

    expect(mockSocket.emit).toHaveBeenCalledWith("task:update", expect.objectContaining({
      id: 1,
      priority: "high",
    }));
  });

  test("can update task category", async () => {
    const mockTasks = [
      {
        id: 1,
        title: "Task 1",
        description: "Description",
        column: "todo",
        priority: "low",
        category: "bug",
        attachments: [],
      },
    ];

    render(<KanbanBoard />);

    const syncCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    if (syncCallback) {
      syncCallback(mockTasks);
    }

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    const categorySelects = screen.getAllByDisplayValue("Bug");
    fireEvent.change(categorySelects[0], { target: { value: "feature" } });

    expect(mockSocket.emit).toHaveBeenCalledWith("task:update", expect.objectContaining({
      id: 1,
      category: "feature",
    }));
  });

  test("shows progress chart with correct data", async () => {
    const mockTasks = [
      { id: 1, title: "Task 1", column: "todo", priority: "high", category: "bug", attachments: [] },
      { id: 2, title: "Task 2", column: "in-progress", priority: "medium", category: "feature", attachments: [] },
      { id: 3, title: "Task 3", column: "done", priority: "low", category: "enhancement", attachments: [] },
    ];

    render(<KanbanBoard />);

    const syncCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    if (syncCallback) {
      syncCallback(mockTasks);
    }

    await waitFor(() => {
      expect(screen.getByText("Task Progress Dashboard")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument(); // Total tasks
      expect(screen.getByText("1")).toBeInTheDocument(); // Completed tasks
    });
  });

  test("handles task created event", async () => {
    render(<KanbanBoard />);

    const syncCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    if (syncCallback) {
      syncCallback([]);
    }

    const createdCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "task:created"
    )?.[1];

    const newTask = {
      id: 1,
      title: "New Task",
      description: "Description",
      column: "todo",
      priority: "medium",
      category: "feature",
      attachments: [],
    };

    if (createdCallback) {
      createdCallback(newTask);
    }

    await waitFor(() => {
      expect(screen.getByText("New Task")).toBeInTheDocument();
    });
  });

  test("displays file attachments", async () => {
    const mockTasks = [
      {
        id: 1,
        title: "Task with Files",
        description: "Description",
        column: "todo",
        priority: "high",
        category: "bug",
        attachments: [
          {
            name: "test.jpg",
            type: "image/jpeg",
            size: 1024,
            url: "data:image/jpeg;base64,test",
          },
        ],
      },
    ];

    render(<KanbanBoard />);

    const syncCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === "sync:tasks"
    )?.[1];
    
    if (syncCallback) {
      syncCallback(mockTasks);
    }

    await waitFor(() => {
      expect(screen.getByText("Attachments (1):")).toBeInTheDocument();
      expect(screen.getByAltText("test.jpg")).toBeInTheDocument();
    });
  });

  test("disconnects socket on unmount", () => {
    const { unmount } = render(<KanbanBoard />);
    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
