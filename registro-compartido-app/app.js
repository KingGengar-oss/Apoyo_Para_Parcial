import { APP_CONFIG } from "./config.js";

const STORAGE_KEY = "registro-compartido-state-v1";
const SYNC_QUEUE_KEY = "registro-compartido-sync-queue-v1";
const CLIENT_ID_KEY = "registro-compartido-client-id-v1";
const channel = "BroadcastChannel" in window ? new BroadcastChannel("registro-compartido") : null;
const clientId = getClientId();

let syncQueue = loadSyncQueue();
let supabaseClient = null;
let remoteSubscription = null;

const defaultState = {
  workspaceName: "Despacho demo",
  role: "Administrador",
  selectedSheetId: "impuestos-2026",
  driveLinked: false,
  members: [
    {
      id: "m-ana",
      name: "Ana Martinez",
      role: "Administrador",
      email: "ana@demo.com",
      status: "Activo",
      updatedAt: "2026-08-24T16:10:00.000Z"
    },
    {
      id: "m-carlos",
      name: "Carlos Rivera",
      role: "Contador",
      email: "carlos@demo.com",
      status: "Activo",
      updatedAt: "2026-08-24T17:25:00.000Z"
    },
    {
      id: "m-lucia",
      name: "Lucia Gomez",
      role: "Cliente",
      email: "lucia@cliente.com",
      status: "Invitado",
      updatedAt: "2026-08-24T18:00:00.000Z"
    }
  ],
  sheets: [
    {
      id: "impuestos-2026",
      name: "Impuestos 2026",
      columns: ["Cliente", "NIT", "Mes", "IVA", "Renta", "Estado", "Notas"],
      rows: [
        ["Lucia Gomez", "0614-000000-101-0", "Agosto", "$240.00", "$110.00", "Pendiente", "Falta recibo"],
        ["Nova Cafe", "0614-000000-102-0", "Agosto", "$510.00", "$260.00", "Pagado", "Archivado"],
        ["Taller Norte", "0614-000000-103-0", "Julio", "$145.00", "$88.00", "Revision", "Confirmar deducciones"]
      ],
      updatedBy: "Ana Martinez",
      updatedAt: "2026-08-24T18:05:00.000Z"
    },
    {
      id: "documentos",
      name: "Documentos pendientes",
      columns: ["Cliente", "Documento", "Responsable", "Fecha limite", "Estado"],
      rows: [
        ["Lucia Gomez", "DUI representante", "Carlos Rivera", "2026-08-30", "Pendiente"],
        ["Nova Cafe", "Facturas compras", "Ana Martinez", "2026-08-28", "Recibido"]
      ],
      updatedBy: "Carlos Rivera",
      updatedAt: "2026-08-24T17:48:00.000Z"
    }
  ],
  files: [
    {
      id: "f-recibo",
      name: "recibo-iva-agosto.csv",
      type: "text/csv",
      size: 12800,
      memberId: "m-lucia",
      createdAt: "2026-08-24T18:02:00.000Z"
    }
  ],
  audit: [
    {
      id: "a-1",
      text: "Ana actualizo Impuestos 2026",
      detail: "Estado de Nova Cafe marcado como Pagado",
      at: "2026-08-24T18:05:00.000Z"
    },
    {
      id: "a-2",
      text: "Carlos cargo recibo-iva-agosto.csv",
      detail: "Compartido con Lucia Gomez",
      at: "2026-08-24T18:02:00.000Z"
    }
  ]
};

let state = loadState();
let deferredInstallPrompt = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  workspaceName: $("#workspaceName"),
  pageTitle: $("#pageTitle"),
  todayLabel: $("#todayLabel"),
  statusDot: $("#statusDot"),
  syncLabel: $("#syncLabel"),
  syncDetail: $("#syncDetail"),
  activeMembers: $("#activeMembers"),
  tableCount: $("#tableCount"),
  fileCount: $("#fileCount"),
  lastEdit: $("#lastEdit"),
  activityList: $("#activityList"),
  recentSheets: $("#recentSheets"),
  tableSearch: $("#tableSearch"),
  sheetPicker: $("#sheetPicker"),
  sheetNameLabel: $("#sheetNameLabel"),
  sheetUpdatedLabel: $("#sheetUpdatedLabel"),
  dataTable: $("#dataTable"),
  memberSearch: $("#memberSearch"),
  memberRoleFilter: $("#memberRoleFilter"),
  membersGrid: $("#membersGrid"),
  fileSearch: $("#fileSearch"),
  fileMemberFilter: $("#fileMemberFilter"),
  filesList: $("#filesList"),
  workspaceInput: $("#workspaceInput"),
  roleInput: $("#roleInput"),
  driveBadge: $("#driveBadge"),
  driveLabel: $("#driveLabel"),
  backendModeLabel: $("#backendModeLabel"),
  workspaceIdLabel: $("#workspaceIdLabel"),
  pendingSyncLabel: $("#pendingSyncLabel"),
  dialog: $("#quickDialog"),
  dialogTitle: $("#dialogTitle"),
  dialogFields: $("#dialogFields"),
  dialogConfirm: $("#dialogConfirm"),
  installBtn: $("#installBtn")
};

init();

function init() {
  bindEvents();
  updateNetworkState();
  renderAll();
  registerWorker();
  connectRemoteBackend();
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState({ silent = false, enqueue = true } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!silent) {
    if (enqueue) queueSnapshot();
    channel?.postMessage({ type: "state", state });
  }
}

function addAudit(text, detail = "") {
  state.audit.unshift({ id: crypto.randomUUID(), text, detail, at: new Date().toISOString() });
  state.audit = state.audit.slice(0, 40);
}

function bindEvents() {
  $$(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => openView(button.dataset.view));
  });

  $$("[data-open-view]").forEach((button) => {
    button.addEventListener("click", () => openView(button.dataset.openView));
  });

  $("#newSheetBtn").addEventListener("click", createSheet);
  $("#seedBtn").addEventListener("click", restoreDemo);
  $("#renameSheetBtn").addEventListener("click", renameSheet);
  $("#addColumnBtn").addEventListener("click", addColumn);
  $("#addRowBtn").addEventListener("click", addRow);
  $("#exportCsvBtn").addEventListener("click", exportSelectedCsv);
  $("#csvInput").addEventListener("change", importCsv);
  $("#addMemberBtn").addEventListener("click", addMember);
  $("#fileInput").addEventListener("change", addFiles);
  $("#saveSettingsBtn").addEventListener("click", saveSettings);
  $("#toggleDriveBtn").addEventListener("click", toggleDrive);
  $("#syncNowBtn").addEventListener("click", syncNow);
  $("#exportBackupBtn").addEventListener("click", exportBackup);
  $("#backupInput").addEventListener("change", importBackup);
  $("#clearAuditBtn").addEventListener("click", clearAudit);

  els.tableSearch.addEventListener("input", renderTable);
  els.sheetPicker.addEventListener("change", () => {
    state.selectedSheetId = els.sheetPicker.value;
    saveState();
    renderAll();
  });
  els.memberSearch.addEventListener("input", renderMembers);
  els.memberRoleFilter.addEventListener("change", renderMembers);
  els.fileSearch.addEventListener("input", renderFiles);
  els.fileMemberFilter.addEventListener("change", renderFiles);

  window.addEventListener("online", updateNetworkState);
  window.addEventListener("online", syncNow);
  window.addEventListener("offline", updateNetworkState);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installBtn.hidden = false;
  });
  els.installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installBtn.hidden = true;
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    state = JSON.parse(event.newValue);
    renderAll();
  });
  channel?.addEventListener("message", (event) => {
    if (event.data?.type !== "state") return;
    state = event.data.state;
    saveState({ silent: true });
    renderAll();
  });
}

function openView(viewName) {
  $$(".nav-tab").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}View`));
  const titles = {
    dashboard: "Inicio",
    tables: "Tablas",
    members: "Miembros",
    files: "Archivos",
    settings: "Ajustes"
  };
  els.pageTitle.textContent = titles[viewName] || "Inicio";
}

function updateNetworkState() {
  const online = navigator.onLine;
  els.statusDot.classList.toggle("offline", !online);
  refreshSyncStatus();
}

function renderAll() {
  ensureSelectedSheet();
  els.workspaceName.textContent = state.workspaceName;
  els.todayLabel.textContent = new Intl.DateTimeFormat("es-SV", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(new Date());
  renderDashboard();
  renderSheetPicker();
  renderTable();
  renderMembers();
  renderFiles();
  renderSettings();
}

function renderDashboard() {
  els.activeMembers.textContent = state.members.filter((member) => member.status === "Activo").length;
  els.tableCount.textContent = state.sheets.length;
  els.fileCount.textContent = state.files.length;
  const latest = [...state.sheets].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
  els.lastEdit.textContent = latest ? relativeTime(latest.updatedAt) : "-";

  els.activityList.innerHTML = state.audit.length
    ? state.audit
        .slice(0, 7)
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.text)}</strong>
              <span>${escapeHtml(item.detail)} · ${relativeTime(item.at)}</span>
            </li>
          `
        )
        .join("")
    : `<li><strong>Sin actividad</strong><span>Los cambios apareceran aqui.</span></li>`;

  els.recentSheets.innerHTML = [...state.sheets]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)
    .map(
      (sheet) => `
        <article class="recent-sheet">
          <div>
            <strong>${escapeHtml(sheet.name)}</strong>
            <span>${sheet.rows.length} filas · ${escapeHtml(sheet.updatedBy)}</span>
          </div>
          <button class="ghost-button" data-sheet-id="${sheet.id}" type="button">Ver</button>
        </article>
      `
    )
    .join("");

  els.recentSheets.querySelectorAll("[data-sheet-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSheetId = button.dataset.sheetId;
      saveState();
      renderAll();
      openView("tables");
    });
  });
}

function renderSheetPicker() {
  els.sheetPicker.innerHTML = state.sheets
    .map((sheet) => `<option value="${sheet.id}">${escapeHtml(sheet.name)}</option>`)
    .join("");
  els.sheetPicker.value = state.selectedSheetId;
}

function renderTable() {
  const sheet = selectedSheet();
  if (!sheet) {
    els.dataTable.innerHTML = "";
    return;
  }
  const query = normalize(els.tableSearch.value);
  const rows = sheet.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => normalize(row.join(" ")).includes(query));

  els.sheetNameLabel.textContent = sheet.name;
  els.sheetUpdatedLabel.textContent = `Editado por ${sheet.updatedBy} · ${relativeTime(sheet.updatedAt)}`;
  els.dataTable.innerHTML = `
    <thead>
      <tr>
        ${sheet.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          ({ row, index }) => `
            <tr>
              ${sheet.columns
                .map(
                  (_, colIndex) =>
                    `<td contenteditable="true" data-row="${index}" data-col="${colIndex}">${escapeHtml(row[colIndex] || "")}</td>`
                )
                .join("")}
              <td><button class="row-delete" data-delete-row="${index}" type="button" title="Borrar fila">x</button></td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;

  els.dataTable.querySelectorAll("td[contenteditable='true']").forEach((cell) => {
    cell.addEventListener("blur", () => updateCell(cell));
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        cell.blur();
      }
    });
  });

  els.dataTable.querySelectorAll("[data-delete-row]").forEach((button) => {
    button.addEventListener("click", () => deleteRow(Number(button.dataset.deleteRow)));
  });
}

function renderMembers() {
  const query = normalize(els.memberSearch.value);
  const role = els.memberRoleFilter.value;
  const members = state.members.filter((member) => {
    const matchesQuery = normalize(`${member.name} ${member.role} ${member.email}`).includes(query);
    const matchesRole = !role || member.role === role;
    return matchesQuery && matchesRole;
  });

  els.membersGrid.innerHTML = members
    .map(
      (member) => `
        <article class="member-card">
          <div class="member-top">
            <div class="member-avatar">${escapeHtml(initials(member.name))}</div>
            <span class="badge">${escapeHtml(member.status)}</span>
          </div>
          <div class="member-info">
            <strong>${escapeHtml(member.name)}</strong>
            <span>${escapeHtml(member.email)}</span>
          </div>
          <span>${escapeHtml(member.role)} · ${relativeTime(member.updatedAt)}</span>
        </article>
      `
    )
    .join("");
}

function renderFiles() {
  const selectedMemberId = els.fileMemberFilter.value || els.fileMemberFilter.dataset.value || "";
  els.fileMemberFilter.innerHTML = `<option value="">Todos los miembros</option>${state.members
    .map((member) => `<option value="${member.id}">${escapeHtml(member.name)}</option>`)
    .join("")}`;
  els.fileMemberFilter.value = selectedMemberId;

  const query = normalize(els.fileSearch.value);
  const memberId = els.fileMemberFilter.value;
  els.fileMemberFilter.dataset.value = memberId;
  const files = state.files.filter((file) => {
    const member = memberName(file.memberId);
    const matchesQuery = normalize(`${file.name} ${file.type} ${member}`).includes(query);
    const matchesMember = !memberId || file.memberId === memberId;
    return matchesQuery && matchesMember;
  });

  els.filesList.innerHTML = files.length
    ? files
        .map(
          (file) => `
            <article class="file-row">
              <div class="file-main">
                <strong>${escapeHtml(file.name)}</strong>
                <span>${escapeHtml(memberName(file.memberId))} · ${formatBytes(file.size)} · ${relativeTime(file.createdAt)}</span>
              </div>
              <div class="file-actions">
                <button class="ghost-button" data-share-file="${file.id}" type="button">Compartir</button>
                <button class="ghost-button" data-delete-file="${file.id}" type="button">Borrar</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<article class="file-row"><div class="file-main"><strong>Sin archivos</strong><span>Los archivos locales apareceran aqui.</span></div></article>`;

  els.filesList.querySelectorAll("[data-share-file]").forEach((button) => {
    button.addEventListener("click", () => shareFile(button.dataset.shareFile));
  });
  els.filesList.querySelectorAll("[data-delete-file]").forEach((button) => {
    button.addEventListener("click", () => deleteFile(button.dataset.deleteFile));
  });
}

function renderSettings() {
  els.workspaceInput.value = state.workspaceName;
  els.roleInput.value = state.role;
  els.driveBadge.textContent = state.driveLinked ? "Drive" : "Local";
  els.driveLabel.textContent = state.driveLinked ? "Cuenta simulada vinculada" : "No vinculado";
  els.backendModeLabel.textContent = isSupabaseConfigured() ? "Supabase configurado" : "Modo local";
  els.workspaceIdLabel.textContent = APP_CONFIG.workspaceId;
  els.pendingSyncLabel.textContent = `${syncQueue.length} cambio${syncQueue.length === 1 ? "" : "s"} pendiente${syncQueue.length === 1 ? "" : "s"}`;
}

function selectedSheet() {
  return state.sheets.find((sheet) => sheet.id === state.selectedSheetId);
}

function ensureSelectedSheet() {
  if (!selectedSheet() && state.sheets[0]) {
    state.selectedSheetId = state.sheets[0].id;
  }
}

function touchSheet(sheet, action) {
  sheet.updatedAt = new Date().toISOString();
  sheet.updatedBy = "Usuario actual";
  addAudit(action, sheet.name);
  saveState();
  renderAll();
}

function createSheet() {
  openDialog("Nueva tabla", [
    { id: "name", label: "Nombre", value: "Nueva tabla" },
    { id: "columns", label: "Columnas", value: "Cliente, Mes, Estado, Notas" }
  ]).then((values) => {
    if (!values) return;
    const columns = values.columns.split(",").map((item) => item.trim()).filter(Boolean);
    const sheet = {
      id: crypto.randomUUID(),
      name: values.name.trim() || "Nueva tabla",
      columns: columns.length ? columns : ["Cliente", "Estado"],
      rows: [],
      updatedBy: "Usuario actual",
      updatedAt: new Date().toISOString()
    };
    state.sheets.push(sheet);
    state.selectedSheetId = sheet.id;
    addAudit("Nueva tabla creada", sheet.name);
    saveState();
    renderAll();
    openView("tables");
  });
}

function renameSheet() {
  const sheet = selectedSheet();
  if (!sheet) return;
  openDialog("Renombrar tabla", [{ id: "name", label: "Nombre", value: sheet.name }]).then((values) => {
    if (!values) return;
    sheet.name = values.name.trim() || sheet.name;
    touchSheet(sheet, "Tabla renombrada");
  });
}

function addColumn() {
  const sheet = selectedSheet();
  if (!sheet) return;
  openDialog("Nueva columna", [{ id: "name", label: "Nombre", value: "Nuevo campo" }]).then((values) => {
    if (!values) return;
    sheet.columns.push(values.name.trim() || "Nuevo campo");
    sheet.rows.forEach((row) => row.push(""));
    touchSheet(sheet, "Columna agregada");
  });
}

function addRow() {
  const sheet = selectedSheet();
  if (!sheet) return;
  sheet.rows.push(sheet.columns.map(() => ""));
  touchSheet(sheet, "Fila agregada");
}

function updateCell(cell) {
  const sheet = selectedSheet();
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  const nextValue = cell.textContent.trim();
  if (sheet.rows[row][col] === nextValue) return;
  sheet.rows[row][col] = nextValue;
  touchSheet(sheet, "Celda actualizada");
}

function deleteRow(rowIndex) {
  const sheet = selectedSheet();
  if (!sheet) return;
  sheet.rows.splice(rowIndex, 1);
  touchSheet(sheet, "Fila borrada");
}

function importCsv(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result));
    if (!rows.length) return;
    const sheet = selectedSheet();
    sheet.columns = rows[0];
    sheet.rows = rows.slice(1);
    touchSheet(sheet, "CSV importado");
    event.target.value = "";
  };
  reader.readAsText(file);
}

function exportSelectedCsv() {
  const sheet = selectedSheet();
  if (!sheet) return;
  const csv = [sheet.columns, ...sheet.rows].map((row) => row.map(csvCell).join(",")).join("\n");
  download(`${safeName(sheet.name)}.csv`, csv, "text/csv");
}

function addMember() {
  openDialog("Nuevo miembro", [
    { id: "name", label: "Nombre", value: "" },
    { id: "email", label: "Correo", value: "" },
    { id: "role", label: "Rol", value: "Cliente" }
  ]).then((values) => {
    if (!values) return;
    state.members.push({
      id: crypto.randomUUID(),
      name: values.name.trim() || "Nuevo miembro",
      email: values.email.trim() || "sin-correo@demo.local",
      role: values.role.trim() || "Cliente",
      status: "Invitado",
      updatedAt: new Date().toISOString()
    });
    addAudit("Miembro agregado", values.name);
    saveState();
    renderAll();
  });
}

function addFiles(event) {
  const files = [...event.target.files];
  if (!files.length) return;
  const memberId = state.members[0]?.id || "";
  files.forEach((file) => {
    state.files.unshift({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || "archivo",
      size: file.size,
      memberId,
      createdAt: new Date().toISOString()
    });
    addAudit("Archivo cargado", file.name);
  });
  event.target.value = "";
  saveState();
  renderAll();
}

function shareFile(fileId) {
  const file = state.files.find((item) => item.id === fileId);
  if (!file) return;
  openDialog(
    "Compartir archivo",
    [{ id: "member", label: "Miembro destino", value: state.members[0]?.name || "" }]
  ).then((values) => {
    if (!values) return;
    addAudit("Archivo compartido", `${file.name} -> ${values.member}`);
    saveState();
    renderAll();
  });
}

function deleteFile(fileId) {
  const file = state.files.find((item) => item.id === fileId);
  state.files = state.files.filter((item) => item.id !== fileId);
  addAudit("Archivo borrado", file?.name || "");
  saveState();
  renderAll();
}

function saveSettings() {
  state.workspaceName = els.workspaceInput.value.trim() || "Despacho demo";
  state.role = els.roleInput.value;
  addAudit("Ajustes guardados", state.workspaceName);
  saveState();
  renderAll();
}

function toggleDrive() {
  state.driveLinked = !state.driveLinked;
  addAudit(state.driveLinked ? "Drive vinculado" : "Drive desconectado", "Simulacion local");
  saveState();
  renderAll();
}

function exportBackup() {
  download("registro-compartido-respaldo.json", JSON.stringify(state, null, 2), "application/json");
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = JSON.parse(String(reader.result));
      addAudit("Respaldo cargado", file.name);
      saveState();
      renderAll();
    } catch {
      alert("El respaldo no se pudo leer.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function clearAudit() {
  state.audit = [];
  saveState();
  renderAll();
}

function restoreDemo() {
  state = structuredClone(defaultState);
  saveState();
  renderAll();
}

function isSupabaseConfigured() {
  return Boolean(
    APP_CONFIG.backend === "supabase" &&
      APP_CONFIG.supabase?.url &&
      APP_CONFIG.supabase?.anonKey &&
      !APP_CONFIG.supabase.url.includes("TU-PROYECTO") &&
      !APP_CONFIG.supabase.anonKey.includes("TU-ANON-KEY")
  );
}

function refreshSyncStatus(message = "") {
  const online = navigator.onLine;
  const configured = isSupabaseConfigured();
  els.statusDot.classList.toggle("offline", !online || syncQueue.length > 0);

  if (!online) {
    els.syncLabel.textContent = "Sin conexion";
    els.syncDetail.textContent = `${syncQueue.length} cambio(s) guardado(s) localmente`;
  } else if (!configured) {
    els.syncLabel.textContent = "Modo local";
    els.syncDetail.textContent = "Configura Supabase para compartir en tiempo real";
  } else if (syncQueue.length > 0) {
    els.syncLabel.textContent = "Pendiente";
    els.syncDetail.textContent = message || `${syncQueue.length} cambio(s) por sincronizar`;
  } else {
    els.syncLabel.textContent = "Sincronizado";
    els.syncDetail.textContent = message || "Supabase listo";
  }

  if (els.pendingSyncLabel) {
    els.pendingSyncLabel.textContent = `${syncQueue.length} cambio${syncQueue.length === 1 ? "" : "s"} pendiente${syncQueue.length === 1 ? "" : "s"}`;
  }
}

function getClientId() {
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

function loadSyncQueue() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

function persistSyncQueue() {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  refreshSyncStatus();
}

function queueSnapshot() {
  syncQueue = [
    {
      id: "latest-snapshot",
      type: "workspace_snapshot",
      createdAt: new Date().toISOString(),
      payload: state
    }
  ];
  persistSyncQueue();
  if (isSupabaseConfigured() && navigator.onLine) {
    syncNow();
  }
}

async function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (supabaseClient) return supabaseClient;
  const { createClient } = await import(APP_CONFIG.supabase.cdnUrl);
  supabaseClient = createClient(APP_CONFIG.supabase.url, APP_CONFIG.supabase.anonKey);
  return supabaseClient;
}

async function connectRemoteBackend() {
  refreshSyncStatus();
  if (!isSupabaseConfigured()) return;
  await pullRemoteState();
  subscribeToRemoteChanges();
  await syncNow();
}

async function pullRemoteState() {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("workspace_snapshots")
      .select("payload")
      .eq("workspace_id", APP_CONFIG.workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.payload) return;
    state = data.payload;
    saveState({ silent: true, enqueue: false });
    renderAll();
    refreshSyncStatus("Datos remotos cargados");
  } catch (error) {
    refreshSyncStatus("No se pudo cargar Supabase");
    console.warn("Supabase pull failed", error);
  }
}

function subscribeToRemoteChanges() {
  if (remoteSubscription || !supabaseClient) return;
  remoteSubscription = supabaseClient
    .channel(`workspace-${APP_CONFIG.workspaceId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "workspace_snapshots",
        filter: `workspace_id=eq.${APP_CONFIG.workspaceId}`
      },
      (payload) => {
        if (payload.new?.source_client_id === clientId || !payload.new?.payload) return;
        state = payload.new.payload;
        saveState({ silent: true, enqueue: false });
        renderAll();
        refreshSyncStatus("Cambio recibido en tiempo real");
      }
    )
    .subscribe();
}

async function syncNow() {
  if (!isSupabaseConfigured() || !navigator.onLine || syncQueue.length === 0) {
    refreshSyncStatus();
    return;
  }
  try {
    refreshSyncStatus("Sincronizando...");
    const supabase = await getSupabaseClient();
    const latest = syncQueue[syncQueue.length - 1];
    const { error } = await supabase.from("workspace_snapshots").upsert({
      workspace_id: APP_CONFIG.workspaceId,
      payload: latest.payload,
      source_client_id: clientId,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    syncQueue = [];
    persistSyncQueue();
    refreshSyncStatus("Cambios enviados");
  } catch (error) {
    refreshSyncStatus("Sincronizacion pendiente");
    console.warn("Supabase sync failed", error);
  }
}

function openDialog(title, fields) {
  els.dialogTitle.textContent = title;
  els.dialogFields.innerHTML = fields
    .map(
      (field) => `
        <label class="field">
          <span>${escapeHtml(field.label)}</span>
          <input name="${escapeHtml(field.id)}" value="${escapeHtml(field.value)}" />
        </label>
      `
    )
    .join("");

  return new Promise((resolve) => {
    const handleClose = () => {
      els.dialog.removeEventListener("close", handleClose);
      if (els.dialog.returnValue !== "confirm") {
        resolve(null);
        return;
      }
      const formData = new FormData(els.dialog.querySelector("form"));
      resolve(Object.fromEntries(formData.entries()));
    };
    els.dialog.addEventListener("close", handleClose);
    els.dialog.showModal();
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((line) => line.some((value) => value.trim()));
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function memberName(memberId) {
  return state.members.find((member) => member.id === memberId)?.name || "Sin asignar";
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function relativeTime(dateValue) {
  const diff = Date.now() - new Date(dateValue).getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function safeName(name) {
  return normalize(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tabla";
}

function registerWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
