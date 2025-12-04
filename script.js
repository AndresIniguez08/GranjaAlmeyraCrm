// ----- PART 1/3 - Inicio del script.js (corregido para Supabase - Option A: window.supabase) -----

/*
  NOTA: Este archivo fue modificado únicamente en las secciones relacionadas a:
    - Inicialización / uso de Supabase
    - Restauración de sesión sin await top-level
    - Carga/guardado de datos en DB
    - Exposición de handlers de login/session
  TODO lo demás conserva tu lógica original.
*/

/* === Supabase client initialization (Option A: window.supabase) ===
   - Si ya cargaste el UMD en index.html (script src ... supabase.min.js),
     este bloque configura window.supabase usando tus credenciales.
   - Si ya definiste window.supabase en index.html, no lo sobreescribe.
*/
(function initSupabaseClient() {
  try {
    // If the page already created window.supabase, keep it
    if (window.supabase && typeof window.supabase.from === "function") {
      console.log("window.supabase already defined (using existing client).");
      return;
    }

    // If UMD global "supabase" exists (from CDN), create client
    if (typeof supabase !== "undefined" && supabase && typeof supabase.createClient === "function") {
      // User-provided credentials (inlined from conversation)
      const SUPABASE_URL = "https://gntwqahvwwvkwhkdowwh.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdudHdxYWh2d3d2a3doa2Rvd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc0NjQsImV4cCI6MjA3OTgyMzQ2NH0.qAgbzFmnG5136V1pTStF_hW7jKaAzoIlSYoWt2qxM9E";

      try {
        window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("window.supabase created from UMD supabase.createClient()");
      } catch (e) {
        console.error("Error creating supabase client from UMD:", e);
      }
      return;
    }

    // If no UMD, but window.supabaseClient exists, map it to window.supabase for compatibility
    if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
      window.supabase = window.supabaseClient;
      console.log("Mapped window.supabaseClient -> window.supabase");
      return;
    }

    console.warn("No supabase client found on page. Make sure to include the UMD and/or initialize the client.");
  } catch (err) {
    console.error("initSupabaseClient error:", err);
  }
})();

/* ---------------------------
   Cookie helpers for optional session persistence
   --------------------------- */
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + expires + "; path=/";
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

/* In-memory datasets (will be loaded from DB if supabase is initialized) */
let contacts = [];
let clients = [];
let USERS = {}; // kept for compatibility with old code; will be populated from DB if possible
window.allUsers = []; // array form for lookups

/* ---------------------------
   DB helpers (Supabase queries) - use window.supabase everywhere
   --------------------------- */

async function dbLoadAllData() {
  const db = window.supabase;
  if (!db) {
    console.warn("Supabase no está inicializado — trabajando en memoria.");
    return;
  }

  // Load contacts
  try {
    const { data: contactsData, error: contactsError } = await db
      .from("commercial_contacts")
      .select("*");
    if (contactsError) throw contactsError;
    contacts = contactsData || [];
  } catch (err) {
    console.error("Error loading commercial_contacts:", err);
    contacts = [];
  }

  // Load clients
  try {
    const { data: clientsData, error: clientsError } = await db
      .from("commercial_clients")
      .select("*");
    if (clientsError) throw clientsError;
    clients = clientsData || [];
  } catch (err) {
    console.error("Error loading commercial_clients:", err);
    clients = [];
  }

  // Load users
  try {
    const { data: usersData, error: usersError } = await db
      .from("users")
      .select("*");
    if (usersError) throw usersError;

    window.allUsers = usersData || [];

    // Populate USERS object for backward compatibility
    USERS = {};
    for (const u of window.allUsers) {
      if (!u.username) continue;
      USERS[u.username] = {
        password: u.password,
        name: u.name || u.username,
        role: u.role || "user",
        firstLogin: !!u.firstLogin,
      };
    }
  } catch (err) {
    console.error("Error loading users from DB:", err);
    window.allUsers = [];
    USERS = {};
  }
}

/* Restore session from DB if cookie exists (no top-level await) */
async function restoreSessionFromDB() {
  const db = window.supabase;
  if (!db) return;

  const token = getCookie("granja_session");
  if (!token) return;

  try {
    const { data: sessionRow, error: sessionError } = await db
      .from("sessions")
      .select("*")
      .eq("token", token)
      .limit(1)
      .single();

    if (!sessionError && sessionRow) {
      const { data: userRow, error: userError } = await db
        .from("users")
        .select("*")
        .eq("username", sessionRow.username)
        .limit(1)
        .single();

      if (!userError && userRow) {
        window.currentUser = { username: userRow.username, name: userRow.name, role: userRow.role };
        // Also set local variable for compatibility
        currentUser = window.currentUser;
      }
    }
  } catch (err) {
    console.warn("Error restoring session from DB:", err);
  }
}

/* DB save (upsert) */
async function dbSaveAllData() {
  const db = window.supabase;
  if (!db) {
    console.warn("Supabase not initialized — changes remain in memory.");
    return;
  }
  try {
    if (contacts && contacts.length > 0) {
      // Upsert contacts (assumes 'id' is primary key)
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

/* Minimal DB delete helpers */
async function dbDeleteContact(id) {
  const db = window.supabase;
  if (!db) return;
  try {
    await db.from("commercial_contacts").delete().eq("id", id);
  } catch (err) {
    console.error("Error deleting contact:", err);
  }
}
async function dbDeleteClient(id) {
  const db = window.supabase;
  if (!db) return;
  try {
    await db.from("commercial_clients").delete().eq("id", id);
  } catch (err) {
    console.error("Error deleting client:", err);
  }
}

/* User upsert helper (accepts USERS-like object) */
async function upsertUsers(userObj) {
  const db = window.supabase;
  if (!db) return;
  try {
    const rows = Object.entries(userObj).map(([username, u]) => ({
      username,
      password: u.password,
      name: u.name,
      role: u.role,
      firstLogin: !!u.firstLogin,
    }));
    await db.from("users").upsert(rows, { onConflict: "username" });
  } catch (err) {
    console.error("Error upserting users:", err);
  }
}

/* Wrapper functions for compatibility */
function loadData() {
  // Non-blocking load
  dbLoadAllData().catch((err) => console.error(err));
}
function saveData() {
  dbSaveAllData().catch((err) => console.error(err));
}

/* Session creation helper used during login */
async function createSessionForUser(username) {
  const db = window.supabase;
  const token = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  setCookie("granja_session", token, 7);
  if (!db) return;
  try {
    await db.from("sessions").upsert({ token, username, last_active: new Date().toISOString() }, { onConflict: "token" });
  } catch (err) {
    console.warn("Could not create session in DB:", err);
  }
}

/* Logout helper */
async function clearSession() {
  const db = window.supabase;
  const token = getCookie("granja_session");
  eraseCookie("granja_session");
  if (!db || !token) return;
  try {
    await db.from("sessions").delete().eq("token", token);
  } catch (err) {
    console.warn("Could not delete session in DB:", err);
  }
}

/* Current user */
let currentUser = null;
window.currentUser = currentUser;

/* === INIT / BOOTSTRAP ===
   Make init async and ordered: load data -> restore session -> setup listeners -> show UI
*/
async function init() {
  // prevent multiple init
  if (window.__initialized_app) return;
  window.__initialized_app = true;

  // hide screens initially if exist
  const appScreen = document.getElementById("app-screen");
  if (appScreen) appScreen.style.display = "none";
  const pwdScreen = document.getElementById("password-change-screen");
  if (pwdScreen) pwdScreen.style.display = "none";

  // Load DB data
  try {
    await dbLoadAllData();
  } catch (e) {
    console.warn("dbLoadAllData failed:", e);
  }

  // Try restore session from DB if cookie exists
  try {
    await restoreSessionFromDB();
  } catch (e) {
    console.warn("restoreSessionFromDB failed:", e);
  }

  // Setup event listeners (now synchronous binding; heavy work already loaded)
  try {
    setupEventListeners();
  } catch (e) {
    console.error("setupEventListeners error:", e);
  }

  // default date
  const fechaInput = document.getElementById("fecha");
  if (fechaInput) fechaInput.valueAsDate = new Date();

  // Show app or login
  const sessionToken = getCookie("granja_session");
  if (sessionToken && window.currentUser) {
    // use restored user
    showApp();
  } else {
    showLogin();
  }

  // Initial renders
  try {
    updateDashboard();
    renderContactsList();
    renderClientsList();
    updateClientSelect();
  } catch (e) {
    console.warn("Initial render warnings:", e);
  }
}

/* === LOGIN HANDLER - Uses window.supabase (UMD client) === */
async function handleLogin(event) {
  event && event.preventDefault && event.preventDefault();

  const usernameEl = document.getElementById("login-username");
  const passwordEl = document.getElementById("login-password");
  const username = usernameEl ? usernameEl.value.trim() : "";
  const password = passwordEl ? passwordEl.value.trim() : "";

  if (!username || !password) {
    alert("Por favor completa usuario y contraseña.");
    return;
  }

  const db = window.supabase;
  if (!db) {
    alert("El servicio de autenticación no está disponible.");
    return;
  }

  try {
    const { data: userData, error } = await db
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !userData) {
      alert("Usuario incorrecto.");
      return;
    }

    if (userData.password !== password) {
      alert("Contraseña incorrecta.");
      return;
    }

    // Guardar usuario en sesión temporal
    window.currentUser = userData;
    currentUser = userData;

    // Persist session cookie and DB row
    await createSessionForUser(username).catch(() => {});

    // Si es primer login
    if (userData.firstLogin === true) {
      // show change password section if exists
      if (typeof showPasswordChange === "function") {
        showPasswordChange();
      } else if (typeof showSection === "function") {
        showSection("change-password-section");
      }
      return;
    }

    // Login correcto → ir al dashboard / app
    if (typeof showApp === "function") {
      showApp();
    } else if (typeof showSection === "function") {
      showSection("dashboard-section");
    }
    updateDashboard();
  } catch (e) {
    console.error("Error al iniciar sesión:", e);
    alert("Error al conectar con la base de datos.");
  }
}
// Expose globally for inline handlers compatibility
window.handleLogin = handleLogin;

/* === setupEventListeners() - binds DOM events (keeps minimal logic) === */
function setupEventListeners() {
  // Login listeners
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const pwdForm = document.getElementById("password-change-form");
  if (pwdForm) pwdForm.addEventListener("submit", handlePasswordChange);

  // Contact form
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const formData = new FormData(e.target);
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
        fechaRegistro: new Date().toISOString(),
      };

      contacts.push(contact);
      saveData();

      showSuccessMessage("contact-success-message");
      e.target.reset();
      const derivGroup = document.getElementById("derivacion-group");
      if (derivGroup) derivGroup.style.display = "none";
      updateDashboard();
    });
  }

  // Client form
  const clientForm = document.getElementById("client-form");
  if (clientForm) {
    clientForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const formData = new FormData(e.target);
      const client = {
        id: Date.now(),
        name: formData.get("client-name"),
        company: formData.get("client-company"),
        phone: formData.get("client-phone"),
        email: formData.get("client-email"),
        address: formData.get("client-address"),
        type: formData.get("client-type"),
        status: formData.get("client-status"),
        notes: formData.get("client-notes"),
        coordinates: typeof tempCoordinates !== "undefined" ? tempCoordinates : null,
        registradoPor: currentUser ? currentUser.username : null,
        fechaRegistro: new Date().toISOString(),
      };

      clients.push(client);
      saveData();

      showSuccessMessage("client-success-message");
      e.target.reset();
      tempCoordinates = null;
      const coordDisp = document.getElementById("coordinates-display");
      if (coordDisp) coordDisp.textContent = "";
      updateDashboard();
      renderClientsList();
      updateClientSelect();
    });
  }
}
// ----- PART 2/3 - Continuación del script.js (edición, render, mapas, reportes, productos) -----

// === FUNCIONES DE EDICIÓN ===

function editContact(contactId) {
  const contact = contacts.find((c) => c.id == contactId);
  if (!contact) return;

  const elEditId = document.getElementById("edit-contact-id");
  if (elEditId) elEditId.value = contact.id;

  const elEditFecha = document.getElementById("edit-fecha");
  if (elEditFecha) elEditFecha.value = contact.fecha;

  const elEditVendedor = document.getElementById("edit-vendedor");
  if (elEditVendedor) elEditVendedor.value = contact.vendedor || "";

  const elEditCliente = document.getElementById("edit-cliente");
  if (elEditCliente) elEditCliente.value = contact.cliente || "";

  const elEditEmpresa = document.getElementById("edit-empresa");
  if (elEditEmpresa) elEditEmpresa.value = contact.empresa || "";

  const elEditTelefono = document.getElementById("edit-telefono");
  if (elEditTelefono) elEditTelefono.value = contact.telefono || "";

  const elEditEmail = document.getElementById("edit-email");
  if (elEditEmail) elEditEmail.value = contact.email || "";

  const elEditProducto = document.getElementById("edit-Producto");
  if (elEditProducto) elEditProducto.value = contact.Producto || "";

  const elEditEstado = document.getElementById("edit-estado");
  if (elEditEstado) elEditEstado.value = contact.estado || "";

  const elEditClienteDerivado = document.getElementById("edit-cliente-derivado");
  if (elEditClienteDerivado) elEditClienteDerivado.value = contact.clienteDerivado || "";

  const elEditMotivo = document.getElementById("edit-motivo");
  if (elEditMotivo) elEditMotivo.value = contact.motivo || "";

  toggleEditDerivacion();

  const modal = document.getElementById("edit-contact-modal");
  if (modal) modal.style.display = "block";
}

function closeEditContactModal() {
  const modal = document.getElementById("edit-contact-modal");
  if (modal) modal.style.display = "none";
}

function deleteContact(contactId) {
  if (!confirm("¿Estás seguro de que deseas eliminar este contacto?")) return;

  contacts = contacts.filter((c) => c.id != contactId);
  saveData();
  // DB attempt
  dbDeleteContact(contactId).catch(() => {});
  renderContactsList();
  updateDashboard();
  showSuccessMessage("contact-success-message");
}

// === FUNCIONES PARA CLIENTES ===

function editClient(clientId) {
  const client = clients.find((c) => c.id == clientId);
  if (!client) return;

  const elId = document.getElementById("edit-client-id");
  if (elId) elId.value = client.id;

  const elName = document.getElementById("edit-client-name");
  if (elName) elName.value = client.name || "";

  const elCompany = document.getElementById("edit-client-company");
  if (elCompany) elCompany.value = client.company || "";

  const elPhone = document.getElementById("edit-client-phone");
  if (elPhone) elPhone.value = client.phone || "";

  const elEmail = document.getElementById("edit-client-email");
  if (elEmail) elEmail.value = client.email || "";

  const elAddress = document.getElementById("edit-client-address");
  if (elAddress) elAddress.value = client.address || "";

  const elType = document.getElementById("edit-client-type");
  if (elType) elType.value = client.type || "";

  const elStatus = document.getElementById("edit-client-status");
  if (elStatus) elStatus.value = client.status || "";

  const elNotes = document.getElementById("edit-client-notes");
  if (elNotes) elNotes.value = client.notes || "";

  editTempCoordinates = client.coordinates || null;
  const display = document.getElementById("edit-coordinates-display");
  if (display) {
    display.textContent = editTempCoordinates
      ? `Coordenadas: ${editTempCoordinates.lat.toFixed(6)}, ${editTempCoordinates.lng.toFixed(6)}`
      : "";
  }

  const modal = document.getElementById("edit-client-modal");
  if (modal) modal.style.display = "block";
}

function closeEditClientModal() {
  const modal = document.getElementById("edit-client-modal");
  if (modal) modal.style.display = "none";
  editTempCoordinates = null;
  const display = document.getElementById("edit-coordinates-display");
  if (display) display.textContent = "";
}

function deleteClient(clientId) {
  if (!confirm("¿Estás seguro de que deseas eliminar este cliente?")) return;

  clients = clients.filter((c) => c.id != clientId);
  saveData();
  dbDeleteClient(clientId).catch(() => {});
  renderClientsList();
  updateDashboard();
  showSuccessMessage("client-success-message");
}

// === DASHBOARD & RENDERS ===

function updateDashboard() {
  try {
    const totalContacts = contacts.length;
    const totalSales = contacts.filter((c) => c.estado === "Vendido").length;
    const totalReferrals = contacts.filter((c) => c.estado === "Derivado").length;
    const conversionRate = totalContacts > 0 ? Math.round((totalSales / totalContacts) * 100) : 0;
    const totalClients = clients.length;
    const activeClients = clients.filter((c) => c.status === "Activo").length;

    const elTotalContacts = document.getElementById("total-contacts");
    if (elTotalContacts) elTotalContacts.textContent = totalContacts;
    const elTotalSales = document.getElementById("total-sales");
    if (elTotalSales) elTotalSales.textContent = totalSales;
    const elTotalReferrals = document.getElementById("total-referrals");
    if (elTotalReferrals) elTotalReferrals.textContent = totalReferrals;
    const elConversionRate = document.getElementById("conversion-rate");
    if (elConversionRate) elConversionRate.textContent = conversionRate + "%";
    const elTotalClients = document.getElementById("total-clients");
    if (elTotalClients) elTotalClients.textContent = totalClients;
    const elActiveClients = document.getElementById("active-clients");
    if (elActiveClients) elActiveClients.textContent = activeClients;
  } catch (e) {
    console.warn("updateDashboard error:", e);
  }
}

function renderContactsList(filteredContacts = null) {
  const contactsToShow = filteredContacts || contacts;
  const tbody = document.getElementById("contacts-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  contactsToShow.slice().reverse().forEach((contact) => {
    const row = document.createElement("tr");
    const productoDisplay = contact.Producto || "Sin Producto especificado";

    row.innerHTML = `
      <td>${formatDate(contact.fecha)}</td>
      <td>${contact.vendedor || ""}</td>
      <td>${contact.cliente || ""}</td>
      <td>${contact.empresa || "-"}</td>
      <td><strong>${productoDisplay}</strong></td>
      <td><span class="status-badge status-${(contact.estado || "").toLowerCase().replace(" ", "-")}">${contact.estado || "-"}</span></td>
      <td>${contact.clienteDerivado || "-"}</td>
      <td>${contact.motivo || "-"}</td>
      <td class="actions-column">
        <button class="btn-edit" onclick="editContact(${contact.id})" title="Editar">✏️</button>
        <button class="btn-delete" onclick="deleteContact(${contact.id})" title="Eliminar">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderClientsList(filteredClients = null) {
  const clientsToShow = filteredClients || clients;
  const tbody = document.getElementById("clients-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  clientsToShow.forEach((client) => {
    const referralsCount = contacts.filter((c) => c.clienteDerivado === client.company).length;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${client.name}</td>
      <td>${client.company}</td>
      <td>${client.phone || "-"}</td>
      <td>${client.email || "-"}</td>
      <td>${client.address || "-"}</td>
      <td>${client.type || "-"}</td>
      <td><span class="status-badge status-${(client.status || "").toLowerCase()}">${client.status || "-"}</span></td>
      <td><strong>${referralsCount}</strong></td>
      <td class="actions-column">
        <button class="btn-edit" onclick="editClient(${client.id})" title="Editar">✏️</button>
        <button class="btn-delete" onclick="deleteClient(${client.id})" title="Eliminar">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// === FILTROS ===

function filterContacts() {
  const vendedorFilter = document.getElementById("filter-vendedor") ? document.getElementById("filter-vendedor").value : "";
  const estadoFilter = document.getElementById("filter-estado") ? document.getElementById("filter-estado").value : "";
  const fechaDesde = document.getElementById("filter-fecha-desde") ? document.getElementById("filter-fecha-desde").value : "";
  const fechaHasta = document.getElementById("filter-fecha-hasta") ? document.getElementById("filter-fecha-hasta").value : "";

  let filtered = contacts.slice();

  if (vendedorFilter) filtered = filtered.filter((c) => c.vendedor === vendedorFilter);
  if (estadoFilter) filtered = filtered.filter((c) => c.estado === estadoFilter);
  if (fechaDesde) filtered = filtered.filter((c) => c.fecha >= fechaDesde);
  if (fechaHasta) filtered = filtered.filter((c) => c.fecha <= fechaHasta);

  renderContactsList(filtered);
}

function filterClients() {
  const typeFilter = document.getElementById("filter-client-type") ? document.getElementById("filter-client-type").value : "";
  const statusFilter = document.getElementById("filter-client-status") ? document.getElementById("filter-client-status").value : "";

  let filtered = clients.slice();

  if (typeFilter) filtered = filtered.filter((c) => c.type === typeFilter);
  if (statusFilter) filtered = filtered.filter((c) => c.status === statusFilter);

  renderClientsList(filtered);
}

// === MAPA (LEAFLET) ===

async function initLeafletMap() {
  try {
    if (map) {
      map.remove();
      map = null;
    }

    map = L.map("map").setView([-34.6037, -58.3816], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    await showAllClients();
  } catch (e) {
    console.error("initLeafletMap error:", e);
  }
}

function initMap() {
  initLeafletMap().catch((e) => console.error("initMap error:", e));
}

// showAllClients, showActiveClients, showByType already rely on geocoding helpers defined earlier
async function showAllClients() {
  if (!markersLayer) {
    console.warn("markersLayer no inicializado");
    return;
  }
  markersLayer.clearLayers();

  if (!clients || clients.length === 0) return;

  let bounds = [];
  let dataUpdated = false;

  for (const client of clients) {
    if (!client.coordinates && client.address) {
      try {
        const coords = await geocodeWithNominatim(client.address);
        if (coords) {
          client.coordinates = coords;
          dataUpdated = true;
        }
        await new Promise((res) => setTimeout(res, 1000));
      } catch (e) {
        console.warn("Error geocodificando cliente:", e);
      }
    }

    if (client.coordinates) {
      const referralsCount = contacts.filter((c) => c.clienteDerivado === client.company).length;
      let color = "#3388ff";
      if (client.status === "Inactivo") color = "#ff3333";
      if (client.status === "Prospecto") color = "#ffaa00";

      const marker = L.circleMarker([client.coordinates.lat, client.coordinates.lng], {
        color,
        fillColor: color,
        fillOpacity: 0.7,
        radius: Math.max(8, Math.min(20, 8 + referralsCount * 2))
      }).addTo(markersLayer);

      marker.bindPopup(`
        <div>
          <strong>${client.company}</strong><br>
          ${client.name || ""}<br>
          ${client.address || ""}<br>
          <em>${client.type || ""} - ${client.status || ""}</em><br>
          <strong>Derivaciones recibidas: ${referralsCount}</strong>
        </div>
      `);
      bounds.push([client.coordinates.lat, client.coordinates.lng]);
    }
  }

  if (dataUpdated) {
    saveData();
  }

  if (bounds.length > 0 && map) {
    try {
      map.fitBounds(bounds, { padding: [50, 50] });
    } catch (e) {
      console.warn("fitBounds error:", e);
    }
  }
}

function showActiveClients() {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  const activeClients = clients.filter((c) => c.status === "Activo");
  activeClients.forEach((client) => {
    if (client.coordinates) {
      const referralsCount = contacts.filter((c) => c.clienteDerivado === client.company).length;
      const marker = L.circleMarker([client.coordinates.lat, client.coordinates.lng], {
        color: "#3388ff",
        fillColor: "#3388ff",
        fillOpacity: 0.7,
        radius: Math.max(8, Math.min(20, 8 + referralsCount * 2))
      }).addTo(markersLayer);
      marker.bindPopup(`<div><strong>${client.company}</strong><br>${client.name || ""}</div>`);
    }
  });
}

function showByType(type) {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  const filteredClients = clients.filter((c) => c.type === type);
  filteredClients.forEach((client) => {
    if (client.coordinates) {
      const referralsCount = contacts.filter((c) => c.clienteDerivado === client.company).length;
      let color = "#3388ff";
      if (client.status === "Inactivo") color = "#ff3333";
      if (client.status === "Prospecto") color = "#ffaa00";
      const marker = L.circleMarker([client.coordinates.lat, client.coordinates.lng], {
        color, fillColor: color, fillOpacity: 0.7, radius: Math.max(8, Math.min(20, 8 + referralsCount * 2))
      }).addTo(markersLayer);
      marker.bindPopup(`<div><strong>${client.company}</strong><br>${client.name || ""}</div>`);
    }
  });
}

function showClientsOnMap() {
  showSection("map");
  // initLeafletMap called on map section show if necessary
  setTimeout(() => {
    if (!map) initMap();
  }, 100);
}

// === INFORMES y EXPORTS ===

function generateReports() {
  generateSalesReport();
  generateStatusReport();
  generateTopReferralsReport();
  generateTimelineReport();
  generateReferralsReport();
}

function generateSalesReport() {
  const container = document.getElementById("sales-report");
  if (!container) return;

  const vendedores = ["Juan Larrondo","Andrés Iñiguez","Eduardo Schiavi","Gabriel Caffarello","Natalia Montero"];
  const salesData = vendedores.map((v) => ({ name: v, count: contacts.filter((c) => c.vendedor === v && c.estado === "Vendido").length }));
  const maxSales = Math.max(...salesData.map(d => d.count), 1);

  container.innerHTML = salesData.map(item => `
    <div class="chart-bar">
      <div class="chart-label">${item.name}</div>
      <div class="chart-value" style="width: ${Math.max((item.count/maxSales)*100,5)}%">
        ${item.count} ventas
      </div>
    </div>
  `).join("");
}

function generateStatusReport() {
  const container = document.getElementById("status-report");
  if (!container) return;
  const vendidos = contacts.filter((c) => c.estado === "Vendido").length;
  const noVendidos = contacts.filter((c) => c.estado === "No Vendido").length;
  const derivados = contacts.filter((c) => c.estado === "Derivado").length;

  container.innerHTML = `
    <div class="status-item status-vendido"><span class="status-number">${vendidos}</span><span>Vendidos</span></div>
    <div class="status-item status-no-vendido"><span class="status-number">${noVendidos}</span><span>No Vendidos</span></div>
    <div class="status-item status-derivado"><span class="status-number">${derivados}</span><span>Derivados</span></div>
  `;
}

function generateTopReferralsReport() {
  const container = document.getElementById("referrals-report");
  if (!container) return;
  const referralCounts = {};
  contacts.filter((c) => c.estado === "Derivado").forEach(c => {
    if (c.clienteDerivado) referralCounts[c.clienteDerivado] = (referralCounts[c.clienteDerivado]||0) + 1;
  });
  const sorted = Object.entries(referralCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if (sorted.length===0) {
    container.innerHTML = '<p style="text-align:center;color:#666;">No hay derivaciones registradas</p>';
    return;
  }
  container.innerHTML = sorted.map(([client,count],i) => `
    <div class="ranking-item">
      <span class="ranking-position">#${i+1}</span>
      <span class="ranking-name">${client}</span>
      <span class="ranking-value">${count}</span>
    </div>
  `).join("");
}

function generateTimelineReport() {
  const container = document.getElementById("timeline-report");
  if (!container) return;

  const monthlyData = {};
  contacts.forEach((contact) => {
    const month = (contact.fecha || '').substring(0,7);
    if (!month) return;
    if (!monthlyData[month]) monthlyData[month] = { vendidos:0, derivados:0, total:0 };
    monthlyData[month].total++;
    if (contact.estado === "Vendido") monthlyData[month].vendidos++;
    if (contact.estado === "Derivado") monthlyData[month].derivados++;
  });

  const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
  if (sortedMonths.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#666;">No hay datos temporales</p>';
    return;
  }

  container.innerHTML = sortedMonths.map(month => {
    const data = monthlyData[month];
    const monthName = new Date(month + "-01").toLocaleDateString("es-ES",{ month: "short", year: "numeric"});
    return `
      <div class="timeline-item">
        <span class="timeline-month">${monthName}</span>
        <div class="timeline-stats">
          <span class="timeline-stat stat-total">${data.total} total</span>
          <span class="timeline-stat stat-ventas">${data.vendidos} ventas</span>
          <span class="timeline-stat stat-derivaciones">${data.derivados} deriv.</span>
        </div>
      </div>
    `;
  }).join("");
}

function generateReferralsReport() {
  const tbody = document.getElementById("referrals-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const clientStats = {};
  contacts.filter(c => c.estado === "Derivado").forEach(contact => {
    const clientName = contact.clienteDerivado;
    if (!clientName) return;
    if (!clientStats[clientName]) clientStats[clientName] = { total:0, thisMonth:0, lastContact:null, sellers:{} };
    clientStats[clientName].total++;
    const thisMonth = new Date().toISOString().substring(0,7);
    if ((contact.fecha || '').substring(0,7) === thisMonth) clientStats[clientName].thisMonth++;
    if (!clientStats[clientName].lastContact || (contact.fecha || '') > clientStats[clientName].lastContact) clientStats[clientName].lastContact = contact.fecha;
    clientStats[clientName].sellers[contact.vendedor] = (clientStats[clientName].sellers[contact.vendedor] || 0) + 1;
  });

  Object.entries(clientStats).sort((a,b)=>b[1].total - a[1].total).forEach(([clientName, stats]) => {
    const topSeller = Object.entries(stats.sellers).sort((a,b)=>b[1]-a[1])[0];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${clientName}</strong></td>
      <td>${stats.total}</td>
      <td>${stats.thisMonth}</td>
      <td>${formatDate(stats.lastContact)}</td>
      <td>${topSeller ? `${topSeller[0]} (${topSeller[1]})` : "-"}</td>
    `;
    tbody.appendChild(row);
  });
}

// === EXPORT / DOWNLOAD HELPERS ===

function exportContacts() {
  const csv = [
    ["Fecha","Vendedor","Cliente","Empresa","Teléfono","Email","Producto","Estado","Derivado a","Motivo"].join(","),
    ...contacts.map(c => [
      c.fecha,
      c.vendedor,
      c.cliente,
      c.empresa || "",
      c.telefono || "",
      c.email || "",
      c.Producto,
      c.estado,
      c.clienteDerivado || "",
      c.motivo || ""
    ].map(f => `"${(f||"").toString().replace(/"/g,'""')}"`).join(","))
  ].join("\n");
  downloadCSV(csv,"contactos.csv");
}

function exportClients() {
  const csv = [
    ["Nombre","Empresa","Teléfono","Email","Dirección","Tipo","Estado","Derivaciones Recibidas","Notas"].join(","),
    ...clients.map(c => {
      const referralsCount = contacts.filter(contact => contact.clienteDerivado === c.company).length;
      return [c.name, c.company, c.phone || "", c.email || "", c.address || "", c.type || "", c.status || "", referralsCount, c.notes || ""]
        .map(f => `"${(f||"").toString().replace(/"/g,'""')}"`).join(",");
    })
  ].join("\n");
  downloadCSV(csv,"clientes.csv");
}

function exportFullReport() {
  const today = new Date().toISOString().split("T")[0];
  let report = `INFORME COMERCIAL COMPLETO - ${today}\n\n`;
  report += `ESTADÍSTICAS GENERALES:\n`;
  report += `Total de contactos: ${contacts.length}\n`;
  report += `Ventas realizadas: ${contacts.filter(c=>c.estado==="Vendido").length}\n`;
  report += `Derivaciones: ${contacts.filter(c=>c.estado==="Derivado").length}\n`;
  report += `Clientes registrados: ${clients.length}\n\n`;

  const referralCounts = {};
  contacts.filter(c => c.estado === "Derivado").forEach(contact => {
    if (contact.clienteDerivado) referralCounts[contact.clienteDerivado] = (referralCounts[contact.clienteDerivado]||0)+1;
  });

  report += `TOP CLIENTES POR DERIVACIONES:\n`;
  Object.entries(referralCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([client,count],i) => {
    report += `${i+1}. ${client}: ${count} derivaciones\n`;
  });

  downloadTXT(report,"informe-completo.txt");
}

function downloadCSV(content, filename) {
  const blob = new Blob(["\ufeff"+content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function downloadTXT(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// === UTILIDADES (formatDate ya en Part 1, redefining safe) ===
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES");
}

// === PRODUCTOS (parte importante) ===

const PRODUCTOS_DISPONIBLES = [
  { id: "B1", name: "B1", category: "Sin Marca" },
  { id: "B2", name: "B2", category: "Sin Marca" },
  { id: "B3", name: "B3", category: "Sin Marca" },
  { id: "caja 180 B1", name: "Caja 180 B1", category: "Caja Grande" },
  { id: "caj 180 B2", name: "Caja 180 B2", category: "Caja Grande" },
  { id: "caja 180 B3", name: "Caja 180 B3", category: "Caja Grande" },
  { id: "Caja 18 doc (x6)", name: "Caja 18 Docenas (x6)", category: "Caja Docenas" },
  { id: "Caja 18 doc (x12)", name: "Caja 18 Docenas (x12)", category: "Caja Docenas" },
  { id: "estuche_b2_x6", name: "Estuche B2 x6 (Licitación)", category: "Licitación" },
  { id: "estuche_b2_x12", name: "Estuche B2 x12 (Licitación)", category: "Licitación" },
  { id: "pack_6_maples_b1", name: "Pack 6 Maples B1", category: "Pack Maples" },
  { id: "pack_6_maples_b2", name: "Pack 6 Maples B2", category: "Pack Maples" },
  { id: "pack_6_maples_b3", name: "Pack 6 Maples B3", category: "Pack Maples" }
];

function updateProductSelect() {
  const productSelect = document.getElementById("Producto");
  const editProductSelect = document.getElementById("edit-Producto");
  if (productSelect) {
    productSelect.innerHTML = '<option value="">Seleccionar Producto</option>';
    const grouped = {};
    PRODUCTOS_DISPONIBLES.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    Object.keys(grouped).forEach(category => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = category;
      grouped[category].forEach(product => {
        const opt = document.createElement("option");
        opt.value = product.name;
        opt.textContent = product.name;
        optgroup.appendChild(opt);
      });
      productSelect.appendChild(optgroup);
    });
  }
  if (editProductSelect) {
    editProductSelect.innerHTML = '<option value="">Seleccionar Producto</option>';
    const grouped = {};
    PRODUCTOS_DISPONIBLES.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    Object.keys(grouped).forEach(category => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = category;
      grouped[category].forEach(product => {
        const opt = document.createElement("option");
        opt.value = product.name;
        opt.textContent = product.name;
        optgroup.appendChild(opt);
      });
      editProductSelect.appendChild(optgroup);
    });
  }
}

// Product reports and filters

function generateProductReport() {
  const container = document.getElementById("product-report");
  if (!container) return;
  const productCounts = {};
  contacts.forEach(c => {
    if (c.Producto && c.Producto !== "") productCounts[c.Producto] = (productCounts[c.Producto]||0)+1;
  });
  const sorted = Object.entries(productCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  if (sorted.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#666;">No hay datos de Productos</p>';
    return;
  }
  const max = Math.max(...sorted.map(s=>s[1]),1);
  container.innerHTML = sorted.map(([product,count],i)=>`
    <div class="ranking-item">
      <span class="ranking-position">#${i+1}</span>
      <span class="ranking-name">${product}</span>
      <div class="product-bar">
        <div class="product-bar-fill" style="width: ${(count/max)*100}%"></div>
        <span class="product-count">${count}</span>
      </div>
    </div>
  `).join("");
}

function generateProductBySellerReport() {
  const container = document.getElementById("product-by-seller-report");
  if (!container) return;
  const vendedores = ["Juan Larrondo","Andrés Iñiguez","Eduardo Schiavi","Gabriel Caffarello","Natalia Montero"];
  const productData = {};
  vendedores.forEach(v => {
    productData[v] = {};
    PRODUCTOS_DISPONIBLES.forEach(p => productData[v][p.name] = 0);
  });
  contacts.forEach(c => {
    if (c.vendedor && c.Producto && c.Producto !== "" && productData[c.vendedor] && productData[c.vendedor][c.Producto] !== undefined) {
      productData[c.vendedor][c.Producto]++;
    }
  });
  let html = '<div class="seller-product-grid">';
  vendedores.forEach(v => {
    const items = Object.entries(productData[v]).filter(([_,count])=>count>0).sort((a,b)=>b[1]-a[1]);
    html += `<div class="seller-product-card"><h4 class="seller-name">${v}</h4>`;
    if (items.length>0) {
      html += items.map(([p,count])=>`<div class="seller-product-item"><span class="product-name">${p}</span><span class="product-count">${count}</span></div>`).join("");
    } else {
      html += '<p class="no-products">Sin Productos registrados</p>';
    }
    html += `</div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function generateProductCategoryReport() {
  const container = document.getElementById("product-category-report");
  if (!container) return;
  const categoryCounts = {};
  contacts.forEach(c => {
    if (c.Producto && c.Producto !== "") {
      const prod = PRODUCTOS_DISPONIBLES.find(p => p.name === c.Producto);
      if (prod) categoryCounts[prod.category] = (categoryCounts[prod.category]||0)+1;
    }
  });
  const sorted = Object.entries(categoryCounts).sort((a,b)=>b[1]-a[1]);
  if (sorted.length===0) {
    container.innerHTML = '<p style="text-align:center;color:#666;">No hay datos de categorías</p>';
    return;
  }
  const total = sorted.reduce((s,[_k,c])=>s+c,0);
  container.innerHTML = sorted.map(([cat,count])=>{
    const percentage = Math.round((count/total)*100);
    return `<div class="category-item"><div class="category-header"><span class="category-name">${cat}</span><span class="category-stats">${count} (${percentage}%)</span></div><div class="category-bar"><div class="category-bar-fill" style="width:${percentage}%"></div></div></div>`;
  }).join("");
}

function getProductStats() {
  const totalProducts = contacts.filter(c => c.Producto && c.Producto !== "").length;
  const uniqueProducts = [...new Set(contacts.map(c=>c.Producto).filter(p=>p && p!==""))].length;
  const topProduct = getTopProduct();
  return { total: totalProducts, unique: uniqueProducts, topProduct };
}

function getTopProduct() {
  const counts = {};
  contacts.forEach(c => { if (c.Producto && c.Producto!=="") counts[c.Producto] = (counts[c.Producto]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  return sorted.length>0 ? { name: sorted[0][0], count: sorted[0][1] } : { name: "N/A", count: 0 };
}

function updateProductStats() {
  const stats = getProductStats();
  const totalEl = document.getElementById("total-products-requested");
  const uniqueEl = document.getElementById("unique-products");
  const topEl = document.getElementById("top-product");
  if (totalEl) totalEl.textContent = stats.total;
  if (uniqueEl) uniqueEl.textContent = stats.unique;
  if (topEl) topEl.textContent = `${stats.topProduct.name} (${stats.topProduct.count})`;
}

function filterContactsByProduct() {
  const sel = document.getElementById("filter-product");
  if (!sel) return;
  const val = sel.value;
  if (!val) {
    renderContactsList();
    return;
  }
  const filtered = contacts.filter(c => c.Producto === val);
  renderContactsList(filtered);
}

function addProductFilter() {
  const container = document.querySelector(".filters");
  if (!container) return;
  if (document.getElementById("filter-product")) return;
  const group = document.createElement("div");
  group.className = "filter-group";
  group.innerHTML = `<label for="filter-product">Producto:</label><select id="filter-product" onchange="filterContactsByProduct()"><option value="">Todos los Productos</option></select>`;
  container.appendChild(group);
  const uniqueProducts = [...new Set(contacts.map(c=>c.Producto).filter(p=>p && p!==""))].sort();
  const select = document.getElementById("filter-product");
  uniqueProducts.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p; opt.textContent = p; select.appendChild(opt);
  });
}

function exportProductReport() {
  const productCounts = {};
  const categoryStats = {};
  contacts.forEach(c => {
    if (c.Producto && c.Producto !== "") {
      productCounts[c.Producto] = (productCounts[c.Producto]||0)+1;
      const prod = PRODUCTOS_DISPONIBLES.find(p => p.name === c.Producto);
      if (prod) categoryStats[prod.category] = (categoryStats[prod.category]||0)+1;
    }
  });
  const csvContent = [
    "REPORTE DE PRODUCTOS SOLICITADOS",
    "",
    "Producto,Cantidad Solicitada,Categoría",
    ...Object.entries(productCounts).sort((a,b)=>b[1]-a[1]).map(([product,count]) => {
      const productInfo = PRODUCTOS_DISPONIBLES.find(p => p.name === product);
      const category = productInfo ? productInfo.category : "Sin categoría";
      return `"${product}",${count},"${category}"`;
    }),
    "",
    "RESUMEN POR CATEGORÍAS",
    "Categoría,Total",
    ...Object.entries(categoryStats).sort((a,b)=>b[1]-a[1]).map(([cat,count]) => `"${cat}",${count}`)
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reporte-productos-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
}

// Enhance generateReports to include product reports (preserves original)
const originalGenerateReports = typeof generateReports === "function" ? generateReports : null;
generateReports = function() {
  if (originalGenerateReports) originalGenerateReports();
  generateProductReport();
  generateProductBySellerReport();
  generateProductCategoryReport();
  updateProductStats();
};

// Enhance init to include product setup
const originalInit = typeof init === "function" ? init : null;
init = async function() {
  if (originalInit) {
    // original may be sync, but we made init async earlier, so call and then continue.
    try {
      await originalInit();
    } catch (e) {
      console.warn("originalInit error (ignored):", e);
    }
  }
  try {
    updateProductSelect();
    addProductFilter();
  } catch (e) {
    console.warn("product init error:", e);
  }
};

// Replace renderContactsList with enhanced version that also updates product filter
const originalRenderContactsList = typeof renderContactsList === "function" ? renderContactsList : null;
renderContactsList = function(filteredContacts = null) {
  if (originalRenderContactsList) {
    originalRenderContactsList(filteredContacts);
  } else {
    // fallback to our implementation
    const contactsToShow = filteredContacts || contacts;
    const tbody = document.getElementById("contacts-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    contactsToShow.slice().reverse().forEach(c => {
      const row = document.createElement("tr");
      const productoDisplay = c.Producto || "Sin Producto especificado";
      row.innerHTML = `<td>${formatDate(c.fecha)}</td><td>${c.vendedor||""}</td><td>${c.cliente||""}</td><td>${c.empresa||"-"}</td><td><strong>${productoDisplay}</strong></td><td><span class="status-badge status-${(c.estado||"").toLowerCase().replace(" ","-")}">${c.estado||"-"}</span></td><td>${c.clienteDerivado||"-"}</td><td>${c.motivo||"-"}</td><td class="actions-column"><button class="btn-edit" onclick="editContact(${c.id})" title="Editar">✏️</button><button class="btn-delete" onclick="deleteContact(${c.id})" title="Eliminar">🗑️</button></td>`;
      tbody.appendChild(row);
    });
  }

  try {
    if (!filteredContacts) addProductFilter();
  } catch (e) {
    console.warn("update product filter error:", e);
  }
};

// === VALIDACIÓN OBLIGATORIA DE PRODUCTOS y ALERT STYLES (create if needed) ===

function validateProductSelection() {
  const productoSelect = document.getElementById("Producto");
  if (!productoSelect) return true;
  const Producto = (productoSelect.value || "").trim();
  if (!Producto) {
    showProductAlert();
    productoSelect.style.borderColor = "#dc3545";
    productoSelect.style.boxShadow = "0 0 0 3px rgba(220,53,69,0.25)";
    productoSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  productoSelect.style.borderColor = "#e1e5e9";
  productoSelect.style.boxShadow = "none";
  return true;
}

function validateEditProductSelection() {
  const productoSelect = document.getElementById("edit-Producto");
  if (!productoSelect) return true;
  const Producto = (productoSelect.value || "").trim();
  if (!Producto) {
    showProductAlert();
    productoSelect.style.borderColor = "#dc3545";
    productoSelect.style.boxShadow = "0 0 0 3px rgba(220,53,69,0.25)";
    productoSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  productoSelect.style.borderColor = "#e1e5e9";
  productoSelect.style.boxShadow = "none";
  return true;
}

function showProductAlert() {
  let alertModal = document.getElementById("product-alert-modal");
  if (!alertModal) {
    alertModal = document.createElement("div");
    alertModal.id = "product-alert-modal";
    alertModal.className = "product-alert-modal";
    alertModal.innerHTML = `
      <div class="product-alert-content">
        <div class="product-alert-icon">⚠️</div>
        <h3>Producto Requerido</h3>
        <p>Debe seleccionar un Producto antes de continuar.</p>
        <p><strong>Por favor, elija una opción de la lista de Productos.</strong></p>
        <button onclick="closeProductAlert()" class="product-alert-btn">Entendido</button>
      </div>
    `;
    document.body.appendChild(alertModal);
    addProductAlertStyles();
  }
  alertModal.style.display = "flex";
  setTimeout(() => closeProductAlert(), 5000);
}

function closeProductAlert() {
  const modal = document.getElementById("product-alert-modal");
  if (modal) modal.style.display = "none";
}

function addProductAlertStyles() {
  if (document.getElementById("product-alert-styles")) return;
  const styles = document.createElement("style");
  styles.id = "product-alert-styles";
  styles.textContent = `
    .product-alert-modal { display:none; position:fixed; z-index:3000; left:0; top:0; width:100%; height:100%; background-color: rgba(0,0,0,0.6); backdrop-filter: blur(4px); justify-content:center; align-items:center; }
    .product-alert-content { background:white; padding:30px; border-radius:20px; box-shadow:0 20px 40px rgba(0,0,0,0.3); text-align:center; max-width:400px; margin:20px; }
    .product-alert-icon { font-size:3em; margin-bottom:15px; }
    .product-alert-content h3 { color:#dc3545; margin-bottom:15px; font-size:1.5em; font-weight:700; }
    .product-alert-content p { color:#666; margin-bottom:10px; font-size:1em; line-height:1.4; }
    .product-alert-btn { background: linear-gradient(135deg,#dc3545 0%, #c82333 100%); color:white; border:none; padding:12px 25px; border-radius:25px; font-size:16px; font-weight:600; cursor:pointer; margin-top:15px; min-width:120px; }
    .product-alert-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(220,53,69,0.4); }
  `;
  document.head.appendChild(styles);
}

// === FORM VALIDATION HOOKS ===

function setupContactFormValidation() {
  const contactForm = document.getElementById("contact-form");
  if (!contactForm) return;
  try {
    contactForm.removeEventListener("submit", handleContactSubmit);
  } catch (e) {}
  contactForm.addEventListener("submit", function(e) {
    e.preventDefault();
    if (!validateProductSelection()) return;
    // normal processing (mirrors earlier contact form code)
    const formData = new FormData(e.target);
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
    saveData();
    showSuccessMessage("contact-success-message");
    e.target.reset();
    const derivGroup = document.getElementById("derivacion-group");
    if (derivGroup) derivGroup.style.display = "none";
    updateDashboard();
    updateProductSelect();
  });
}

function setupEditContactFormValidation() {
  const editContactForm = document.getElementById("edit-contact-form");
  if (!editContactForm) return;
  try {
    editContactForm.removeEventListener("submit", handleEditContactSubmit);
  } catch (e) {}
  editContactForm.addEventListener("submit", function(e) {
    e.preventDefault();
    if (!validateEditProductSelection()) return;
    const contactId = document.getElementById("edit-contact-id").value;
    const formData = new FormData(e.target);
    const idx = contacts.findIndex(c => c.id == contactId);
    if (idx === -1) return;
    contacts[idx] = {
      ...contacts[idx],
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
      editadoPor: currentUser ? currentUser.username : null,
      fechaEdicion: new Date().toISOString()
    };
    saveData();
    closeEditContactModal();
    renderContactsList();
    updateDashboard();
    showSuccessMessage("contact-success-message");
  });
}

// End of PART 2/3
// (Part 3/3 will include remaining initialization wiring, final event bindings, export of global functions and the final document-ready call if needed.)
// ========================================
// === PART 3/3 – FINAL SYSTEM WIRING =====
// ========================================

// --- RESTAURAR SESIÓN DESDE COOKIE ---
async function restoreSessionFromCookie() {
  try {
    const token = getCookie("granja_session");
    if (!token || !window.supabase) return;

    const { data: sessionRow, error: sessionError } = await window.supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .limit(1)
      .single();

    if (sessionError || !sessionRow) return;

    const { data: userRow, error: userError } = await window.supabase
      .from("users")
      .select("*")
      .eq("username", sessionRow.username)
      .limit(1)
      .single();

    if (!userError && userRow) {
      currentUser = {
        username: userRow.username,
        name: userRow.name,
        role: userRow.role,
      };
    }
  } catch (e) {
    console.warn("Error restoring session:", e);
  }
}

// --- LOGIN ---
async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById("login-username")?.value?.trim();
  const password = document.getElementById("login-password")?.value?.trim();

  if (!username || !password) {
    showErrorMessage("login-error-message", "Faltan datos");
    return;
  }

  try {
    const { data: userRow, error } = await window.supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .limit(1)
      .single();

    if (error || !userRow) {
      showErrorMessage("login-error-message", "Credenciales incorrectas");
      return;
    }

    currentUser = {
      username: userRow.username,
      name: userRow.name,
      role: userRow.role,
    };

    // CREAR TOKEN DE SESIÓN
    const token = crypto.randomUUID();
    setCookie("granja_session", token, 7);

    await window.supabase.from("sessions").insert({
      username: currentUser.username,
      token,
      created_at: new Date().toISOString(),
    });

    if (userRow.firstLogin) {
      showSection("password-change");
      return;
    }

    showApp();
  } catch (err) {
    console.error("Login error:", err);
  }
}

// --- CAMBIO DE CONTRASEÑA ---
async function handlePasswordChange(e) {
  e.preventDefault();

  const newPwd = document.getElementById("new-password")?.value?.trim();
  const newPwd2 = document.getElementById("confirm-password")?.value?.trim();

  if (!newPwd || newPwd !== newPwd2) {
    showErrorMessage("password-change-error", "Las contraseñas no coinciden");
    return;
  }

  try {
    await window.supabase
      .from("users")
      .update({ password: newPwd, firstLogin: false })
      .eq("username", currentUser.username);

    showSection("dashboard");
  } catch (e) {
    console.error("Password update error:", e);
  }
}

// --- LOGOUT ---
async function logout() {
  const token = getCookie("granja_session");
  eraseCookie("granja_session");

  if (token && window.supabase) {
    await window.supabase.from("sessions").delete().eq("token", token);
  }

  currentUser = null;
  showLogin();
}

// --- MOSTRAR LOGIN / APP ---
function showLogin() {
  showSection("login");
}

function showApp() {
  document.getElementById("login").style.display = "none";
  showSection("dashboard");
  updateDashboard();
  renderContactsList();
  renderClientsList();
}

// --- INIT APP ---
async function init() {
  console.log("Init started");

  // iniciar producto select
  try {
    updateProductSelect();
    addProductFilter();
  } catch (e) {
    console.warn("Product init failed:", e);
  }

  // cargar todo desde Supabase
  await dbLoadAllData();

  // restaurar sesión
  await restoreSessionFromCookie();
  if (currentUser) {
    showApp();
  }

  setupEventListeners();
  setupContactFormValidation();
  setupEditContactFormValidation();

  console.log("Init complete");
}


// ======================================================
// === EVENT LISTENERS (FINAL) ===========================
// ======================================================

function setupEventListeners() {
  // login
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  // password change
  const pwdForm = document.getElementById("password-change-form");
  if (pwdForm) pwdForm.addEventListener("submit", handlePasswordChange);

  // logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // nav
  document.getElementById("nav-dashboard")?.addEventListener("click", () => showSection("dashboard"));
  document.getElementById("nav-map")?.addEventListener("click", () => showClientsOnMap());
  document.getElementById("nav-contacts")?.addEventListener("click", () => showSection("contacts"));
  document.getElementById("nav-clients")?.addEventListener("click", () => showSection("clients"));
  document.getElementById("nav-reports")?.addEventListener("click", () => {
    showSection("reports");
    generateReports();
  });
}


// ======================================================
// === EXPONER FUNCIONES GLOBALMENTE =====================
// ======================================================

window.showSection = showSection;
window.logout = logout;
window.showLogin = showLogin;
window.showApp = showApp;
window.editContact = editContact;
window.editClient = editClient;
window.deleteContact = deleteContact;
window.deleteClient = deleteClient;
window.closeEditContactModal = closeEditContactModal;
window.closeEditClientModal = closeEditClientModal;
window.showClientsOnMap = showClientsOnMap;
window.exportContacts = exportContacts;
window.exportClients = exportClients;
window.exportProductReport = exportProductReport;
window.exportFullReport = exportFullReport;
window.filterContacts = filterContacts;
window.filterClients = filterClients;
window.filterContactsByProduct = filterContactsByProduct;


// ======================================================
// === EJECUTAR INIT CUANDO EL DOM ESTÉ LISTO ===========
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  init();
});
// ======================
// EXPONER FUNCIONES AL SCOPE GLOBAL
// ======================

window.showSection = showSection;
window.logout = logout;
window.handleLogin = handleLogin;
window.handleContactSubmit = handleContactSubmit;
window.handleClientSubmit = handleClientSubmit;
window.handlePasswordChange = handlePasswordChange;
window.updateDashboard = updateDashboard;
window.loadContacts = loadContacts;
window.loadClients = loadClients;
