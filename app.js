const App = (() => {
  const GITHUB_USER = "hannconn8";
  const GITHUB_REPO = "My-Planner";
  const FILE_PATH = "planner-data.json";
  const TOKEN = "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";

  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const sections = ["Morning","Afternoon","Evening"];

  let state = {
    tasks: [],
    tags: [],
    tagPanelOpen: true,
    focusDay: null
  };

  let draggedTaskId = null;

  // ---------- INIT ----------
  async function init() {

  await loadFromGitHub();

  renderAll();

  setInterval(renderAll, 60000);

  document.getElementById("saveBtn").onclick = saveToGitHub;
  document.getElementById("resetWeekBtn").onclick = resetWeek;

}

  // Sync planner across tabs
  window.addEventListener("storage", (e) => {
    if (e.key === "plannerData") {
      loadFromGitHub();
      renderAll();
    }
  });
}

async function loadFromGitHub() {

  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

  const res = await fetch(url);

  const data = await res.json();

  const decoded = JSON.parse(atob(data.content));

  state = decoded;

  renderAll();

}

async function saveToGitHub() {

  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

  const file = await fetch(url);
  const fileData = await file.json();

  const sha = fileData.sha;

  const content = btoa(JSON.stringify(state, null, 2));

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `token ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Update planner data",
      content: content,
      sha: sha
    })
  });

  if(response.ok){
    alert("Saved to GitHub!");
  } else {
    alert("Save failed.");
  }

}
  
  // ---------- STORAGE ----------
  function save() {
    localStorage.setItem("plannerData", JSON.stringify(state));
    alert("Saved!");
  }

  function autoSave() {
  localStorage.setItem("plannerData", JSON.stringify(state));
}

  function load() {
    const data = localStorage.getItem("plannerData");
    if (data) state = JSON.parse(data);
  }
  

  // ---------- TAG SYSTEM ----------

  function addParentTag() {
    const name = document.getElementById("newTagName").value.trim();
    const color = document.getElementById("newTagColor").value;
    if (!name) return;

    state.tags.push({
  id: Date.now(),
  name,
  color,
  parentId: null
});

autoSave();

    document.getElementById("newTagName").value = "";
    renderAll();
  }

  function addSubTag(parentId) {
    const name = prompt("Sub-tag name:");
    if (!name) return;

    state.tags.push({
      id: Date.now(),
      name,
      color: state.tags.find(t => t.id === parentId).color,
      parentId
    });

    autoSave();

    renderAll();
  }

  function editTag(tagId) {
    const tag = state.tags.find(t => t.id === tagId);
    const newName = prompt("Edit tag name:", tag.name);
    if (!newName) return;
    tag.name = newName;
    renderAll();
    autoSave();
  }


  function deleteTag(tagId) {

  // 1️⃣ Remove all subtags first
  const subTagIds = state.tags
    .filter(tag => tag.parentId == tagId)
    .map(tag => tag.id);

  // Remove subtags from tag list
  state.tags = state.tags.filter(tag => tag.id != tagId && tag.parentId != tagId);

  // 2️⃣ Remove tag + subtag references from tasks
  state.tasks.forEach(task => {
    if (task.tagId == tagId || subTagIds.includes(task.tagId)) {
      task.tagId = null;
    }
  });
  autoSave();
  renderAll();
}

  function renderTags() {
  const container = document.getElementById("tagContent");
  container.innerHTML = "";

  state.tags
    .filter(tag => !tag.parentId)
    .forEach(parent => {

      const parentWrapper = document.createElement("div");
      parentWrapper.className = "tag-item";

      // ---------- Parent Header ----------
      const parentHeader = document.createElement("div");
      parentHeader.style.display = "flex";
      parentHeader.style.alignItems = "center";
      parentHeader.style.justifyContent = "space-between";
      parentHeader.style.cursor = "pointer";

      const title = document.createElement("span");
      title.textContent = parent.name;
      title.style.color = parent.color;
      title.style.fontWeight = "bold";

      const controls = document.createElement("span");

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.onclick = (e) => {
        e.stopPropagation();
        editTag(parent.id);
        autoSave();
      };

      const addSubBtn = document.createElement("button");
      addSubBtn.textContent = "➕";
      addSubBtn.onclick = (e) => {
        e.stopPropagation();
        addSubTag(parent.id);
        autoSave();
      };

      autoSave();

      // ---------- Delete button ----------
const deleteBtn = document.createElement("button");
deleteBtn.textContent = "🗑";
deleteBtn.className = "delete-btn";

deleteBtn.onclick = (e) => {
  e.stopPropagation();
  deleteTag(parent.id);
};

deleteBtn.className = "delete-btn";

      controls.appendChild(editBtn);
      controls.appendChild(addSubBtn);
      controls.appendChild(deleteBtn);

      parentHeader.appendChild(title);
      parentHeader.appendChild(controls);

      const parentContent = document.createElement("div");
      parentContent.style.display = "none";
      parentContent.style.marginLeft = "15px";

      parentHeader.onclick = () => {
        parentContent.style.display =
          parentContent.style.display === "none" ? "block" : "none";
      };

      // ---------- Parent Tasks ----------
      state.tasks
        .filter(task => task.tagId == parent.id)
        .forEach(task => {
          parentContent.appendChild(createTaskElement(task));
        });

      // ---------- Subtags ----------
      state.tags
        .filter(sub => sub.parentId == parent.id)
        .forEach(sub => {

          const subWrapper = document.createElement("div");
          subWrapper.style.marginTop = "5px";

          const subHeader = document.createElement("div");
          subHeader.style.display = "flex";
          subHeader.style.justifyContent = "space-between";
          subHeader.style.cursor = "pointer";

          const subTitle = document.createElement("span");
          subTitle.textContent = sub.name;
          subTitle.style.color = sub.color;
          subTitle.style.fontWeight = "bold";

          const subControls = document.createElement("span");

          const subEdit = document.createElement("button");
          subEdit.textContent = "✏️";
          subEdit.onclick = (e) => {
            e.stopPropagation();
            editTag(sub.id);
          };

          const subDelete = document.createElement("button");
          subDelete.textContent = "🗑";
          subDelete.onclick = (e) => {
            e.stopPropagation();
            deleteTag(sub.id);
          };

          subControls.appendChild(subEdit);
          subControls.appendChild(subDelete);

          subHeader.appendChild(subTitle);
          subHeader.appendChild(subControls);

          const subContent = document.createElement("div");
          subContent.style.display = "none";
          subContent.style.marginLeft = "15px";

          subHeader.onclick = () => {
            subContent.style.display =
              subContent.style.display === "none" ? "block" : "none";
          };

          state.tasks
            .filter(task => task.tagId == sub.id)
            .forEach(task => {
              subContent.appendChild(createTaskElement(task));
            });

          subWrapper.appendChild(subHeader);
          subWrapper.appendChild(subContent);
          parentContent.appendChild(subWrapper);
        });

      parentWrapper.appendChild(parentHeader);
      parentWrapper.appendChild(parentContent);
      container.appendChild(parentWrapper);
    });
}

  function populateTagSelect(select) {
    select.innerHTML = `<option value="">No Tag</option>`;
    state.tags.forEach(tag => {
      const opt = document.createElement("option");
      opt.value = tag.id;
      opt.textContent = tag.parentId ? "— " + tag.name : tag.name;
      select.appendChild(opt);
    });
  }

  // ---------- WEEK ----------
  function renderWeek() {
    const container = document.getElementById("weekContainer");
    container.innerHTML = "";

    days.forEach(day => {
      if (state.focusDay && state.focusDay !== day) return;
      const { currentDay, currentSection } = getCurrentTimeInfo();

      const dayDiv = document.createElement("div");
      dayDiv.className = "day";

      if (day === currentDay) {
  dayDiv.classList.add("current-day");
}

      const header = document.createElement("div");
header.className = "day-header";

const title = document.createElement("h2");
title.textContent = day;

header.appendChild(title);

// 👇 ADD THIS RIGHT HERE
const focusBtn = document.createElement("button");

if (state.focusDay === day) {
  focusBtn.textContent = "Exit Focus";
} else {
  focusBtn.textContent = "Focus";
}

focusBtn.onclick = () => {
  state.focusDay = state.focusDay === day ? null : day;
  renderAll();
};

header.appendChild(focusBtn);

      const canvas = document.createElement("canvas");
      canvas.width = 50;
      canvas.height = 50;
      drawPie(canvas, day);

      header.appendChild(title);
      header.appendChild(canvas);
      dayDiv.appendChild(header);

      sections.forEach(section => {

        const sec = document.createElement("div");
        sec.className = "time-section";
        if (day === currentDay && section === currentSection) {
  sec.classList.add("current-section");
}
        sec.innerHTML = `<h4>${section}</h4>`;
        sec.ondragover = e => e.preventDefault();
        sec.ondrop = e => dropTask(e, day, section);

        const taskContainer = document.createElement("div");
        taskContainer.className = "task-container";

        state.tasks
          .filter(t => t.type === "scheduled" && t.day === day && t.section === section)
          .forEach(t => taskContainer.appendChild(createTaskElement(t)));

        // ---------- Add Task Toggle Button ----------
const toggleBtn = document.createElement("button");
toggleBtn.textContent = "Add Task";

// ---------- Form ----------
const form = document.createElement("div");
form.className = "task-form";
form.style.display = "none"; // hidden by default

form.innerHTML = `
  <input placeholder="Task">
  <input type="time">
  <input type="time">
  <select></select>
  <button>Add</button>
`;

const [titleInput, startInput, endInput, tagSelect, addBtn] =
  form.querySelectorAll("input, select, button");

populateTagSelect(tagSelect);

// Toggle visibility
toggleBtn.onclick = () => {
  form.style.display =
    form.style.display === "none" ? "block" : "none";
};

// Add task
addBtn.onclick = () => {
  if (!titleInput.value) return;

  state.tasks.push({
    id: Date.now(),
    title: titleInput.value,
    type: "scheduled",
    day,
    section,
    start: startInput.value,
    end: endInput.value,
    tagId: tagSelect.value || null,
    description: "",
    completed: false
  });

  renderAll();
};

sec.appendChild(taskContainer);
sec.appendChild(toggleBtn);
sec.appendChild(form);
        dayDiv.appendChild(sec);
      });

      container.appendChild(dayDiv);
    });
  }

  // ---------- QUICK ----------
  function addQuickTask() {
    const title = document.getElementById("quickTitle").value;
    const tagId = document.getElementById("quickTagSelect").value;
    if (!title) return;

    state.tasks.push({
      id: Date.now(),
      title,
      type: "quick",
      tagId: tagId || null,
      description: "",
      completed: false,
      notes: ""
    });
    autoSave();
    document.getElementById("quickTitle").value = "";
    renderAll();
  }

  function renderQuickTasks() {
    const container = document.getElementById("quickTasks");
    container.innerHTML = "";

    state.tasks
      .filter(t => t.type === "quick")
      .forEach(t => container.appendChild(createTaskElement(t)));
  }

  // ---------- TASK ----------
  function createTaskElement(task) {
  const div = document.createElement("div");
  div.className = "task";
  div.draggable = true;
  // ---------- Tag badge or assign button ----------
if (task.tagId) {
  const tag = state.tags.find(t => t.id == task.tagId);
  if (tag) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.style.background = tag.color;
    badge.textContent = tag.name;
    badge.style.cursor = "pointer";

    const select = document.createElement("select");
    select.style.display = "none"; // hidden by default
    const noTagOption = document.createElement("option");
    noTagOption.value = "";
    noTagOption.textContent = "No Tag";
    select.appendChild(noTagOption);

    state.tags.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.parentId ? "— " + t.name : t.name;
      if (t.id == task.tagId) opt.selected = true;
      select.appendChild(opt);
    });

    badge.onclick = (e) => {
      e.stopPropagation(); // prevent anything else
      select.style.display = "inline-block";
      select.focus();
    };

    select.onchange = () => {
      task.tagId = select.value || null;
      renderAll(); // refresh so badge replaces old assign button
    };

    select.onblur = () => {
      select.style.display = "none";
    };

    div.appendChild(badge);
    div.appendChild(select);
  }
} else {
  // ---------- No tag button ----------
  const assignBtn = document.createElement("button");
  assignBtn.textContent = "🏷️"; // little tag emoji
  assignBtn.style.marginLeft = "5px";

  const select = document.createElement("select");
  select.style.display = "none";
  const noTagOption = document.createElement("option");
  noTagOption.value = "";
  noTagOption.textContent = "No Tag";
  select.appendChild(noTagOption);

  state.tags.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.parentId ? "— " + t.name : t.name;
    select.appendChild(opt);
  });

  assignBtn.onclick = (e) => {
    e.stopPropagation();
    select.style.display = "inline-block";
    select.focus();
  };

  select.onchange = () => {
    task.tagId = select.value || null;
    renderAll(); // refresh so now badge shows instead of button
  };

  select.onblur = () => {
    select.style.display = "none";
  };

  // ---------- Delete button ----------
const deleteBtn = document.createElement("button");
deleteBtn.textContent = "🗑"; 
deleteBtn.style.marginLeft = "6px";
deleteBtn.onclick = (e) => {
  e.stopPropagation();
  state.tasks = state.tasks.filter(t => t.id !== task.id);
  renderAll();
};

div.appendChild(deleteBtn);

  div.appendChild(assignBtn);
  div.appendChild(select);
}

  div.ondragstart = () => draggedTaskId = task.id;

  // ---------- Completion checkbox ----------
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.style.marginRight = "8px";

  checkbox.onchange = () => {
    task.completed = checkbox.checked;
    if (task.completed) {
      title.style.textDecoration = "line-through";
    } else {
      title.style.textDecoration = "none";
    }
    renderAll();
  };

  // ---------- Title ----------
  const title = document.createElement("span");
  title.textContent = task.title;
  if (task.completed) title.style.textDecoration = "line-through";

  div.appendChild(checkbox);
  div.appendChild(title);


  // ---------- Start/End times ----------
  if (task.start || task.end) {
    const time = document.createElement("div");
    time.style.fontSize = "12px";
    time.textContent = `${task.start || ""} - ${task.end || ""}`;
    div.appendChild(time);
  }

  // ---------- Notes button ----------
  const noteBtn = document.createElement("button");
  noteBtn.textContent = "Notes";

  const noteBox = document.createElement("div");
  noteBox.style.display = "none";

  const textarea = document.createElement("textarea");
  textarea.value = task.description;
  textarea.oninput = e => task.description = e.target.value;

  noteBox.appendChild(textarea);

  noteBtn.onclick = (e) => {
    e.stopPropagation();
    noteBox.style.display =
      noteBox.style.display === "none" ? "block" : "none";
  };

  div.appendChild(noteBtn);
  div.appendChild(noteBox);

  return div;
}

  function dropTask(e, day, section) {
    const task = state.tasks.find(t => t.id == draggedTaskId);
    if (!task) return;

    task.type = "scheduled";
    task.day = day;
    task.section = section;

    renderAll();
  }

  // ---------- PIE ----------
  function drawPie(canvas, day) {
    const ctx = canvas.getContext("2d");
    const dayTasks = state.tasks.filter(t => t.day === day);
    const completed = dayTasks.filter(t => t.completed).length;
    const percent = dayTasks.length ? completed / dayTasks.length : 0;

    ctx.clearRect(0,0,50,50);

    ctx.beginPath();
    ctx.moveTo(25,25);
    ctx.arc(25,25,20,0,2*Math.PI*percent);
    ctx.fillStyle = "#6e1990"; // completed tasks – purple
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(25,25);
    ctx.arc(25,25,20,2*Math.PI*percent,2*Math.PI);
    ctx.fillStyle = "#a364cd"; // incomplete tasks – soft green
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";
    ctx.fillText(Math.round(percent*100)+"%",12,30);
  }

  function getCurrentTimeInfo() {
  const now = new Date();

  const dayIndex = now.getDay(); 
  // JS: 0=Sunday ... 6=Saturday

  const dayMap = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday"
  };

  const currentDay = dayMap[dayIndex];

  const hour = now.getHours();

  let currentSection;
  if (hour < 12) {
    currentSection = "Morning";
  } else if (hour < 17) {
    currentSection = "Afternoon";
  } else {
    currentSection = "Evening";
  }

  return { currentDay, currentSection };
}

  // ---------- RESET ----------
  function resetWeek() {
    if (!confirm("Delete all scheduled tasks?")) return;
    state.tasks = state.tasks.filter(t => t.type !== "scheduled");
    renderAll();
  }

  function renderAll() {
    renderTags();
    renderWeek();
    renderQuickTasks();
    populateTagSelect(document.getElementById("quickTagSelect"));
  }

  return {
    init,
    addQuickTask,
    addParentTag
  };

})();

window.onload = App.init;


