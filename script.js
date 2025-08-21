document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT --- //
    let state = {
        projects: [],
        activeProjectId: null,
        theme: 'light'
    };

    // --- DOM ELEMENT SELECTION --- //
    const projectList = document.getElementById('project-list');
    const addProjectBtn = document.getElementById('add-project-btn');
    const deleteProjectBtn = document.getElementById('delete-project-btn');
    const currentProjectTitle = document.getElementById('current-project-title');
    const taskList = document.getElementById('task-list');
    
    // Task Input
    const newTaskInput = document.getElementById('new-task-input');
    const newTaskDate = document.getElementById('new-task-date');
    const newTaskPriority = document.getElementById('new-task-priority');
    
    // Stats
    const totalTasksSpan = document.getElementById('total-tasks');
    const activeTasksSpan = document.getElementById('active-tasks');
    const completedTasksSpan = document.getElementById('completed-tasks');
    const overdueTasksSpan = document.getElementById('overdue-tasks');
    
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');

    // Modals
    const commandPaletteToggle = document.getElementById('command-palette-toggle');
    const commandPaletteModal = document.getElementById('command-palette-modal');
    const commandInput = document.getElementById('command-input');
    const commandResults = document.getElementById('command-results');
    const focusModal = document.getElementById('focus-modal');
    const confirmModal = document.getElementById('confirm-modal');
    
    // --- STATE & LOCAL STORAGE --- //
    const saveState = () => {
        localStorage.setItem('todoProState', JSON.stringify(state));
    };

    const loadState = () => {
        const savedState = localStorage.getItem('todoProState');
        if (savedState) {
            state = JSON.parse(savedState);
        } else {
            // Default state for first-time users
            const inboxId = Date.now();
            state = {
                projects: [{ id: inboxId, name: 'Inbox', tasks: [] }],
                activeProjectId: inboxId,
                theme: 'light'
            };
        }
    };
    
    const getActiveProject = () => {
        return state.projects.find(p => p.id === state.activeProjectId);
    };

    // --- RENDERING --- //
    const render = () => {
        renderProjects();
        renderTasks();
        updateStats();
        applyTheme();
    };
    
    const renderProjects = () => {
        projectList.innerHTML = '';
        state.projects.forEach(project => {
            const li = document.createElement('li');
            li.className = `project-item ${project.id === state.activeProjectId ? 'active' : ''}`;
            li.dataset.id = project.id;
            
            const completed = project.tasks.filter(t => t.completed).length;
            const total = project.tasks.length;
            const progress = total > 0 ? (completed / total) * 100 : 0;
            
            li.innerHTML = `
                <div>
                    <span>${project.name}</span>
                    <div class="project-progress">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                    </div>
                </div>
                <span class="task-count">${completed}/${total}</span>
            `;
            li.addEventListener('click', () => switchProject(project.id));
            projectList.appendChild(li);
        });
    };
    
    const renderTasks = () => {
        taskList.innerHTML = '';
        const activeProject = getActiveProject();
        if (!activeProject) {
            currentProjectTitle.textContent = 'No Project Selected';
            return;
        }
        
        currentProjectTitle.textContent = activeProject.name;
        deleteProjectBtn.style.display = activeProject.name === 'Inbox' ? 'none' : 'inline-block';

        if (activeProject.tasks.length === 0) {
            taskList.innerHTML = '<li class="no-tasks-message">No tasks yet. Add one above!</li>';
            return;
        }

        activeProject.tasks.forEach(task => {
            const li = createTaskElement(task);
            taskList.appendChild(li);
        });
    };

    const createTaskElement = (task) => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} priority-${task.priority}`;
        li.dataset.id = task.id;

        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

        li.innerHTML = `
            <div class="task-item-header">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark task complete">
                <span class="task-text" contenteditable="false">${task.text}</span>
                <div class="task-details">
                    ${task.dueDate ? `<span class="due-date ${isOverdue ? 'overdue' : ''}">${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="task-actions">
                    <button class="focus-btn" aria-label="Start focus session">🎯</button>
                    <button class="delete-btn" aria-label="Delete task">🗑️</button>
                </div>
            </div>
            <div class="task-notes" contenteditable="true" data-placeholder="Add a note...">${task.notes || ''}</div>
        `;
        return li;
    };
    
    // --- PROJECT & TASK MANIPULATION --- //
    const addProject = () => {
        const name = prompt('Enter new project name:');
        if (name && name.trim()) {
            const newProject = { id: Date.now(), name: name.trim(), tasks: [] };
            state.projects.push(newProject);
            switchProject(newProject.id);
            saveState();
            render();
        }
    };
    
    const deleteProject = () => {
        const project = getActiveProject();
        if (project && project.name !== 'Inbox') {
            showConfirmation('Delete Project?', `Are you sure you want to delete the "${project.name}" project and all its tasks? This cannot be undone.`, () => {
                state.projects = state.projects.filter(p => p.id !== state.activeProjectId);
                state.activeProjectId = state.projects[0].id; // Switch to Inbox
                saveState();
                render();
            });
        }
    };

    const switchProject = (projectId) => {
        state.activeProjectId = projectId;
        saveState();
        render();
    };

    const addTask = () => {
        const text = newTaskInput.value.trim();
        if (text === '') return;
        
        const activeProject = getActiveProject();
        if (!activeProject) return;

        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            dueDate: newTaskDate.value,
            priority: newTaskPriority.value,
            notes: '',
        };

        activeProject.tasks.unshift(newTask);
        newTaskInput.value = '';
        saveState();
        render();
    };
    
    taskList.addEventListener('click', (e) => {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const taskId = Number(taskItem.dataset.id);
        const project = getActiveProject();
        const task = project.tasks.find(t => t.id === taskId);

        if (e.target.matches('.task-checkbox')) {
            task.completed = !task.completed;
            saveState();
            render();
        }
        if (e.target.matches('.delete-btn')) {
            project.tasks = project.tasks.filter(t => t.id !== taskId);
            saveState();
            render();
        }
        if (e.target.matches('.focus-btn')) {
            startFocusSession(task);
        }
        if (e.target.matches('.task-text')) {
            const span = e.target;
            span.contentEditable = true;
            span.focus();
            span.onblur = () => {
                span.contentEditable = false;
                task.text = span.textContent.trim();
                saveState();
            };
        }
    });

    taskList.addEventListener('focusout', (e) => {
        if(e.target.matches('.task-notes')) {
            const taskId = Number(e.target.closest('.task-item').dataset.id);
            const project = getActiveProject();
            const task = project.tasks.find(t => t.id === taskId);
            task.notes = e.target.innerHTML;
            saveState();
        }
    });

    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // --- UI & THEME --- //
    const updateStats = () => {
        const project = getActiveProject();
        if (!project) return;
        const tasks = project.tasks;
        const today = new Date();
        today.setHours(0,0,0,0);
        
        totalTasksSpan.textContent = tasks.length;
        const completedCount = tasks.filter(t => t.completed).length;
        completedTasksSpan.textContent = completedCount;
        activeTasksSpan.textContent = tasks.length - completedCount;
        overdueTasksSpan.textContent = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today).length;
    };
    
    const applyTheme = () => {
        document.documentElement.setAttribute('data-theme', state.theme);
    };

    themeToggle.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        saveState();
        applyTheme();
    });
    
    // --- MODAL & COMMAND PALETTE LOGIC --- //
    const showModal = (modal) => { modal.style.display = 'flex'; };
    const hideModal = (modal) => { modal.style.display = 'none'; };

    // Confirmation Modal
    const showConfirmation = (title, message, onConfirm) => {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        showModal(confirmModal);
        
        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');
        
        const confirmHandler = () => {
            onConfirm();
            hideModal(confirmModal);
            cleanup();
        };
        const cancelHandler = () => {
            hideModal(confirmModal);
            cleanup();
        };
        const cleanup = () => {
            yesBtn.removeEventListener('click', confirmHandler);
            noBtn.removeEventListener('click', cancelHandler);
        };
        
        yesBtn.addEventListener('click', confirmHandler);
        noBtn.addEventListener('click', cancelHandler);
    };

    // Command Palette
    const openCommandPalette = () => {
        showModal(commandPaletteModal);
        commandInput.focus();
        renderCommandResults('');
    };
    
    const renderCommandResults = (query) => {
        commandResults.innerHTML = '';
        const lowerQuery = query.toLowerCase();
        
        // Add static commands
        const commands = [
            { name: 'Add New Task', action: () => { hideModal(commandPaletteModal); newTaskInput.focus(); } },
            { name: 'Toggle Theme', action: () => { themeToggle.click(); } },
            { name: 'Add New Project', action: () => { hideModal(commandPaletteModal); addProject(); } },
        ];
        
        commands.filter(c => c.name.toLowerCase().includes(lowerQuery)).forEach(c => {
            const li = document.createElement('li');
            li.textContent = c.name;
            li.addEventListener('click', c.action);
            commandResults.appendChild(li);
        });
        
        // Add tasks from all projects
        state.projects.forEach(p => {
            p.tasks.filter(t => t.text.toLowerCase().includes(lowerQuery)).forEach(t => {
                const li = document.createElement('li');
                li.innerHTML = `${t.text} <span class="command-hint">${p.name}</span>`;
                li.addEventListener('click', () => {
                    switchProject(p.id);
                    hideModal(commandPaletteModal);
                    // Highlight the task briefly
                    setTimeout(() => {
                        const taskEl = document.querySelector(`.task-item[data-id="${t.id}"]`);
                        if(taskEl) {
                           taskEl.style.transition = 'none';
                           taskEl.style.backgroundColor = 'var(--c-accent-hover)';
                           setTimeout(() => taskEl.style.backgroundColor = '', 1000);
                        }
                    }, 100);
                });
                commandResults.appendChild(li);
            });
        });
    };

    commandInput.addEventListener('input', () => renderCommandResults(commandInput.value));
    commandPaletteToggle.addEventListener('click', openCommandPalette);
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openCommandPalette();
        }
        if (e.key === 'Escape' && commandPaletteModal.style.display !== 'none') {
            hideModal(commandPaletteModal);
        }
    });
    // Close modal on overlay click
    commandPaletteModal.addEventListener('click', (e) => { if (e.target === commandPaletteModal) hideModal(commandPaletteModal); });

    // --- FOCUS MODE --- //
    let focusInterval = null;
    let focusTask = null;

    const startFocusSession = (task) => {
        focusTask = task;
        document.getElementById('focus-task-name').textContent = task.text;
        showModal(focusModal);
        
        let duration = 25 * 60; // 25 minutes
        focusInterval = setInterval(() => {
            duration--;
            const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
            const seconds = (duration % 60).toString().padStart(2, '0');
            document.getElementById('focus-time-display').textContent = `${minutes}:${seconds}`;

            if (duration <= 0) {
                clearInterval(focusInterval);
                new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg').play();
                stopFocus(true); // Auto-complete on finish
            }
        }, 1000);
    };

    const stopFocus = (markComplete) => {
        clearInterval(focusInterval);
        hideModal(focusModal);
        if (markComplete && focusTask) {
            const project = state.projects.find(p => p.tasks.some(t => t.id === focusTask.id));
            const taskInState = project.tasks.find(t => t.id === focusTask.id);
            taskInState.completed = true;
            saveState();
            render();
        }
        focusTask = null;
    };
    
    document.getElementById('stop-focus-btn').addEventListener('click', () => stopFocus(true));
    document.getElementById('cancel-focus-btn').addEventListener('click', () => stopFocus(false));
    
    // --- INITIALIZATION --- //
    addProjectBtn.addEventListener('click', addProject);
    deleteProjectBtn.addEventListener('click', deleteProject);

    loadState();
    render();
});