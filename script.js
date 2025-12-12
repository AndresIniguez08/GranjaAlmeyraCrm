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
  // 🔴 IMPORTANTE: usar "block" para que se vean aunque .section tenga display:none en CSS
  if (el) el.style.display = "block";
}
function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
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
        // login y cambio de contraseña usan flex
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
  if (realId === "map-section" && typeof initLeafletMap === "function")
    setTimeout(initLeafletMap, 300);
}

// === SESIONES ===
async function createSession(user) {
  const token = crypto.randomUUID();
  setCookie("granja_session", token, 7);
  try {
    await window.supabase
      .from("sessions")
      .insert({ token, user_id: user.username });
  } catch (e) {
    console.error("createSession error:", e);
  }
}
async function clearSession() {
  const token = getCookie("granja_session");
  eraseCookie("granja_session");
  if (token)
    await window.supabase.from("sessions").delete().eq("token", token);
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

  const fechaInput = document.getElementById("fecha");
  if (fechaInput) fechaInput.valueAsDate = new Date();

  await loadContactsFromDB();
  await loadClientsFromDB();
  await restoreSessionFromCookie();

  const userSpan = document.getElementById("current-user");
  if (currentUser && userSpan)
    userSpan.textContent = currentUser.name || currentUser.username;

  if (currentUser) {
    showSection("dashboard");
    showSection("app-screen");
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
      errorBox.textContent =
        "Las contraseñas no coinciden o son muy cortas (mínimo 6 caracteres)";
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
        first_login: false,
      })
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
    } else {
      alert("Error al cambiar la contraseña");
    }
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
  if (editContactForm)
    editContactForm.addEventListener("submit", handleEditContactSubmit);

  const editClientForm = document.getElementById("edit-client-form");
  if (editClientForm)
    editClientForm.addEventListener("submit", handleEditClientSubmit);
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
  try {
    const { data, error } = await window.supabase
      .from("commercial_contacts")
      .insert(contact)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("No se devolvieron datos al guardar contacto");

    return data;
  } catch (e) {
    console.error("saveContactToDB error:", e);
    throw e;
  }
}

// === CONTACTOS: LISTA Y FILTROS ===
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
        ? `<button class="btn-whatsapp" title="Contactar por WhatsApp" 
            onclick="sendWhatsApp('${phone}', '', '${c.cliente}', '${c.producto}')">💬</button>`
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

// === CONTACTOS: EDICIÓN / BORRADO ===
function editContact(id) {
  const c = contacts.find((x) => x.id === id);
  if (!c) {
    console.warn("No se encontró el contacto con id:", id);
    return;
  }

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

// === Derivación (alta / edición) ===
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

// === EDICIÓN FINAL SIN 406 ===
async function handleEditContactSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    alert("Sesión expirada");
    return;
  }

  const id = document.getElementById("edit-contact-id").value;
  const old = contacts.find((c) => c.id === id);
  if (!old) {
    alert("No se encontró el contacto a editar.");
    return;
  }

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
      .eq("id", id); // 👈 sin .select("*")

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

window.closeEditContactModal = () => hideElement("edit-contact-modal");

// Exponer funciones globalmente
window.editContact = editContact;
window.handleEditContactSubmit = handleEditContactSubmit;
window.deleteContact = deleteContact;
window.logout = logout;
window.handleLogin = handleLogin;
window.handlePasswordChange = handlePasswordChange;


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

  const coordinates = (() => {
    const coordDisplay = document.getElementById("coordinates-display");
    if (
      coordDisplay &&
      coordDisplay.dataset.lat &&
      coordDisplay.dataset.lng
    ) {
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

// Insertar nuevo cliente
async function insertClientToDB(client) {
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
  } catch (e) {
    console.error("insertClientToDB error:", e);
    throw e;
  }
}

// === CLIENTES: LISTA Y FILTROS ===
function renderClientsList(filtered = null) {
  const tbody = document.getElementById("clients-tbody");
  if (!tbody) return;

  const data = filtered || clients;
  tbody.innerHTML = "";

  data.forEach((c) => {
    const derivCount = contacts.filter(
      (x) => x.cliente_derivado === c.company
    ).length;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name || ""}</td>
      <td>${c.company || ""}</td>
      <td>${c.phone || "-"}</td>
      <td>${c.email || "-"}</td>
      <td>${c.address || "-"}</td>
      <td>${c.type || "-"}</td>
      <td><span class="status-badge status-${(c.status || "").toLowerCase()}">${
      c.status || "-"
    }</span></td>
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

  if (type) filtered = filtered.filter((c) => c.type === type);
  if (status) filtered = filtered.filter((c) => c.status === status);

  renderClientsList(filtered);
}

// === CLIENTES: EDICIÓN / BORRADO ===
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
  setVal("edit-client-status", c.status);
  setVal("edit-client-notes", c.notes);

  const coordDisplay = document.getElementById("edit-coordinates-display");
  if (coordDisplay) {
    if (c.coordinates && c.coordinates.lat && c.coordinates.lng) {
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

// Actualizar cliente en DB
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
      registered_at: client.registered_at || new Date().toISOString(),
    };

    if (
      client.coordinates &&
      typeof client.coordinates === "object" &&
      client.coordinates.lat &&
      client.coordinates.lng
    ) {
      safe.coordinates = client.coordinates;
    }

    const { error } = await window.supabase
      .from("commercial_clients")
      .update(safe)
      .eq("id", client.id.toString().trim());

    if (error) throw error;

    const { data: verify, error: verifyErr } = await window.supabase
      .from("commercial_clients")
      .select("*")
      .eq("id", client.id.toString().trim())
      .limit(1);

    if (verifyErr) throw verifyErr;
    if (!verify || verify.length === 0)
      throw new Error("No se actualizó ningún registro");

    return verify[0];
  } catch (e) {
    console.error("saveClientToDB error:", e);
    throw e;
  }
}

// Envío formulario edición cliente
async function handleEditClientSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    alert("Sesión expirada. Iniciá sesión nuevamente.");
    return;
  }

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
    status: form.querySelector("#edit-client-status").value,
    notes: form.querySelector("#edit-client-notes").value.trim(),
  };

  const coordsDisplay = document.getElementById("edit-coordinates-display");
  if (coordsDisplay && coordsDisplay.dataset.lat && coordsDisplay.dataset.lng) {
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
    console.error("Error editando cliente:", err);
    alert("❌ Error guardando los cambios del cliente");
  }
}

// Borrar cliente
async function deleteClientFromDB(id) {
  try {
    const { error } = await window.supabase
      .from("commercial_clients")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    console.error("deleteClientFromDB error:", e);
    throw e;
  }
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

// Exponer al scope global
window.handleEditClientSubmit = handleEditClientSubmit;
window.editClient = editClient;
window.closeEditClientModal = closeEditClientModal;

// === DASHBOARD ===
function updateDashboard() {
  try {
    const totalContacts = contacts.length;
    const totalSales = contacts.filter((c) => c.estado === "Vendido").length;
    const totalReferrals = contacts.filter(
      (c) => c.estado === "Derivado"
    ).length;
    const conversionRate = totalContacts
      ? Math.round((totalSales / totalContacts) * 100)
      : 0;
    const totalClients = clients.length;
    const activeClients = clients.filter(
      (c) => c.status === "Activo"
    ).length;

    const totalProducts = contacts.filter(
      (c) => c.producto && c.producto.trim() !== ""
    ).length;

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

// === SELECT DE CLIENTES PARA DERIVACIÓN ===
function updateClientSelectFromClients() {
  const sel = document.getElementById("cliente-derivado");
  const editSel = document.getElementById("edit-cliente-derivado");
  if (!sel && !editSel) return;

  const companies = [
    ...new Set(clients.map((c) => c.company).filter(Boolean)),
  ].sort();
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
  // reservado por si lo necesitás luego
}

// === REPORTES ===
function generateReports() {
  generateSalesReport();
  generateStatusReport();
  generateTopReferralsReport();
  generateTimelineReport();
  generateReferralsReport();
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
    "Natalia Montero",
  ];

  const salesData = vendedores.map((v) => ({
    name: v,
    count: contacts.filter(
      (c) => c.vendedor === v && c.estado === "Vendido"
    ).length,
  }));

  const max = Math.max(...salesData.map((d) => d.count), 1);

  container.innerHTML = salesData
    .map(
      (item) => `
    <div class="chart-bar">
      <div class="chart-label">${item.name}</div>
      <div class="chart-value" style="width: ${Math.max(
        (item.count / max) * 100,
        5
      )}%">
        ${item.count} ventas
      </div>
    </div>
  `
    )
    .join("");
}

// Productos más solicitados
function generateTopProductsReport() {
  const container = document.getElementById("top-products-report");
  if (!container) return;

  const counts = {};
  contacts.forEach((c) => {
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

  container.innerHTML = sorted
    .map(
      ([prod, count], i) => `
    <div class="ranking-item">
      <span class="ranking-position">#${i + 1}</span>
      <span class="ranking-name">${prod}</span>
      <span class="ranking-value">${count}</span>
    </div>
  `
    )
    .join("");
}

// Productos por vendedor
function generateProductsBySellerReport() {
  const container = document.getElementById("products-by-seller-report");
  if (!container) return;

  const sellers = {};
  contacts.forEach((c) => {
    if (!c.vendedor || !c.producto) return;
    if (!sellers[c.vendedor]) sellers[c.vendedor] = {};
    const prod = c.producto.trim();
    sellers[c.vendedor][prod] = (sellers[c.vendedor][prod] || 0) + 1;
  });

  const html = Object.entries(sellers)
    .map(([seller, products]) => {
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
    })
    .join("");

  container.innerHTML =
    html ||
    `<p style="text-align:center;color:#666;">Sin registros de productos por vendedor</p>`;
}

// Solicitudes por categoría (si usás type en contactos)
function generateRequestsByCategoryReport() {
  const container = document.getElementById("requests-by-category-report");
  if (!container) return;

  const counts = {};
  contacts.forEach((c) => {
    if (c.type && c.type.trim() !== "") {
      counts[c.type] = (counts[c.type] || 0) + 1;
    }
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:#666;">No hay categorías registradas</p>`;
    return;
  }

  container.innerHTML = sorted
    .map(
      ([cat, count]) => `
    <div class="ranking-item">
      <span class="ranking-name">${cat}</span>
      <span class="ranking-value">${count}</span>
    </div>
  `
    )
    .join("");
}

// Resumen de estados
function generateStatusReport() {
  const container = document.getElementById("status-report");
  if (!container) return;

  const vendidos = contacts.filter((c) => c.estado === "Vendido").length;
  const noVendidos = contacts.filter((c) => c.estado === "No Vendido").length;
  const derivados = contacts.filter((c) => c.estado === "Derivado").length;

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
    .filter((c) => c.estado === "Derivado" && c.cliente_derivado)
    .forEach((c) => {
      counts[c.cliente_derivado] = (counts[c.cliente_derivado] || 0) + 1;
    });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!sorted.length) {
    container.innerHTML = `<p style="text-align:center;color:#666;">No hay derivaciones registradas</p>`;
    return;
  }

  container.innerHTML = sorted
    .map(
      ([name, count], idx) => `
    <div class="ranking-item">
      <span class="ranking-position">#${idx + 1}</span>
      <span class="ranking-name">${name}</span>
      <span class="ranking-value">${count}</span>
    </div>
  `
    )
    .join("");
}

// Evolución mensual
function generateTimelineReport() {
  const container = document.getElementById("timeline-report");
  if (!container) return;

  const monthly = {};
  contacts.forEach((c) => {
    if (!c.fecha) return;
    const month = c.fecha.substring(0, 7);
    if (!monthly[month])
      monthly[month] = { total: 0, vendidos: 0, derivados: 0 };
    monthly[month].total++;
    if (c.estado === "Vendido") monthly[month].vendidos++;
    if (c.estado === "Derivado") monthly[month].derivados++;
  });

  const months = Object.keys(monthly).sort().slice(-6);
  if (!months.length) {
    container.innerHTML = `<p style="text-align:center;color:#666;">No hay datos temporales</p>`;
    return;
  }

  container.innerHTML = months
    .map((m) => {
      const d = monthly[m];
      const label = new Date(m + "-01").toLocaleDateString("es-ES", {
        month: "short",
        year: "numeric",
      });
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
    })
    .join("");
}

// Informe detallado de derivaciones
function generateReferralsReport() {
  const tbody = document.getElementById("referrals-tbody");
  if (!tbody) return;

  const stats = {};
  const todayMonth = new Date().toISOString().slice(0, 7);

  contacts
    .filter((c) => c.estado === "Derivado" && c.cliente_derivado)
    .forEach((c) => {
      const name = c.cliente_derivado;
      if (!stats[name]) {
        stats[name] = {
          total: 0,
          thisMonth: 0,
          lastContact: null,
          sellers: {},
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
    cols
      .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
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
    "Notas",
  ];

  const rows = clients.map((c) => {
    const derivs = contacts.filter(
      (x) => x.cliente_derivado === c.company
    ).length;
    return [
      c.name || "",
      c.company || "",
      c.phone || "",
      c.email || "",
      c.address || "",
      c.type || "",
      c.status || "",
      derivs,
      c.notes || "",
    ];
  });

  const csvLines = [header, ...rows].map((cols) =>
    cols
      .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
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
  report += `Ventas realizadas: ${
    contacts.filter((c) => c.estado === "Vendido").length
  }\n`;
  report += `Derivaciones: ${
    contacts.filter((c) => c.estado === "Derivado").length
  }\n`;
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
 *  BLOQUE 4 - MAPA, GEOLOCALIZACIÓN, GLOBAL
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

async function plotClientsOnMap(clientList) {
  if (!ensureMapInitialized()) return;
  if (!markersLayer) return;

  markersLayer.clearLayers();

  if (!clientList || clientList.length === 0) {
    alert("No hay clientes para mostrar en el mapa.");
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
        const derivCount = contacts.filter(
          (x) => x.cliente_derivado === c.company
        ).length;

        const marker = L.marker([lat, lng]).addTo(markersLayer);
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

async function initLeafletMap() {
  try {
    await plotClientsOnMap(clients);
  } catch (err) {
    console.error("initLeafletMap error:", err);
  }
}

function resetMapView() {
  if (mapView) {
    mapView.setView([-34.6037, -58.3816], 6);
  }
}

// Botones del mapa
async function showAllClients() {
  showSection("map-section");
  await plotClientsOnMap(clients);
}

async function showActiveClients() {
  showSection("map-section");
  const list = clients.filter((c) => c.status === "Activo");
  await plotClientsOnMap(list);
}

async function showByType(type) {
  showSection("map-section");
  const list = clients.filter((c) => c.type === type);
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
  if (!address)
    return alert("Por favor ingresá una dirección para geocodificar.");

  coordDisplay.textContent = "Buscando ubicación...";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}`;
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

async function geocodeCurrentAddressEdit() {
  const addressInput = document.getElementById("edit-client-address");
  const coordDisplay = document.getElementById("edit-coordinates-display");
  if (!addressInput || !coordDisplay) return;

  const address = addressInput.value.trim();
  if (!address)
    return alert("Por favor ingresá una dirección para geocodificar.");

  coordDisplay.textContent = "Buscando ubicación...";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}`;
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

function getCurrentLocationEdit() {
  const coordDisplay = document.getElementById("edit-coordinates-display");
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  coordDisplay.textContent = "Obteniendo tu ubicación actual...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lon = pos.coords.longitude.toFixed(6);
      coordDisplay.textContent = `Lat: ${lat}, Lng: ${lon}`;
      coordDisplay.dataset.lat = lat;
      coordDisplay.dataset.lng = lon;
      alert(`Ubicación actual:\nLat: ${lat}\nLng: ${lon}`);
    },
    (err) => {
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
window.showAllClients = showAllClients;
window.showActiveClients = showActiveClients;
window.showByType = showByType;
window.exportContacts = exportContacts;
window.exportClients = exportClients;
window.exportFullReport = exportFullReport;
window.filterContacts = filterContacts;
window.filterClients = filterClients;

console.log(
  "🌍 Funciones de geolocalización y reportes registradas correctamente en window"
);
// === CONTACTO POR WHATSAPP ===
function sendWhatsApp(phone, msg, clientName = "", product = "", empresa = "") {
  if (!phone) return alert("No hay teléfono disponible para este contacto.");

  // Limpiar número
  const cleaned = phone.replace(/\D/g, "");
  const fullNumber = cleaned.startsWith("54") ? cleaned : `54${cleaned}`;

  // Mensaje base
  if (!msg) {
    msg = `Hola ${clientName || ""}, soy ${
      currentUser?.name || currentUser?.username || "del equipo"
    } de Granja Almeyra 🐔${
      empresa ? ` (${empresa})` : ""
    }. Te contacto por ${product || "nuestros productos"}.`;
  }

  const encodedMsg = encodeURIComponent(msg);
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod/i.test(ua);
  const isDesktop = /win|mac|linux/i.test(ua) && !isMobile;

  // URL universal
  const deepLink = `whatsapp://send?phone=${fullNumber}&text=${encodedMsg}`;
  const webLink = `https://web.whatsapp.com/send?phone=${fullNumber}&text=${encodedMsg}`;
  const desktopLink = `https://api.whatsapp.com/send?phone=${fullNumber}&text=${encodedMsg}`;

  try {
    if (isMobile) {
      // Dispositivos móviles → app nativa
      window.location.href = deepLink;
    } else if (isDesktop) {
      /* Escritorio → intentar abrir app primero
      const a = document.createElement("a");
      a.href = deepLink;
      document.body.appendChild(a);
      a.click(); */

      // Si falla (no abre app), fallback automático a web
      setTimeout(() => {
        window.open(webLink, "_blank");
      }, 1000);
    } else {
      // Fallback genérico
      window.open(desktopLink, "_blank");
    }
  } catch (err) {
    console.error("Error abriendo WhatsApp:", err);
    window.open(webLink, "_blank");
  }
}



// === DOM READY (unificado y al final de TODO el script) ===
document.addEventListener("DOMContentLoaded", () => {
  if (typeof initApp === "function") {
    initApp().catch((err) => console.error("initApp error:", err));
  } else {
    console.error("⚠️ initApp no está definida o cargó fuera de orden.");
  }
});
