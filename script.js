/*****************************************************
 *  BLOQUE 1 - SUPABASE, UTILIDADES, SESIÓN, INIT
 *****************************************************/

// === CONFIGURACIÓN SUPABASE ===
const SUPABASE_URL = "https://gntwqahvwwvkwhkdowwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdudHdxYWh2d3d2a3doa2Rvd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc0NjQsImV4cCI6MjA3OTgyMzQ2NH0.qAgbzFmnG5136V1pTStF_hW7jKaAzoIlSYoWt2qxM9E"; // <-- reemplazar por el tuyo real

// Cliente global
(function initSupabaseClient() {
  try {
    if (window.supabase && typeof window.supabase.from === "function") {
      console.log("Using existing window.supabase client.");
      return;
    }
    if (typeof supabase !== "undefined" && supabase && typeof supabase.createClient === "function") {
      window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("Supabase UMD inicializado correctamente");
    } else {
      console.error("Supabase UMD no encontrado. Asegúrate de incluir el script de supabase en el HTML.");
    }
  } catch (err) {
    console.error("Error inicializando Supabase:", err);
  }
})();

// === COOKIES ===
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}
function getCookie(name) {
  return document.cookie.split("; ").reduce((acc, item) => {
    const [k, v] = item.split("=");
    return k === name ? decodeURIComponent(v) : acc;
  }, "");
}
function eraseCookie(name) {
  setCookie(name, "", -1);
}

// === ESTADO GLOBAL EN MEMORIA ===
let currentUser = null;
let contacts = []; // commercial_contacts
let clients = [];  // commercial_clients

// === UTILIDADES DE UI ===
function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "";
}
function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
function showMessage(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "block";
  setTimeout(() => {
    el.style.display = "none";
  }, 3000);
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (msg) el.textContent = msg;
  el.style.display = "block";
}

// === showSection: maneja login, cambio de password y secciones internas ===
function showMapSection(sectionId) {
  const screens = ["login-screen", "password-change-screen", "app-screen"];

  // 1) Ocultar SIEMPRE las pantallas principales
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === "app-screen") {
      el.style.display = "none";
    } else {
      el.style.display = "none";
    }
  });

  // 2) Si el parámetro es una pantalla principal
  if (screens.includes(sectionId)) {
    const el = document.getElementById(sectionId);
    if (el) {
      // login y cambio de password en modo "flex" para centrar
      if (sectionId === "login-screen" || sectionId === "password-change-screen") {
        el.style.display = "flex";
      } else {
        el.style.display = "block";
      }
    }
    return;
  }

  // 3) Todo lo demás son secciones internas dentro de app-screen
  const appScreen = document.getElementById("app-screen");
  if (!appScreen) return;
  appScreen.style.display = "block";

  // IDs de secciones internas
  const sections = [
    "dashboard",
    "form-contact",
    "list-contacts",
    "form-client",
    "list-clients",
    "map-section",
    "reports"
  ];

  // Ocultar todas las secciones internas
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = "none";
      el.classList.remove("active");
    }
  });

  // Caso especial: si viene "map", lo mapeamos a "map-section"
  let realId = sectionId === "map" ? "map-section" : sectionId;

  // Mostrar la sección correspondiente
  const target = document.getElementById(realId);
  if (target) {
    target.style.display = "block";
    target.classList.add("active");
  }

  // 4) Si entramos a informes, generamos los reportes
  if (realId === "reports") {
    try {
      generateReports();
    } catch (e) {
      console.warn("generateReports error:", e);
    }
  }

  // 5) Si entramos al mapa, inicializamos Leaflet
  if (realId === "map-section") {
    setTimeout(() => {
      if (typeof initLeafletMap === "function") {
        initLeafletMap();
      } else {
        console.error("❌ initLeafletMap no está definida");
      }
    }, 300);
  }
}


// === SESIONES CON UUID (tabla sessions: token uuid pk, user_id text, created_at) ===

// Crear sesión en DB y cookie
async function createSession(user) {
  const db = window.supabase;
  if (!db) return;

  const token = crypto.randomUUID();
  setCookie("granja_session", token, 7);

  try {
    const { error } = await db
      .from("sessions")
      .insert({
        token,
        user_id: user.username
      });
    if (error) {
      console.error("Error creando sesión en DB:", error);
    }
  } catch (e) {
    console.error("Error createSession:", e);
  }
}

// Borrar sesión
async function clearSession() {
  const db = window.supabase;
  if (!db) return;

  const token = getCookie("granja_session");
  eraseCookie("granja_session");
  if (!token) return;

  try {
    const { error } = await db
      .from("sessions")
      .delete()
      .eq("token", token);
    if (error) {
      console.warn("Error borrando sesión en DB:", error);
    }
  } catch (e) {
    console.warn("clearSession error:", e);
  }
}

// Restaurar sesión desde cookie
async function restoreSessionFromCookie() {
  const db = window.supabase;
  if (!db) return;

  const token = getCookie("granja_session");
  if (!token) return;

  try {
    const { data: sessionRows, error: sessionError } = await db
      .from("sessions")
      .select("*")
      .eq("token", token)
      .limit(1);

    if (sessionError || !sessionRows || sessionRows.length === 0) {
      return;
    }

    const session = sessionRows[0];

    const { data: userRows, error: userError } = await db
      .from("users")
      .select("*")
      .eq("username", session.user_id)
      .limit(1);

    if (userError || !userRows || userRows.length === 0) {
      return;
    }

    currentUser = userRows[0];
  } catch (e) {
    console.warn("restoreSessionFromCookie error:", e);
  }
}

// === CARGA DE DATOS DESDE SUPABASE ===

async function loadContactsFromDB() {
  const db = window.supabase;
  if (!db) return;
  try {
    const { data, error } = await db
      .from("commercial_contacts")
      .select("*")
      .order("fecha", { ascending: true });
    if (error) {
      console.error("Error cargando contactos:", error);
      return;
    }
    contacts = data || [];
  } catch (e) {
    console.error("loadContactsFromDB error:", e);
  }
}

async function loadClientsFromDB() {
  const db = window.supabase;
  if (!db) return;
  try {
    const { data, error } = await db
      .from("commercial_clients")
      .select("*")
      .order("company", { ascending: true });
    if (error) {
      console.error("Error cargando clientes:", error);
      return;
    }
    clients = data || [];
  } catch (e) {
    console.error("loadClientsFromDB error:", e);
  }
}
// === GUARDAR CONTACTO EN SUPABASE ===
// === GUARDAR CONTACTO EN SUPABASE (versión corregida) ===
async function saveContactToDB(contact) {
  try {
    // Crear un objeto con las columnas válidas EXACTAS de la tabla commercial_contacts
    const safe = {
      fecha: contact.fecha || new Date().toISOString().slice(0, 10),
      vendedor: contact.vendedor?.toString() || "",
      cliente: contact.cliente?.toString() || "",
      empresa: contact.empresa?.toString() || "",
      telefono: contact.telefono?.toString() || "",
      email: contact.email?.toString() || "",
      producto: contact.producto?.toString() || "",
      estado: contact.estado?.toString() || "",
      cliente_derivado: contact.cliente_derivado?.toString() || "",
      motivo: contact.motivo?.toString() || "",
      registrado_por: currentUser?.username || "",
      fecha_registro: new Date().toISOString(),
    };

    console.log("🧾 Enviando a Supabase:", safe);

    const { data, error } = await window.supabase
      .from("commercial_contacts")
      .insert([safe])
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("No se insertó el contacto");

    console.log("✅ Contacto guardado correctamente:", data);
    return data;
  } catch (err) {
    console.error("saveContactToDB error:", err);
    throw err;
  }
}

async function saveClientToDB(client) {
  try {
    const safe = {
      name: client.name?.toString() || "Sin nombre",
      company: client.company?.toString() || "",
      phone: client.phone?.toString() || "",
      email: client.email?.toString() || "",
      address: client.address?.toString() || "",
      type: client.type?.toString() || "",
      status: client.status?.toString() || "",
      notes: client.notes?.toString() || "",
      registered_by: currentUser?.username?.toString() || "",
      registered_at: new Date().toISOString()
    };

    // agregar coordenadas sólo si son válidas
    if (
      client.coordinates &&
      typeof client.coordinates === "object" &&
      client.coordinates.lat &&
      client.coordinates.lng
    ) {
      safe.coordinates = client.coordinates;
    }

    const { data, error } = await window.supabase
      .from("commercial_clients")
      .update(safe)
      .eq("id", client.id)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("No se actualizó ningún registro");

    console.log("Cliente actualizado correctamente:", data);
    return data;
  } catch (e) {
    console.error("saveClientToDB error:", e);
    throw e;
  }
}







async function deleteClientFromDB(id) {
  const db = window.supabase;
  if (!db) return;
  try {
    const { error } = await db
      .from("commercial_clients")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    console.error("deleteClientFromDB error:", e);
    throw e;
  }
}

// === INIT PRINCIPAL ===

async function initApp() {
  console.log("Init started");

  // Siempre comenzamos mostrando sólo el login
  showMapSection("login-screen");

  // Fecha por defecto en el formulario de contacto
  const fechaInput = document.getElementById("fecha");
  if (fechaInput) fechaInput.valueAsDate = new Date();

  // Cargar datos desde DB
  await loadContactsFromDB();
  await loadClientsFromDB();

  // Restaurar sesión
  await restoreSessionFromCookie();

  // Setear nombre de usuario actual si hay
  const currentUserSpan = document.getElementById("current-user");
  if (currentUser && currentUserSpan) {
    currentUserSpan.textContent = currentUser.name || currentUser.username;
  }

  // Si hay usuario logueado → mostrar app
  if (currentUser) {
    showMapSection("dashboard");
    showMapSection("app-screen");
    updateDashboard();
    renderContactsList();
    renderClientsList();
  } else {
    showMapSection("login-screen");
  }

  // Listeners (login, formularios...)
  setupEventListeners();

  console.log("Init complete");
}
/*****************************************************
 *  BLOQUE 2 - LOGIN, PASSWORD, CONTACTOS
 *****************************************************/

// === LOGIN ===

async function handleLogin(e) {
  e.preventDefault();
  const db = window.supabase;
  if (!db) {
    alert("Supabase no está disponible");
    return;
  }

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("login-error");

  const username = usernameInput ? usernameInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value.trim() : "";

  if (!username || !password) {
    if (errorBox) {
      errorBox.textContent = "Completa usuario y contraseña";
      errorBox.style.display = "block";
    } else {
      alert("Completa usuario y contraseña");
    }
    return;
  }

  try {
    const { data: userRows, error } = await db
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .limit(1);

    if (error || !userRows || userRows.length === 0) {
      if (errorBox) {
        errorBox.textContent = "Usuario o contraseña incorrectos";
        errorBox.style.display = "block";
      } else {
        alert("Usuario o contraseña incorrectos");
      }
      return;
    }

    currentUser = userRows[0];

    // Crear sesión
    await createSession(currentUser);

    // Mostrar nombre
    const currentUserSpan = document.getElementById("current-user");
    if (currentUserSpan) {
      currentUserSpan.textContent = currentUser.name || currentUser.username;
    }

    // ¿primer login?
    if (currentUser.first_login) {
      showMapSection("password-change-screen");
    } else {
      showMapSection("dashboard");
      showMapSection("app-screen");
      updateDashboard();
      renderContactsList();
      renderClientsList();
    }
  } catch (e) {
    console.error("Error en login:", e);
    if (errorBox) {
      errorBox.textContent = "Error al conectar con la base de datos";
      errorBox.style.display = "block";
    } else {
      alert("Error al conectar con la base de datos");
    }
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
      errorBox.textContent = "Las contraseñas no coinciden o son muy cortas (mínimo 6 caracteres)";
      errorBox.style.display = "block";
    } else {
      alert("Las contraseñas no coinciden o son muy cortas");
    }
    return;
  }

  try {
    const { error } = await db
      .from("users")
      .update({
        password: newPwd,
        first_login: false
      })
      .eq("username", currentUser.username);

    if (error) throw error;

    // Forzar que en memoria ya no tenga first_login
    currentUser.first_login = false;

    // Ir al dashboard
    showMapSection("app-screen");
    showMapSection("dashboard");
    updateDashboard();
    renderContactsList();
    renderClientsList();
  } catch (e) {
    console.error("Error cambiando contraseña:", e);
    if (errorBox) {
      errorBox.textContent = "Error al cambiar la contraseña";
      errorBox.style.display = "block";
    } else {
      alert("Error al cambiar la contraseña");
    }
  }
}

// === LOGOUT ===

async function logout() {
  await clearSession();
  currentUser = null;
  showMapSection("login-screen");
}

// === EVENT LISTENERS GENERALES ===

function setupEventListeners() {
  // Login
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Cambio de contraseña
  const pwdForm = document.getElementById("password-change-form");
  if (pwdForm) {
    pwdForm.addEventListener("submit", handlePasswordChange);
  }

  // Formulario de contacto
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", handleContactSubmit);
  }

  // Formulario de cliente
  const clientForm = document.getElementById("client-form");
  if (clientForm) {
    clientForm.addEventListener("submit", handleClientSubmit);
  }

  // Formularios de edición
  const editContactForm = document.getElementById("edit-contact-form");
  if (editContactForm) {
    editContactForm.addEventListener("submit", handleEditContactSubmit);
  }

  const editClientForm = document.getElementById("edit-client-form");
  if (editClientForm) {
    editClientForm.addEventListener("submit", handleEditClientSubmit);
  }
}

// === CONTACTOS: ALTA ===

async function handleContactSubmit(e) {
  e.preventDefault();
  if (!currentUser) {
    alert("Sesión expirada, vuelve a iniciar sesión");
    return;
  }

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
    fecha_registro: new Date().toISOString()
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

// === CONTACTOS: LISTA Y FILTROS ===

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("es-ES");
}

function renderContactsList(filtered = null) {
  const tbody = document.getElementById("contacts-tbody");
  if (!tbody) return;

  const data = filtered || contacts;
  tbody.innerHTML = "";

  // Mostramos más recientes arriba
  [...data].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || "")).reverse().forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(c.fecha)}</td>
      <td>${c.vendedor || ""}</td>
      <td>${c.cliente || ""}</td>
      <td>${c.empresa || ""}</td>
      <td>${c.producto || ""}</td>
      <td><span class="status-badge status-${(c.estado || "").toLowerCase().replace(/\s+/g, "-")}">${c.estado || "-"}</span></td>
      <td>${c.cliente_derivado || "-"}</td>
      <td>${c.motivo || "-"}</td>
      <td class="actions-column">
        <button class="btn-edit" onclick="editContact('${c.id}')">✏️</button>
        <button class="btn-delete" onclick="deleteContact('${c.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterContacts() {
  const vendedorSel = document.getElementById("filter-vendedor");
  const estadoSel = document.getElementById("filter-estado");
  const desdeInput = document.getElementById("filter-fecha-desde");
  const hastaInput = document.getElementById("filter-fecha-hasta");

  const vendedor = vendedorSel ? vendedorSel.value : "";
  const estado = estadoSel ? estadoSel.value : "";
  const desde = desdeInput ? desdeInput.value : "";
  const hasta = hastaInput ? hastaInput.value : "";

  let filtered = [...contacts];

  if (vendedor) {
    filtered = filtered.filter(c => c.vendedor === vendedor);
  }
  if (estado) {
    filtered = filtered.filter(c => c.estado === estado);
  }
  if (desde) {
    filtered = filtered.filter(c => (c.fecha || "") >= desde);
  }
  if (hasta) {
    filtered = filtered.filter(c => (c.fecha || "") <= hasta);
  }

  renderContactsList(filtered);
}

// === CONTACTOS: EDICIÓN / BORRADO ===

function editContact(id) {
  // 🔹 Aseguramos comparar números
  const contactId = Number(id);
  const c = contacts.find(x => Number(x.id) === contactId);
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

function closeEditContactModal() {
  hideElement("edit-contact-modal");
}

async function handleEditContactSubmit(e) {
  e.preventDefault();
  if (!currentUser) {
    alert("Sesión expirada");
    return;
  }

  const form = e.target;
  const formData = new FormData(form);
  const rawId =
    formData.get("edit-contact-id") ||
    document.getElementById("edit-contact-id").value;
  const contactId = Number(rawId);

  const old = contacts.find(c => Number(c.id) === contactId);
  if (!old) return;

  const updated = {
    ...old,
    fecha: formData.get("fecha"),
    vendedor: formData.get("vendedor"),
    cliente: formData.get("cliente"),
    empresa: formData.get("empresa"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    producto:
      formData.get("producto") ||
      formData.get("Producto") ||
      old.producto,
    estado: formData.get("estado"),
    cliente_derivado: formData.get("cliente-derivado") || "",
    motivo: formData.get("motivo") || "",
    editado_por: currentUser.username,
    fecha_edicion: new Date().toISOString()
  };

  try {
    // UPDATE en Supabase usando id numérico
    const safe = {
      fecha: updated.fecha,
      vendedor: updated.vendedor,
      cliente: updated.cliente,
      empresa: updated.empresa,
      telefono: updated.telefono,
      email: updated.email,
      producto: updated.producto,
      estado: updated.estado,
      cliente_derivado: updated.cliente_derivado,
      motivo: updated.motivo,
      editado_por: updated.editado_por,
      fecha_edicion: updated.fecha_edicion
    };

    const { data, error } = await window.supabase
      .from("commercial_contacts")
      .update(safe)
      .eq("id", contactId)
      .select("*")
      .maybeSingle();

    if (error) throw error;

    const idx = contacts.findIndex(c => Number(c.id) === contactId);
    if (idx !== -1 && data) contacts[idx] = data;

    closeEditContactModal();
    updateDashboard();
    renderContactsList();
    alert("✅ Contacto actualizado correctamente");
  } catch (e) {
    console.error("Error editando contacto:", e);
    alert("Error guardando cambios");
  }
}

async function deleteContact(id) {
  if (!confirm("¿Estás seguro de eliminar este contacto?")) return;

  const contactId = Number(id);

  try {
    await deleteContactFromDB(contactId);
    // 🔹 Filtramos comparando como número
    contacts = contacts.filter(c => Number(c.id) !== contactId);
    updateDashboard();
    renderContactsList();
  } catch (e) {
    console.error("Error borrando contacto:", e);
    alert("Error borrando contacto");
  }
}


/*****************************************************
 *  BLOQUE 3 - CLIENTES, DASHBOARD, REPORTES, EXPORT
 *****************************************************/

// === CLIENTES: ALTA ===

async function handleClientSubmit(e) {
  e.preventDefault();
  if (!currentUser) {
    alert("Sesión expirada, vuelve a iniciar sesión");
    return;
  }

  const form = e.target;
  const formData = new FormData(form);

  const client = {
    name: formData.get("client-name") || "",
    company: formData.get("client-company") || "",
    phone: formData.get("client-phone") || "",
    email: formData.get("client-email") || "",
    address: formData.get("client-address") || "",
    type: formData.get("client-type") || "",
    status: formData.get("client-status") || "",
    notes: formData.get("client-notes") || "",
    registered_by: currentUser.username,
    registered_at: new Date().toISOString(),
    coordinates: null
  };

  try {
    const saved = await saveClientToDB(client);
    clients.push(saved);
    showMessage("client-success-message");
    form.reset();
    const coordDisp = document.getElementById("coordinates-display");
    if (coordDisp) coordDisp.textContent = "";
    updateDashboard();
    renderClientsList();
    updateClientSelectFromClients();
  } catch (e) {
    console.error("Error guardando cliente:", e);
    alert("Error guardando cliente");
  }
}

// === CLIENTES: LISTA Y FILTROS ===

function renderClientsList(filtered = null) {
  const tbody = document.getElementById("clients-tbody");
  if (!tbody) return;

  const data = filtered || clients;
  tbody.innerHTML = "";

  data.forEach(c => {
    // Conteo de derivaciones que llegan a este cliente
    const derivCount = contacts.filter(x => x.cliente_derivado === c.company).length;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name || ""}</td>
      <td>${c.company || ""}</td>
      <td>${c.phone || "-"}</td>
      <td>${c.email || "-"}</td>
      <td>${c.address || "-"}</td>
      <td>${c.type || "-"}</td>
      <td><span class="status-badge status-${(c.status || "").toLowerCase()}">${c.status || "-"}</span></td>
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

  const type = typeSel ? typeSel.value : "";
  const status = statusSel ? statusSel.value : "";

  let filtered = [...clients];

  if (type) filtered = filtered.filter(c => c.type === type);
  if (status) filtered = filtered.filter(c => c.status === status);

  renderClientsList(filtered);
}

// === CLIENTES: EDICIÓN / BORRADO ===

// === CLIENTES: EDICIÓN / BORRADO ===

function editClient(id) {
  const c = clients.find(x => x.id === id);
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
  setVal("edit-client-status", c.status);
  setVal("edit-client-notes", c.notes);
}

function closeEditClientModal() {
  hideElement("edit-client-modal");
}

// === GUARDAR CAMBIOS DEL CLIENTE ===
// === CLIENTES: GUARDAR CAMBIOS / EDICIÓN / BORRADO ===

async function saveClientToDB(client) {
  try {
    const safe = {
      name: client.name?.toString() || "Sin nombre",
      company: client.company?.toString() || "",
      phone: client.phone?.toString() || "",
      email: client.email?.toString() || "",
      address: client.address?.toString() || "",
      type: client.type?.toString() || "",
      status: client.status?.toString() || "",
      notes: client.notes?.toString() || "",
      registered_by: currentUser?.username?.toString() || "",
      registered_at: new Date().toISOString()
    };

    // agregar coordenadas solo si son válidas
    if (
      client.coordinates &&
      typeof client.coordinates === "object" &&
      client.coordinates.lat &&
      client.coordinates.lng
    ) {
      safe.coordinates = client.coordinates;
    }

    console.log("Actualizando cliente con ID:", client.id);

    // 1️⃣ Realizar UPDATE
    const { error } = await window.supabase
      .from("commercial_clients")
      .update(safe)
      .eq("id", client.id.toString().trim());

    if (error) throw error;

    // 2️⃣ Verificar que el registro existe y fue actualizado
    const { data: verify, error: verifyErr } = await window.supabase
      .from("commercial_clients")
      .select("*")
      .eq("id", client.id.toString().trim())
      .limit(1);

    if (verifyErr) throw verifyErr;
    if (!verify || verify.length === 0)
      throw new Error("No se actualizó ningún registro");

    console.log("Cliente actualizado correctamente:", verify[0]);
    return verify[0];
  } catch (e) {
    console.error("saveClientToDB error:", e);
    throw e;
  }
}

// === ENVÍO DEL FORMULARIO DE EDICIÓN ===
async function handleEditClientSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    alert("Sesión expirada. Iniciá sesión nuevamente.");
    return;
  }

  const form = e.target;
  const id = document.getElementById("edit-client-id").value;

  // armar el objeto actualizado
  const updatedClient = {
    id,
    name: form.querySelector("#edit-client-name").value.trim(),
    company: form.querySelector("#edit-client-company").value.trim(),
    phone: form.querySelector("#edit-client-phone").value.trim(),
    email: form.querySelector("#edit-client-email").value.trim(),
    address: form.querySelector("#edit-client-address").value.trim(),
    type: form.querySelector("#edit-client-type").value,
    status: form.querySelector("#edit-client-status").value,
    notes: form.querySelector("#edit-client-notes").value.trim()
  };

  // intentar leer las coordenadas visibles en el formulario
  const coordsDisplay = document.getElementById("edit-coordinates-display");
  if (coordsDisplay && coordsDisplay.dataset.lat && coordsDisplay.dataset.lng) {
    updatedClient.coordinates = {
      lat: parseFloat(coordsDisplay.dataset.lat),
      lng: parseFloat(coordsDisplay.dataset.lng)
    };
  }

  try {
    const saved = await saveClientToDB(updatedClient);
    const idx = clients.findIndex(c => c.id === id);
    if (idx !== -1) clients[idx] = saved;

    closeEditClientModal();
    updateDashboard();
    renderClientsList();

    alert("✅ Cliente actualizado correctamente");
  } catch (err) {
    console.error("Error editando cliente:", err);
    alert("❌ Error guardando los cambios del cliente");
  }
}

// === BORRADO DE CLIENTE ===
async function deleteClient(id) {
  if (!confirm("¿Estás seguro de eliminar este cliente?")) return;

  try {
    await deleteClientFromDB(id);
    clients = clients.filter(c => c.id !== id);
    updateDashboard();
    renderClientsList();
  } catch (e) {
    console.error("Error borrando cliente:", e);
    alert("Error borrando cliente");
  }
}

// Exponer al scope global
window.handleEditClientSubmit = handleEditClientSubmit;
window.editClient = editClient;
window.closeEditClientModal = closeEditClientModal;


// === DASHBOARD ===

function updateDashboard() {
  try {
    const totalContacts = contacts.length;
    const totalSales = contacts.filter(c => c.estado === "Vendido").length;
    const totalReferrals = contacts.filter(c => c.estado === "Derivado").length;
    const conversionRate = totalContacts ? Math.round((totalSales / totalContacts) * 100) : 0;
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === "Activo").length;

    // 🔸 Nuevo cálculo: total de productos solicitados
    const totalProducts = contacts.filter(c => c.producto && c.producto.trim() !== "").length;

    // Asignar valores al DOM
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

    // 🔸 Actualizar contador de productos solicitados
    const productsBox = document.getElementById("total-products");
    if (productsBox) productsBox.textContent = totalProducts;

  } catch (e) {
    console.warn("updateDashboard error:", e);
  }
}


// === SELECT DE CLIENTES PARA DERIVACIÓN ===

function updateClientSelectFromClients() {
  const sel = document.getElementById("cliente-derivado");
  const editSel = document.getElementById("edit-cliente-derivado");
  if (!sel && !editSel) return;

  const companies = [...new Set(clients.map(c => c.company).filter(Boolean))].sort();
  const fill = (select) => {
    if (!select) return;
    select.innerHTML = `<option value="">Seleccionar cliente</option>`;
    companies.forEach(name => {
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
  // Podría usarse para alimentar algo si hace falta; ahora mismo no estrictamente necesario.
}

// === REPORTES (VERSIÓN RESUMIDA) ===

function generateReports() {
  generateSalesReport();
  generateStatusReport();
  generateTopReferralsReport();
  generateTimelineReport();
  generateReferralsReport();

  // 🔸 Nuevos reportes
  generateTopProductsReport();
  generateProductsBySellerReport();
  generateRequestsByCategoryReport();
}


// Ventas por vendedor
function generateSalesReport() {
  const container = document.getElementById("sales-report");
  if (!container) return;

  const vendedores = [
    "Juan Larrondo",
    "Andrés Iñiguez",
    "Eduardo Schiavi",
    "Gabriel Caffarello",
    "Natalia Montero"
  ];

  const salesData = vendedores.map(v => ({
    name: v,
    count: contacts.filter(c => c.vendedor === v && c.estado === "Vendido").length
  }));

  const max = Math.max(...salesData.map(d => d.count), 1);

  container.innerHTML = salesData.map(item => `
    <div class="chart-bar">
      <div class="chart-label">${item.name}</div>
      <div class="chart-value" style="width: ${Math.max((item.count / max) * 100, 5)}%">
        ${item.count} ventas
      </div>
    </div>
  `).join("");
}
// === NUEVOS REPORTES DE PRODUCTOS ===

// 🥚 Productos más solicitados
function generateTopProductsReport() {
  const container = document.getElementById("top-products-report");
  if (!container) return;

  const counts = {};
  contacts.forEach(c => {
    if (c.producto && c.producto.trim() !== "") {
      const name = c.producto.trim();
      counts[name] = (counts[name] || 0) + 1;
    }
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:#666;">No hay productos registrados</p>`;
    return;
  }

  container.innerHTML = sorted.map(([prod, count], i) => `
    <div class="ranking-item">
      <span class="ranking-position">#${i + 1}</span>
      <span class="ranking-name">${prod}</span>
      <span class="ranking-value">${count}</span>
    </div>
  `).join("");
}

// 👩‍💼 Productos por vendedor
function generateProductsBySellerReport() {
  const container = document.getElementById("products-by-seller-report");
  if (!container) return;

  const sellers = {};
  contacts.forEach(c => {
    if (!c.vendedor || !c.producto) return;
    if (!sellers[c.vendedor]) sellers[c.vendedor] = {};
    const prod = c.producto.trim();
    sellers[c.vendedor][prod] = (sellers[c.vendedor][prod] || 0) + 1;
  });

  const html = Object.entries(sellers).map(([seller, products]) => {
    const items = Object.entries(products)
      .sort((a, b) => b[1] - a[1])
      .map(([prod, count]) => `<li>${prod}: ${count}</li>`)
      .join("");
    return `
      <div class="seller-block">
        <strong>${seller}</strong>
        <ul>${items}</ul>
      </div>
    `;
  }).join("");

  container.innerHTML = html || `<p style="text-align:center;color:#666;">Sin registros de productos por vendedor</p>`;
}

// 📦 Solicitudes por categoría (usa el campo "type" del cliente derivado)
function generateRequestsByCategoryReport() {
  const container = document.getElementById("requests-by-category-report");
  if (!container) return;

  const counts = {};
  contacts.forEach(c => {
    if (c.type && c.type.trim() !== "") {
      counts[c.type] = (counts[c.type] || 0) + 1;
    }
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:#666;">No hay categorías registradas</p>`;
    return;
  }

  container.innerHTML = sorted.map(([cat, count]) => `
    <div class="ranking-item">
      <span class="ranking-name">${cat}</span>
      <span class="ranking-value">${count}</span>
    </div>
  `).join("");
}


// Resumen de estados
function generateStatusReport() {
  const container = document.getElementById("status-report");
  if (!container) return;

  const vendidos = contacts.filter(c => c.estado === "Vendido").length;
  const noVendidos = contacts.filter(c => c.estado === "No Vendido").length;
  const derivados = contacts.filter(c => c.estado === "Derivado").length;

  container.innerHTML = `
    <div class="status-item status-vendido">
      <span class="status-number">${vendidos}</span>
      <span>Vendidos</span>
    </div>
    <div class="status-item status-no-vendido">
      <span class="status-number">${noVendidos}</span>
      <span>No Vendidos</span>
    </div>
    <div class="status-item status-derivado">
      <span class="status-number">${derivados}</span>
      <span>Derivados</span>
    </div>
  `;
}

// Top derivaciones
function generateTopReferralsReport() {
  const container = document.getElementById("referrals-report");
  if (!container) return;

  const counts = {};
  contacts
    .filter(c => c.estado === "Derivado" && c.cliente_derivado)
    .forEach(c => {
      counts[c.cliente_derivado] = (counts[c.cliente_derivado] || 0) + 1;
    });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (!sorted.length) {
    container.innerHTML = `<p style="text-align:center;color:#666;">No hay derivaciones registradas</p>`;
    return;
  }

  container.innerHTML = sorted.map(([name, count], idx) => `
    <div class="ranking-item">
      <span class="ranking-position">#${idx + 1}</span>
      <span class="ranking-name">${name}</span>
      <span class="ranking-value">${count}</span>
    </div>
  `).join("");
}

// Evolución mensual simple
function generateTimelineReport() {
  const container = document.getElementById("timeline-report");
  if (!container) return;

  const monthly = {};
  contacts.forEach(c => {
    if (!c.fecha) return;
    const month = c.fecha.substring(0, 7);
    if (!monthly[month]) monthly[month] = { total: 0, vendidos: 0, derivados: 0 };
    monthly[month].total++;
    if (c.estado === "Vendido") monthly[month].vendidos++;
    if (c.estado === "Derivado") monthly[month].derivados++;
  });

  const months = Object.keys(monthly).sort().slice(-6);
  if (!months.length) {
    container.innerHTML = `<p style="text-align:center;color:#666;">No hay datos temporales</p>`;
    return;
  }

  container.innerHTML = months.map(m => {
    const d = monthly[m];
    const label = new Date(m + "-01").toLocaleDateString("es-ES", { month: "short", year: "numeric" });
    return `
      <div class="timeline-item">
        <span class="timeline-month">${label}</span>
        <div class="timeline-stats">
          <span class="timeline-stat stat-total">${d.total} total</span>
          <span class="timeline-stat stat-ventas">${d.vendidos} ventas</span>
          <span class="timeline-stat stat-derivaciones">${d.derivados} deriv.</span>
        </div>
      </div>
    `;
  }).join("");
}

// Informe detallado de derivaciones
function generateReferralsReport() {
  const tbody = document.getElementById("referrals-tbody");
  if (!tbody) return;

  const stats = {};
  const todayMonth = new Date().toISOString().slice(0, 7);

  contacts
    .filter(c => c.estado === "Derivado" && c.cliente_derivado)
    .forEach(c => {
      const name = c.cliente_derivado;
      if (!stats[name]) {
        stats[name] = {
          total: 0,
          thisMonth: 0,
          lastContact: null,
          sellers: {}
        };
      }
      stats[name].total++;
      if ((c.fecha || "").slice(0, 7) === todayMonth) stats[name].thisMonth++;
      if (!stats[name].lastContact || (c.fecha || "") > stats[name].lastContact) {
        stats[name].lastContact = c.fecha;
      }
      if (!stats[name].sellers[c.vendedor]) stats[name].sellers[c.vendedor] = 0;
      stats[name].sellers[c.vendedor]++;
    });

  const rows = Object.entries(stats).sort((a, b) => b[1].total - a[1].total);

  tbody.innerHTML = "";
  rows.forEach(([clientName, data]) => {
    const bestSeller =
      Object.entries(data.sellers).sort((a, b) => b[1] - a[1])[0] || null;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${clientName}</strong></td>
      <td>${data.total}</td>
      <td>${data.thisMonth}</td>
      <td>${formatDate(data.lastContact)}</td>
      <td>${bestSeller ? `${bestSeller[0]} (${bestSeller[1]})` : "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// === EXPORTACIONES ===

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
    "Motivo"
  ];

  const rows = contacts.map(c => [
    c.fecha || "",
    c.vendedor || "",
    c.cliente || "",
    c.empresa || "",
    c.telefono || "",
    c.email || "",
    c.producto || "",
    c.estado || "",
    c.cliente_derivado || "",
    c.motivo || ""
  ]);

  const csvLines = [header, ...rows].map(cols =>
    cols
      .map(v => `"${(v || "").toString().replace(/"/g, '""')}"`)
      .join(",")
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
    "Tipo",
    "Estado",
    "Derivaciones Recibidas",
    "Notas"
  ];

  const rows = clients.map(c => {
    const derivs = contacts.filter(x => x.cliente_derivado === c.company).length;
    return [
      c.name || "",
      c.company || "",
      c.phone || "",
      c.email || "",
      c.address || "",
      c.type || "",
      c.status || "",
      derivs,
      c.notes || ""
    ];
  });

  const csvLines = [header, ...rows].map(cols =>
    cols
      .map(v => `"${(v || "").toString().replace(/"/g, '""')}"`)
      .join(",")
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
  report += `Ventas realizadas: ${contacts.filter(c => c.estado === "Vendido").length}\n`;
  report += `Derivaciones: ${contacts.filter(c => c.estado === "Derivado").length}\n`;
  report += `Clientes registrados: ${clients.length}\n\n`;

  const counts = {};
  contacts
    .filter(c => c.estado === "Derivado" && c.cliente_derivado)
    .forEach(c => {
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
 *  BLOQUE 4 - MAPA, GEOLOCALIZACIÓN, GLOBAL
 *****************************************************/

/*****************************************************
 *  BLOQUE 4 - MAPA, GEOLOCALIZACIÓN, GLOBAL
 *****************************************************/

// === MAPA DE CLIENTES (Versión final estable con Leaflet) ===
let mapView = null;
let markersLayer = null;

// Inicializa o reinicia el mapa
async function initLeafletMap() {
  try {
    const mapDiv = document.getElementById("map");
    if (!mapDiv) return;

    // Si ya existe, eliminarlo para evitar errores
    if (mapView) {
      mapView.remove();
      mapView = null;
    }

    mapView = L.map("map").setView([-34.6037, -58.3816], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapView);

    markersLayer = L.layerGroup().addTo(mapView);
    await showAllClientsOnMap();
  } catch (err) {
    console.error("initLeafletMap error:", err);
  }
}

// Muestra todos los clientes con coordenadas
async function showAllClientsOnMap() {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  if (!clients || clients.length === 0) {
    alert("No hay clientes registrados.");
    return;
  }

  const coords = [];

  for (const c of clients) {
    // Geocodificación si no tiene coordenadas
    if (!c.coordinates && c.address) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(c.address)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          c.coordinates = { lat: parseFloat(lat), lng: parseFloat(lon) };
        }
      } catch (err) {
        console.warn(`No se pudo geocodificar: ${c.address}`, err);
      }
    }

    if (c.coordinates) {
      const lat = parseFloat(c.coordinates.lat);
      const lng = parseFloat(c.coordinates.lng);
      if (!isNaN(lat) && !isNaN(lng)) {

        // 🔹 Calcular cantidad de derivaciones de este cliente
        const derivCount = contacts.filter(x => x.cliente_derivado === c.company).length;
        console.log(`Derivaciones para ${c.company}:`, derivCount);

        const marker = L.marker([lat, lng]).addTo(markersLayer);

        // 🔹 Popup con datos + cantidad de derivaciones
        marker.bindPopup(`
          <b>${c.name || "-"}</b><br>
          ${c.company || ""}<br>
          ${c.address || ""}<br>
          <em>${c.type || ""} - ${c.status || ""}</em><br>
          <hr>
          <b>Derivaciones recibidas:</b> ${derivCount}
        `);

        coords.push([lat, lng]);
      }
    }
  }

  if (coords.length > 0) {
    const bounds = L.latLngBounds(coords);
    mapView.fitBounds(bounds, { padding: [50, 50] });
  } else {
    resetMapView();
  }
}

// Restablece la vista inicial
function resetMapView() {
  if (mapView) {
    mapView.setView([-34.6037, -58.3816], 6);
  }
}

// Botón "Ver en mapa"
function showClientsOnMap() {
  // Mostramos directamente la sección del mapa
  showMapSection("map-section");
}


// === GEOLOCALIZACIÓN ===

// Buscar coordenadas (formulario nuevo cliente)
async function geocodeCurrentAddress() {
  const addressInput = document.getElementById("client-address");
  const coordDisplay = document.getElementById("coordinates-display");
  if (!addressInput || !coordDisplay) return;

  const address = addressInput.value.trim();
  if (!address) return alert("Por favor ingresá una dirección para geocodificar.");

  coordDisplay.textContent = "Buscando ubicación...";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || data.length === 0) {
      coordDisplay.textContent = "No se encontró ubicación.";
      return alert("No se encontró la dirección ingresada.");
    }

    const { lat, lon } = data[0];
    coordDisplay.textContent = `Lat: ${lat}, Lng: ${lon}`;
    coordDisplay.dataset.lat = lat;
    coordDisplay.dataset.lng = lon;
    alert(`Ubicación encontrada:\nLat: ${lat}\nLng: ${lon}`);
  } catch (err) {
    coordDisplay.textContent = "Error al obtener coordenadas.";
    console.error("Error en geocodeCurrentAddress:", err);
    alert("Ocurrió un error al obtener la ubicación.");
  }
}

// Buscar coordenadas (formulario editar cliente)
async function geocodeCurrentAddressEdit() {
  const addressInput = document.getElementById("edit-client-address");
  const coordDisplay = document.getElementById("edit-coordinates-display");
  if (!addressInput || !coordDisplay) return;

  const address = addressInput.value.trim();
  if (!address) return alert("Por favor ingresá una dirección para geocodificar.");

  coordDisplay.textContent = "Buscando ubicación...";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || data.length === 0) {
      coordDisplay.textContent = "No se encontró ubicación.";
      return alert("No se encontró la dirección ingresada.");
    }

    const { lat, lon } = data[0];
    coordDisplay.textContent = `Lat: ${lat}, Lng: ${lon}`;
    coordDisplay.dataset.lat = lat;
    coordDisplay.dataset.lng = lon;
    alert(`Ubicación encontrada:\nLat: ${lat}\nLng: ${lon}`);
  } catch (err) {
    coordDisplay.textContent = "Error al obtener coordenadas.";
    console.error("Error en geocodeCurrentAddressEdit:", err);
    alert("Ocurrió un error al obtener la ubicación.");
  }
}

// Obtener ubicación actual (modo edición)
function getCurrentLocationEdit() {
  const coordDisplay = document.getElementById("edit-coordinates-display");
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  coordDisplay.textContent = "Obteniendo tu ubicación actual...";
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lon = pos.coords.longitude.toFixed(6);
      coordDisplay.textContent = `Lat: ${lat}, Lng: ${lon}`;
      coordDisplay.dataset.lat = lat;
      coordDisplay.dataset.lng = lon;
      alert(`Ubicación actual:\nLat: ${lat}\nLng: ${lon}`);
    },
    err => {
      coordDisplay.textContent = "No se pudo obtener ubicación.";
      alert("Error al obtener ubicación: " + err.message);
    }
  );
}

// === REGISTRO GLOBAL (window) ===
window.showClientsOnMap = showClientsOnMap;
window.geocodeCurrentAddress = geocodeCurrentAddress;
window.geocodeCurrentAddressEdit = geocodeCurrentAddressEdit;
window.getCurrentLocationEdit = getCurrentLocationEdit;
window.initLeafletMap = initLeafletMap;
window.resetMapView = resetMapView;

console.log("🌍 Funciones de geolocalización registradas correctamente en window");

// === DOM READY ===
document.addEventListener("DOMContentLoaded", () => {
  initApp().catch(err => console.error("initApp error:", err));
});

// --- Mostrar secciones y asegurar que el mapa se cargue correctamente ---
function showMapSection(sectionId) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // Si el usuario va al mapa directamente
  if (sectionId === "map-section") {
    setTimeout(() => {
      // Si ya existe el mapa, solo refrescarlo
      if (window.map) {
        window.map.invalidateSize();
      } else if (typeof initMap === "function") {
        initMap(); // Inicializar por primera vez
      } else {
        console.error("❌ initMap() no está definida");
      }
    }, 400);
  }
}
