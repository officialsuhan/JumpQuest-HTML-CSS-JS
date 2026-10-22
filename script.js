
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const emptyState = document.getElementById("empty-state");
const clearCompletedButton = document.getElementById("clear-completed");

let tasks = [];
let nextId = 1;

// Screen par tasks show karna
function renderTasks() {
    taskList.replaceChildren();

    for (const task of tasks) {
        const item = document.createElement("li");

        item.className = `task-item${task.completed ? " completed" : ""}`;

        // Checkbox banana
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute(
            "aria-label",
            `Mark ${task.text} as completed`
        );

        checkbox.addEventListener("change", () => {
            task.completed = checkbox.checked;
            renderTasks();
        });

        // Task ka text
        const text = document.createElement("span");
        text.className = "task-text";
        text.textContent = task.text;

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            tasks = tasks.filter((currentTask) => {
                return currentTask.id !== task.id;
            });

            renderTasks();
        });

        item.append(checkbox, text, deleteButton);
        taskList.append(item);
    }

    // Incomplete tasks count karna
    const remaining = tasks.filter((task) => {
        return !task.completed;
    }).length;

    taskCount.textContent =
        `${remaining} task${remaining === 1 ? "" : "s"} left`;

    // Empty message show ya hide karna
    emptyState.hidden = tasks.length > 0;
}

// Naya task add karna
taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = taskInput.value.trim();

    if (!text) return;

    tasks.push({
        id: nextId++,
        text: text,
        completed: false
    });

    taskInput.value = "";
    taskInput.focus();

    renderTasks();
});

// Completed tasks remove karna
clearCompletedButton.addEventListener("click", () => {
    tasks = tasks.filter((task) => {
        return !task.completed;
    });

    renderTasks();
});

// Initial display
renderTasks();
