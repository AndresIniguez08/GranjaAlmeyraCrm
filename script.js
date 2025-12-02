
/*

// === SISTEMA DE AUTENTICACIÓN ===
const USERS = {
  admin: {
    password: "She.said5643",
    name: "Administrador",
    role: "admin",
    firstLogin: false,
  },
  "Juan.Larrondo": {
    password: "venta123",
    name: "Juan Larrondo",
    role: "vendedor",
    firstLogin: true,
  },
  "Andres.Iñiguez": {
    password: "venta123",
    name: "Andrés Iñiguez",
    role: "vendedor",
    firstLogin: true,
  },
  "Eduardo.Schiavi": {
    password: "venta123",
    name: "Eduardo Schiavi",
    role: "vendedor",
    firstLogin: true,
  },
  "Gabriel.Caffarello": {
    password: "venta123",
    name: "Gabriel Caffarello",
    role: "vendedor",
    firstLogin: true,
  },
  "Natalia.Montero" : {
    password: "venta123",
    name: "Natalia Montero",
    role: "vendedor",
    firstLogin: true,
  },
};
*/

/* ---------------------------
   Supabase integration helpers
   ---------------------------
   BEFORE using the app, call:
     initSupabase('https://YOUR-SUPABASE-URL.supabase.co', 'YOUR-ANON-KEY');
   or include the UMD CDN:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js"></script>
   and then call initSupabase with your credentials.
*/
let supabase = null;


  // Ejecutar inicialización
  initSupabase();
initSupabase('https://gntwqahvwwvkwhkdowwh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdudHdxYWh2d3d2a3doa2Rvd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc0NjQsImV4cCI6MjA3OTgyMzQ2NH0.qAgbzFmnG5136V1pTStF_hW7jKaAzoIlSYoWt2qxM9E');
async function initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY) {
  if (typeof window !== 'undefined' && window.createClient) {
    supabase = window.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.info('Supabase initialized (UMD).');
    return;
  }
  try {
    // Attempt dynamic ESM import (may fail in non-module environments)
    const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    supabase = module.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.info('Supabase initialized (dynamic import).');
  } catch (err) {
    console.warn('No supabase client detected. Call initSupabase(...) with your credentials or include the UMD script.', err);
  }
}

/* Cookie helpers for optional session persistence */
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}
function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r
  }, '');
}
function eraseCookie(name) {
  setCookie(name, '', -1);
}

/* In-memory datasets (will be loaded from DB if supabase is initialized) */
let contacts = [];
let clients = [];
// USERS already declared above; we'll update USERS at load if DB has users

/* DB helpers (see earlier assistant message for table schema expectations) */
async function dbLoadAllData() {
  if (!supabase) {
    console.warn('Supabase not initialized — continuing with data in memory.');
    return;
  }
  try {
    const { data: contactsData, error: contactsError } = await supabase
      .from('commercial_contacts')
      .select('*');
    if (contactsError) throw contactsError;
    contacts = contactsData || [];
  } catch (err) {
    console.error('Error loading commercial_contacts:', err);
    contacts = [];
  }

  try {
    const { data: clientsData, error: clientsError } = await supabase
      .from('commercial_clients')
      .select('*');
    if (clientsError) throw clientsError;
    clients = clientsData || [];
  } catch (err) {
    console.error('Error loading commercial_clients:', err);
    clients = [];
  }

  try {
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*');
    if (usersError) throw usersError;
    if (usersData && usersData.length > 0) {
      // overwrite USERS constant properties for runtime usage
      for (const u of usersData) {
        USERS[u.username] = {
          password: u.password,
          name: u.name,
          role: u.role,
          firstLogin: !!u.firstLogin
        };
      }
    }
  } catch (err) {
    console.error('Error loading users from DB:', err);
  }

  // Try restore session from cookie
  const token = getCookie('granja_session');
  if (token) {
    try {
      const { data: sessionRow, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('token', token)
        .limit(1)
        .single();
      if (!sessionError && sessionRow) {
        const { data: userRow, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('username', sessionRow.username)
          .limit(1)
          .single();
        if (!userError && userRow) {
          currentUser = { username: userRow.username, name: userRow.name, role: userRow.role };
        }
      }
    } catch (err) {
      console.warn('Error restoring session from DB:', err);
    }
  }
}

async function dbSaveAllData() {
  if (!supabase) {
    console.warn('Supabase not initialized — changes remain in memory.');
    return;
  }
  try {
    if (contacts && contacts.length > 0) {
      await supabase.from('commercial_contacts').upsert(contacts, { onConflict: 'id' });
    }
  } catch (err) {
    console.error('Error upserting contacts:', err);
  }
  try {
    if (clients && clients.length > 0) {
      await supabase.from('commercial_clients').upsert(clients, { onConflict: 'id' });
    }
  } catch (err) {
    console.error('Error upserting clients:', err);
  }
}

/* Minimal DB delete helpers used later */
async function dbDeleteContact(id) {
  if (!supabase) return;
  try {
    await supabase.from('commercial_contacts').delete().eq('id', id);
  } catch (err) {
    console.error('Error deleting contact:', err);
  }
}
async function dbDeleteClient(id) {
  if (!supabase) return;
  try {
    await supabase.from('commercial_clients').delete().eq('id', id);
  } catch (err) {
    console.error('Error deleting client:', err);
  }
}

/* User upsert helper */
async function upsertUsers(userObj) {
  if (!supabase) return;
  try {
    const rows = Object.entries(userObj).map(([username,u]) => ({ username, password: u.password, name: u.name, role: u.role, firstLogin: !!u.firstLogin }));
    await supabase.from('users').upsert(rows, { onConflict: 'username' });
  } catch (err) {
    console.error('Error upserting users:', err);
  }
}

/* Wrapper functions used by original code */
function loadData() {
  // keep sync signature for compatibility: start async load but don't block UI
  dbLoadAllData().catch(err => console.error(err));
}
function saveData() {
  // async persist in background
  dbSaveAllData().catch(err => console.error(err));
}

/* Session creation helper used during login */
async function createSessionForUser(username) {
  const token = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
  setCookie('granja_session', token, 7);
  if (!supabase) return;
  try {
    await supabase.from('sessions').upsert({ token, username, last_active: new Date().toISOString() }, { onConflict: 'token' });
  } catch (err) {
    console.warn('Could not create session in DB:', err);
  }
}

/* Logout helper */
async function clearSession() {
  const token = getCookie('granja_session');
  eraseCookie('granja_session');
  if (!supabase || !token) return;
  try {
    await supabase.from('sessions').delete().eq('token', token);
  } catch (err) {
    console.warn('Could not delete session in DB:', err);
  }
}
let currentUser = null;
// Inicializar el sistema
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("app-screen").style.display = "none";
  document.getElementById("password-change-screen").style.display = "none";

  // Attempt to restore session and load data (Supabase optional).
  // If you haven't initialized Supabase, the app will continue using localStorage fallback.
  loadData();
  const sessionToken = getCookie('granja_session');
  if (sessionToken) {
    // If session restored by dbLoadAllData, currentUser may already be set.
    if (typeof currentUser !== 'undefined' && currentUser) {
      showApp();
    } else {
      // otherwise show login; dbLoadAllData attempted to restore session if supabase initialized.
      showLogin();
    }
  } else {
    showLogin();
  }

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document
    .getElementById("password-change-form")
    .addEventListener("submit", handlePasswordChange);
;

function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const userData = getUserData();

  if (userData[username] && userData[username].password === password) {
    currentUser = {
      username: username,
      name: userData[username].name,
      role: userData[username].role,
    };

    if (userData[username].firstLogin) {
      showPasswordChange();
    } else {
      // Persist current user: create session (cookie + sessions table if available)
      createSessionForUser(currentUser.username).catch(()=>{});
      // Also keep a localStorage fallback for compatibility
      localStorage.setItem("current-user", JSON.stringify(currentUser));
      showApp();
    }
  } else {
    document.getElementById("login-error").style.display = "block";
    setTimeout(() => {
      document.getElementById("login-error").style.display = "none";
    }, 3000);
  }
}

function handlePasswordChange(e) {
  e.preventDefault();

  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (newPassword !== confirmPassword || newPassword.length < 6) {
    document.getElementById("password-error").style.display = "block";
    setTimeout(() => {
      document.getElementById("password-error").style.display = "none";
    }, 3000);
    return;
  }

  const userData = getUserData();
  userData[currentUser.username].password = newPassword;
  userData[currentUser.username].firstLogin = false;

  // Persist user-data: update DB (if available) and localStorage fallback
  upsertUsers(userData).catch(()=>{});
  localStorage.setItem("user-data", JSON.stringify(userData));
  // Persist current user: create session (cookie + sessions table if available)
  createSessionForUser(currentUser.username).catch(()=>{});
  // Also keep a localStorage fallback for compatibility
  localStorage.setItem("current-user", JSON.stringify(currentUser));
  showApp();
}

function getUserData() {
  // USERS is kept in memory and loaded from DB at startup if Supabase is initialized.
  return USERS;
}


function showPasswordChange() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("password-change-screen").style.display = "flex";
  document.getElementById("app-screen").style.display = "none";

  document.getElementById("new-password").value = "";
  document.getElementById("confirm-password").value = "";
  document.getElementById("password-error").style.display = "none";
}

function logout() {
  // Clear session both locally and in DB
  clearSession().catch(()=>{});
  currentUser = null;
  showLogin();
}

function showLogin() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("password-change-screen").style.display = "none";
  document.getElementById("app-screen").style.display = "none";

  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("login-error").style.display = "none";
}

function showApp() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("password-change-screen").style.display = "none";
  document.getElementById("app-screen").style.display = "block";
  document.getElementById("current-user").textContent = currentUser.name;

  init();
}

// === DATOS GLOBALES ===
let contacts = [];
let clients = [];
let map = null;
let markersLayer = null;

// Variables globales para geolocalización
let tempCoordinates = null;
let editTempCoordinates = null;

// === FUNCIONES DE GEOLOCALIZACIÓN ===

// Geocodificación con Nominatim (OpenStreetMap)
async function geocodeWithNominatim(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address
  )}&format=json&countrycodes=ar&limit=1`;

  try {
    // Nominatim requires a custom User-Agent
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "GranjaAlmeyraCRM/1.0 (https://github.com/jponc/granja-almeyra-crm)",
      },
    });
    if (!response.ok) {
      throw new Error(`Error en la solicitud: ${response.statusText}`);
    }
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error en geocodificación con Nominatim:", error);
    throw new Error("El servicio de geocodificación no está disponible.");
  }
}

// Geocodificación inversa con Nominatim (coordenadas → dirección)
async function reverseGeocodeWithNominatim(lat, lng, addressFieldId) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "GranjaAlmeyraCRM/1.0 (https://github.com/jponc/granja-almeyra-crm)",
      },
    });
    if (!response.ok) {
      throw new Error(`Error en la solicitud: ${response.statusText}`);
    }
    const data = await response.json();

    if (data && data.display_name) {
      const addressField = document.getElementById(addressFieldId);
      if (addressField) {
        addressField.value = data.display_name;
      }
      return data.display_name;
    } else {
      console.warn(
        "Geocodificación inversa con Nominatim falló: No se encontró dirección."
      );
      return null;
    }
  } catch (error) {
    console.error("Error en geocodificación inversa con Nominatim:", error);
    throw new Error(
      "El servicio de geocodificación inversa no está disponible."
    );
  }
}

// Fallback de geolocalización por IP
async function getLocationByIP(displayElement, isEditForm) {
  displayElement.textContent = "Intentando ubicación por IP (menos precisa)...";
  try {
    const response = await fetch("https://ip-api.com/json");
    if (!response.ok) {
      throw new Error(`Error en la solicitud: ${response.statusText}`);
    }
    const data = await response.json();

    if (data && data.status === "success" && data.lat && data.lon) {
      const coords = {
        lat: data.lat,
        lng: data.lon,
      };

      if (isEditForm) {
        editTempCoordinates = coords;
      } else {
        tempCoordinates = coords;
      }

      displayElement.textContent = `Coordenadas (aprox.): ${coords.lat.toFixed(
        4
      )}, ${coords.lng.toFixed(4)}`;

      const addressFieldId = isEditForm
        ? "edit-client-address"
        : "client-address";
      await reverseGeocodeWithNominatim(coords.lat, coords.lng, addressFieldId);
    } else {
      throw new Error("No se pudo obtener la ubicación por IP.");
    }
  } catch (error) {
    console.error("Error obteniendo ubicación por IP:", error);
    displayElement.textContent = "No se pudo determinar la ubicación.";
  }
}

// Para formulario principal
async function getCurrentLocation() {
  const display = document.getElementById("coordinates-display");

  if (!navigator.geolocation) {
    display.textContent = "Geolocalización no disponible en este navegador";
    return;
  }

  display.textContent = "Obteniendo ubicación...";

  navigator.geolocation.getCurrentPosition(
    async function (position) {
      tempCoordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      display.textContent = `Coordenadas: ${tempCoordinates.lat.toFixed(
        6
      )}, ${tempCoordinates.lng.toFixed(6)}`;

      // Geocodificación inversa para obtener la dirección
      await reverseGeocodeWithNominatim(
        tempCoordinates.lat,
        tempCoordinates.lng,
        "client-address"
      );
    },
    async function (error) {
      console.warn(
        `Error de geolocalización (${error.code}): ${error.message}`
      );
      // Fallback to IP-based geolocation
      await getLocationByIP(display, false);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

// Para modal de edición
async function getCurrentLocationEdit() {
  const display = document.getElementById("edit-coordinates-display");

  if (!navigator.geolocation) {
    display.textContent = "Geolocalización no disponible en este navegador";
    return;
  }

  display.textContent = "Obteniendo ubicación...";

  navigator.geolocation.getCurrentPosition(
    async function (position) {
      editTempCoordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      display.textContent = `Coordenadas: ${editTempCoordinates.lat.toFixed(
        6
      )}, ${editTempCoordinates.lng.toFixed(6)}`;

      // Geocodificación inversa para obtener la dirección
      await reverseGeocodeWithNominatim(
        editTempCoordinates.lat,
        editTempCoordinates.lng,
        "edit-client-address"
      );
    },
    async function (error) {
      console.warn(
        `Error de geolocalización (${error.code}): ${error.message}`
      );
      const display = document.getElementById("edit-coordinates-display");
      // Fallback to IP-based geolocation
      await getLocationByIP(display, true);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

// Geocodificar dirección del formulario principal
async function geocodeCurrentAddress() {
  const addressField = document.getElementById("client-address");
  const address = addressField.value.trim();
  const display = document.getElementById("coordinates-display");

  if (!address) {
    display.textContent = "Ingresa una dirección primero";
    return;
  }

  display.textContent = "Buscando coordenadas...";

  try {
    tempCoordinates = await geocodeWithNominatim(address);

    if (tempCoordinates) {
      display.textContent = `Coordenadas encontradas: ${tempCoordinates.lat.toFixed(
        6
      )}, ${tempCoordinates.lng.toFixed(6)}`;
    } else {
      display.textContent =
        "No se pudieron encontrar coordenadas para esa dirección";
    }
  } catch (error) {
    display.textContent = "Error buscando coordenadas: " + error.message;
    console.error("Error geocodificando:", error);
  }
}

// Geocodificar dirección del modal de edición
async function geocodeCurrentAddressEdit() {
  const addressField = document.getElementById("edit-client-address");
  const address = addressField.value.trim();
  const display = document.getElementById("edit-coordinates-display");

  if (!address) {
    display.textContent = "Ingresa una dirección primero";
    return;
  }

  display.textContent = "Buscando coordenadas...";

  try {
    editTempCoordinates = await geocodeWithNominatim(address);

    if (editTempCoordinates) {
      display.textContent = `Coordenadas encontradas: ${editTempCoordinates.lat.toFixed(
        6
      )}, ${editTempCoordinates.lng.toFixed(6)}`;
    } else {
      display.textContent =
        "No se pudieron encontrar coordenadas para esa dirección";
    }
  } catch (error) {
    display.textContent = "Error buscando coordenadas: " + error.message;
    console.error("Error geocodificando:", error);
  }
}

// === FUNCIONES DE DATOS ===
// NOTE: data load/save helpers are defined earlier to support Supabase integration.

// === NAVEGACIÓN ===
function showSection(sectionName) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (sectionName === "map") {
    document.getElementById("map-section").classList.add("active");
  } else {
    document.getElementById(sectionName).classList.add("active");
  }

  event.target.classList.add("active");

  switch (sectionName) {
    case "dashboard":
      updateDashboard();
      break;
    case "list-contacts":
      renderContactsList();
      break;
    case "list-clients":
      renderClientsList();
      updateClientSelect();
      break;
    case "map":
      setTimeout(initMap, 100);
      break;
    case "reports":
      generateReports();
      break;
  }
}

// === FUNCIONES DE FORMULARIOS ===
function toggleDerivacion() {
  const estado = document.getElementById("estado").value;
  const derivacionGroup = document.getElementById("derivacion-group");
  const clienteDerivado = document.getElementById("cliente-derivado");

  if (estado === "Derivado") {
    derivacionGroup.style.display = "block";
    clienteDerivado.required = true;
    updateClientSelect();
  } else {
    derivacionGroup.style.display = "none";
    clienteDerivado.required = false;
    clienteDerivado.value = "";
  }
}

function toggleEditDerivacion() {
  const estado = document.getElementById("edit-estado").value;
  const derivacionGroup = document.getElementById("edit-derivacion-group");
  const clienteDerivado = document.getElementById("edit-cliente-derivado");

  if (estado === "Derivado") {
    derivacionGroup.style.display = "block";
    clienteDerivado.required = true;
    updateEditClientSelect();
  } else {
    derivacionGroup.style.display = "none";
    clienteDerivado.required = false;
    clienteDerivado.value = "";
  }
}

function updateClientSelect() {
  const select = document.getElementById("cliente-derivado");
  select.innerHTML = '<option value="">Seleccionar cliente</option>';

  clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.company;
    option.textContent = `${client.name} - ${client.company}`;
    select.appendChild(option);
  });
}

function updateEditClientSelect() {
  const select = document.getElementById("edit-cliente-derivado");
  select.innerHTML = '<option value="">Seleccionar cliente</option>';

  clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.company;
    option.textContent = `${client.name} - ${client.company}`;
    select.appendChild(option);
  });
}

function showSuccessMessage(elementId) {
  const message = document.getElementById(elementId);
  message.style.display = "block";
  setTimeout(() => {
    message.style.display = "none";
  }, 3000);
}

// === FUNCIONES DE EDICIÓN ===

// Funciones para editar contactos
function editContact(contactId) {
  const contact = contacts.find((c) => c.id == contactId);
  if (!contact) return;

  document.getElementById("edit-contact-id").value = contact.id;
  document.getElementById("edit-fecha").value = contact.fecha;
  document.getElementById("edit-vendedor").value = contact.vendedor;
  document.getElementById("edit-cliente").value = contact.cliente;
  document.getElementById("edit-empresa").value = contact.empresa || "";
  document.getElementById("edit-telefono").value = contact.telefono || "";
  document.getElementById("edit-email").value = contact.email || "";
  document.getElementById("edit-Producto").value = contact.Producto;
  document.getElementById("edit-estado").value = contact.estado;
  document.getElementById("edit-cliente-derivado").value =
    contact.clienteDerivado || "";
  document.getElementById("edit-motivo").value = contact.motivo || "";

  toggleEditDerivacion();
  document.getElementById("edit-contact-modal").style.display = "block";
}

function closeEditContactModal() {
  document.getElementById("edit-contact-modal").style.display = "none";
}

function deleteContact(contactId) {
  if (confirm("¿Estás seguro de que deseas eliminar este contacto?")) {
    contacts = contacts.filter((c) => c.id != contactId);
    saveData();
    // Also attempt to delete directly in DB if possible
    dbDeleteContact(contactId).catch(()=>{});
    renderContactsList();
    updateDashboard();
    showSuccessMessage("contact-success-message");
  }
}


// Funciones para editar clientes
function editClient(clientId) {
  const client = clients.find((c) => c.id == clientId);
  if (!client) return;

  document.getElementById("edit-client-id").value = client.id;
  document.getElementById("edit-client-name").value = client.name;
  document.getElementById("edit-client-company").value = client.company;
  document.getElementById("edit-client-phone").value = client.phone || "";
  document.getElementById("edit-client-email").value = client.email || "";
  document.getElementById("edit-client-address").value = client.address;
  document.getElementById("edit-client-type").value = client.type;
  document.getElementById("edit-client-status").value = client.status;
  document.getElementById("edit-client-notes").value = client.notes || "";

  // Precargar coordenadas existentes
  editTempCoordinates = client.coordinates;
  const display = document.getElementById("edit-coordinates-display");
  if (editTempCoordinates) {
    display.textContent = `Coordenadas: ${editTempCoordinates.lat.toFixed(
      6
    )}, ${editTempCoordinates.lng.toFixed(6)}`;
  } else {
    display.textContent = "";
  }

  document.getElementById("edit-client-modal").style.display = "block";
}

function closeEditClientModal() {
  document.getElementById("edit-client-modal").style.display = "none";
  editTempCoordinates = null;
  document.getElementById("edit-coordinates-display").textContent = "";
}

function deleteClient(clientId) {
  if (confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
    clients = clients.filter((c) => c.id != clientId);
    saveData();
    dbDeleteClient(clientId).catch(()=>{});
    renderClientsList();
    updateDashboard();
    showSuccessMessage("client-success-message");
  }
}


// === DASHBOARD ===
function updateDashboard() {
  const totalContacts = contacts.length;
  const totalSales = contacts.filter((c) => c.estado === "Vendido").length;
  const totalReferrals = contacts.filter((c) => c.estado === "Derivado").length;
  const conversionRate =
    totalContacts > 0 ? Math.round((totalSales / totalContacts) * 100) : 0;
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "Activo").length;

  document.getElementById("total-contacts").textContent = totalContacts;
  document.getElementById("total-sales").textContent = totalSales;
  document.getElementById("total-referrals").textContent = totalReferrals;
  document.getElementById("conversion-rate").textContent = conversionRate + "%";
  document.getElementById("total-clients").textContent = totalClients;
  document.getElementById("active-clients").textContent = activeClients;
}

// === RENDERIZADO DE LISTAS ===
function renderContactsList(filteredContacts = null) {
  const contactsToShow = filteredContacts || contacts;
  const tbody = document.getElementById("contacts-tbody");

  tbody.innerHTML = "";

  contactsToShow
    .slice()
    .reverse()
    .forEach((contact) => {
      const row = document.createElement("tr");
      row.innerHTML = `
            <td>${formatDate(contact.fecha)}</td>
            <td>${contact.vendedor}</td>
            <td>${contact.cliente}</td>
            <td>${contact.empresa || "-"}</td>
            <td>${contact.Producto}</td>
            <td><span class="status-badge status-${contact.estado
              .toLowerCase()
              .replace(" ", "-")}">${contact.estado}</span></td>
            <td>${contact.clienteDerivado || "-"}</td>
            <td>${contact.motivo || "-"}</td>
            <td class="actions-column">
              <button class="btn-edit" onclick="editContact(${
                contact.id
              })" title="Editar">✏️</button>
              <button class="btn-delete" onclick="deleteContact(${
                contact.id
              })" title="Eliminar">🗑️</button>
            </td>
        `;
      tbody.appendChild(row);
    });
}

function renderClientsList(filteredClients = null) {
  const clientsToShow = filteredClients || clients;
  const tbody = document.getElementById("clients-tbody");

  tbody.innerHTML = "";

  clientsToShow.forEach((client) => {
    const referralsCount = contacts.filter(
      (c) => c.clienteDerivado === client.company
    ).length;

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${client.name}</td>
            <td>${client.company}</td>
            <td>${client.phone || "-"}</td>
            <td>${client.email || "-"}</td>
            <td>${client.address}</td>
            <td>${client.type}</td>
            <td><span class="status-badge status-${client.status.toLowerCase()}">${
      client.status
    }</span></td>
            <td><strong>${referralsCount}</strong></td>
            <td class="actions-column">
              <button class="btn-edit" onclick="editClient(${
                client.id
              })" title="Editar">✏️</button>
              <button class="btn-delete" onclick="deleteClient(${
                client.id
              })" title="Eliminar">🗑️</button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

// === FILTROS ===
function filterContacts() {
  const vendedorFilter = document.getElementById("filter-vendedor").value;
  const estadoFilter = document.getElementById("filter-estado").value;
  const fechaDesde = document.getElementById("filter-fecha-desde").value;
  const fechaHasta = document.getElementById("filter-fecha-hasta").value;

  let filtered = contacts;

  if (vendedorFilter) {
    filtered = filtered.filter((c) => c.vendedor === vendedorFilter);
  }

  if (estadoFilter) {
    filtered = filtered.filter((c) => c.estado === estadoFilter);
  }

  if (fechaDesde) {
    filtered = filtered.filter((c) => c.fecha >= fechaDesde);
  }

  if (fechaHasta) {
    filtered = filtered.filter((c) => c.fecha <= fechaHasta);
  }

  renderContactsList(filtered);
}

function filterClients() {
  const typeFilter = document.getElementById("filter-client-type").value;
  const statusFilter = document.getElementById("filter-client-status").value;

  let filtered = clients;

  if (typeFilter) {
    filtered = filtered.filter((c) => c.type === typeFilter);
  }

  if (statusFilter) {
    filtered = filtered.filter((c) => c.status === statusFilter);
  }

  renderClientsList(filtered);
}

// === MAPA CON LEAFLET ===
async function initLeafletMap() {
  if (map) {
    map.remove();
  }

  map = L.map("map").setView([-34.6037, -58.3816], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  await showAllClients();
}

function initMap() {
  initLeafletMap();
}

// === MOSTRAR CLIENTES EN EL MAPA ===
async function showAllClients() {
  if (!markersLayer) {
    console.warn(
      "markersLayer no está inicializado. El mapa puede no estar listo."
    );
    return;
  }
  markersLayer.clearLayers();

  if (clients.length === 0) return;

  let bounds = [];
  let dataUpdated = false;

  for (const client of clients) {
    // Si no hay coordenadas pero sí dirección, intentar geocodificar
    if (!client.coordinates && client.address) {
      try {
        console.log(
          `Geocodificando dirección para ${client.company}: ${client.address}`
        );
        const coords = await geocodeWithNominatim(client.address);
        if (coords) {
          client.coordinates = coords;
          dataUpdated = true;
        }
        // Esperar 1 segundo para no sobrecargar la API de Nominatim
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(
          `No se pudo geocodificar la dirección para ${client.company}:`,
          error
        );
      }
    }

    if (client.coordinates) {
      const referralsCount = contacts.filter(
        (c) => c.clienteDerivado === client.company
      ).length;

      let color = "#3388ff";
      if (client.status === "Inactivo") color = "#ff3333";
      if (client.status === "Prospecto") color = "#ffaa00";

      const marker = L.circleMarker(
        [client.coordinates.lat, client.coordinates.lng],
        {
          color: color,
          fillColor: color,
          fillOpacity: 0.7,
          radius: Math.max(8, Math.min(20, 8 + referralsCount * 2)),
        }
      ).addTo(markersLayer);

      marker.bindPopup(`
                <div>
                    <strong>${client.company}</strong><br>
                    ${client.name}<br>
                    ${client.address}<br>
                    <em>${client.type} - ${client.status}</em><br>
                    <strong>Derivaciones recibidas: ${referralsCount}</strong>
                </div>
            `);

      bounds.push([client.coordinates.lat, client.coordinates.lng]);
    }
  }

  if (dataUpdated) {
    console.log(
      "Guardando datos de clientes actualizados con nuevas coordenadas."
    );
    saveData();
  }

  // Ajustar mapa para que se vean todos los clientes
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

function showActiveClients() {
  if (!markersLayer) return;

  markersLayer.clearLayers();

  const activeClients = clients.filter((c) => c.status === "Activo");

  activeClients.forEach((client) => {
    if (client.coordinates) {
      const referralsCount = contacts.filter(
        (c) => c.clienteDerivado === client.company
      ).length;

      const marker = L.circleMarker(
        [client.coordinates.lat, client.coordinates.lng],
        {
          color: "#3388ff",
          fillColor: "#3388ff",
          fillOpacity: 0.7,
          radius: Math.max(8, Math.min(20, 8 + referralsCount * 2)),
        }
      ).addTo(markersLayer);

      marker.bindPopup(`
                <div>
                    <strong>${client.company}</strong><br>
                    ${client.name}<br>
                    ${client.address}<br>
                    <em>${client.type} - ${client.status}</em><br>
                    <strong>Derivaciones recibidas: ${referralsCount}</strong>
                </div>
            `);
    }
  });
}

function showByType(type) {
  if (!markersLayer) return;

  markersLayer.clearLayers();

  const filteredClients = clients.filter((c) => c.type === type);

  filteredClients.forEach((client) => {
    if (client.coordinates) {
      const referralsCount = contacts.filter(
        (c) => c.clienteDerivado === client.company
      ).length;

      let color = "#3388ff";
      if (client.status === "Inactivo") color = "#ff3333";
      if (client.status === "Prospecto") color = "#ffaa00";

      const marker = L.circleMarker(
        [client.coordinates.lat, client.coordinates.lng],
        {
          color: color,
          fillColor: color,
          fillOpacity: 0.7,
          radius: Math.max(8, Math.min(20, 8 + referralsCount * 2)),
        }
      ).addTo(markersLayer);

      marker.bindPopup(`
                <div>
                    <strong>${client.company}</strong><br>
                    ${client.name}<br>
                    ${client.address}<br>
                    <em>${client.type} - ${client.status}</em><br>
                    <strong>Derivaciones recibidas: ${referralsCount}</strong>
                </div>
            `);
    }
  });
}

function showClientsOnMap() {
  showSection("map");
  // showAllClients() is now called from within initLeafletMap,
  // which is called when the map section is shown.
}

// === INFORMES ===
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

  const vendedores = [
    "Juan Larrondo",
    "Andrés Iñiguez",
    "Eduardo Schiavi",
    "Gabriel Caffarello",
    "Natalia Montero",
  ];

  const salesData = vendedores.map((vendedor) => ({
    name: vendedor,
    count: contacts.filter(
      (c) => c.vendedor === vendedor && c.estado === "Vendido"
    ).length,
  }));

  const maxSales = Math.max(...salesData.map((d) => d.count), 1);

  container.innerHTML = salesData
    .map(
      (item) => `
        <div class="chart-bar">
            <div class="chart-label">${item.name}</div>
            <div class="chart-value" style="width: ${Math.max(
              (item.count / maxSales) * 100,
              5
            )}%">
                ${item.count} ventas
            </div>
        </div>
    `
    )
    .join("");
}

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

function generateTopReferralsReport() {
  const container = document.getElementById("referrals-report");
  if (!container) return;

  const referralCounts = {};
  contacts
    .filter((c) => c.estado === "Derivado")
    .forEach((contact) => {
      if (contact.clienteDerivado) {
        referralCounts[contact.clienteDerivado] =
          (referralCounts[contact.clienteDerivado] || 0) + 1;
      }
    });

  const sortedReferrals = Object.entries(referralCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sortedReferrals.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666;">No hay derivaciones registradas</p>';
    return;
  }

  container.innerHTML = sortedReferrals
    .map(
      ([client, count], index) => `
        <div class="ranking-item">
            <span class="ranking-position">#${index + 1}</span>
            <span class="ranking-name">${client}</span>
            <span class="ranking-value">${count}</span>
        </div>
    `
    )
    .join("");
}

function generateTimelineReport() {
  const container = document.getElementById("timeline-report");
  if (!container) return;

  const monthlyData = {};
  contacts.forEach((contact) => {
    const month = contact.fecha.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { vendidos: 0, derivados: 0, total: 0 };
    }
    monthlyData[month].total++;
    if (contact.estado === "Vendido") monthlyData[month].vendidos++;
    if (contact.estado === "Derivado") monthlyData[month].derivados++;
  });

  const sortedMonths = Object.keys(monthlyData).sort().slice(-6);

  if (sortedMonths.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666;">No hay datos temporales</p>';
    return;
  }

  container.innerHTML = sortedMonths
    .map((month) => {
      const data = monthlyData[month];
      const monthName = new Date(month + "-01").toLocaleDateString("es-ES", {
        month: "short",
        year: "numeric",
      });

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
    })
    .join("");
}

function generateReferralsReport() {
  const tbody = document.getElementById("referrals-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const clientStats = {};

  contacts
    .filter((c) => c.estado === "Derivado")
    .forEach((contact) => {
      const clientName = contact.clienteDerivado;
      if (!clientName) return;

      if (!clientStats[clientName]) {
        clientStats[clientName] = {
          total: 0,
          thisMonth: 0,
          lastContact: null,
          sellers: {},
        };
      }

      clientStats[clientName].total++;

      const thisMonth = new Date().toISOString().substring(0, 7);
      if (contact.fecha.substring(0, 7) === thisMonth) {
        clientStats[clientName].thisMonth++;
      }

      if (
        !clientStats[clientName].lastContact ||
        contact.fecha > clientStats[clientName].lastContact
      ) {
        clientStats[clientName].lastContact = contact.fecha;
      }

      clientStats[clientName].sellers[contact.vendedor] =
        (clientStats[clientName].sellers[contact.vendedor] || 0) + 1;
    });

  Object.entries(clientStats)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([clientName, stats]) => {
      const topSeller = Object.entries(stats.sellers).sort(
        (a, b) => b[1] - a[1]
      )[0];

      const row = document.createElement("tr");
      row.innerHTML = `
                <td><strong>${clientName}</strong></td>
                <td>${stats.total}</td>
                <td>${stats.thisMonth}</td>
                <td>${formatDate(stats.lastContact)}</td>
                <td>${
                  topSeller ? `${topSeller[0]} (${topSeller[1]})` : "-"
                }</td>
            `;
      tbody.appendChild(row);
    });
}

// === EXPORTACIÓN ===
function exportContacts() {
  const csv = [
    [
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
    ].join(","),
    ...contacts.map((c) =>
      [
        c.fecha,
        c.vendedor,
        c.cliente,
        c.empresa || "",
        c.telefono || "",
        c.email || "",
        c.Producto,
        c.estado,
        c.clienteDerivado || "",
        c.motivo || "",
      ]
        .map((field) => `"${field}"`)
        .join(",")
    ),
  ].join("\n");

  downloadCSV(csv, "contactos.csv");
}

function exportClients() {
  const csv = [
    [
      "Nombre",
      "Empresa",
      "Teléfono",
      "Email",
      "Dirección",
      "Tipo",
      "Estado",
      "Derivaciones Recibidas",
      "Notas",
    ].join(","),
    ...clients.map((c) => {
      const referralsCount = contacts.filter(
        (contact) => contact.clienteDerivado === c.company
      ).length;
      return [
        c.name,
        c.company,
        c.phone || "",
        c.email || "",
        c.address,
        c.type,
        c.status,
        referralsCount,
        c.notes || "",
      ]
        .map((field) => `"${field}"`)
        .join(",");
    }),
  ].join("\n");

  downloadCSV(csv, "clientes.csv");
}

function exportFullReport() {
  const today = new Date().toISOString().split("T")[0];

  let report = `INFORME COMERCIAL COMPLETO - ${today}\n\n`;

  report += `ESTADÍSTICAS GENERALES:\n`;
  report += `Total de contactos: ${contacts.length}\n`;
  report += `Ventas realizadas: ${
    contacts.filter((c) => c.estado === "Vendido").length
  }\n`;
  report += `Derivaciones: ${
    contacts.filter((c) => c.estado === "Derivado").length
  }\n`;
  report += `Clientes registrados: ${clients.length}\n\n`;

  const referralCounts = {};
  contacts
    .filter((c) => c.estado === "Derivado")
    .forEach((contact) => {
      if (contact.clienteDerivado) {
        referralCounts[contact.clienteDerivado] =
          (referralCounts[contact.clienteDerivado] || 0) + 1;
      }
    });

  report += `TOP CLIENTES POR DERIVACIONES:\n`;
  Object.entries(referralCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([client, count], index) => {
      report += `${index + 1}. ${client}: ${count} derivaciones\n`;
    });

  downloadTXT(report, "informe-completo.txt");
}

function downloadCSV(content, filename) {
  const blob = new Blob(["\ufeff" + content], {
    type: "text/csv;charset=utf-8;",
  });
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

// === UTILIDADES ===
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES");
}

// === EVENT LISTENERS ===
function setupEventListeners() {
  // Formulario de contactos
  document
    .getElementById("contact-form")
    .addEventListener("submit", function (e) {
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
        registradoPor: currentUser.username,
        fechaRegistro: new Date().toISOString(),
      };

      contacts.push(contact);
      saveData();

      showSuccessMessage("contact-success-message");
      e.target.reset();
      document.getElementById("derivacion-group").style.display = "none";
      updateDashboard();
    });

  // Formulario de clientes CON GEOLOCALIZACIÓN
  document
    .getElementById("client-form")
    .addEventListener("submit", function (e) {
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
        coordinates: tempCoordinates, // Usar coordenadas obtenidas
        registradoPor: currentUser.username,
        fechaRegistro: new Date().toISOString(),
      };

      clients.push(client);
      saveData();

      showSuccessMessage("client-success-message");
      e.target.reset();
      tempCoordinates = null; // Limpiar coordenadas temporales
      document.getElementById("coordinates-display").textContent = "";
      updateDashboard();
      renderClientsList();
      updateClientSelect();
    });

  // Formulario de edición de contactos
  document
    .getElementById("edit-contact-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();

      const contactId = document.getElementById("edit-contact-id").value;
      const formData = new FormData(e.target);

      const contactIndex = contacts.findIndex((c) => c.id == contactId);
      if (contactIndex === -1) return;

      contacts[contactIndex] = {
        ...contacts[contactIndex],
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
        editadoPor: currentUser.username,
        fechaEdicion: new Date().toISOString(),
      };

      saveData();
      closeEditContactModal();
      renderContactsList();
      updateDashboard();
      showSuccessMessage("contact-success-message");
    });

  // Formulario de edición de clientes CON GEOLOCALIZACIÓN
  document
    .getElementById("edit-client-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();

      const clientId = document.getElementById("edit-client-id").value;
      const formData = new FormData(e.target);

      const clientIndex = clients.findIndex((c) => c.id == clientId);
      if (clientIndex === -1) return;

      const updatedClient = {
        ...clients[clientIndex],
        name: formData.get("client-name"),
        company: formData.get("client-company"),
        phone: formData.get("client-phone"),
        email: formData.get("client-email"),
        address: formData.get("client-address"),
        type: formData.get("client-type"),
        status: formData.get("client-status"),
        notes: formData.get("client-notes"),
        coordinates: editTempCoordinates || clients[clientIndex].coordinates, // Usar nuevas coordenadas o mantener las existentes
        editadoPor: currentUser.username,
        fechaEdicion: new Date().toISOString(),
      };

      clients[clientIndex] = updatedClient;
      saveData();

      closeEditClientModal();
      renderClientsList();
      updateDashboard();
      updateClientSelect();
      showSuccessMessage("client-success-message");
    });

  // Cerrar modales al hacer clic fuera de ellos
  window.addEventListener("click", function (event) {
    const contactModal = document.getElementById("edit-contact-modal");
    const clientModal = document.getElementById("edit-client-modal");

    if (event.target === contactModal) {
      closeEditContactModal();
    }
    if (event.target === clientModal) {
      closeEditClientModal();
    }
  });
}

// === INICIALIZACIÓN ===
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;

  loadData();
  setupEventListeners();

  // Establecer fecha actual por defecto
  document.getElementById("fecha").valueAsDate = new Date();

  // Actualizar dashboard inicial
  updateDashboard();
  renderContactsList();
  renderClientsList();
  updateClientSelect();
}
// === SISTEMA DE PRODUCTOS ===

// Lista de Productos disponibles
const PRODUCTOS_DISPONIBLES = [
  { id: "B1", name: "B1", category: "Sin Marca" },
  { id: "B2", name: "B2", category: "Sin Marca" },
  { id: "B3", name: "B3", category: "Sin Marca" },
  { id: "caja 180 B1", name: "Caja 180 B1", category: "Caja Grande" },
  { id: "caj 180 B2", name: "Caja 180 B2", category: "Caja Grande" },
  { id: "caja 180 B3", name: "Caja 180 B3", category: "Caja Grande" },
  {
    id: "Caja 18 doc (x6)",
    name: "Caja 18 Docenas (x6)",
    category: "Caja Docenas",
  },
  {
    id: "Caja 18 doc (x12)",
    name: "Caja 18 Docenas (x12)",
    category: "Caja Docenas",
  },
  {
    id: "estuche_b2_x6",
    name: "Estuche B2 x6 (Licitación)",
    category: "Licitación",
  },
  {
    id: "estuche_b2_x12",
    name: "Estuche B2 x12 (Licitación)",
    category: "Licitación",
  },
  { id: "pack_6_maples_b1", name: "Pack 6 Maples B1", category: "Pack Maples" },
  { id: "pack_6_maples_b2", name: "Pack 6 Maples B2", category: "Pack Maples" },
  { id: "pack_6_maples_b3", name: "Pack 6 Maples B3", category: "Pack Maples" },
];

// Función para actualizar el select de Productos
function updateProductSelect() {
  const productSelect = document.getElementById("Producto");
  const editProductSelect = document.getElementById("edit-Producto");

  if (productSelect) {
    // Limpiar opciones existentes excepto la primera
    productSelect.innerHTML = '<option value="">Seleccionar Producto</option>';

    // Agrupar Productos por categoría
    const groupedProducts = {};
    PRODUCTOS_DISPONIBLES.forEach((product) => {
      if (!groupedProducts[product.category]) {
        groupedProducts[product.category] = [];
      }
      groupedProducts[product.category].push(product);
    });

    // Añadir Productos agrupados
    Object.keys(groupedProducts).forEach((category) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = category;

      groupedProducts[category].forEach((product) => {
        const option = document.createElement("option");
        option.value = product.name;
        option.textContent = product.name;
        optgroup.appendChild(option);
      });

      productSelect.appendChild(optgroup);
    });
  }

  // Hacer lo mismo para el select de edición
  if (editProductSelect) {
    editProductSelect.innerHTML =
      '<option value="">Seleccionar Producto</option>';

    const groupedProducts = {};
    PRODUCTOS_DISPONIBLES.forEach((product) => {
      if (!groupedProducts[product.category]) {
        groupedProducts[product.category] = [];
      }
      groupedProducts[product.category].push(product);
    });

    Object.keys(groupedProducts).forEach((category) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = category;

      groupedProducts[category].forEach((product) => {
        const option = document.createElement("option");
        option.value = product.name;
        option.textContent = product.name;
        optgroup.appendChild(option);
      });

      editProductSelect.appendChild(optgroup);
    });
  }
}

// === REPORTES DE PRODUCTOS ===

// Generar reporte de Productos más solicitados
function generateProductReport() {
  const container = document.getElementById("product-report");
  if (!container) return;

  // Contar Productos en contactos
  const productCounts = {};
  contacts.forEach((contact) => {
    const product = contact.Producto;
    if (product && product !== "") {
      productCounts[product] = (productCounts[product] || 0) + 1;
    }
  });

  // Convertir a array y ordenar
  const sortedProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10); // Top 10

  if (sortedProducts.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666;">No hay datos de Productos</p>';
    return;
  }

  const maxCount = Math.max(...sortedProducts.map(([_, count]) => count));

  container.innerHTML = sortedProducts
    .map(
      ([product, count], index) => `
      <div class="ranking-item">
        <span class="ranking-position">#${index + 1}</span>
        <span class="ranking-name">${product}</span>
        <div class="product-bar">
          <div class="product-bar-fill" style="width: ${
            (count / maxCount) * 100
          }%"></div>
          <span class="product-count">${count}</span>
        </div>
      </div>
    `
    )
    .join("");
}

// Generar reporte de Productos por vendedor
function generateProductBySellerReport() {
  const container = document.getElementById("product-by-seller-report");
  if (!container) return;

  const vendedores = [
    "Juan Larrondo",
    "Andrés Iñiguez",
    "Eduardo Schiavi",
    "Gabriel Caffarello",
    "Natalia Montero",
  ];
  const productData = {};

  // Inicializar estructura de datos
  vendedores.forEach((vendedor) => {
    productData[vendedor] = {};
    PRODUCTOS_DISPONIBLES.forEach((product) => {
      productData[vendedor][product.name] = 0;
    });
  });

  // Contar Productos por vendedor
  contacts.forEach((contact) => {
    if (contact.vendedor && contact.Producto && contact.Producto !== "") {
      if (
        productData[contact.vendedor] &&
        productData[contact.vendedor][contact.Producto] !== undefined
      ) {
        productData[contact.vendedor][contact.Producto]++;
      }
    }
  });

  // Generar HTML
  let html = '<div class="seller-product-grid">';

  vendedores.forEach((vendedor) => {
    const vendedorProducts = Object.entries(productData[vendedor])
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    html += `
      <div class="seller-product-card">
        <h4 class="seller-name">${vendedor}</h4>
        ${
          vendedorProducts.length > 0
            ? vendedorProducts
                .map(
                  ([product, count]) => `
            <div class="seller-product-item">
              <span class="product-name">${product}</span>
              <span class="product-count">${count}</span>
            </div>
          `
                )
                .join("")
            : '<p class="no-products">Sin Productos registrados</p>'
        }
      </div>
    `;
  });

  html += "</div>";
  container.innerHTML = html;
}

// Generar reporte de Productos por categoría
function generateProductCategoryReport() {
  const container = document.getElementById("product-category-report");
  if (!container) return;

  const categoryCounts = {};

  contacts.forEach((contact) => {
    if (contact.Producto && contact.Producto !== "") {
      const product = PRODUCTOS_DISPONIBLES.find(
        (p) => p.name === contact.Producto
      );
      if (product) {
        const category = product.category;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    }
  });

  const sortedCategories = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  );

  if (sortedCategories.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666;">No hay datos de categorías</p>';
    return;
  }

  const total = sortedCategories.reduce((sum, [_, count]) => sum + count, 0);

  container.innerHTML = sortedCategories
    .map(([category, count]) => {
      const percentage = Math.round((count / total) * 100);
      return `
        <div class="category-item">
          <div class="category-header">
            <span class="category-name">${category}</span>
            <span class="category-stats">${count} (${percentage}%)</span>
          </div>
          <div class="category-bar">
            <div class="category-bar-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

// Función para obtener estadísticas rápidas de Productos
function getProductStats() {
  const totalProducts = contacts.filter(
    (c) => c.Producto && c.Producto !== ""
  ).length;
  const uniqueProducts = [
    ...new Set(contacts.map((c) => c.Producto).filter((p) => p && p !== "")),
  ].length;
  const topProduct = getTopProduct();

  return {
    total: totalProducts,
    unique: uniqueProducts,
    topProduct: topProduct,
  };
}

function getTopProduct() {
  const productCounts = {};
  contacts.forEach((contact) => {
    if (contact.Producto && contact.Producto !== "") {
      productCounts[contact.Producto] =
        (productCounts[contact.Producto] || 0) + 1;
    }
  });

  const sorted = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0
    ? { name: sorted[0][0], count: sorted[0][1] }
    : { name: "N/A", count: 0 };
}

// Actualizar dashboard con estadísticas de Productos
function updateProductStats() {
  const stats = getProductStats();

  // Actualizar elementos si existen
  const totalProductsElement = document.getElementById(
    "total-products-requested"
  );
  const uniqueProductsElement = document.getElementById("unique-products");
  const topProductElement = document.getElementById("top-product");

  if (totalProductsElement) {
    totalProductsElement.textContent = stats.total;
  }
  if (uniqueProductsElement) {
    uniqueProductsElement.textContent = stats.unique;
  }
  if (topProductElement) {
    topProductElement.textContent = `${stats.topProduct.name} (${stats.topProduct.count})`;
  }
}

// Función para filtrar contactos por Producto
function filterContactsByProduct() {
  const productFilter = document.getElementById("filter-product");
  if (!productFilter) return;

  const selectedProduct = productFilter.value;

  if (selectedProduct === "") {
    renderContactsList();
    return;
  }

  const filteredContacts = contacts.filter(
    (contact) => contact.Producto === selectedProduct
  );

  renderContactsList(filteredContacts);
}

// Añadir filtro de Productos al HTML de filtros
function addProductFilter() {
  const filtersContainer = document.querySelector(".filters");
  if (!filtersContainer) return;

  // Verificar si ya existe
  if (document.getElementById("filter-product")) return;

  const productFilterGroup = document.createElement("div");
  productFilterGroup.className = "filter-group";
  productFilterGroup.innerHTML = `
    <label for="filter-product">Producto:</label>
    <select id="filter-product" onchange="filterContactsByProduct()">
      <option value="">Todos los Productos</option>
    </select>
  `;

  filtersContainer.appendChild(productFilterGroup);

  // Poblar con Productos únicos
  const uniqueProducts = [
    ...new Set(contacts.map((c) => c.Producto).filter((p) => p && p !== "")),
  ];
  const productSelect = document.getElementById("filter-product");

  uniqueProducts.sort().forEach((product) => {
    const option = document.createElement("option");
    option.value = product;
    option.textContent = product;
    productSelect.appendChild(option);
  });
}

// Función para exportar reporte de Productos
function exportProductReport() {
  const productCounts = {};
  const categoryStats = {};

  contacts.forEach((contact) => {
    if (contact.Producto && contact.Producto !== "") {
      // Contar Productos
      productCounts[contact.Producto] =
        (productCounts[contact.Producto] || 0) + 1;

      // Contar categorías
      const product = PRODUCTOS_DISPONIBLES.find(
        (p) => p.name === contact.Producto
      );
      if (product) {
        categoryStats[product.category] =
          (categoryStats[product.category] || 0) + 1;
      }
    }
  });

  // Crear CSV
  const csvContent = [
    "REPORTE DE PRODUCTOS SOLICITADOS",
    "",
    "Producto,Cantidad Solicitada,Categoría",
    ...Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([product, count]) => {
        const productInfo = PRODUCTOS_DISPONIBLES.find(
          (p) => p.name === product
        );
        const category = productInfo ? productInfo.category : "Sin categoría";
        return `"${product}",${count},"${category}"`;
      }),
    "",
    "RESUMEN POR CATEGORÍAS",
    "Categoría,Total",
    ...Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => `"${category}",${count}`),
  ].join("\n");

  // Descargar
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reporte-Productos-${
    new Date().toISOString().split("T")[0]
  }.csv`;
  link.click();
}

// Modificar la función generateReports existente para incluir reportes de Productos
const originalGenerateReports = generateReports;
generateReports = function () {
  // Ejecutar reportes originales
  if (originalGenerateReports) {
    originalGenerateReports();
  }

  // Generar reportes de Productos
  generateProductReport();
  generateProductBySellerReport();
  generateProductCategoryReport();
  updateProductStats();
};

// Modificar la función de inicialización para incluir Productos
const originalInit = init;
init = function () {
  // Ejecutar inicialización original
  if (originalInit) {
    originalInit();
  }

  // Inicializar sistema de Productos
  updateProductSelect();
  addProductFilter();
};

// Modificar renderContactsList para incluir filtro de Productos
const originalRenderContactsList = renderContactsList;
renderContactsList = function (filteredContacts = null) {
  // Ejecutar render original
  originalRenderContactsList(filteredContacts);

  // Actualizar filtro de Productos si es necesario
  if (!filteredContacts) {
    addProductFilter();
  }
};
// === VALIDACIÓN OBLIGATORIA DE PRODUCTOS ===

// Función para validar que se haya seleccionado un Producto
function validateProductSelection() {
  const ProductoSelect = document.getElementById("Producto");
  const Producto = ProductoSelect.value.trim();

  if (!Producto || Producto === "") {
    // Mostrar alerta personalizada
    showProductAlert();

    // Resaltar el campo
    ProductoSelect.style.borderColor = "#dc3545";
    ProductoSelect.style.boxShadow = "0 0 0 3px rgba(220, 53, 69, 0.25)";

    // Hacer scroll al campo
    ProductoSelect.scrollIntoView({ behavior: "smooth", block: "center" });

    return false;
  }

  // Restablecer estilos si está correcto
  ProductoSelect.style.borderColor = "#e1e5e9";
  ProductoSelect.style.boxShadow = "none";

  return true;
}

// Función para validar Producto en edición
function validateEditProductSelection() {
  const ProductoSelect = document.getElementById("edit-Producto");
  const Producto = ProductoSelect.value.trim();

  if (!Producto || Producto === "") {
    showProductAlert();
    ProductoSelect.style.borderColor = "#dc3545";
    ProductoSelect.style.boxShadow = "0 0 0 3px rgba(220, 53, 69, 0.25)";
    ProductoSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  ProductoSelect.style.borderColor = "#e1e5e9";
  ProductoSelect.style.boxShadow = "none";
  return true;
}

// Función para mostrar alerta personalizada
function showProductAlert() {
  // Crear modal de alerta si no existe
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
  }

  alertModal.style.display = "flex";

  // Auto-cerrar después de 5 segundos
  setTimeout(() => {
    closeProductAlert();
  }, 5000);
}

// Función para cerrar la alerta
function closeProductAlert() {
  const alertModal = document.getElementById("product-alert-modal");
  if (alertModal) {
    alertModal.style.display = "none";
  }
}

// === MODIFICACIÓN DE FORMULARIOS ===

// Modificar el event listener del formulario de contactos
function setupContactFormValidation() {
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    // Remover event listener anterior si existe
    contactForm.removeEventListener("submit", handleContactSubmit);

    // Añadir nuevo event listener con validación
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Validar Producto primero
      if (!validateProductSelection()) {
        return; // Detener envío si no hay Producto
      }

      // Si pasa la validación, procesar el formulario
      const formData = new FormData(e.target);
      const contact = {
        id: Date.now(),
        fecha: formData.get("fecha"),
        vendedor: formData.get("vendedor"),
        cliente: formData.get("cliente"),
        empresa: formData.get("empresa"),
        telefono: formData.get("telefono"),
        email: formData.get("email"),
        Producto: formData.get("Producto"), // Ahora garantizado que no será vacío
        estado: formData.get("estado"),
        clienteDerivado: formData.get("cliente-derivado") || "",
        motivo: formData.get("motivo"),
        registradoPor: currentUser.username,
        fechaRegistro: new Date().toISOString(),
      };

      contacts.push(contact);
      saveData();

      showSuccessMessage("contact-success-message");
      e.target.reset();
      document.getElementById("derivacion-group").style.display = "none";
      updateDashboard();

      // Actualizar select de Productos
      updateProductSelect();
    });
  }
}

// Modificar el event listener del formulario de edición
function setupEditContactFormValidation() {
  const editContactForm = document.getElementById("edit-contact-form");
  if (editContactForm) {
    // Remover event listener anterior si existe
    editContactForm.removeEventListener("submit", handleEditContactSubmit);

    // Añadir nuevo event listener con validación
    editContactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Validar Producto primero
      if (!validateEditProductSelection()) {
        return; // Detener envío si no hay Producto
      }

      const contactId = document.getElementById("edit-contact-id").value;
      const formData = new FormData(e.target);

      const contactIndex = contacts.findIndex((c) => c.id == contactId);
      if (contactIndex === -1) return;

      contacts[contactIndex] = {
        ...contacts[contactIndex],
        fecha: formData.get("fecha"),
        vendedor: formData.get("vendedor"),
        cliente: formData.get("cliente"),
        empresa: formData.get("empresa"),
        telefono: formData.get("telefono"),
        email: formData.get("email"),
        Producto: formData.get("Producto"), // Ahora garantizado que no será vacío
        estado: formData.get("estado"),
        clienteDerivado: formData.get("cliente-derivado") || "",
        motivo: formData.get("motivo"),
        editadoPor: currentUser.username,
        fechaEdicion: new Date().toISOString(),
      };

      saveData();
      closeEditContactModal();
      renderContactsList();
      updateDashboard();
      showSuccessMessage("contact-success-message");
    });
  }
}

// === FUNCIÓN PARA MOSTRAR PRODUCTOS CORRECTAMENTE ===

// Función mejorada para renderizar contactos (reemplaza la existente)
function renderContactsList(filteredContacts = null) {
  const contactsToShow = filteredContacts || contacts;
  const tbody = document.getElementById("contacts-tbody");

  tbody.innerHTML = "";

  contactsToShow
    .slice()
    .reverse()
    .forEach((contact) => {
      const row = document.createElement("tr");

      // Mostrar el Producto seleccionado correctamente
      const ProductoDisplay = contact.Producto || "Sin Producto especificado";

      row.innerHTML = `
            <td>${formatDate(contact.fecha)}</td>
            <td>${contact.vendedor}</td>
            <td>${contact.cliente}</td>
            <td>${contact.empresa || "-"}</td>
            <td><strong>${ProductoDisplay}</strong></td>
            <td><span class="status-badge status-${contact.estado
              .toLowerCase()
              .replace(" ", "-")}">${contact.estado}</span></td>
            <td>${contact.clienteDerivado || "-"}</td>
            <td>${contact.motivo || "-"}</td>
            <td class="actions-column">
              <button class="btn-edit" onclick="editContact(${
                contact.id
              })" title="Editar">✏️</button>
              <button class="btn-delete" onclick="deleteContact(${
                contact.id
              })" title="Eliminar">🗑️</button>
            </td>
        `;
      tbody.appendChild(row);
    });
}

// === ESTILOS CSS PARA LA ALERTA ===

// Función para añadir estilos de la alerta
function addProductAlertStyles() {
  if (document.getElementById("product-alert-styles")) return;

  const styles = document.createElement("style");
  styles.id = "product-alert-styles";
  styles.textContent = `
    .product-alert-modal {
      display: none;
      position: fixed;
      z-index: 3000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      justify-content: center;
      align-items: center;
      animation: alertFadeIn 0.3s ease-out;
    }
    
    .product-alert-content {
      background: white;
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 400px;
      margin: 20px;
      animation: alertSlideIn 0.3s ease-out;
    }
    
    .product-alert-icon {
      font-size: 3em;
      margin-bottom: 15px;
    }
    
    .product-alert-content h3 {
      color: #dc3545;
      margin-bottom: 15px;
      font-size: 1.5em;
      font-weight: 700;
    }
    
    .product-alert-content p {
      color: #666;
      margin-bottom: 10px;
      font-size: 1em;
      line-height: 1.4;
    }
    
    .product-alert-btn {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 25px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 15px;
      transition: all 0.3s ease;
      min-width: 120px;
    }
    
    .product-alert-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(220, 53, 69, 0.4);
    }
    
    @keyframes alertFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes alertSlideIn {
      from { 
        opacity: 0; 
        transform: translateY(-30px) scale(0.9); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
    }
    
    @media (max-width: 480px) {
      .product-alert-content {
        padding: 25px 20px;
        margin: 15px;
      }
      
      .product-alert-icon {
        font-size: 2.5em;
      }
      
      .product-alert-content h3 {
        font-size: 1.3em;
      }
    }
  `;

  document.head.appendChild(styles);
}

// === INICIALIZACIÓN ===

// Modificar la función init existente para incluir las validaciones
const originalSetupEventListeners = setupEventListeners;
setupEventListeners = function () {
  // Ejecutar setup original (si existe)
  if (originalSetupEventListeners) {
    originalSetupEventListeners();
  }

  // Añadir estilos de alerta
  addProductAlertStyles();

  // Configurar validaciones de formularios
  setupContactFormValidation();
  setupEditContactFormValidation();

  // Asegurar que los selects de Productos estén actualizados
  updateProductSelect();
};

// Función para hacer el select de Producto más visible
function highlightProductField() {
  const ProductoSelect = document.getElementById("Producto");
  if (ProductoSelect) {
    ProductoSelect.style.border = "3px solid #f4c430";
    ProductoSelect.style.boxShadow = "0 0 10px rgba(244, 196, 48, 0.3)";
  }
}
})