/*****************************************************
 *  BLOQUE 1 - SUPABASE, UTILIDADES, SESIÓN, INIT
 *****************************************************/

// === CONFIGURACIÓN SUPABASE ===
const SUPABASE_URL = "https://gntwqahvwwvkwhkdowwh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdudHdxYWh2d3d2a3doa2Rvd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc0NjQsImV4cCI6MjA3OTgyMzQ2NH0.qAgbzFmnG5136V1pTStF_hW7jKaAzoIlSYoWt2qxM9E";

// === CLIENTE SUPABASE GLOBAL ===
(function initSupabaseClient() {
  try {
    // Si ya existe window.supabase (creado en el HTML) lo respetamos
    if (window.supabase && typeof window.supabase.from === "function") {
      console.log("✅ Supabase ya estaba inicializado desde el HTML");
      return;
    }
    if (typeof supabase !== "undefined" && supabase.createClient) {
      window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("✅ Supabase inicializado correctamente (desde script.js)");
    } else {
      console.error("❌ No se encontró el script de Supabase en el HTML");
    }
  } catch (err) {
    console.error("Error inicializando Supabase:", err);
  }
})();

// === COOKIES ===
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/`;
}
function getCookie(name) {
  return document.cookie.split("; ").reduce((a, c) => {
    const [k, v] = c.split("=");
    return k === name ? decodeURIComponent(v) : a;
  }, "");
}
function eraseCookie(name) {
  setCookie(name, "", -1);
}

// === ESTADO GLOBAL ===
let currentUser = null;
let contacts = [];
let clients = [];

// === UTILIDADES DE UI ===
function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}
function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

/* ===================================================
   HELPERS (faltaban en tu código y el mapa los usa)
=================================================== */
function looseEquals(a, b) {
  const A = (a ?? "").toString().trim().toLowerCase();
  const B = (b ?? "").toString().trim().toLowerCase();
  return A === B;
}

/*****************************************************
 *  CLIENTES - SEGMENTACIÓN
 *****************************************************/

const CLIENT_SEGMENTS = {
  REPARTIDORES: "Repartidores",
  ALMACEN: "Almacen / supermercado",
  NEGOCIO: "Negocio",
  B2B: "B2B",
};

const SEGMENT_COLORS = {
  [CLIENT_SEGMENTS.REPARTIDORES]: "#1e88e5", // azul
  [CLIENT_SEGMENTS.ALMACEN]: "#43a047", // verde
  [CLIENT_SEGMENTS.NEGOCIO]: "#fb8c00", // naranja
  [CLIENT_SEGMENTS.B2B]: "#8e24aa", // violeta
};

function getSegmentColor(segment) {
  return SEGMENT_COLORS[segment] || "#607d8b"; // gris fallback
}

function normalizeSegment(raw) {
  const s = (raw || "").toString().trim();
  return Object.values(CLIENT_SEGMENTS).includes(s) ? s : "";
}

/* ===================================================
   COLOR FINAL PARA MAPA
   - 1) segmento si existe
   - 2) fallback por type
=================================================== */
function getTypeColor(type) {
  const t = (type || "").toString().trim().toLowerCase();
  if (t === "distribuidor") return "#1e88e5"; // azul
  if (t === "retail") return "#43a047"; // verde
  return "#607d8b"; // gris
}

function getClientColor(client) {
  const seg = normalizeSegment(client?.segment);
  if (seg) return getSegmentColor(seg);
  return getTypeColor(client?.type);
}

// Rellena selects si existen (alta/edición/filtro)
function hydrateSegmentSelects() {
  const ids = ["client-segment", "edit-client-segment", "filter-client-segment"];
  ids.forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel || sel.dataset.hydrated === "1") return;

    const hasBlank = !!sel.querySelector("option[value='']");
    const firstText = hasBlank
      ? sel.querySelector("option[value='']").textContent
      : "Seleccionar";

    sel.innerHTML = `<option value="">${firstText || "Seleccionar"}</option>`;

    Object.values(CLIENT_SEGMENTS).forEach((seg) => {
      const opt = document.createElement("option");
      opt.value = seg;
      opt.textContent = seg;
      sel.appendChild(opt);
    });

    sel.dataset.hydrated = "1";
  });
}

// === CONTROL DE PANTALLAS ===
function showSection(sectionId) {
  const screens = ["login-screen", "password-change-screen", "app-screen"];
  screens.forEach((id) => hideElement(id));

  // Si es una de las pantallas principales
  if (screens.includes(sectionId)) {
    const el = document.getElementById(sectionId);
    if (el) {
      if (sectionId === "app-screen") {
        el.style.display = "block";
      } else {
        el.style.display = "flex";
      }
    }
    return;
  }

  const app = document.getElementById("app-screen");
  if (!app) return;
  app.style.display = "block";

  const sections = [
    "dashboard",
    "form-contact",
    "list-contacts",
    "form-client",
    "list-clients",
    "map-section",
    "reports",
  ];
  sections.forEach((id) => hideElement(id));

  const realId = sectionId === "map" ? "map-section" : sectionId;
  showElement(realId);

  if (realId === "reports" && typeof generateReports === "function")
    generateReports();

  // ✅ FIX CLAVE: NO reiniciar mapa con timeouts cada vez que entrás
  if (realId === "map-section" && typeof initLeafletMap === "function") {
    initLeafletMap();
  }
}

// === SESIONES ===
async function createSession(user) {
  const token = crypto.randomUUID();
  setCookie("granja_session", token, 7);
  try {
    await window.supabase.from("sessions").insert({ token, user_id: user.username });
  } catch (e) {
    console.error("createSession error:", e);
  }
}
async function clearSession() {
  const token = getCookie("granja_session");
  eraseCookie("granja_session");
  if (token) await window.supabase.from("sessions").delete().eq("token", token);
}
async function restoreSessionFromCookie() {
  const token = getCookie("granja_session");
  if (!token) return;
  try {
    const { data: s } = await window.supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .limit(1);
    if (!s?.length) return;

    const { data: u } = await window.supabase
      .from("users")
      .select("*")
      .eq("username", s[0].user_id)
      .limit(1);

    if (u?.length) currentUser = u[0];
  } catch (e) {
    console.error("restoreSessionFromCookie error:", e);
  }
}

// === CARGA DE DATOS ===
async function loadContactsFromDB() {
  try {
    const { data, error } = await window.supabase
      .from("commercial_contacts")
      .select("*")
      .order("fecha", { ascending: true });
    if (error) throw error;
    contacts = data || [];
  } catch (e) {
    console.error("loadContactsFromDB error:", e);
  }
}
async function loadClientsFromDB() {
  try {
    const { data, error } = await window.supabase
      .from("commercial_clients")
      .select("*")
      .order("company", { ascending: true });
    if (error) throw error;
    clients = data || [];
  } catch (e) {
    console.error("loadClientsFromDB error:", e);
  }
}

// === INIT PRINCIPAL ===
async function initApp() {
  console.log("🚀 Init started");
  showSection("login-screen");

  hydrateSegmentSelects();

  const fechaInput = document.getElementById("fecha");
  if (fechaInput) fechaInput.valueAsDate = new Date();

  await loadContactsFromDB();
  await loadClientsFromDB();
  await restoreSessionFromCookie();

  const userSpan = document.getElementById("current-user");
  if (currentUser && userSpan)
    userSpan.textContent = currentUser.name || currentUser.username;

  if (currentUser) {
    showSection("app-screen");
    showSection("dashboard");
    if (typeof updateDashboard === "function") updateDashboard();
    if (typeof renderContactsList === "function") renderContactsList();
    if (typeof renderClientsList === "function") renderClientsList();
  } else {
    showSection("login-screen");
  }

  if (typeof setupEventListeners === "function") setupEventListeners();
  console.log("✅ Init complete");
}

/*****************************************************
 *  BLOQUE 2 - LOGIN, PASSWORD, CONTACTOS
 *****************************************************/

// === LOGIN ===
async function handleLogin(e) {
  e.preventDefault();
  const db = window.supabase;
  if (!db) return alert("Supabase no está disponible");

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("login-error");

  const username = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value.trim() : "";

  if (!username || !password) {
    if (errorBox) {
      errorBox.textContent = "Completa usuario y contraseña";
      errorBox.style.display = "block";
    } else alert("Completa usuario y contraseña");
    return;
  }

  try {
    const { data: userRows, error } = await db
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .limit(1);

    if (error || !userRows?.length) {
      if (errorBox) {
        errorBox.textContent = "Usuario o contraseña incorrectos";
        errorBox.style.display = "block";
      } else alert("Usuario o contraseña incorrectos");
      return;
    }

    currentUser = userRows[0];
    await createSession(currentUser);

    const currentUserSpan = document.getElementById("current-user");
    if (currentUserSpan) currentUserSpan.textContent = currentUser.name || currentUser.username;

    if (currentUser.first_login) {
      showSection("password-change-screen");
    } else {
      showSection("app-screen");
      showSection("dashboard");
      updateDashboard();
      renderContactsList();
      renderClientsList();
    }
  } catch (e) {
    console.error("Error en login:", e);
    if (errorBox) {
      errorBox.textContent = "Error al conectar con la base de datos";
      errorBox.style.display = "block";
    } else alert("Error al conectar con la base de datos");
  }
}

// === CAMBIO DE CONTRASEÑA ===
async function handlePasswordChange(e) {
  e.preventDefault();
  const db = window.supabase;
  if (!db || !currentUser) return;

  const newPwdInput = document.getElementById("new-password");
  const confirmInput = document.getElementById("confirm-password");
  const errorBox = document.getElementById("password-error");

  const newPwd = newPwdInput ? newPwdInput.value.trim() : "";
  const confirmPwd = confirmInput ? confirmInput.value.trim() : "";

  if (!newPwd || newPwd.length < 6 || newPwd !== confirmPwd) {
    if (errorBox) {
      errorBox.textContent =
        "Las contraseñas no coinciden o son muy cortas (mínimo 6 caracteres)";
      errorBox.style.display = "block";
    } else alert("Las contraseñas no coinciden o son muy cortas");
    return;
  }

  try {
    const { error } = await db
      .from("users")
      .update({ password: newPwd, first_login: false })
      .eq("username", currentUser.username);

    if (error) throw error;

    currentUser.first_login = false;

    showSection("app-screen");
    showSection("dashboard");
    updateDashboard();
    renderContactsList();
    renderClientsList();
  } catch (e) {
    console.error("Error cambiando contraseña:", e);
    if (errorBox) {
      errorBox.textContent = "Error al cambiar la contraseña";
      errorBox.style.display = "block";
    } else alert("Error al cambiar la contraseña");
  }
}

// === LOGOUT ===
async function logout() {
  await clearSession();
  currentUser = null;
  showSection("login-screen");
}

// === EVENT LISTENERS GENERALES ===
function setupEventListeners() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const pwdForm = document.getElementById("password-change-form");
  if (pwdForm) pwdForm.addEventListener("submit", handlePasswordChange);

  const contactForm = document.getElementById("contact-form");
  if (contactForm) contactForm.addEventListener("submit", handleContactSubmit);

  const clientForm = document.getElementById("client-form");
  if (clientForm) clientForm.addEventListener("submit", handleClientSubmit);

  const editContactForm = document.getElementById("edit-contact-form");
  if (editContactForm) editContactForm.addEventListener("submit", handleEditContactSubmit);

  const editClientForm = document.getElementById("edit-client-form");
  if (editClientForm) editClientForm.addEventListener("submit", handleEditClientSubmit);

  hydrateSegmentSelects();
}

/* ====== CONTACTOS ====== */
async function handleContactSubmit(e) {
  e.preventDefault();
  if (!currentUser) return alert("Sesión expirada, vuelve a iniciar sesión");

  const form = e.target;
  const formData = new FormData(form);

  const contact = {
    fecha: formData.get("fecha") || null,
    vendedor: formData.get("vendedor") || "",
    cliente: formData.get("cliente") || "",
    empresa: formData.get("empresa") || "",
    telefono: formData.get("telefono") || "",
    email: formData.get("email") || "",
    producto: formData.get("Producto") || "",
    estado: formData.get("estado") || "",
    cliente_derivado: formData.get("cliente-derivado") || "",
    motivo: formData.get("motivo") || "",
    registrado_por: currentUser.username,
    fecha_registro: new Date().toISOString(),
  };

  try {
    const saved = await saveContactToDB(contact);
    contacts.push(saved);
    showMessage("contact-success-message");
    form.reset();
    const derivGroup = document.getElementById("derivacion-group");
    if (derivGroup) derivGroup.style.display = "none";
    updateDashboard();
    renderContactsList();
    updateClientSelectFromContacts();
  } catch (e) {
    console.error("Error guardando contacto:", e);
    alert("Error guardando contacto");
  }
}

function showMessage(id) {
  const msg = document.getElementById(id);
  if (!msg) return;
  msg.style.display = "block";
  setTimeout(() => (msg.style.display = "none"), 2000);
}

async function saveContactToDB(contact) {
  const { data, error } = await window.supabase
    .from("commercial_contacts")
    .insert(contact)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No se devolvieron datos al guardar contacto");
  return data;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toLocaleDateString("es-ES");
}

function renderContactsList(filtered = null) {
  const tbody = document.getElementById("contacts-tbody");
  if (!tbody) return;

  const data = filtered || contacts;
  tbody.innerHTML = "";

  [...data]
    .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
    .reverse()
    .forEach((c) => {
      const phone = c.telefono || "";
      const whatsappBtn = phone
        ? `<button class="btn-whatsapp" onclick="sendWhatsApp('${c.telefono}', '', '${c.cliente}', '${c.producto}', '${c.empresa}')">
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" class="icon-whatsapp" />
          </button>`
        : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDate(c.fecha)}</td>
        <td>${c.vendedor || ""}</td>
        <td>${c.cliente || ""}</td>
        <td>${c.empresa || ""}</td>
        <td>${c.producto || ""}</td>
        <td><span class="status-badge status-${(c.estado || "")
          .toLowerCase()
          .replace(/\s+/g, "-")}">${c.estado || "-"}</span></td>
        <td>${c.cliente_derivado || "-"}</td>
        <td>${c.motivo || "-"}</td>
        <td class="actions-column">
          ${whatsappBtn}
          <button class="btn-edit" onclick="editContact('${c.id}')">✏️</button>
          <button class="btn-delete" onclick="deleteContact('${c.id}')">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

function filterContacts() {
  const vendedor = document.getElementById("filter-vendedor")?.value || "";
  const estado = document.getElementById("filter-estado")?.value || "";
  const desde = document.getElementById("filter-fecha-desde")?.value || "";
  const hasta = document.getElementById("filter-fecha-hasta")?.value || "";

  let filtered = [...contacts];
  if (vendedor) filtered = filtered.filter((c) => c.vendedor === vendedor);
  if (estado) filtered = filtered.filter((c) => c.estado === estado);
  if (desde) filtered = filtered.filter((c) => (c.fecha || "") >= desde);
  if (hasta) filtered = filtered.filter((c) => (c.fecha || "") <= hasta);

  renderContactsList(filtered);
}

function editContact(id) {
  const c = contacts.find((x) => x.id === id);
  if (!c) return;

  showElement("edit-contact-modal");

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setVal("edit-contact-id", c.id);
  setVal("edit-fecha", c.fecha);
  setVal("edit-vendedor", c.vendedor);
  setVal("edit-cliente", c.cliente);
  setVal("edit-empresa", c.empresa);
  setVal("edit-telefono", c.telefono);
  setVal("edit-email", c.email);
  setVal("edit-producto", c.producto);
  setVal("edit-estado", c.estado);
  setVal("edit-cliente-derivado", c.cliente_derivado);
  setVal("edit-motivo", c.motivo);

  toggleEditDerivacion();
}

function toggleDerivacion() {
  const estado = document.getElementById("estado")?.value || "";
  const derivGroup = document.getElementById("derivacion-group");
  if (!derivGroup) return;
  derivGroup.style.display = estado === "Derivado" ? "block" : "none";
  if (estado === "Derivado") updateClientSelectFromClients();
}

function toggleEditDerivacion() {
  const estado = document.getElementById("edit-estado")?.value || "";
  const derivGroup = document.getElementById("edit-derivacion-group");
  if (!derivGroup) return;
  derivGroup.style.display = estado === "Derivado" ? "block" : "none";
  if (estado === "Derivado") updateClientSelectFromClients();
}

window.toggleDerivacion = toggleDerivacion;
window.toggleEditDerivacion = toggleEditDerivacion;

function closeEditContactModal() {
  hideElement("edit-contact-modal");
}

async function handleEditContactSubmit(e) {
  e.preventDefault();
  if (!currentUser) return alert("Sesión expirada");

  const id = document.getElementById("edit-contact-id").value;
  const old = contacts.find((c) => c.id === id);
  if (!old) return alert("No se encontró el contacto a editar.");

  const updated = {
    fecha: document.getElementById("edit-fecha").value,
    vendedor: document.getElementById("edit-vendedor").value,
    cliente: document.getElementById("edit-cliente").value,
    empresa: document.getElementById("edit-empresa").value,
    telefono: document.getElementById("edit-telefono").value,
    email: document.getElementById("edit-email").value,
    producto: document.getElementById("edit-producto").value,
    estado: document.getElementById("edit-estado").value,
    cliente_derivado: document.getElementById("edit-cliente-derivado").value || "",
    motivo: document.getElementById("edit-motivo").value || "",
    editado_por: currentUser.username,
    fecha_edicion: new Date().toISOString(),
  };

  try {
    const { error } = await window.supabase
      .from("commercial_contacts")
      .update(updated)
      .eq("id", id);

    if (error) throw error;

    const idx = contacts.findIndex((c) => c.id === id);
    if (idx !== -1) contacts[idx] = { ...contacts[idx], ...updated };

    closeEditContactModal();
    updateDashboard();
    renderContactsList();

    alert("✅ Contacto actualizado correctamente");
  } catch (err) {
    console.error("Error al editar contacto:", err);
    alert("Error al guardar los cambios");
  }
}

async function deleteContact(id) {
  if (!confirm("¿Estás seguro de eliminar este contacto?")) return;
  try {
    await window.supabase.from("commercial_contacts").delete().eq("id", id);
    contacts = contacts.filter((c) => c.id !== id);
    updateDashboard();
    renderContactsList();
  } catch (e) {
    console.error("Error borrando contacto:", e);
    alert("Error borrando contacto");
  }
}

/*****************************************************
 *  BLOQUE 3 - CLIENTES, DASHBOARD (CORREGIDO COMPLETO)
 *****************************************************/

async function handleClientSubmit(e) {
  e.preventDefault();
  if (!currentUser) return alert("Sesión expirada, vuelve a iniciar sesión");

  const form = e.target;
  const formData = new FormData(form);

  const coordinates = (() => {
    const coordDisplay = document.getElementById("coordinates-display");
    if (coordDisplay && coordDisplay.dataset.lat && coordDisplay.dataset.lng) {
      return {
        lat: parseFloat(coordDisplay.dataset.lat),
        lng: parseFloat(coordDisplay.dataset.lng),
      };
    }
    return null;
  })();

  const client = {
    name: formData.get("client-name") || "",
    company: formData.get("client-company") || "",
    phone: formData.get("client-phone") || "",
    email: formData.get("client-email") || "",
    address: formData.get("client-address") || "",
    type: formData.get("client-type") || "",
    status: formData.get("client-status") || "",
    segment: typeof normalizeSegment === "function"
      ? normalizeSegment(formData.get("client-segment"))
      : "",
    notes: formData.get("client-notes") || "",
    registered_by: currentUser.username,
    registered_at: new Date().toISOString(),
    coordinates,
  };

  try {
    const saved = await insertClientToDB(client);
    clients.push(saved);
    showMessage("client-success-message");
    form.reset();

    const coordDisp = document.getElementById("coordinates-display");
    if (coordDisp) {
      coordDisp.textContent = "";
      delete coordDisp.dataset.lat;
      delete coordDisp.dataset.lng;
    }

    updateDashboard();
    renderClientsList();
    updateClientSelectFromClients();
  } catch (e) {
    console.error("Error guardando cliente:", e);
    alert("Error guardando cliente");
  }
}

async function insertClientToDB(client) {
  const safe = {
    name: client.name?.toString() || "Sin nombre",
    company: client.company?.toString() || "",
    phone: client.phone?.toString() || "",
    email: client.email?.toString() || "",
    address: client.address?.toString() || "",
    type: client.type?.toString() || "",
    status: client.status?.toString() || "",
    segment: typeof normalizeSegment === "function" ? normalizeSegment(client.segment) : "",
    notes: client.notes?.toString() || "",
    registered_by: currentUser?.username?.toString() || "",
    registered_at: new Date().toISOString(),
    coordinates: client.coordinates || null,
  };

  const { data, error } = await window.supabase
    .from("commercial_clients")
    .insert(safe)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No se devolvieron datos al insertar cliente");
  return data;
}

function renderClientsList(filtered = null) {
  const tbody = document.getElementById("clients-tbody");
  if (!tbody) return;

  const data = filtered || clients;
  tbody.innerHTML = "";

  data.forEach((c) => {
    const derivCount = contacts.filter((x) => x.cliente_derivado === c.company).length;

    const typeText = c.type || "-";
    const statusText = c.status || "-";
    const statusClass = statusText.toLowerCase().replace(/\s+/g, "-");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name || ""}</td>
      <td>${c.company || ""}</td>
      <td>${c.phone || "-"}</td>
      <td>${c.email || "-"}</td>
      <td>${c.address || "-"}</td>
      <td>${typeText}</td>
      <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
      <td><strong>${derivCount}</strong></td>
      <td class="actions-column">
        <button class="btn-edit" onclick="editClient('${c.id}')">✏️</button>
        <button class="btn-delete" onclick="deleteClient('${c.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterClients() {
  const typeSel = document.getElementById("filter-client-type");
  const statusSel = document.getElementById("filter-client-status");
  const segmentSel = document.getElementById("filter-client-segment");

  const type = typeSel ? typeSel.value : "";
  const status = statusSel ? statusSel.value : "";
  const segment = segmentSel ? segmentSel.value : "";

  let filtered = [...clients];

  if (type) filtered = filtered.filter((c) => c.type === type);
  if (status) filtered = filtered.filter((c) => c.status === status);
  if (segment) filtered = filtered.filter((c) => (c.segment || "") === segment);

  renderClientsList(filtered);
}

function searchClients() {
  const input = document.getElementById("client-search");
  const term = (input?.value || "").toLowerCase().trim();
  if (!term) return renderClientsList();

  const filtered = clients.filter(
    (c) =>
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.company && c.company.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term)) ||
      (c.segment && c.segment.toLowerCase().includes(term)) ||
      (c.type && c.type.toLowerCase().includes(term)) ||
      (c.status && c.status.toLowerCase().includes(term))
  );

  renderClientsList(filtered);
}

function editClient(id) {
  const c = clients.find((x) => x.id === id);
  if (!c) return;

  showElement("edit-client-modal");

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setVal("edit-client-id", c.id);
  setVal("edit-client-name", c.name);
  setVal("edit-client-company", c.company);
  setVal("edit-client-phone", c.phone);
  setVal("edit-client-email", c.email);
  setVal("edit-client-address", c.address);
  setVal("edit-client-type", c.type);
  setVal("edit-client-segment", c.segment);
  setVal("edit-client-status", c.status);
  setVal("edit-client-notes", c.notes);

  const coordDisplay = document.getElementById("edit-coordinates-display");
  if (coordDisplay) {
    if (c.coordinates?.lat && c.coordinates?.lng) {
      coordDisplay.textContent = `Lat: ${c.coordinates.lat}, Lng: ${c.coordinates.lng}`;
      coordDisplay.dataset.lat = c.coordinates.lat;
      coordDisplay.dataset.lng = c.coordinates.lng;
    } else {
      coordDisplay.textContent = "";
      delete coordDisplay.dataset.lat;
      delete coordDisplay.dataset.lng;
    }
  }
}

function closeEditClientModal() {
  hideElement("edit-client-modal");
}

async function saveClientToDB(client) {
  const safe = {
    name: (client.name ?? "").toString(),
    company: (client.company ?? "").toString(),
    phone: (client.phone ?? "").toString(),
    email: (client.email ?? "").toString(),
    address: (client.address ?? "").toString(),
    type: (client.type ?? "").toString(),
    status: (client.status ?? "").toString(),
    segment: normalizeSegment(client.segment),
    notes: (client.notes ?? "").toString(),
    // OJO: solo mandá columnas que EXISTAN en la tabla
    // registered_by: currentUser?.username?.toString() || "",
    // registered_at: client.registered_at || new Date().toISOString(),
  };

  // coordinates (si existe la columna y es json/jsonb)
  if (client.coordinates?.lat != null && client.coordinates?.lng != null) {
    safe.coordinates = {
      lat: Number(client.coordinates.lat),
      lng: Number(client.coordinates.lng),
    };
  }

  const id = (client.id ?? "").toString().trim();

  const { data, error } = await window.supabase
    .from("commercial_clients")
    .update(safe)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("❌ Supabase update error FULL:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  if (!data) throw new Error("No se devolvieron datos al actualizar el cliente");
  return data;
}


async function handleEditClientSubmit(e) {
  e.preventDefault();
  if (!currentUser) return alert("Sesión expirada. Iniciá sesión nuevamente.");

  const form = e.target;
  const id = document.getElementById("edit-client-id").value;

  const updatedClient = {
    id,
    name: form.querySelector("#edit-client-name").value.trim(),
    company: form.querySelector("#edit-client-company").value.trim(),
    phone: form.querySelector("#edit-client-phone").value.trim(),
    email: form.querySelector("#edit-client-email").value.trim(),
    address: form.querySelector("#edit-client-address").value.trim(),
    type: form.querySelector("#edit-client-type").value,
    segment: typeof normalizeSegment === "function"
      ? normalizeSegment(form.querySelector("#edit-client-segment")?.value)
      : "",
    status: form.querySelector("#edit-client-status").value,
    notes: form.querySelector("#edit-client-notes").value.trim(),
  };

  const coordsDisplay = document.getElementById("edit-coordinates-display");
  if (coordsDisplay?.dataset.lat && coordsDisplay?.dataset.lng) {
    updatedClient.coordinates = {
      lat: parseFloat(coordsDisplay.dataset.lat),
      lng: parseFloat(coordsDisplay.dataset.lng),
    };
  }

  try {
    const saved = await saveClientToDB(updatedClient);
    const idx = clients.findIndex((c) => c.id === id);
    if (idx !== -1) clients[idx] = saved;

    closeEditClientModal();
    updateDashboard();
    renderClientsList();

    alert("✅ Cliente actualizado correctamente");
  } catch (err) {
  console.error("Error editando cliente FULL:", err);
  const msg =
    (err?.message || "") +
    (err?.details ? ` | ${err.details}` : "") +
    (err?.hint ? ` | hint: ${err.hint}` : "") +
    (err?.code ? ` | code: ${err.code}` : "");
  alert("❌ " + (msg.trim() || "Error guardando los cambios del cliente"));
}

}

async function deleteClientFromDB(id) {
  const { error } = await window.supabase.from("commercial_clients").delete().eq("id", id);
  if (error) throw error;
}

async function deleteClient(id) {
  if (!confirm("¿Estás seguro de eliminar este cliente?")) return;

  try {
    await deleteClientFromDB(id);
    clients = clients.filter((c) => c.id !== id);
    updateDashboard();
    renderClientsList();
  } catch (e) {
    console.error("Error borrando cliente:", e);
    alert("Error borrando cliente");
  }
}

function updateDashboard() {
  try {
    const totalContacts = contacts.length;
    const totalSales = contacts.filter((c) => c.estado === "Vendido").length;
    const totalReferrals = contacts.filter((c) => c.estado === "Derivado").length;
    const conversionRate = totalContacts ? Math.round((totalSales / totalContacts) * 100) : 0;
    const totalClients = clients.length;
    const activeClients = clients.filter((c) => c.status === "Activo").length;
    const totalProducts = contacts.filter((c) => c.producto && c.producto.trim() !== "").length;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText("total-contacts", totalContacts);
    setText("total-sales", totalSales);
    setText("total-referrals", totalReferrals);
    setText("conversion-rate", `${conversionRate}%`);
    setText("total-clients", totalClients);
    setText("active-clients", activeClients);
    setText("total-products", totalProducts);
  } catch (e) {
    console.warn("updateDashboard error:", e);
  }
}

function updateClientSelectFromClients() {
  const sel = document.getElementById("cliente-derivado");
  const editSel = document.getElementById("edit-cliente-derivado");
  if (!sel && !editSel) return;

  const companies = [...new Set(clients.map((c) => c.company).filter(Boolean))].sort();

  const fill = (select) => {
    if (!select) return;
    select.innerHTML = `<option value="">Seleccionar cliente</option>`;
    companies.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  };

  fill(sel);
  fill(editSel);
}

function updateClientSelectFromContacts() {
  // reservado
}

/*****************************************************
 *  BLOQUE 4 - MAPA, GEOLOCALIZACIÓN (FIX DEFINITIVO)
 *****************************************************/

let mapView = null;
let markersLayer = null;

function ensureMapInitialized() {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return false;

  if (!mapView) {
    mapView = L.map("map").setView([-34.6037, -58.3816], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapView);

    markersLayer = L.layerGroup().addTo(mapView);
  }

  return true;
}

function getClientColor(c) {
  const t = String(c?.type || "").trim().toLowerCase();

  // ✅ mismos colores que CSS de la leyenda (y agregado repartidor)
  const COLORS_BY_TYPE = {
    "distribuidor": "#1e88e5",
    "supermercados": "#43a047",
    "negocio local": "#fb8c00",
    "b2b": "#8e24aa",
    "mayorista": "#c5223b",
    "repartidor": "#fbc02d", // ✅ sugerido (cambialo si querés)
  };

  return COLORS_BY_TYPE[t] || "#607d8b";
}

async function plotClientsOnMap(clientList) {
  if (!ensureMapInitialized()) return;
  if (!markersLayer) return;

  markersLayer.clearLayers();

  if (!clientList || clientList.length === 0) {
    resetMapView();
    return;
  }

  const coords = [];

  for (const c of clientList) {
    if (!c.coordinates && c.address) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          c.address
        )}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data?.length) {
          c.coordinates = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          };
        }
      } catch (err) {
        console.warn("No se pudo geocodificar:", c.address);
      }
    }

    if (!c.coordinates) continue;

    const lat = parseFloat(c.coordinates.lat);
    const lng = parseFloat(c.coordinates.lng);
    if (isNaN(lat) || isNaN(lng)) continue;

    const derivCount = contacts.filter((x) => x.cliente_derivado === c.company).length;
    const color = getClientColor(c);

    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      color: color,
      fillColor: color,
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(markersLayer);

    marker.bindPopup(`
      <b>${c.name || "-"}</b><br>
      ${c.company || ""}<br>
      ${c.address || ""}<br>
      <em>${c.type || ""} - ${c.status || ""}</em><br>
      <b>Segmento:</b> ${c.segment || "-"}<br>
      <hr>
      <b>Derivaciones:</b> ${derivCount}
    `);

    coords.push([lat, lng]);
  }

  if (coords.length) {
    mapView.fitBounds(L.latLngBounds(coords), { padding: [50, 50] });
  } else {
    resetMapView();
  }
}

async function initLeafletMap() {
  try {
    if (!ensureMapInitialized()) return;

    // ✅ importante: NO re-plotear si ya hay markers
    if (markersLayer && markersLayer.getLayers().length > 0) return;

    await plotClientsOnMap(clients);
  } catch (err) {
    console.error("initLeafletMap error:", err);
  }
}

function resetMapView() {
  if (mapView) mapView.setView([-34.6037, -58.3816], 6);
}

// Botones del mapa (NO llaman showSection para no re-entrar)
async function showAllClients() {
  await plotClientsOnMap(clients);
}

async function showActiveClients() {
  const list = clients.filter((c) => looseEquals(c.status, "Activo"));
  await plotClientsOnMap(list);
}

async function showByType(type) {
  const list = clients.filter((c) => looseEquals(c.type, type));
  await plotClientsOnMap(list);
}

async function showBySegment(segment) {
  const list = clients.filter((c) => looseEquals(c.segment, segment));
  await plotClientsOnMap(list);
}

async function showClientsOnMap() {
  await showAllClients();
}

// === GEOLOCALIZACIÓN ===
async function geocodeCurrentAddress() {
  const addressInput = document.getElementById("client-address");
  const coordDisplay = document.getElementById("coordinates-display");
  if (!addressInput || !coordDisplay) return;

  const address = addressInput.value.trim();
  if (!address) return alert("Por favor ingresá una dirección para geocodificar.");

  coordDisplay.textContent = "Buscando ubicación...";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.length) {
      coordDisplay.textContent = "No se encontró ubicación.";
      return;
    }

    coordDisplay.textContent = `Lat: ${data[0].lat}, Lng: ${data[0].lon}`;
    coordDisplay.dataset.lat = data[0].lat;
    coordDisplay.dataset.lng = data[0].lon;
  } catch (err) {
    coordDisplay.textContent = "Error al obtener coordenadas.";
    console.error("Error en geocodeCurrentAddress:", err);
  }
}

async function geocodeCurrentAddressEdit() {
  const addressInput = document.getElementById("edit-client-address");
  const coordDisplay = document.getElementById("edit-coordinates-display");
  if (!addressInput || !coordDisplay) return;

  const address = addressInput.value.trim();
  if (!address) return alert("Por favor ingresá una dirección para geocodificar.");

  coordDisplay.textContent = "Buscando ubicación...";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.length) {
      coordDisplay.textContent = "No se encontró ubicación.";
      return;
    }

    coordDisplay.textContent = `Lat: ${data[0].lat}, Lng: ${data[0].lon}`;
    coordDisplay.dataset.lat = data[0].lat;
    coordDisplay.dataset.lng = data[0].lon;
  } catch (err) {
    coordDisplay.textContent = "Error al obtener coordenadas.";
    console.error("Error en geocodeCurrentAddressEdit:", err);
  }
}

function getCurrentLocationEdit() {
  const coordDisplay = document.getElementById("edit-coordinates-display");
  if (!navigator.geolocation) return alert("Tu navegador no soporta geolocalización.");

  coordDisplay.textContent = "Obteniendo tu ubicación actual...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lon = pos.coords.longitude.toFixed(6);
      coordDisplay.textContent = `Lat: ${lat}, Lng: ${lon}`;
      coordDisplay.dataset.lat = lat;
      coordDisplay.dataset.lng = lon;
    },
    (err) => {
      coordDisplay.textContent = "No se pudo obtener ubicación.";
      alert("Error al obtener ubicación: " + err.message);
    }
  );
}

/*****************************************************
 *  EXPORTACIONES
 *****************************************************/
function downloadTextFile(content, filename, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportContacts() {
  const header = [
    "Fecha",
    "Vendedor",
    "Cliente",
    "Empresa",
    "Teléfono",
    "Email",
    "Producto",
    "Estado",
    "Derivado a",
    "Motivo",
  ];

  const rows = contacts.map((c) => [
    c.fecha || "",
    c.vendedor || "",
    c.cliente || "",
    c.empresa || "",
    c.telefono || "",
    c.email || "",
    c.producto || "",
    c.estado || "",
    c.cliente_derivado || "",
    c.motivo || "",
  ]);

  const csvLines = [header, ...rows].map((cols) =>
    cols.map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`).join(",")
  );

  const csv = "\uFEFF" + csvLines.join("\n");
  downloadTextFile(csv, "contactos.csv", "text/csv;charset=utf-8");
}

function exportClients() {
  const header = [
    "Nombre",
    "Empresa",
    "Teléfono",
    "Email",
    "Dirección",
    "Segmento",
    "Tipo",
    "Estado",
    "Derivaciones Recibidas",
    "Notas",
  ];

  const rows = clients.map((c) => {
    const derivs = contacts.filter((x) => x.cliente_derivado === c.company).length;
    return [
      c.name || "",
      c.company || "",
      c.phone || "",
      c.email || "",
      c.address || "",
      c.segment || "",
      c.type || "",
      c.status || "",
      derivs,
      c.notes || "",
    ];
  });

  const csvLines = [header, ...rows].map((cols) =>
    cols.map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`).join(",")
  );

  const csv = "\uFEFF" + csvLines.join("\n");
  downloadTextFile(csv, "clientes.csv", "text/csv;charset=utf-8");
}

function exportFullReport() {
  const today = new Date().toISOString().slice(0, 10);

  let report = "";
  report += `INFORME COMERCIAL COMPLETO - ${today}\n\n`;
  report += `ESTADÍSTICAS GENERALES:\n`;
  report += `Total de contactos: ${contacts.length}\n`;
  report += `Ventas realizadas: ${contacts.filter((c) => c.estado === "Vendido").length}\n`;
  report += `Derivaciones: ${contacts.filter((c) => c.estado === "Derivado").length}\n`;
  report += `Clientes registrados: ${clients.length}\n\n`;

  const counts = {};
  contacts
    .filter((c) => c.estado === "Derivado" && c.cliente_derivado)
    .forEach((c) => {
      counts[c.cliente_derivado] = (counts[c.cliente_derivado] || 0) + 1;
    });

  report += `TOP CLIENTES POR DERIVACIONES:\n`;
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([name, count], idx) => {
      report += `${idx + 1}. ${name}: ${count} derivaciones\n`;
    });

  downloadTextFile(report, "informe-completo.txt", "text/plain;charset=utf-8");
}

/*****************************************************
 *  WHATSAPP
 *****************************************************/
function sendWhatsApp(phone, msg, clientName = "", product = "", empresa = "") {
  if (!phone) return alert("No hay teléfono disponible para este contacto.");

  const cleaned = phone.replace(/\D/g, "");
  const fullNumber = cleaned.startsWith("54") ? cleaned : `54${cleaned}`;

  if (!msg) {
    msg = `Hola ${clientName || ""}, soy ${
      currentUser?.name || currentUser?.username || "del equipo"
    } de Granja Almeyra 🐔${empresa ? ` (${empresa})` : ""}. Te contacto por ${
      product || "nuestros productos"
    }.`;
  }

  const encodedMsg = encodeURIComponent(msg);
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod/i.test(ua);
  const isDesktop = /win|mac|linux/i.test(ua) && !isMobile;

  const deepLink = `whatsapp://send?phone=${fullNumber}&text=${encodedMsg}`;
  const webLink = `https://web.whatsapp.com/send?phone=${fullNumber}&text=${encodedMsg}`;
  const desktopLink = `https://api.whatsapp.com/send?phone=${fullNumber}&text=${encodedMsg}`;

  try {
    if (isMobile) {
      window.location.href = deepLink;
    } else if (isDesktop) {
      setTimeout(() => window.open(webLink, "_blank"), 300);
    } else {
      window.open(desktopLink, "_blank");
    }
  } catch (err) {
    console.error("Error abriendo WhatsApp:", err);
    window.open(webLink, "_blank");
  }
}
/*****************************************************
 *  BLOQUE REPORTES - GENERATE + RENDERERS (FIX)
 *****************************************************/

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function monthKey(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function sortEntriesDesc(obj) {
  return Object.entries(obj).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
}

function renderBars(containerId, rows, opts = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const titleLeft = opts.titleLeft || "";
  const titleRight = opts.titleRight || "";

  if (!rows || rows.length === 0) {
    el.innerHTML = `<div style="color:#777;font-size:13px;padding:10px;">Sin datos</div>`;
    return;
  }

  const max = Math.max(...rows.map((r) => Number(r.value) || 0), 1);

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;color:#666;font-size:12px;">
      <span>${escapeHtml(titleLeft)}</span>
      <span>${escapeHtml(titleRight)}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${rows
        .map((r) => {
          const v = Number(r.value) || 0;
          const pct = Math.round((v / max) * 100);
          return `
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:170px;font-size:13px;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${escapeHtml(r.label)}
              </div>
              <div style="flex:1;background:#f2f2f2;border-radius:999px;height:10px;overflow:hidden;">
                <div style="width:${pct}%;height:10px;border-radius:999px;background:#f4c430;"></div>
              </div>
              <div style="width:42px;text-align:right;font-size:13px;color:#222;">
                ${v}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStatusSummary(containerId, stats) {
  const el = document.getElementById(containerId);
  if (!el) return;

  // ✅ FORZAR CENTRADO REAL EN EL CONTENEDOR (gana a la mayoría de CSS)
  el.style.display = "flex";
  el.style.justifyContent = "center";
  el.style.width = "100%";
  el.style.boxSizing = "border-box";

  const total = Number(stats.total) || 0;
  const sold = Number(stats.sold) || 0;
  const derived = Number(stats.derived) || 0;
  const noSold = Number(stats.noSold) || 0;

  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);

  const items = [
    { label: "Total", value: total, percent: 100, color: "#616161" },
    { label: "Vendido", value: sold, percent: pct(sold), color: "#43a047" },
    { label: "Derivado", value: derived, percent: pct(derived), color: "#fb8c00" },
    { label: "No vendido", value: noSold, percent: pct(noSold), color: "#e53935" },
  ];

  el.innerHTML = `
    <div style="
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:18px;
      margin:10px 0;
      width:260px;   /* ✅ ancho fijo = centrado perfecto */
    ">
      ${items
        .map(
          (it) => `
          <div style="
            background:#fff;
            border:1px solid #eee;
            border-radius:16px;
            padding:16px;
            min-height:110px;
            width:260px;
            display:flex;
            flex-direction:column;
            justify-content:space-between;
            box-shadow:0 8px 20px rgba(0,0,0,0.04);
          ">
            <div style="font-size:13px;font-weight:600;color:#555;text-align:center;">
              ${it.label}
            </div>

            <div style="font-size:30px;font-weight:800;color:#111;line-height:1;margin:6px 0;text-align:center;">
              ${it.value}
            </div>

            <div style="width:100%;height:8px;background:#eee;border-radius:6px;overflow:hidden;">
              <div
                class="status-bar-fill"
                data-target="${it.percent}"
                style="
                  width:0%;
                  height:100%;
                  background:${it.color};
                  border-radius:6px;
                "
              ></div>
            </div>

            <div style="font-size:12px;font-weight:600;color:#777;margin-top:6px;text-align:right;">
              ${it.percent}%
            </div>
          </div>
        `
        )
        .join("")}
    </div>
  `;

  // ✅ Animación 0% -> valor
  const bars = el.querySelectorAll(".status-bar-fill");
  const DURATION_MS = 650;

  bars.forEach((bar) => {
    const target = Math.max(0, Math.min(100, Number(bar.dataset.target) || 0));
    bar.style.width = "0%";

    const start = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      bar.style.width = `${target * easeOutCubic(t)}%`;
      if (t < 1) requestAnimationFrame(tick);
      else bar.style.width = `${target}%`;
    };

    requestAnimationFrame(tick);
  });
}



function generateReports() {
  try {
    // Asegurar arrays
    const cc = Array.isArray(contacts) ? contacts : [];
    const cl = Array.isArray(clients) ? clients : [];

    // ===== Ventas por vendedor (count vendidos)
    const salesBySeller = {};
    cc.forEach((c) => {
      if ((c.estado || "") === "Vendido") {
        const k = (c.vendedor || "Sin vendedor").trim() || "Sin vendedor";
        salesBySeller[k] = (salesBySeller[k] || 0) + 1;
      }
    });
    const salesRows = sortEntriesDesc(salesBySeller).map(([label, value]) => ({ label, value }));
    renderBars("sales-report", salesRows, { titleLeft: "Vendedor", titleRight: "Ventas" });

    // ===== Resumen de estados
    const stats = {
      total: cc.length,
      sold: cc.filter((c) => (c.estado || "") === "Vendido").length,
      derived: cc.filter((c) => (c.estado || "") === "Derivado").length,
      noSold: cc.filter((c) => (c.estado || "") === "No Vendido").length,
    };
    renderStatusSummary("status-report", stats);

    // ===== Top derivaciones (clientes receptores)
    const derivByClient = {};
    cc.forEach((c) => {
      if ((c.estado || "") === "Derivado" && c.cliente_derivado) {
        const k = String(c.cliente_derivado).trim();
        if (!k) return;
        derivByClient[k] = (derivByClient[k] || 0) + 1;
      }
    });
    const topDerivRows = sortEntriesDesc(derivByClient)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }));
    renderBars("referrals-report", topDerivRows, { titleLeft: "Cliente", titleRight: "Deriv." });

    // ===== Evolución mensual (contactos por mes)
    const monthly = {};
    cc.forEach((c) => {
      const k = monthKey(c.fecha);
      if (!k) return;
      monthly[k] = (monthly[k] || 0) + 1;
    });
    const monthlyRows = Object.entries(monthly)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12) // últimos 12 meses
      .map(([label, value]) => ({ label, value }));
    renderBars("timeline-report", monthlyRows, { titleLeft: "Mes", titleRight: "Contactos" });

    // ===== Informe detallado de derivaciones (tabla)
    const tbody = document.getElementById("referrals-tbody");
    if (tbody) {
      const nowKey = monthKey(new Date().toISOString());
      const byClient = {};

      cc.forEach((c) => {
        if ((c.estado || "") !== "Derivado" || !c.cliente_derivado) return;
        const client = String(c.cliente_derivado).trim();
        if (!client) return;

        if (!byClient[client]) {
          byClient[client] = {
            client,
            total: 0,
            thisMonth: 0,
            lastDate: "",
            sellerCount: {},
          };
        }

        byClient[client].total += 1;

        const mk = monthKey(c.fecha);
        if (mk && mk === nowKey) byClient[client].thisMonth += 1;

        // último contacto
        const fd = c.fecha || "";
        if (fd && (!byClient[client].lastDate || fd > byClient[client].lastDate)) {
          byClient[client].lastDate = fd;
        }

        // vendedor que más deriva
        const seller = (c.vendedor || "Sin vendedor").trim() || "Sin vendedor";
        byClient[client].sellerCount[seller] = (byClient[client].sellerCount[seller] || 0) + 1;
      });

      const rows = Object.values(byClient)
        .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
        .slice(0, 30);

      tbody.innerHTML = rows
        .map((r) => {
          const topSeller = Object.entries(r.sellerCount)
            .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] || "-";

          const last = r.lastDate ? formatDate(r.lastDate) : "-";

          return `
            <tr>
              <td>${escapeHtml(r.client)}</td>
              <td><strong>${r.total}</strong></td>
              <td>${r.thisMonth}</td>
              <td>${escapeHtml(last)}</td>
              <td>${escapeHtml(topSeller)}</td>
            </tr>
          `;
        })
        .join("");

      if (!rows.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="padding:12px;color:#777;">Sin derivaciones registradas</td>
          </tr>
        `;
      }
    }

    // ===== Productos más solicitados
    const prodCounts = {};
    cc.forEach((c) => {
      const p = (c.producto || "").trim();
      if (!p) return;
      prodCounts[p] = (prodCounts[p] || 0) + 1;
    });
    const topProdRows = sortEntriesDesc(prodCounts)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }));
    renderBars("top-products-report", topProdRows, { titleLeft: "Producto", titleRight: "Solic." });

    // ===== Productos por vendedor (top 10 combinados "Vendedor - Producto")
    const prodBySeller = {};
    cc.forEach((c) => {
      const s = (c.vendedor || "Sin vendedor").trim() || "Sin vendedor";
      const p = (c.producto || "").trim();
      if (!p) return;
      const k = `${s} — ${p}`;
      prodBySeller[k] = (prodBySeller[k] || 0) + 1;
    });
    const prodBySellerRows = sortEntriesDesc(prodBySeller)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }));
    renderBars("products-by-seller-report", prodBySellerRows, { titleLeft: "Vendedor — Producto", titleRight: "Cant." });

    // ===== Solicitudes por categoría (tipo de cliente)
    const reqByType = {};
    cc.forEach((c) => {
      // si en tu contacto no guardás el tipo, no hay forma de hacerlo exacto.
      // fallback: usa empresa -> busca en clientes por company
      const empresa = (c.empresa || "").trim();
      let type = "";
      if (empresa) {
        const found = cl.find((x) => (x.company || "").trim() === empresa);
        type = found?.type || "";
      }
      type = (type || "Sin categoría").trim() || "Sin categoría";
      reqByType[type] = (reqByType[type] || 0) + 1;
    });
    const reqByTypeRows = sortEntriesDesc(reqByType)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }));
    renderBars("requests-by-category-report", reqByTypeRows, { titleLeft: "Categoría", titleRight: "Solic." });

  } catch (err) {
    console.error("generateReports error:", err);
  }
}

// ✅ EXPO: que exista global y que showSection('reports') lo pueda llamar
window.generateReports = generateReports;

/*****************************************************
 *  REGISTRO GLOBAL (window)
 *****************************************************/

// contactos
window.editContact = editContact;
window.handleEditContactSubmit = handleEditContactSubmit;
window.deleteContact = deleteContact;
window.logout = logout;
window.handleLogin = handleLogin;
window.handlePasswordChange = handlePasswordChange;
window.closeEditContactModal = closeEditContactModal;

// clientes
window.handleClientSubmit = handleClientSubmit;
window.handleEditClientSubmit = handleEditClientSubmit;
window.editClient = editClient;
window.closeEditClientModal = closeEditClientModal;
window.deleteClient = deleteClient;
window.filterClients = filterClients;
window.searchClients = searchClients;

// mapa
window.showClientsOnMap = showClientsOnMap;
window.geocodeCurrentAddress = geocodeCurrentAddress;
window.geocodeCurrentAddressEdit = geocodeCurrentAddressEdit;
window.getCurrentLocationEdit = getCurrentLocationEdit;
window.initLeafletMap = initLeafletMap;
window.resetMapView = resetMapView;
window.showAllClients = showAllClients;
window.showActiveClients = showActiveClients;
window.showByType = showByType;
window.showBySegment = showBySegment;

// exports / filtros
window.exportContacts = exportContacts;
window.exportClients = exportClients;
window.exportFullReport = exportFullReport;
window.filterContacts = filterContacts;

// whatsapp
window.sendWhatsApp = sendWhatsApp;

// init
window.initApp = initApp;

console.log("🌍 Funciones registradas correctamente en window");

// === DOM READY ===
document.addEventListener("DOMContentLoaded", () => {
  if (typeof initApp === "function") {
    initApp().catch((err) => console.error("initApp error:", err));
  } else {
    console.error("⚠️ initApp no está definida o cargó fuera de orden.");
  }
});
