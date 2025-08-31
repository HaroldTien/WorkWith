(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const o of a)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function e(a){const o={};return a.integrity&&(o.integrity=a.integrity),a.referrerPolicy&&(o.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?o.credentials="include":a.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(a){if(a.ep)return;a.ep=!0;const o=e(a);fetch(a.href,o)}})();class b{constructor(t,e,s,a,o){this.task=t,this.status=e,this.onDelete=s,this.onMoveToDone=a,this.onUpdateTask=o,this.element=this.createElement(),this.task.subtasks||(this.task.subtasks=[])}createElement(){const t=document.createElement("div");return t.className="task-card",t.draggable=!0,t.dataset.taskId=this.task.id,t.dataset.status=this.status,t.innerHTML=this.getHTML(),this.bindEvents(t),t}getHTML(){const t=this.task.subtasks.filter(s=>s.completed).length,e=this.task.subtasks.length;return`
            <div class="task-header">
                <div class="task-title">${this.task.title}</div>
                <div class="task-actions">
                    ${this.status!=="done"?`<button class="done-task-btn" data-task-id="${this.task.id}" data-status="${this.status}" aria-label="Mark as done" title="Mark as done">Done</button>`:""}
                    <button class="delete-task-btn" data-task-id="${this.task.id}" data-status="${this.status}" aria-label="Delete task" title="Delete task">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </div>
            ${this.task.estimateTime?`<div class="task-estimate">⏱️ ${this.task.estimateTime}</div>`:""}
            ${e>0?`<div class="subtask-progress">${t}/${e} subtasks completed</div>`:""}
            <div class="subtasks-container">
                ${this.getSubtasksHTML()}
                <button class="add-subtask-btn" title="Add subtask">+ Add subtask</button>
            </div>
        `}getSubtasksHTML(){return this.task.subtasks.map(t=>`
            <div class="subtask-item ${t.completed?"completed":""}" data-subtask-id="${t.id}">
                <input type="checkbox" class="subtask-checkbox" ${t.completed?"checked":""}>
                <span class="subtask-text">${t.text}</span>
                <button class="delete-subtask-btn" data-subtask-id="${t.id}" title="Delete subtask">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        `).join("")}bindEvents(t){t.querySelector(".delete-task-btn").addEventListener("click",i=>{i.stopPropagation(),this.onDelete&&this.onDelete(this.task.id,this.status)});const s=t.querySelector(".done-task-btn");s&&this.onMoveToDone&&s.addEventListener("click",i=>{i.stopPropagation(),this.onMoveToDone(this.task.id,this.status)}),t.querySelector(".add-subtask-btn").addEventListener("click",i=>{i.stopPropagation(),this.showAddSubtaskInput()}),t.querySelectorAll(".subtask-checkbox").forEach(i=>{i.addEventListener("change",c=>{c.stopPropagation();const d=parseInt(c.target.closest(".subtask-item").dataset.subtaskId);this.toggleSubtask(d)})}),t.querySelectorAll(".delete-subtask-btn").forEach(i=>{i.addEventListener("click",c=>{c.stopPropagation();const d=parseInt(i.dataset.subtaskId);this.deleteSubtask(d)})})}updateTask(t){this.task=t,this.element.innerHTML=this.getHTML(),this.bindEvents(this.element)}updateStatus(t){this.status=t,this.element.dataset.status=t;const e=this.element.querySelector(".delete-task-btn");e&&(e.dataset.status=t)}getElement(){return this.element}showAddSubtaskInput(){const t=this.element.querySelector(".subtask-input-container");t&&t.remove();const e=document.createElement("div");e.className="subtask-input-container";const s=document.createElement("input");s.type="text",s.className="subtask-input",s.placeholder="Enter subtask...",s.maxLength=100;const a=document.createElement("div");a.className="subtask-input-buttons";const o=document.createElement("button");o.className="subtask-save-btn",o.textContent="✓",o.title="Add subtask";const r=document.createElement("button");r.className="subtask-cancel-btn",r.textContent="✕",r.title="Cancel",a.appendChild(o),a.appendChild(r),e.appendChild(s),e.appendChild(a);const i=this.element.querySelector(".add-subtask-btn");i.parentNode.insertBefore(e,i),i.style.display="none",s.focus();const c=()=>{const l=s.value.trim();l&&this.addSubtask(l),this.hideAddSubtaskInput()},d=()=>{this.hideAddSubtaskInput()};o.addEventListener("click",l=>{l.stopPropagation(),c()}),r.addEventListener("click",l=>{l.stopPropagation(),d()}),s.addEventListener("keydown",l=>{l.stopPropagation(),l.key==="Enter"?c():l.key==="Escape"&&d()}),e.addEventListener("click",l=>{l.stopPropagation()})}hideAddSubtaskInput(){const t=this.element.querySelector(".subtask-input-container");t&&t.remove();const e=this.element.querySelector(".add-subtask-btn");e&&(e.style.display="block")}addSubtask(t){const e={id:Date.now(),text:t,completed:!1,createdAt:new Date().toISOString()};this.task.subtasks.push(e),this.updateTaskAndNotify()}toggleSubtask(t){const e=this.task.subtasks.find(s=>s.id===t);e&&(e.completed=!e.completed,this.updateTaskAndNotify())}deleteSubtask(t){this.task.subtasks=this.task.subtasks.filter(e=>e.id!==t),this.updateTaskAndNotify()}updateTaskAndNotify(){this.updateTask(this.task),this.onUpdateTask&&this.onUpdateTask(this.task)}static createTaskCard(t,e,s,a,o){return new b(t,e,s,a,o).getElement()}}class v{constructor(t="Task Board"){this.isVisible=!1,this.boardName=t,this.tasks={"in-process":[],today:[],done:[]},this.loadStyles(),this.element=this.createModal(),this.bindEvents()}createModal(){const t=document.createElement("div");return t.className="task-board-overlay",t.innerHTML=`
            <div class="task-board-modal">
                <header class="task-board-header">
                    <h2>${this.boardName}</h2>
                    <button class="close-btn" aria-label="Close">×</button>
                </header>
                <div class="task-board-content">
                    <div class="task-column" data-status="in-process">
                        <div class="column-header">
                            <h3>In Process</h3>
                            <span class="task-count">0</span>
                        </div>
                        <div class="task-list" id="in-process-list"></div>
                    </div>
                    <div class="task-column" data-status="today">
                        <div class="column-header">
                            <h3>Today</h3>
                            <span class="task-count">0</span>
                        </div>
                        <div class="task-list" id="today-list"></div>
                    </div>
                    <div class="task-column" data-status="done">
                        <div class="column-header">
                            <h3>Done</h3>
                            <span class="task-count">0</span>
                        </div>
                        <div class="task-list" id="done-list"></div>
                    </div>
                </div>
            </div>
        `,t}loadStyles(){if(document.getElementById("task-board-styles")||document.getElementById("task-board-inline-styles"))return;const t=document.createElement("link");t.id="task-board-styles",t.rel="stylesheet",t.type="text/css",t.href="./src/components/task-board-modal.css",t.onerror=()=>{console.warn("Failed to load external CSS, using inline styles"),this.loadInlineStyles()},setTimeout(()=>{window.getComputedStyle(document.body),!document.querySelector(".task-board-overlay")&&!document.getElementById("task-board-inline-styles")&&(console.warn("CSS loading timeout, falling back to inline styles"),this.loadInlineStyles())},500),document.head.appendChild(t)}loadInlineStyles(){if(document.getElementById("task-board-inline-styles"))return;const t=document.createElement("style");t.id="task-board-inline-styles",t.textContent=`
.task-board-overlay {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background: rgba(0, 0, 0, 0.8) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 999999 !important;
    backdrop-filter: blur(6px) !important;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}

.task-board-overlay.visible {
    opacity: 1 !important;
    visibility: visible !important;
}

.task-board-modal {
    background: #111827 !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-radius: 16px !important;
    width: 95vw !important;
    max-width: none !important;
    height: 90vh !important;
    max-height: none !important;
    display: flex !important;
    flex-direction: column !important;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
    transform: scale(0.9);
    transition: transform 0.3s ease;
}

.task-board-overlay.visible .task-board-modal {
    transform: scale(1) !important;
}

.task-board-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 20px 24px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
    background: rgba(255, 255, 255, 0.03) !important;
    border-radius: 16px 16px 0 0 !important;
}

.task-board-header h2 {
    margin: 0 !important;
    color: #E5E7EB !important;
    font-size: 24px !important;
    font-weight: 600 !important;
}

.close-btn {
    background: none !important;
    border: none !important;
    color: #9CA3AF !important;
    font-size: 24px !important;
    cursor: pointer !important;
    padding: 4px 8px !important;
    border-radius: 6px !important;
    transition: all 0.2s ease !important;
}

.close-btn:hover {
    background: rgba(255, 255, 255, 0.1) !important;
    color: #E5E7EB !important;
}

.task-board-content {
    display: grid !important;
    grid-template-columns: 1fr 1fr 1fr !important;
    gap: 20px !important;
    padding: 24px !important;
    flex: 1 !important;
    overflow: hidden !important;
}

.task-column {
    background: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 12px !important;
    padding: 16px !important;
    display: flex !important;
    flex-direction: column !important;
    min-height: 0 !important;
}

.task-column[data-status="in-process"] .column-header h3 {
    color: #3B82F6 !important;
}

.task-column[data-status="today"] .column-header h3 {
    color: #8B5CF6 !important;
}

.task-column[data-status="done"] .column-header h3 {
    color: #10B981 !important;
}

.column-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    margin-bottom: 16px !important;
    padding-bottom: 12px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.column-header h3 {
    margin: 0 !important;
    font-size: 16px !important;
    font-weight: 600 !important;
}

.task-count {
    background: rgba(255, 255, 255, 0.1) !important;
    color: #9CA3AF !important;
    font-size: 12px !important;
    padding: 4px 8px !important;
    border-radius: 12px !important;
    min-width: 20px !important;
    text-align: center !important;
}

.task-list {
    flex: 1 !important;
    overflow-y: auto !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
    margin-bottom: 16px !important;
}
`,document.head.appendChild(t),console.log("✅ Inline styles loaded for task board modal")}bindEvents(){this.element.querySelector(".close-btn").addEventListener("click",()=>this.hide()),this.element.addEventListener("click",t=>{t.target===this.element&&this.hide()}),this.bindHoverButtonEvents(),this.setupDragAndDrop(),document.addEventListener("keydown",t=>{t.key==="Escape"&&this.isVisible&&this.hide()})}bindHoverButtonEvents(){this.element.addEventListener("click",t=>{if(t.target.closest(".add-task-hover-area")){const s=t.target.closest(".add-task-hover-area").dataset.status;this.addTask(s)}})}renderTasks(){Object.keys(this.tasks).forEach(t=>{const e=`${t}-list`,s=this.element.querySelector(`#${e}`),a=this.element.querySelector(`[data-status="${t}"] .task-count`);if(!s){console.warn(`Task list not found: ${e}`);return}s.innerHTML="",this.tasks[t].forEach(r=>{const i=b.createTaskCard(r,t,(c,d)=>{this.deleteTask(c,d)},(c,d)=>{this.moveTaskToDone(c,d)},c=>{this.updateTask(c,t)});s.appendChild(i)});const o=document.createElement("div");o.className="add-task-hover-area",o.dataset.status=t,o.innerHTML=`
                <div class="hover-indicator"></div>
                <div class="hover-text">+ Add Task</div>
            `,s.appendChild(o),a.textContent=this.tasks[t].length})}addTask(t){this.showAddTaskModal(t)}deleteTask(t,e){const s=this.tasks[e].find(a=>a.id===t);if(!s){console.error("Task not found");return}this.tasks[e]=this.tasks[e].filter(a=>a.id!==t),this.renderTasks(),this.saveToLocalStorage(),this.showSuccessMessage(`Task "${s.title}" deleted successfully!`)}setupDragAndDrop(){this.element.addEventListener("dragstart",t=>{t.target.classList.contains("task-card")&&(t.target.classList.add("dragging"),t.dataTransfer.effectAllowed="move",t.dataTransfer.setData("text/html",t.target.outerHTML),t.dataTransfer.setData("text/plain",JSON.stringify({taskId:t.target.dataset.taskId,fromStatus:t.target.dataset.status})))}),this.element.addEventListener("dragend",t=>{t.target.classList.contains("task-card")&&t.target.classList.remove("dragging")}),this.element.addEventListener("dragover",t=>{t.preventDefault();const e=t.target.closest(".task-list");e&&(t.dataTransfer.dropEffect="move",e.classList.add("drag-over"),this.handleVerticalDragOver(t,e))}),this.element.addEventListener("dragenter",t=>{t.preventDefault();const e=t.target.closest(".task-list");e&&e.classList.add("drag-over")}),this.element.addEventListener("dragleave",t=>{const e=t.target.closest(".task-list");e&&!e.contains(t.relatedTarget)&&e.classList.remove("drag-over")}),this.element.addEventListener("drop",t=>{t.preventDefault();const e=t.target.closest(".task-list");if(e){e.classList.remove("drag-over"),this.clearDropIndicators();const a=e.closest(".task-column").dataset.status,o=JSON.parse(t.dataTransfer.getData("text/plain")),r=parseInt(o.taskId),i=o.fromStatus;i===a?this.handleVerticalDrop(t,e,r,i):this.moveTask(r,i,a)}})}moveTask(t,e,s){const a=this.tasks[e].findIndex(i=>i.id===t);if(a===-1){console.error("Task not found in source status");return}const o=this.tasks[e][a];this.tasks[e].splice(a,1),o.status=s,o.movedAt=new Date().toISOString(),this.tasks[s].push(o),this.renderTasks(),this.saveToLocalStorage();const r={"in-process":"In Process",today:"Today",done:"Done"};this.showSuccessMessage(`Task "${o.title}" moved to ${r[s]}!`)}moveTaskToDone(t,e){e!=="done"&&this.moveTask(t,e,"done")}updateTask(t,e){const s=this.tasks[e].findIndex(a=>a.id===t.id);s!==-1&&(this.tasks[e][s]=t,this.saveToLocalStorage())}handleVerticalDragOver(t,e){if(this.clearDropIndicators(),!document.querySelector(".dragging"))return;const a=[...e.querySelectorAll(".task-card:not(.dragging)")],o=t.clientY;let r=null;for(const i of a){const c=i.getBoundingClientRect(),d=c.top+c.height/2;if(o<d)break;r=i}this.showDropIndicator(e,r)}handleVerticalDrop(t,e,s,a){const o=[...e.querySelectorAll(".task-card:not(.dragging)")],r=t.clientY;let i=0;for(let c=0;c<o.length;c++){const d=o[c].getBoundingClientRect(),l=d.top+d.height/2;if(r<l){i=c;break}i=c+1}this.reorderTask(s,a,i)}reorderTask(t,e,s){const a=this.tasks[e],o=a.findIndex(i=>i.id===t);if(o===-1)return;const[r]=a.splice(o,1);o<s&&s--,a.splice(s,0,r),this.renderTasks(),this.saveToLocalStorage(),console.log(`✅ Reordered task "${r.title}" in ${e}`)}showDropIndicator(t,e){const s=document.createElement("div");s.className="drop-indicator",e?e.insertAdjacentElement("afterend",s):t.insertBefore(s,t.firstChild)}clearDropIndicators(){document.querySelectorAll(".drop-indicator").forEach(e=>e.remove())}showAddTaskModal(t){const e=document.createElement("div");e.className="add-task-overlay",e.innerHTML=`
            <div class="add-task-modal">
                <header class="add-task-header">
                    <h3>Add New Task</h3>
                    <button class="add-task-close-btn" aria-label="Close">×</button>
                </header>
                <form class="add-task-form">
                    <div class="form-group">
                        <label for="task-title">Task Title *</label>
                        <input type="text" id="task-title" name="title" required maxlength="100" placeholder="Enter task title..." autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="task-estimate">Estimate Time</label>
                        <input type="text" id="task-estimate" name="estimateTime" pattern="^([0-9]|[1-9][0-9]|[1-9][0-9][0-9]):([0-5][0-9])$" placeholder="HH:MM (e.g., 02:30)" autocomplete="off" title="Enter time in HH:MM format">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="cancel-btn">Cancel</button>
                        <button type="submit" class="submit-btn">Add Task</button>
                    </div>
                </form>
            </div>
        `;const s=e.querySelector(".add-task-close-btn"),a=e.querySelector(".cancel-btn"),o=e.querySelector(".add-task-form"),r=e.querySelector("#task-title"),i=()=>{e.classList.remove("visible"),setTimeout(()=>{e.parentNode&&e.parentNode.removeChild(e)},300)};s.addEventListener("click",i),a.addEventListener("click",i),e.addEventListener("click",d=>{d.target===e&&i()});const c=e.querySelector("#task-estimate");c.addEventListener("input",d=>{let l=d.target.value.replace(/[^\d]/g,"");l.length>=2&&(l=l.substring(0,2)+":"+l.substring(2,4)),l.length>5&&(l=l.substring(0,5)),d.target.value=l}),c.addEventListener("keydown",d=>{if(d.key==="Backspace"){const l=d.target.value;d.target.selectionStart===3&&l.charAt(2)===":"&&(d.preventDefault(),d.target.value=l.substring(0,1),d.target.setSelectionRange(1,1))}}),o.addEventListener("submit",d=>{d.preventDefault();const l=new FormData(o),m=l.get("title").trim(),h=l.get("estimateTime");if(!m){this.showValidationError("Please enter a task title.");return}if(h&&h.trim()&&!/^([0-9]|[1-9][0-9]|[1-9][0-9][0-9]):([0-5][0-9])$/.test(h.trim())){this.showValidationError("Please enter time in HH:MM format (e.g., 02:30).");return}const x={id:Date.now(),title:m,createdAt:new Date().toISOString(),status:t,estimateTime:h&&h.trim()?h.trim():null,subtasks:[]};this.tasks[t].push(x),this.renderTasks(),this.saveToLocalStorage(),this.showSuccessMessage(`Task "${m}" added successfully!`),i()}),document.body.appendChild(e),requestAnimationFrame(()=>{e.classList.add("visible")}),setTimeout(()=>r.focus(),100)}showValidationError(t){const e=document.querySelector(".validation-error");e&&e.remove();const s=document.createElement("div");s.className="validation-error",s.textContent=t;const a=document.querySelector(".add-task-form");a.insertBefore(s,a.querySelector(".form-actions")),setTimeout(()=>{s.parentNode&&s.remove()},3e3)}showSuccessMessage(t){const e=document.querySelector(".success-message");e&&e.remove();const s=document.createElement("div");s.className="success-message",s.textContent=t,document.body.appendChild(s),setTimeout(()=>{s.classList.add("visible")},100),setTimeout(()=>{s.classList.remove("visible"),setTimeout(()=>{s.parentNode&&s.remove()},300)},2e3)}saveToLocalStorage(){try{const t={boardName:this.boardName,tasks:this.tasks,lastUpdated:Date.now()};localStorage.setItem("workwith-taskboard",JSON.stringify(t))}catch(t){console.error("Failed to save task board to localStorage:",t)}}loadFromLocalStorage(){try{const t=localStorage.getItem("workwith-taskboard");if(t){const e=JSON.parse(t);this.boardName=e.boardName||this.boardName,this.tasks=e.tasks||this.tasks;const s=this.element.querySelector(".task-board-header h2");s&&(s.textContent=this.boardName),console.log(`✅ Loaded task board: "${this.boardName}"`)}}catch(t){console.error("Failed to load task board from localStorage:",t)}}show(){this.isVisible?console.log("⚠️ TaskBoard modal already visible"):(console.log(`🔄 Attempting to show TaskBoard modal for: ${this.boardName}`),!document.getElementById("task-board-styles")&&!document.getElementById("task-board-inline-styles")&&(console.log("⚠️ No styles detected, loading inline styles immediately"),this.loadInlineStyles()),this.element.parentNode||(document.body.appendChild(this.element),console.log("📎 Modal element appended to body")),document.body.style.overflow="hidden",this.renderTasks(),this.element.style.display="flex",this.element.style.position="fixed",this.element.style.top="0",this.element.style.left="0",this.element.style.right="0",this.element.style.bottom="0",this.element.style.zIndex="999999",this.element.style.background="rgba(0, 0, 0, 0.8)",requestAnimationFrame(()=>{this.element.classList.add("visible"),console.log("✨ Modal animation triggered")}),this.isVisible=!0,console.log(`✅ TaskBoard modal shown for: ${this.boardName}`),console.log("🔍 Modal element:",this.element))}hide(){this.isVisible?(this.element.classList.remove("visible"),setTimeout(()=>{this.element.parentNode&&this.element.parentNode.removeChild(this.element),document.body.style.overflow=""},300),this.isVisible=!1,console.log("✅ TaskBoard modal hidden")):console.log("⚠️ TaskBoard modal already hidden")}toggle(){this.isVisible?this.hide():this.show()}}console.log("Renderer process started");const u=[];function E(){w(),y(n=>{try{n&&n.trim()!==""?T(n.trim()):console.log("❌ Task board creation cancelled - no name provided")}catch(t){console.error("Error creating task board:",t)}})}function S(n){const t=u.find(e=>e.id===n);t&&(t.lastAccessed=new Date().toISOString(),t.taskBoard.saveToLocalStorage,t.taskBoard.saveToLocalStorage=function(){p()},t.taskBoard.show(),p(),k())}function T(n){const t=`board_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,e=new v(n),s={id:t,name:n,taskBoard:e,createdAt:new Date().toISOString(),lastAccessed:new Date().toISOString()};e.saveToLocalStorage=function(){p()},u.push(s),p(),k(),console.log(`✅ TaskBoard instance created: "${n}"`),e.show()}function y(n,t="",e="Create Task Board"){const s=document.createElement("div");s.className="name-dialog-overlay",s.innerHTML=`
        <div class="name-dialog">
            <div class="dialog-header">
                <h3>${e}</h3>
            </div>
            <div class="dialog-content">
                <label for="boardNameInput">Enter a name for your task board:</label>
                <input type="text" id="boardNameInput" placeholder="My Task Board" maxlength="50" autofocus value="${t}">
                <div class="dialog-actions">
                    <button type="button" class="btn-cancel">Cancel</button>
                    <button type="button" class="btn-create">${e.includes("Rename")?"Rename":"Create"}</button>
                </div>
            </div>
        </div>
    `;const a=document.createElement("style");a.textContent=`
        .name-dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
            backdrop-filter: blur(4px);
        }

        .name-dialog {
            background: #1F2937;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            width: 90vw;
            max-width: 400px;
            box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6);
        }

        .dialog-header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }

        .dialog-header h3 {
            margin: 0;
            color: #E5E7EB;
            font-size: 20px;
            font-weight: 600;
        }

        .dialog-content {
            padding: 24px;
        }

        .dialog-content label {
            display: block;
            color: #E5E7EB;
            font-size: 14px;
            margin-bottom: 12px;
        }

        #boardNameInput {
            width: 100%;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            color: #E5E7EB;
            font-size: 14px;
            box-sizing: border-box;
            margin-bottom: 24px;
        }

        #boardNameInput:focus {
            outline: none;
            border-color: rgba(67, 56, 202, 0.5);
            box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
        }

        .dialog-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }

        .btn-cancel, .btn-create {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-cancel {
            background: none;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #9CA3AF;
        }

        .btn-cancel:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #E5E7EB;
        }

        .btn-create {
            background: linear-gradient(135deg, #4338CA, #6D28D9);
            color: white;
            border: none;
        }

        .btn-create:hover {
            background: linear-gradient(135deg, #5B21B6, #7C3AED);
            transform: translateY(-1px);
        }
    `,document.head.appendChild(a);const o=s.querySelector("#boardNameInput"),r=s.querySelector(".btn-cancel"),i=s.querySelector(".btn-create"),c=()=>{s.remove(),a.remove()},d=()=>{const m=o.value.trim();c(),n(m)},l=()=>{c(),n(null)};i.addEventListener("click",d),r.addEventListener("click",l),o.addEventListener("keydown",m=>{m.key==="Enter"?d():m.key==="Escape"&&l()}),document.body.appendChild(s),o.focus(),o.select()}function w(){document.querySelectorAll(".task-board-overlay").forEach((e,s)=>{console.log(`🧹 Cleaning up orphaned modal ${s+1}`),e.remove()}),document.querySelectorAll(".name-dialog-overlay").forEach((e,s)=>{console.log(`🧹 Cleaning up orphaned dialog ${s+1}`),e.remove()}),document.body.style.overflow=""}function p(){try{const n=u.map(t=>({id:t.id,name:t.name,createdAt:t.createdAt,lastAccessed:t.lastAccessed,tasks:t.taskBoard.tasks}));localStorage.setItem("workwith-taskboards-list",JSON.stringify(n)),console.log(`💾 Saved ${n.length} task boards`)}catch(n){console.error("Failed to save task boards:",n)}}function L(){try{const n=localStorage.getItem("workwith-taskboards-list");if(n){const t=JSON.parse(n);t.forEach(e=>{const s=new v(e.name);s.tasks=e.tasks||{"not-started":[],"in-process":[],done:[]},s.saveToLocalStorage=function(){p()};const a={id:e.id,name:e.name,taskBoard:s,createdAt:e.createdAt,lastAccessed:e.lastAccessed};u.push(a)}),console.log(`📁 Loaded ${t.length} task boards`)}}catch(n){console.error("Failed to load task boards:",n)}}function k(){const n=document.getElementById("mainContainer");if(!n)return;n.querySelectorAll(".task-board-block:not(.creation-block)").forEach(e=>e.remove()),u.forEach(e=>{const s=document.createElement("div");s.className="task-board-block",s.dataset.boardId=e.id,s.innerHTML=`
            <div class="task-board-instance">
                <div class="board-menu-btn" data-board-id="${e.id}" title="More options">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </div>
                <div class="board-dropdown-menu" data-board-id="${e.id}" style="display: none;">
                    <div class="dropdown-item rename-board-item" data-board-id="${e.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        Rename
                    </div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item delete-board-item" data-board-id="${e.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                        </svg>
                        Delete
                    </div>
                </div>
                <div class="board-header">
                    <h3 class="board-name">${e.name}</h3>
                    <div class="board-stats">
                        <div class="task-count">
                            ${Object.values(e.taskBoard.tasks).flat().length} tasks
                        </div>
                        <div class="last-accessed">
                            ${A(e.lastAccessed)}
                        </div>
                    </div>
                </div>
            </div>
        `,n.appendChild(s)}),B()}function B(){const n=document.getElementById("mainContainer");n&&(n.querySelectorAll(".board-menu-btn").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation(),I(t.dataset.boardId)})}),n.querySelectorAll(".dropdown-item").forEach(t=>{t.addEventListener("click",e=>{e.stopPropagation();const s=t.dataset.boardId;t.classList.contains("rename-board-item")?C(s):t.classList.contains("delete-board-item")&&D(s),g()})}),n.querySelectorAll(".task-board-block:not(.creation-block)").forEach(t=>{t.addEventListener("click",e=>{if(e.target.closest(".board-menu-btn")||e.target.closest(".board-dropdown-menu"))return;const s=t.dataset.boardId;S(s)})}))}document.addEventListener("click",n=>{!n.target.closest(".board-dropdown-menu")&&!n.target.closest(".board-menu-btn")&&g()});function I(n){const t=document.querySelector(`.board-dropdown-menu[data-board-id="${n}"]`),e=document.querySelector(`.board-menu-btn[data-board-id="${n}"]`);if(!t||!e)return;g(),t.style.display==="block"?(t.style.display="none",e.classList.remove("active")):(t.style.display="block",e.classList.add("active"))}function g(){document.querySelectorAll(".board-dropdown-menu").forEach(n=>{n.style.display="none"}),document.querySelectorAll(".board-menu-btn").forEach(n=>{n.classList.remove("active")})}function C(n){const t=u.find(e=>e.id===n);t&&y(e=>{e&&e.trim()!==""&&e.trim()!==t.name&&(t.name=e.trim(),p(),k(),console.log(`✏️ Renamed task board to: "${e}"`))},t.name,"Rename Task Board")}function D(n){const t=u.find(s=>s.id===n);if(!t)return;const e=u.findIndex(s=>s.id===n);e>-1&&u.splice(e,1),p(),k(),console.log(`🗑️ Deleted task board: "${t.name}"`)}function A(n){const t=new Date(n),s=new Date-t,a=Math.floor(s/6e4),o=Math.floor(s/36e5),r=Math.floor(s/864e5);return a<1?"Just now":a<60?`${a}m ago`:o<24?`${o}h ago`:r<7?`${r}d ago`:t.toLocaleDateString()}const f=document.getElementById("taskBoardBtn");f&&f.addEventListener("click",E);document.addEventListener("DOMContentLoaded",()=>{console.log("DOM loaded, WorkWith ready"),console.log("✅ Task Board component loaded"),L(),k()});
