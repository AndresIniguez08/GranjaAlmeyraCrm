// script.js - Versión final para index.html (Granja Almeyra)
// Requisitos: index.html debe incluir supabase UMD y crear window.supabase antes de cargar este archivo.
// También debe incluir Leaflet después de este script (o el script se encarga de inicializar mapa cuando Leaflet esté disponible).

/* =========================================================================
   UTILS, INITIAL SETUP Y DB HELPERS
   ========================================================================= */

(function ensureSupabasePresent() {
  if (!window.supabase) {
    console.warn("Warning: window.supabase no está definido. Asegurate de cargar el UMD y crear el cliente en index.html antes de script.js.");
  } else {
    console.log("Using existing window.supabase client.");
  }
})();

function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}
function getCookie(name) {
  return document.cookie.split("; ").reduce((r, v) => {
    const parts = v.split("=");
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, "");
}
function eraseCookie(name) {
  setCookie(name, "", -1);
}

// In-memory data structures (populated from DB if possible)
let contacts = [];
let clients = [];
let tempCoordinates = null;
let editTempCoordinates = null;
let map = null;
let markersLayer = null;
let currentUser = null;

// Expose currentUser reference on window for older code compatibility
window.currentUser = currentUser;

/* --------------------------
   DB helpers (Supabase)
   -------------------------- */

async function dbLoadAllData() {
  const db = window.supabase;
  if (!db) {
    console.warn("Supabase no está inicializado — trabajando en memoria.");
    return;
  }
  try {
    const { data: contactsData, error: contactsError } = await db.from("commercial_contacts").select("*");
    if (contactsError) throw contactsError;
    contacts = contactsData || [];
  } catch (err) {
    console.error("Error cargando commercial_contacts:", err);
    contacts = [];
  }

  try {
    const { data: clientsData, error: clientsError } = await db.from("commercial_clients").select("*");
    if (clientsError) throw clientsError;
    clients = clientsData || [];
  } catch (err) {
    console.error("Error cargando commercial_clients:", err);
    clients = [];
  }

  // Users table used for login (if exists)
  try {
    const { data: usersData, error: usersError } = await db.from("users").select("*");
    if (!usersError && usersData) {
      // no guardamos en variable global sensible más que lo necesario
      window.allUsers = usersData;
    } else {
      window.allUsers = [];
    }
  } catch (err) {
    console.warn("No se pudo cargar tabla users (puede no existir):", err);
    window.allUsers = [];
  }
}

async function dbSaveAllData() {
  const db = window.supabase;
  if (!db) {
    console.warn("Supabase no está inicializado — cambios quedarán en memoria.");
    return;
  }
  try {
    if (contacts && contacts.length > 0) {
      await db.from("commercial_contacts").upsert(contacts, { onConflict: "id" });
    }
  } catch (err) {
    console.error("Error upserting contacts:", err);
  }

  try {
    if (clients && clients.length > 0) {
      await db.from("commercial_clients").upsert(clients, { onConflict: "id" });
    }
  } catch (err) {
    console.error("Error upserting clients:", err);
  }
}

async function dbDeleteContact(id) {
  const db = window.supabase;
  if (!db) return;
  try {
    await db.from("commercial_contacts").delete().eq("id", id);
  } catch (err) {
    console.error("Error eliminando contacto en DB:", err);
  }
}
async function dbDeleteClient(id) {
  const db = window.supabase;
  if (!db) return;
  try {
    await db.from("commercial_clients").delete().eq("id", id);
  } catch (err) {
    console.error("Error eliminando cliente en DB:", err);
  }
}

/* =========================================================================
   UI: showSection / navigation helpers
   ========================================================================= */

function showSection(sectionId) {
  // Screens: login-screen, password-change-screen, app-screen
  const mainScreens = ["login-screen", "password-change-screen", "app-screen"];
  mainScreens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = "none";
  });

  // If sectionId is one of main screens -> show it directly
  if (mainScreens.includes(sectionId)) {
    const el = document.getElementById(sectionId);
    if (el) {
      // login/password screens are centered, use flex
      if (sectionId === "login-screen" || sectionId === "password-change-screen") {
        el.style.display = "flex";
      } else {
        el.style.display = "block";
      }
    }
    return;
  }

  // Otherwise show app-screen and hide internal sections
  const appScreen = document.getElementById("app-screen");
  if (appScreen) appScreen.style.display = "block";

  const internalSections = [
    "dashboard",
    "form-contact",
    "list-contacts",
    "form-client",
    "list-clients",
    "map-section",
    "reports"
  ];
  internalSections.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = "none";
  });

  // Accept compatibility with both 'map' and 'map-section'
  const target = document.getElementById(sectionId) || document.getElementById(sectionId === "map" ? "map-section" : sectionId);
  if (target) {
    target.style.display = "block";
    // If showing map section, initialize map after short delay
    if (sectionId === "map" || sectionId === "map-section") {
      setTimeout(() => {
        if (!map) initMap();
      }, 100);
    }
  } else {
    console.warn("showSection: sección no encontrada ->", sectionId);
  }
}

/* =========================================================================
   LOGIN / AUTH HANDLERS
   ========================================================================= */

async function restoreSessionFromCookie() {
  const db = window.supabase;
  if (!db) return;
  try {
    const token = crypto.randomUUID();

    if (!token) return;
    const { data: sessionRow, error: sessionError } = await db.from("sessions").select("*").eq("token", token).limit(1).single();
    if (sessionError || !sessionRow) return;
    const { data: userRow, error: userError } = await db.from("users").select("*").eq("username", sessionRow.username).limit(1).single();
    if (!userError && userRow) {
      currentUser = { username: userRow.username, name: userRow.name, role: userRow.role };
      window.currentUser = currentUser;
      // reflect in UI
      const cu = document.getElementById("current-user");
      if (cu) cu.textContent = currentUser.name || currentUser.username;
    }
  } catch (err) {
    console.warn("Error restaurando sesión desde cookie:", err);
  }
}

async function handleLogin(e) {
  if (e && e.preventDefault) e.preventDefault();

  const username = (document.getElementById("username")?.value || "").trim();
  const password = (document.getElementById("password")?.value || "").trim();

  if (!username || !password) {
    showErrorMessage("login-error", "Completa usuario y contraseña.");
    return;
  }

  const db = window.supabase;
  if (!db) {
    alert("Servicio de autenticación no disponible.");
    return;
  }

  try {
    // Query users table for username
    const { data: userRow, error } = await db.from("users").select("*").eq("username", username).limit(1).single();
    if (error || !userRow) {
      showErrorMessage("login-error", "Credenciales incorrectas.");
      return;
    }

    if (userRow.password !== password) {
      showErrorMessage("login-error", "Credenciales incorrectas.");
      return;
    }

    currentUser = { username: userRow.username, name: userRow.name || userRow.username, role: userRow.role || "vendedor" };
    window.currentUser = currentUser;
    // reflect in UI
    const cu = document.getElementById("current-user");
    if (cu) cu.textContent = currentUser.name || currentUser.username;

    // create session token
    const token = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ("sess_" + Date.now() + "_" + Math.random().toString(36).slice(2,8));
    setCookie("granja_session", token, 7);
    try {
      await db.from("sessions").upsert({ username: currentUser.username, token, created_at: new Date().toISOString() }, { onConflict: "token" });
    } catch (err) {
      console.warn("No se pudo crear session row en DB:", err);
    }

    // If first login flag set, show password change screen
    if (userRow.firstLogin === true) {
      showSection("password-change-screen");
      return;
    }

    // Show app
    showApp();
    // Load data and render
    await dbLoadAllData();
    renderClientsList();
    renderContactsList();
    updateDashboard();
    updateClientSelect();
  } catch (err) {
    console.error("handleLogin error:", err);
    showErrorMessage("login-error", "Error al conectar con la base de datos.");
  }
}

async function handlePasswordChange(e) {
  if (e && e.preventDefault) e.preventDefault();
  const newPwd = (document.getElementById("new-password")?.value || "").trim();
  const newPwd2 = (document.getElementById("confirm-password")?.value || "").trim();

  if (!newPwd || newPwd.length < 6 || newPwd !== newPwd2) {
    showErrorMessage("password-error", "Contraseñas no coinciden o son muy cortas.");
    return;
  }

  if (!currentUser || !currentUser.username) {
    showErrorMessage("password-error", "No hay usuario activo.");
    return;
  }

  try {
    if (window.supabase) {
      await window.supabase.from("users").update({ password: newPwd, firstLogin: false }).eq("username", currentUser.username);
    }
    showSection("dashboard");
    showSuccessMessage("password-success", 2000);
  } catch (err) {
    console.error("handlePasswordChange error:", err);
    showErrorMessage("password-error", "Error actualizando contraseña.");
  }
}

async function logout() {
const token = crypto.randomUUID();

  eraseCookie("granja_session");
  if (token && window.supabase) {
    try {
      await window.supabase.from("sessions").delete().eq("token", token);
    } catch (err) {
      console.warn("No se pudo borrar session en DB:", err);
    }
  }
  currentUser = null;
  window.currentUser = null;
  const cu = document.getElementById("current-user");
  if (cu) cu.textContent = "";
  showSection("login-screen");
}

/* =========================================================================
   FORM HANDLING (contacts & clients)
   ========================================================================= */

function setupContactFormValidation() {
  const contactForm = document.getElementById("contact-form");
  if (!contactForm) return;

  // Remove previous listeners safe
  try { contactForm.removeEventListener("submit", window._contactFormHandler); } catch (e){}

  const handler = function(e) {
    e.preventDefault();
    // Validate product
    const producto = (document.getElementById("Producto")?.value || "").trim();
    if (!producto) {
      showProductAlert();
      return;
    }
    const formData = new FormData(contactForm);
    const contact = {
      id: Date.now(),
      fecha: formData.get("fecha"),
      vendedor: formData.get("vendedor"),
      cliente: formData.get("cliente"),
      empresa: formData.get("empresa"),
      telefono: formData.get("telefono"),
      email: formData.get("email"),
      Producto: formData.get("Producto"),
      estado: formData.get("estado"),
      clienteDerivado: formData.get("cliente-derivado") || "",
      motivo: formData.get("motivo"),
      registradoPor: currentUser ? currentUser.username : null,
      fechaRegistro: new Date().toISOString()
    };
    contacts.push(contact);
    // Persist to DB
    dbSaveAllData().catch(() => {});
    showSuccessMessage("contact-success-message");
    contactForm.reset();
    const deriv = document.getElementById("derivacion-group");
    if (deriv) deriv.style.display = "none";
    updateDashboard();
    renderContactsList();
    updateProductSelect();
  };

  contactForm.addEventListener("submit", handler);
  // keep reference if we want to remove later
  window._contactFormHandler = handler;
}

function setupClientForm() {
  const clientForm = document.getElementById("client-form");
  if (!clientForm) return;

  try { clientForm.removeEventListener("submit", window._clientFormHandler); } catch (e) {}

  const handler = function(e) {
    e.preventDefault();
    const fd = new FormData(clientForm);
    const client = {
      id: Date.now(),
      name: fd.get("client-name"),
      company: fd.get("client-company"),
      phone: fd.get("client-phone"),
      email: fd.get("client-email"),
      address: fd.get("client-address"),
      type: fd.get("client-type"),
      status: fd.get("client-status"),
      notes: fd.get("client-notes"),
      coordinates: tempCoordinates || null,
      registradoPor: currentUser ? currentUser.username : null,
      fechaRegistro: new Date().toISOString()
    };
    clients.push(client);
    dbSaveAllData().catch(() => {});
    showSuccessMessage("client-success-message");
    clientForm.reset();
    tempCoordinates = null;
    const coordDisp = document.getElementById("coordinates-display");
    if (coordDisp) coordDisp.textContent = "";
    updateDashboard();
    renderClientsList();
    updateClientSelect();
  };

  clientForm.addEventListener("submit", handler);
  window._clientFormHandler = handler;
}

function setupEditContactFormValidation() {
  const editContactForm = document.getElementById("edit-contact-form");
  if (!editContactForm) return;
  try { editContactForm.removeEventListener("submit", window._editContactHandler); } catch (e) {}

  const handler = function(e) {
    e.preventDefault();
    const contactId = document.getElementById("edit-contact-id")?.value;
    const idx = contacts.findIndex(c => c.id == contactId);
    if (idx === -1) {
      showErrorMessage("edit-contact-error", "Contacto no encontrado.");
      return;
    }
    const fd = new FormData(editContactForm);
    contacts[idx] = {
      ...contacts[idx],
      fecha: fd.get("fecha"),
      vendedor: fd.get("vendedor"),
      cliente: fd.get("cliente"),
      empresa: fd.get("empresa"),
      telefono: fd.get("telefono"),
      email: fd.get("email"),
      Producto: fd.get("Producto"),
      estado: fd.get("estado"),
      clienteDerivado: fd.get("cliente-derivado") || "",
      motivo: fd.get("motivo"),
      editadoPor: currentUser ? currentUser.username : null,
      fechaEdicion: new Date().toISOString()
    };
    dbSaveAllData().catch(()=>{});
    closeEditContactModal();
    renderContactsList();
    updateDashboard();
    showSuccessMessage("contact-success-message");
  };

  editContactForm.addEventListener("submit", handler);
  window._editContactHandler = handler;
}

function setupEditClientFormValidation() {
  const editClientForm = document.getElementById("edit-client-form");
  if (!editClientForm) return;
  try { editClientForm.removeEventListener("submit", window._editClientHandler); } catch (e) {}

  const handler = function(e) {
    e.preventDefault();
    const clientId = document.getElementById("edit-client-id")?.value;
    const idx = clients.findIndex(c => c.id == clientId);
    if (idx === -1) {
      showErrorMessage("edit-client-error", "Cliente no encontrado.");
      return;
    }
    const fd = new FormData(editClientForm);
    clients[idx] = {
      ...clients[idx],
      name: fd.get("client-name"),
      company: fd.get("client-company"),
      phone: fd.get("client-phone"),
      email: fd.get("client-email"),
      address: fd.get("client-address"),
      type: fd.get("client-type"),
      status: fd.get("client-status"),
      notes: fd.get("client-notes"),
      coordinates: editTempCoordinates || clients[idx].coordinates || null,
      editadoPor: currentUser ? currentUser.username : null,
      fechaEdicion: new Date().toISOString()
    };
    dbSaveAllData().catch(()=>{});
    closeEditClientModal();
    renderClientsList();
    updateDashboard();
    showSuccessMessage("client-success-message");
  };

  editClientForm.addEventListener("submit", handler);
  window._editClientHandler = handler;
}

/* =========================================================================
   EDIT / DELETE / RENDER functions
   ========================================================================= */

function editContact(contactId) {
  const contact = contacts.find(c => c.id == contactId);
  if (!contact) return;
  document.getElementById("edit-contact-id").value = contact.id;
  document.getElementById("edit-fecha").value = contact.fecha || "";
  document.getElementById("edit-vendedor").value = contact.vendedor || "";
  document.getElementById("edit-cliente").value = contact.cliente || "";
  document.getElementById("edit-empresa").value = contact.empresa || "";
  document.getElementById("edit-telefono").value = contact.telefono || "";
  document.getElementById("edit-email").value = contact.email || "";
  // set product select if exists
  const ep = document.getElementById("edit-Producto") || document.getElementById("edit-producto");
  if (ep) ep.value = contact.Producto || "";
  const est = document.getElementById("edit-estado");
  if (est) est.value = contact.estado || "";
  const der = document.getElementById("edit-cliente-derivado");
  if (der) der.value = contact.clienteDerivado || "";
  toggleEditDerivacion();
  const modal = document.getElementById("edit-contact-modal");
  if (modal) modal.style.display = "block";
}

function closeEditContactModal() {
  const modal = document.getElementById("edit-contact-modal");
  if (modal) modal.style.display = "none";
}

function deleteContact(contactId) {
  if (!confirm("¿Seguro que querés eliminar este contacto?")) return;
  contacts = contacts.filter(c => c.id != contactId);
  dbDeleteContact(contactId).catch(()=>{});
  dbSaveAllData().catch(()=>{});
  renderContactsList();
  updateDashboard();
  showSuccessMessage("contact-success-message");
}

function editClient(clientId) {
  const client = clients.find(c => c.id == clientId);
  if (!client) return;
  document.getElementById("edit-client-id").value = client.id;
  document.getElementById("edit-client-name").value = client.name || "";
  document.getElementById("edit-client-company").value = client.company || "";
  document.getElementById("edit-client-phone").value = client.phone || "";
  document.getElementById("edit-client-email").value = client.email || "";
  document.getElementById("edit-client-address").value = client.address || "";
  document.getElementById("edit-client-type").value = client.type || "";
  document.getElementById("edit-client-status").value = client.status || "";
  document.getElementById("edit-client-notes").value = client.notes || "";
  editTempCoordinates = client.coordinates || null;
  const ed = document.getElementById("edit-coordinates-display");
  if (ed) ed.textContent = editTempCoordinates ? `Coordenadas: ${editTempCoordinates.lat}, ${editTempCoordinates.lng}` : "";
  const modal = document.getElementById("edit-client-modal");
  if (modal) modal.style.display = "block";
}

function closeEditClientModal() {
  const modal = document.getElementById("edit-client-modal");
  if (modal) modal.style.display = "none";
  editTempCoordinates = null;
  const ed = document.getElementById("edit-coordinates-display");
  if (ed) ed.textContent = "";
}

function deleteClient(clientId) {
  if (!confirm("¿Seguro que querés eliminar este cliente?")) return;
  clients = clients.filter(c => c.id != clientId);
  dbDeleteClient(clientId).catch(()=>{});
  dbSaveAllData().catch(()=>{});
  renderClientsList();
  updateDashboard();
  showSuccessMessage("client-success-message");
}

/* Renderers */
function renderContactsList(filteredContacts = null) {
  const tbody = document.getElementById("contacts-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const list = (filteredContacts || contacts).slice().reverse();
  list.forEach(contact => {
    const tr = document.createElement("tr");
    const productoDisplay = contact.Producto || "Sin Producto";
    tr.innerHTML = `
      <td>${formatDate(contact.fecha)}</td>
      <td>${contact.vendedor || ""}</td>
      <td>${contact.cliente || ""}</td>
      <td>${contact.empresa || "-"}</td>
      <td><strong>${productoDisplay}</strong></td>
      <td><span class="status-badge">${contact.estado || "-"}</span></td>
      <td>${contact.clienteDerivado || "-"}</td>
      <td>${contact.motivo || "-"}</td>
      <td class="actions-column">
        <button class="btn-edit" onclick="editContact(${contact.id})">✏️</button>
        <button class="btn-delete" onclick="deleteContact(${contact.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderClientsList(filteredClients = null) {
  const tbody = document.getElementById("clients-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const list = filteredClients || clients;
  list.forEach(client => {
    const referralsCount = contacts.filter(c => c.clienteDerivado === client.company).length;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${client.name}</td>
      <td>${client.company}</td>
      <td>${client.phone || "-"}</td>
      <td>${client.email || "-"}</td>
      <td>${client.address || "-"}</td>
      <td>${client.type || "-"}</td>
      <td>${client.status || "-"}</td>
      <td><strong>${referralsCount}</strong></td>
      <td class="actions-column">
        <button class="btn-edit" onclick="editClient(${client.id})">✏️</button>
        <button class="btn-delete" onclick="deleteClient(${client.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* =========================================================================
   FILTERS, DASHBOARD, REPORTS, PRODUCTS
   ========================================================================= */

function filterContacts() {
  const vendedor = document.getElementById("filter-vendedor")?.value || "";
  const estado = document.getElementById("filter-estado")?.value || "";
  const desde = document.getElementById("filter-fecha-desde")?.value || "";
  const hasta = document.getElementById("filter-fecha-hasta")?.value || "";
  let filtered = contacts.slice();
  if (vendedor) filtered = filtered.filter(c => c.vendedor === vendedor);
  if (estado) filtered = filtered.filter(c => c.estado === estado);
  if (desde) filtered = filtered.filter(c => (c.fecha || "") >= desde);
  if (hasta) filtered = filtered.filter(c => (c.fecha || "") <= hasta);
  renderContactsList(filtered);
}

function filterClients() {
  const type = document.getElementById("filter-client-type")?.value || "";
  const status = document.getElementById("filter-client-status")?.value || "";
  let filtered = clients.slice();
  if (type) filtered = filtered.filter(c => c.type === type);
  if (status) filtered = filtered.filter(c => c.status === status);
  renderClientsList(filtered);
}

function updateDashboard() {
  try {
    const totalContacts = contacts.length;
    const totalSales = contacts.filter(c => c.estado === "Vendido").length;
    const totalReferrals = contacts.filter(c => c.estado === "Derivado").length;
    const conversionRate = totalContacts > 0 ? Math.round((totalSales / totalContacts) * 100) : 0;
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === "Activo").length;

    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText("total-contacts", totalContacts);
    setText("total-sales", totalSales);
    setText("total-referrals", totalReferrals);
    setText("conversion-rate", conversionRate + "%");
    setText("total-clients", totalClients);
    setText("active-clients", activeClients);
    updateProductStats();
  } catch (e) {
    console.warn("updateDashboard error:", e);
  }
}

/* Reports & CSV exports */
function downloadCSV(content, filename) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
function exportContacts() {
  const rows = [["Fecha","Vendedor","Cliente","Empresa","Teléfono","Email","Producto","Estado","Derivado a","Motivo"]];
  contacts.forEach(c => {
    rows.push([c.fecha || "", c.vendedor || "", c.cliente || "", c.empresa || "", c.telefono || "", c.email || "", c.Producto || "", c.estado || "", c.clienteDerivado || "", c.motivo || ""]);
  });
  downloadCSV(rows.map(r => r.map(f => `"${(f||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n"), "contactos.csv");
}
function exportClients() {
  const rows = [["Nombre","Empresa","Teléfono","Email","Dirección","Tipo","Estado","Notas"]];
  clients.forEach(c => rows.push([c.name || "", c.company || "", c.phone || "", c.email || "", c.address || "", c.type || "", c.status || "", c.notes || ""]));
  downloadCSV(rows.map(r => r.map(f => `"${(f||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n"), "clientes.csv");
}
function exportFullReport() {
  const today = new Date().toISOString().split("T")[0];
  let report = `INFORME COMERCIAL - ${today}\n\nTotal contactos: ${contacts.length}\nVentas: ${contacts.filter(c=>c.estado==="Vendido").length}\nDerivaciones: ${contacts.filter(c=>c.estado==="Derivado").length}\nClientes: ${clients.length}\n`;
  const blob = new Blob([report], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `informe-${today}.txt`;
  link.click();
}

/* =========================================================================
   PRODUCTS helpers (build select, stats)
   ========================================================================= */

const PRODUCTOS_DISPONIBLES = [
  { id: "B1", name: "B1", category: "Sin Marca" },
  { id: "B2", name: "B2", category: "Sin Marca" },
  { id: "B3", name: "B3", category: "Sin Marca" },
  { id: "Caja 180 B1", name: "Caja 180 B1", category: "Caja Grande" },
  { id: "Caja 180 B2", name: "Caja 180 B2", category: "Caja Grande" },
  { id: "Caja 180 B3", name: "Caja 180 B3", category: "Caja Grande" },
  { id: "Caja 18 Docenas (x6)", name: "Caja 18 Docenas (x6)", category: "Caja Docenas" },
  { id: "Caja 18 Docenas (x12)", name: "Caja 18 Docenas (x12)", category: "Caja Docenas" },
  { id: "Estuche B2 x6 (Licitacion)", name: "Estuche B2 x6 (Licitacion)", category: "Licitación" },
  { id: "Estuche B2 x12 (Licitacion)", name: "Estuche B2 x12 (Licitacion)", category: "Licitación" },
  { id: "Pack 6 Maples B1", name: "Pack 6 Maples B1", category: "Pack Maples" },
  { id: "Pack 6 Maples B2", name: "Pack 6 Maples B2", category: "Pack Maples" },
  { id: "Pack 6 Maples B3", name: "Pack 6 Maples B3", category: "Pack Maples" }
];

function updateProductSelect() {
  const productSelect = document.getElementById("Producto");
  const editProductSelect = document.getElementById("edit-Producto") || document.getElementById("edit-producto");
  if (productSelect) {
    productSelect.innerHTML = '<option value="">Seleccionar Producto</option>';
    const grouped = {};
    PRODUCTOS_DISPONIBLES.forEach(p => { grouped[p.category] = grouped[p.category] || []; grouped[p.category].push(p); });
    Object.keys(grouped).forEach(cat => {
      const optg = document.createElement("optgroup");
      optg.label = cat;
      grouped[cat].forEach(p => {
        const o = document.createElement("option");
        o.value = p.name; o.textContent = p.name; optg.appendChild(o);
      });
      productSelect.appendChild(optg);
    });
  }
  if (editProductSelect) {
    editProductSelect.innerHTML = '<option value="">Seleccionar Producto</option>';
    const grouped = {};
    PRODUCTOS_DISPONIBLES.forEach(p => { grouped[p.category] = grouped[p.category] || []; grouped[p.category].push(p); });
    Object.keys(grouped).forEach(cat => {
      const optg = document.createElement("optgroup");
      optg.label = cat;
      grouped[cat].forEach(p => {
        const o = document.createElement("option");
        o.value = p.name; o.textContent = p.name; optg.appendChild(o);
      });
      editProductSelect.appendChild(optg);
    });
  }
}

function getProductStats() {
  const total = contacts.filter(c=>c.Producto && c.Producto!=="").length;
  const unique = [...new Set(contacts.map(c=>c.Producto).filter(Boolean))].length;
  const counts = {};
  contacts.forEach(c => { if (c.Producto) counts[c.Producto] = (counts[c.Producto]||0)+1; });
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0] || ["N/A",0];
  return { total, unique, topProduct: { name: top[0], count: top[1] } };
}
function updateProductStats() {
  const st = getProductStats();
  const totalEl = document.getElementById("total-products-requested");
  if (totalEl) totalEl.textContent = st.total;
}

/* =========================================================================
   MAP & GEO helpers (defensive - won't break if Leaflet or geocoding missing)
   ========================================================================= */

async function initLeafletMap() {
  try {
    if (typeof L === "undefined") {
      console.warn("Leaflet no está cargado todavía.");
      return;
    }
    if (map) {
      map.remove();
      map = null;
    }
    map = L.map("map").setView([-34.6037, -58.3816], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    await showAllClients();
  } catch (err) {
    console.error("initLeafletMap error:", err);
  }
}
function initMap() { initLeafletMap().catch(()=>{}); }

async function geocodeWithNominatim(address) {
  // Minimal geocode: try fetch to nominatim. If blocked by CORS/local environment, return null.
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" }});
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    // Could be CORS or network; ignore
  }
  return null;
}

async function showAllClients() {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  if (!clients || clients.length === 0) return;
  let bounds = [];
  let dataUpdated = false;
  for (const c of clients) {
    if (!c.coordinates && c.address) {
      try {
        const coords = await geocodeWithNominatim(c.address);
        if (coords) { c.coordinates = coords; dataUpdated = true; }
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {}
    }
    if (c.coordinates) {
      const refCount = contacts.filter(ct => ct.clienteDerivado === c.company).length;
      const color = c.status === "Inactivo" ? "#ff3333" : (c.status === "Prospecto" ? "#ffaa00" : "#3388ff");
      const mk = L.circleMarker([c.coordinates.lat, c.coordinates.lng], { color, fillColor: color, fillOpacity: 0.8, radius: Math.max(6, 8 + refCount*2) });
      mk.bindPopup(`<strong>${c.company}</strong><br>${c.name || ""}<br>${c.address || ""}`);
      mk.addTo(markersLayer);
      bounds.push([c.coordinates.lat, c.coordinates.lng]);
    }
  }
  if (dataUpdated) dbSaveAllData().catch(()=>{});
  if (bounds.length && map) {
    try { map.fitBounds(bounds, { padding: [50,50] }); } catch(e){}
  }
}
function showActiveClients() { if (!markersLayer) return; markersLayer.clearLayers(); clients.filter(c=>c.status==="Activo").forEach(c=>{ if (c.coordinates && markersLayer) { const mk = L.circleMarker([c.coordinates.lat, c.coordinates.lng]); mk.addTo(markersLayer); }}); }
function showByType(type) { if (!markersLayer) return; markersLayer.clearLayers(); clients.filter(c=>c.type===type).forEach(c=>{ if (c.coordinates) { const mk = L.circleMarker([c.coordinates.lat, c.coordinates.lng]); mk.addTo(markersLayer); } }); }
function showClientsOnMap() { showSection("map-section"); setTimeout(()=>{ if (!map) initMap(); }, 150); }

/* =========================================================================
   Misc helpers: toggles, messages, validation
   ========================================================================= */

function toggleDerivacion() {
  const estado = document.getElementById("estado")?.value || "";
  const group = document.getElementById("derivacion-group");
  if (group) group.style.display = (estado === "Derivado" ? "block" : "none");
}
function toggleEditDerivacion() {
  const estado = document.getElementById("edit-estado")?.value || "";
  const group = document.getElementById("edit-derivacion-group");
  if (group) group.style.display = (estado === "Derivado" ? "block" : "none");
}

function showSuccessMessage(id, timeout = 2500) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "block";
  setTimeout(()=> { el.style.display = "none"; }, timeout);
}
function showErrorMessage(id, text, timeout = 4000) {
  const el = document.getElementById(id);
  if (!el) {
    // fallback: alerta
    console.warn("Error:", text);
    return;
  }
  el.textContent = text;
  el.style.display = "block";
  setTimeout(()=> { el.style.display = "none"; }, timeout);
}

function formatDate(d) {
  if (!d) return "-";
  try { const dt = new Date(d); return dt.toLocaleDateString("es-ES"); } catch(e) { return d; }
}

/* =========================================================================
   Product alert modal (simple)
   ========================================================================= */

function showProductAlert() {
  let modal = document.getElementById("product-alert-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "product-alert-modal";
    modal.style = "position:fixed;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:9999";
    modal.innerHTML = `<div style="background:#fff;padding:20px;border-radius:10px;max-width:400px;text-align:center">
      <h3>Producto requerido</h3><p>Debe seleccionar un producto antes de continuar.</p>
      <button id="product-alert-ok">Aceptar</button>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById("product-alert-ok").addEventListener("click", ()=>{ modal.style.display = "none"; });
  }
  modal.style.display = "flex";
}

/* =========================================================================
   Helper to update cliente-derivado selects
   ========================================================================= */

function updateClientSelect() {
  const sel = document.getElementById("cliente-derivado");
  const editSel = document.getElementById("edit-cliente-derivado");
  const companies = [...new Set(clients.map(c => c.company).filter(Boolean))].sort();
  if (sel) {
    sel.innerHTML = `<option value="">Seleccionar cliente</option>`;
    companies.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); });
  }
  if (editSel) {
    editSel.innerHTML = `<option value="">Seleccionar cliente</option>`;
    companies.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; editSel.appendChild(o); });
  }
}

/* =========================================================================
   Lightweight geolocation helpers for forms
   ========================================================================= */

function geocodeCurrentAddress() {
  const addr = document.getElementById("client-address")?.value || "";
  if (!addr) { alert("Ingresa una dirección"); return; }
  geocodeWithNominatim(addr).then(coords => {
    if (!coords) { alert("No se pudieron obtener coordenadas (posible CORS o límite)."); return; }
    tempCoordinates = coords;
    const disp = document.getElementById("coordinates-display");
    if (disp) disp.textContent = `Coordenadas: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
  });
}
function geocodeCurrentAddressEdit() {
  const addr = document.getElementById("edit-client-address")?.value || "";
  if (!addr) { alert("Ingresa una dirección"); return; }
  geocodeWithNominatim(addr).then(coords => {
    if (!coords) { alert("No se pudieron obtener coordenadas (posible CORS o límite)."); return; }
    editTempCoordinates = coords;
    const disp = document.getElementById("edit-coordinates-display");
    if (disp) disp.textContent = `Coordenadas: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
  });
}
function getCurrentLocationEdit() {
  if (!navigator.geolocation) { alert("Geolocalización no soportada"); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    editTempCoordinates = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    const disp = document.getElementById("edit-coordinates-display");
    if (disp) disp.textContent = `Coordenadas: ${editTempCoordinates.lat.toFixed(6)}, ${editTempCoordinates.lng.toFixed(6)}`;
  }, err => { alert("No se pudo obtener ubicación: " + err.message); });
}

/* =========================================================================
   INIT / Event Listeners / Expose Globals
   ========================================================================= */

function loadContacts() { renderContactsList(); }
function loadClients() { renderClientsList(); }

async function init() {
  if (window.__initialized_app) return;
  window.__initialized_app = true;
  // hide app until loaded
  const app = document.getElementById("app-screen");
  if (app) app.style.display = "none";

  // setup listeners for nav forms and buttons that we can attach to
  // Login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  // Password change form
  const pwdForm = document.getElementById("password-change-form");
  if (pwdForm) pwdForm.addEventListener("submit", handlePasswordChange);
  // Logout button (if present)
  try { document.querySelectorAll(".logout-btn").forEach(b => b.addEventListener("click", logout)); } catch(e){}

  // Attach inline toggles
  const estadoEl = document.getElementById("estado");
  if (estadoEl) estadoEl.addEventListener("change", toggleDerivacion);
  const editEstadoEl = document.getElementById("edit-estado");
  if (editEstadoEl) editEstadoEl.addEventListener("change", toggleEditDerivacion);

  // Setup form handlers
  setupContactFormValidation();
  setupClientForm();
  setupEditContactFormValidation();
  setupEditClientFormValidation();

  // Load DB data
  await dbLoadAllData().catch(()=>{});
  // Restore session
  await restoreSessionFromCookie().catch(()=>{});

  // Reflect restored user in UI
  if (currentUser) {
    const cu = document.getElementById("current-user");
    if (cu) cu.textContent = currentUser.name || currentUser.username;
    showSection("dashboard");
  } else {
    showSection("login-screen");
  }

  // Initial render
  renderContactsList();
  renderClientsList();
  updateDashboard();
  updateClientSelect();
  updateProductSelect();
  console.log("Init complete");
}

// Attach to DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  init().catch(err => console.error("init error:", err));
});

/* =========================================================================
   Expose functions globally for inline usage in HTML (onclicks)
   ========================================================================= */

window.showSection = showSection;
window.showApp = function() { showSection("dashboard"); updateDashboard(); };
window.showLogin = function() { showSection("login-screen"); };
window.logout = logout;
window.handleLogin = handleLogin;
window.handlePasswordChange = handlePasswordChange;
window.loadContacts = loadContacts;
window.loadClients = loadClients;
window.editContact = editContact;
window.deleteContact = deleteContact;
window.editClient = editClient;
window.deleteClient = deleteClient;
window.closeEditContactModal = closeEditContactModal;
window.closeEditClientModal = closeEditClientModal;
window.showClientsOnMap = showClientsOnMap;
window.showAllClients = showAllClients;
window.showActiveClients = showActiveClients;
window.showByType = showByType;
window.exportContacts = exportContacts;
window.exportClients = exportClients;
window.exportFullReport = exportFullReport;
window.filterContacts = filterContacts;
window.filterClients = filterClients;
window.filterContactsByProduct = function() {
  const sel = document.getElementById("filter-product");
  if (!sel) return;
  const val = sel.value;
  if (!val) { renderContactsList(); return; }
  renderContactsList(contacts.filter(c => c.Producto === val));
};
// Keep aliases expected in older versions
window.handleContactSubmit = function() { document.getElementById("contact-form")?.dispatchEvent(new Event("submit", { cancelable: true })); };
window.handleClientSubmit = function() { document.getElementById("client-form")?.dispatchEvent(new Event("submit", { cancelable: true })); };

/* =========================================================================
   End of script.js
   ========================================================================= */
