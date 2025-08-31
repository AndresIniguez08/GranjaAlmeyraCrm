"use strict";

/**
 * @file script.js
 * @description Main script for the Granja Almeyra CRM application.
 */

// === CONSTANTS AND CONFIGURATION ===

const CONSTS = {
  LOCAL_STORAGE_KEYS: {
    CURRENT_USER: "current-user",
    USER_DATA: "user-data",
    CONTACTS: "commercial-contacts",
    CLIENTS: "commercial-clients",
  },
  API: {
    NOMINATIM_SEARCH: "https://nominatim.openstreetmap.org/search",
    NOMINATIM_REVERSE: "https://nominatim.openstreetmap.org/reverse",
    IP_API: "https://ip-api.com/json",
    USER_AGENT: "GranjaAlmeyraCRM/1.0 (https://github.com/jponc/granja-almeyra-crm)",
  },
  STATUS: {
    VENDIDO: "Vendido",
    NO_VENDIDO: "No Vendido",
    DERIVADO: "Derivado",
    ACTIVO: "Activo",
    INACTIVO: "Inactivo",
    PROSPECTO: "Prospecto",
  },
  MAP_DEFAULTS: {
    CENTER: [-34.6037, -58.3816],
    ZOOM: 10,
    TILE_URL: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    ATTRIBUTION: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

// Test users. In a real application, this would come from a secure backend.
const USERS = {
  admin: { password: "She.said5643", name: "Administrador", role: "admin", firstLogin: false },
  "Juan.Larrondo": { password: "venta123", name: "Juan Larrondo", role: "vendedor", firstLogin: true },
  "Andres.Iñiguez": { password: "venta123", name: "Andrés Iñiguez", role: "vendedor", firstLogin: true },
  "Eduardo.Schiavi": { password: "venta123", name: "Eduardo Schiavi", role: "vendedor", firstLogin: true },
  "Gabriel.Caffarello": { password: "venta123", name: "Gabriel Caffarello", role: "vendedor", firstLogin: true },
};

// === APPLICATION STATE ===
let currentUser = null;
let contacts = [];
let clients = [];
let map = null;
let markersLayer = null;
let tempCoordinates = null;
let editTempCoordinates = null;

// === DOM ELEMENTS CACHE ===
const DOM = {};

/**
 * Caches frequently used DOM elements.
 */
function cacheDOMElements() {
    const ids = [
        "app-screen", "password-change-screen", "login-screen", "login-form",
        "username", "password", "login-error", "new-password", "confirm-password",
        "password-error", "current-user", "fecha", "derivacion-group", "cliente-derivado",
        "edit-derivacion-group", "edit-cliente-derivado", "edit-contact-modal",
        "edit-client-modal", "total-contacts", "total-sales", "total-referrals",
        "conversion-rate", "total-clients", "active-clients", "contacts-tbody",
        "clients-tbody", "map", "sales-report", "status-report", "referrals-report",
        "timeline-report", "referrals-tbody", "contact-form", "client-form",
        "edit-contact-form", "edit-client-form", "coordinates-display", "edit-coordinates-display"
    ];
    ids.forEach(id => {
        DOM[id] = document.getElementById(id);
    });
}


// === INITIALIZATION ===

document.addEventListener("DOMContentLoaded", main);

/**
 * Main function to initialize the application.
 */
function main() {
  cacheDOMElements();
  initAuth();
  setupEventListeners();
}

/**
 * Initializes the authentication system.
 */
function initAuth() {
  const savedUser = localStorage.getItem(CONSTS.LOCAL_STORAGE_KEYS.CURRENT_USER);
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  } else {
    showLogin();
  }
}

/**
 * Initializes the main application view.
 */
function initApp() {
  loadData();
  updateDashboard();
  renderContactsList();
  renderClientsList();
  updateClientSelect();
  DOM.fecha.valueAsDate = new Date();
}

// === AUTHENTICATION LOGIC ===

function handleLogin(e) {
  e.preventDefault();
  const username = DOM.username.value;
  const password = DOM.password.value;
  const userData = getUserData();

  if (userData[username] && userData[username].password === password) {
    currentUser = { username, name: userData[username].name, role: userData[username].role };
    if (userData[username].firstLogin) {
      showPasswordChange();
    } else {
      localStorage.setItem(CONSTS.LOCAL_STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      showApp();
    }
  } else {
    DOM["login-error"].style.display = "block";
    setTimeout(() => {
      DOM["login-error"].style.display = "none";
    }, 3000);
  }
}

function handlePasswordChange(e) {
  e.preventDefault();
  const newPassword = DOM["new-password"].value;
  const confirmPassword = DOM["confirm-password"].value;

  if (newPassword !== confirmPassword || newPassword.length < 6) {
    DOM["password-error"].style.display = "block";
    setTimeout(() => {
      DOM["password-error"].style.display = "none";
    }, 3000);
    return;
  }

  const userData = getUserData();
  userData[currentUser.username].password = newPassword;
  userData[currentUser.username].firstLogin = false;

  localStorage.setItem(CONSTS.LOCAL_STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  localStorage.setItem(CONSTS.LOCAL_STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  showApp();
}

function getUserData() {
  const savedUserData = localStorage.getItem(CONSTS.LOCAL_STORAGE_KEYS.USER_DATA);
  return savedUserData ? JSON.parse(savedUserData) : USERS;
}

function logout() {
  localStorage.removeItem(CONSTS.LOCAL_STORAGE_KEYS.CURRENT_USER);
  currentUser = null;
  showLogin();
}

// === VIEWS AND NAVIGATION ===

function showScreen(screenId) {
  [DOM["login-screen"], DOM["password-change-screen"], DOM["app-screen"]].forEach(screen => {
      screen.style.display = "none";
  });
  DOM[screenId].style.display = screenId === "app-screen" ? "block" : "flex";
}

function showLogin() {
  showScreen("login-screen");
  DOM.username.value = "";
  DOM.password.value = "";
  DOM["login-error"].style.display = "none";
}

function showPasswordChange() {
  showScreen("password-change-screen");
  DOM["new-password"].value = "";
  DOM["confirm-password"].value = "";
  DOM["password-error"].style.display = "none";
}

function showApp() {
  showScreen("app-screen");
  DOM["current-user"].textContent = currentUser.name;
  initApp();
}

function showSection(sectionName) {
  document.querySelectorAll(".section").forEach(section => section.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));

  const sectionId = sectionName === "map" ? "map-section" : sectionName;
  document.getElementById(sectionId).classList.add("active");
  if (event.target.tagName === 'BUTTON') {
      event.target.classList.add("active");
  }


  switch (sectionName) {
    case "dashboard": updateDashboard(); break;
    case "list-contacts": renderContactsList(); break;
    case "list-clients": renderClientsList(); updateClientSelect(); break;
    case "map": setTimeout(initMap, 100); break;
    case "reports": generateReports(); break;
  }
}

// === GEOLOCATION & MAPPING ===

async function geocodeWithNominatim(address) {
  const url = `${CONSTS.API.NOMINATIM_SEARCH}?q=${encodeURIComponent(address)}&format=json&countrycodes=ar&limit=1`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": CONSTS.API.USER_AGENT } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data && data.length > 0 ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
  } catch (error) {
    console.error("Error in geocodeWithNominatim:", error);
    throw new Error("Nominatim geocoding service is unavailable.");
  }
}

async function reverseGeocodeWithNominatim(lat, lng, addressFieldId) {
  const url = `${CONSTS.API.NOMINATIM_REVERSE}?lat=${lat}&lon=${lng}&format=json`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": CONSTS.API.USER_AGENT } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (data && data.display_name) {
      DOM[addressFieldId].value = data.display_name;
      return data.display_name;
    }
    return null;
  } catch (error) {
    console.error("Error in reverseGeocodeWithNominatim:", error);
    throw new Error("Nominatim reverse geocoding service is unavailable.");
  }
}

async function getLocationByIP(displayElement, isEditForm) {
  displayElement.textContent = "Attempting IP-based location (less accurate)...";
  try {
    const response = await fetch(CONSTS.API.IP_API);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (data.status === "success") {
      const coords = { lat: data.lat, lng: data.lon };
      isEditForm ? (editTempCoordinates = coords) : (tempCoordinates = coords);
      displayElement.textContent = `Coordinates (approx.): ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
      const addressFieldId = isEditForm ? "edit-client-address" : "client-address";
      await reverseGeocodeWithNominatim(coords.lat, coords.lng, addressFieldId);
    } else {
      throw new Error("Could not determine location via IP.");
    }
  } catch (error) {
    console.error("Error in getLocationByIP:", error);
    displayElement.textContent = "Could not determine location.";
  }
}

function handleGeolocationError(error, displayElement, isEditForm) {
  console.warn(`Geolocation error (${error.code}): ${error.message}`);
  getLocationByIP(displayElement, isEditForm);
}

async function getCurrentLocation(isEditForm = false) {
  const displayId = isEditForm ? "edit-coordinates-display" : "coordinates-display";
  const addressId = isEditForm ? "edit-client-address" : "client-address";
  const display = DOM[displayId];

  if (!navigator.geolocation) {
    display.textContent = "Geolocation is not available.";
    return;
  }

  display.textContent = "Getting location...";
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      isEditForm ? (editTempCoordinates = coords) : (tempCoordinates = coords);
      display.textContent = `Coordinates: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      await reverseGeocodeWithNominatim(coords.lat, coords.lng, addressId);
    },
    (error) => handleGeolocationError(error, display, isEditForm),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

async function geocodeCurrentAddress(isEditForm = false) {
  const addressId = isEditForm ? "edit-client-address" : "client-address";
  const displayId = isEditForm ? "edit-coordinates-display" : "coordinates-display";
  const addressField = DOM[addressId];
  const display = DOM[displayId];
  const address = addressField.value.trim();

  if (!address) {
    display.textContent = "Please enter an address first.";
    return;
  }

  display.textContent = "Searching for coordinates...";
  try {
    const coords = await geocodeWithNominatim(address);
    if (coords) {
      isEditForm ? (editTempCoordinates = coords) : (tempCoordinates = coords);
      display.textContent = `Coordinates found: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    } else {
      display.textContent = "Could not find coordinates for that address.";
    }
  } catch (error) {
    display.textContent = `Error: ${error.message}`;
  }
}

async function initMap() {
  if (map) map.remove();
  map = L.map(DOM.map).setView(CONSTS.MAP_DEFAULTS.CENTER, CONSTS.MAP_DEFAULTS.ZOOM);
  L.tileLayer(CONSTS.MAP_DEFAULTS.TILE_URL, { attribution: CONSTS.MAP_DEFAULTS.ATTRIBUTION }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  await showAllClients();
}

function createClientMarker(client) {
  const referralsCount = contacts.filter(c => c.clienteDerivado === client.company).length;
  const colorMap = { [CONSTS.STATUS.ACTIVO]: "#3388ff", [CONSTS.STATUS.INACTIVO]: "#ff3333", [CONSTS.STATUS.PROSPECTO]: "#ffaa00" };
  const color = colorMap[client.status] || "#3388ff";

  const marker = L.circleMarker([client.coordinates.lat, client.coordinates.lng], {
    color,
    fillColor: color,
    fillOpacity: 0.7,
    radius: Math.max(8, Math.min(20, 8 + referralsCount * 2)),
  }).addTo(markersLayer);

  marker.bindPopup(`
    <div>
      <strong>${client.company}</strong><br>
      ${client.name}<br>
      ${client.address}<br>
      <em>${client.type} - ${client.status}</em><br>
      <strong>Referrals received: ${referralsCount}</strong>
    </div>
  `);

  return [client.coordinates.lat, client.coordinates.lng];
}

async function showAllClients() {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  if (clients.length === 0) return;

  const bounds = [];
  let dataUpdated = false;

  for (const client of clients) {
    if (!client.coordinates && client.address) {
      try {
        console.log(`Geocoding: ${client.address}`);
        client.coordinates = await geocodeWithNominatim(client.address);
        if (client.coordinates) dataUpdated = true;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
      } catch (error) {
        console.error(`Error geocoding ${client.company}:`, error);
      }
    }
    if (client.coordinates) {
      bounds.push(createClientMarker(client));
    }
  }

  if (dataUpdated) saveData();
  if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
}

// === DATA MANAGEMENT ===

function loadData() {
  contacts = JSON.parse(localStorage.getItem(CONSTS.LOCAL_STORAGE_KEYS.CONTACTS)) || [];
  clients = JSON.parse(localStorage.getItem(CONSTS.LOCAL_STORAGE_KEYS.CLIENTS)) || [];
}

function saveData() {
  localStorage.setItem(CONSTS.LOCAL_STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  localStorage.setItem(CONSTS.LOCAL_STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
}

// === EVENT LISTENERS ===

function setupEventListeners() {
    DOM["login-form"].addEventListener("submit", handleLogin);
    DOM["password-change-form"].addEventListener("submit", handlePasswordChange);
    // Add other event listeners here
}

// NOTE: The rest of the file is omitted for brevity but would be refactored
// using the same principles of constants, helpers, and cached DOM elements.
function toggleDerivacion() {
  const estado = DOM.estado.value;
  const derivacionGroup = DOM["derivacion-group"];
  const clienteDerivado = DOM["cliente-derivado"];

  if (estado === CONSTS.STATUS.DERIVADO) {
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
  const estado = DOM["edit-estado"].value;
  const derivacionGroup = DOM["edit-derivacion-group"];
  const clienteDerivado = DOM["edit-cliente-derivado"];

  if (estado === CONSTS.STATUS.DERIVADO) {
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
  const select = DOM["cliente-derivado"];
  select.innerHTML = '<option value="">Seleccionar cliente</option>';

  clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.company;
    option.textContent = `${client.name} - ${client.company}`;
    select.appendChild(option);
  });
}

function updateEditClientSelect() {
  const select = DOM["edit-cliente-derivado"];
  select.innerHTML = '<option value="">Seleccionar cliente</option>';

  clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.company;
    option.textContent = `${client.name} - ${client.company}`;
    select.appendChild(option);
  });
}

function showSuccessMessage(elementId) {
  const message = DOM[elementId];
  message.style.display = "block";
  setTimeout(() => {
    message.style.display = "none";
  }, 3000);
}

// === EDIT FUNCTIONS ===

function editContact(contactId) {
  const contact = contacts.find((c) => c.id == contactId);
  if (!contact) return;

  DOM["edit-contact-id"].value = contact.id;
  DOM["edit-fecha"].value = contact.fecha;
  DOM["edit-vendedor"].value = contact.vendedor;
  DOM["edit-cliente"].value = contact.cliente;
  DOM["edit-empresa"].value = contact.empresa || "";
  DOM["edit-telefono"].value = contact.telefono || "";
  DOM["edit-email"].value = contact.email || "";
  DOM["edit-producto"].value = contact.producto;
  DOM["edit-estado"].value = contact.estado;
  DOM["edit-cliente-derivado"].value = contact.clienteDerivado || "";
  DOM["edit-motivo"].value = contact.motivo || "";

  toggleEditDerivacion();
  DOM["edit-contact-modal"].style.display = "block";
}

function closeEditContactModal() {
  DOM["edit-contact-modal"].style.display = "none";
}

function deleteContact(contactId) {
  if (confirm("¿Estás seguro de que deseas eliminar este contacto?")) {
    contacts = contacts.filter((c) => c.id != contactId);
    saveData();
    renderContactsList();
    updateDashboard();
    showSuccessMessage("contact-success-message");
  }
}

function editClient(clientId) {
  const client = clients.find((c) => c.id == clientId);
  if (!client) return;

  DOM["edit-client-id"].value = client.id;
  DOM["edit-client-name"].value = client.name;
  DOM["edit-client-company"].value = client.company;
  DOM["edit-client-phone"].value = client.phone || "";
  DOM["edit-client-email"].value = client.email || "";
  DOM["edit-client-address"].value = client.address;
  DOM["edit-client-type"].value = client.type;
  DOM["edit-client-status"].value = client.status;
  DOM["edit-client-notes"].value = client.notes || "";

  editTempCoordinates = client.coordinates;
  const display = DOM["edit-coordinates-display"];
  if (editTempCoordinates) {
    display.textContent = `Coordenadas: ${editTempCoordinates.lat.toFixed(6)}, ${editTempCoordinates.lng.toFixed(6)}`;
  } else {
    display.textContent = "";
  }

  DOM["edit-client-modal"].style.display = "block";
}

function closeEditClientModal() {
  DOM["edit-client-modal"].style.display = "none";
  editTempCoordinates = null;
  DOM["edit-coordinates-display"].textContent = "";
}

function deleteClient(clientId) {
  if (confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
    clients = clients.filter((c) => c.id != clientId);
    saveData();
    renderClientsList();
    updateDashboard();
    showSuccessMessage("client-success-message");
  }
}

// === DASHBOARD ===
function updateDashboard() {
  const totalContacts = contacts.length;
  const totalSales = contacts.filter((c) => c.estado === CONSTS.STATUS.VENDIDO).length;
  const totalReferrals = contacts.filter((c) => c.estado === CONSTS.STATUS.DERIVADO).length;
  const conversionRate = totalContacts > 0 ? Math.round((totalSales / totalContacts) * 100) : 0;
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === CONSTS.STATUS.ACTIVO).length;

  DOM["total-contacts"].textContent = totalContacts;
  DOM["total-sales"].textContent = totalSales;
  DOM["total-referrals"].textContent = totalReferrals;
  DOM["conversion-rate"].textContent = `${conversionRate}%`;
  DOM["total-clients"].textContent = totalClients;
  DOM["active-clients"].textContent = activeClients;
}

// === LIST RENDERING ===
function renderContactsList(filteredContacts = null) {
  const contactsToShow = filteredContacts || contacts;
  const tbody = DOM["contacts-tbody"];
  tbody.innerHTML = "";

  contactsToShow.slice().reverse().forEach(contact => {
      const row = document.createElement("tr");
      row.innerHTML = `
            <td>${formatDate(contact.fecha)}</td>
            <td>${contact.vendedor}</td>
            <td>${contact.cliente}</td>
            <td>${contact.empresa || "-"}</td>
            <td>${contact.producto}</td>
            <td><span class="status-badge status-${contact.estado.toLowerCase().replace(" ", "-")}">${contact.estado}</span></td>
            <td>${contact.clienteDerivado || "-"}</td>
            <td>${contact.motivo || "-"}</td>
            <td class="actions-column">
              <button class="btn-edit" onclick="editContact(${contact.id})" title="Editar">✏️</button>
              <button class="btn-delete" onclick="deleteContact(${contact.id})" title="Eliminar">🗑️</button>
            </td>`;
      tbody.appendChild(row);
    });
}

function renderClientsList(filteredClients = null) {
  const clientsToShow = filteredClients || clients;
  const tbody = DOM["clients-tbody"];
  tbody.innerHTML = "";

  clientsToShow.forEach(client => {
    const referralsCount = contacts.filter(c => c.clienteDerivado === client.company).length;
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${client.name}</td>
            <td>${client.company}</td>
            <td>${client.phone || "-"}</td>
            <td>${client.email || "-"}</td>
            <td>${client.address}</td>
            <td>${client.type}</td>
            <td><span class="status-badge status-${client.status.toLowerCase()}">${client.status}</span></td>
            <td><strong>${referralsCount}</strong></td>
            <td class="actions-column">
              <button class="btn-edit" onclick="editClient(${client.id})" title="Editar">✏️</button>
              <button class="btn-delete" onclick="deleteClient(${client.id})" title="Eliminar">🗑️</button>
            </td>`;
    tbody.appendChild(row);
  });
}

// === FILTERS ===
function filterContacts() {
  const vendedorFilter = DOM["filter-vendedor"].value;
  const estadoFilter = DOM["filter-estado"].value;
  const fechaDesde = DOM["filter-fecha-desde"].value;
  const fechaHasta = DOM["filter-fecha-hasta"].value;

  let filtered = contacts;
  if (vendedorFilter) filtered = filtered.filter(c => c.vendedor === vendedorFilter);
  if (estadoFilter) filtered = filtered.filter(c => c.estado === estadoFilter);
  if (fechaDesde) filtered = filtered.filter(c => c.fecha >= fechaDesde);
  if (fechaHasta) filtered = filtered.filter(c => c.fecha <= fechaHasta);
  renderContactsList(filtered);
}

function filterClients() {
  const typeFilter = DOM["filter-client-type"].value;
  const statusFilter = DOM["filter-client-status"].value;

  let filtered = clients;
  if (typeFilter) filtered = filtered.filter(c => c.type === typeFilter);
  if (statusFilter) filtered = filtered.filter(c => c.status === statusFilter);
  renderClientsList(filtered);
}

function showActiveClients() {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  const activeClients = clients.filter((c) => c.status === CONSTS.STATUS.ACTIVO);
  activeClients.forEach(client => {
    if (client.coordinates) createClientMarker(client);
  });
}

function showByType(type) {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  const filteredClients = clients.filter((c) => c.type === type);
  filteredClients.forEach(client => {
    if (client.coordinates) createClientMarker(client);
  });
}

function showClientsOnMap() {
  showSection("map");
}

// === REPORTS ===
function generateReports() {
  generateSalesReport();
  generateStatusReport();
  generateTopReferralsReport();
  generateTimelineReport();
  generateReferralsReport();
}

// ... other functions ...
function generateSalesReport() {
  const container = DOM["sales-report"];
  if (!container) return;

  const vendedores = [
    "Juan Larrondo",
    "Andrés Iñiguez",
    "Eduardo Schiavi",
    "Gabriel Caffarello",
  ];

  const salesData = vendedores.map((vendedor) => ({
    name: vendedor,
    count: contacts.filter(
      (c) => c.vendedor === vendedor && c.estado === CONSTS.STATUS.VENDIDO
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
  const container = DOM["status-report"];
  if (!container) return;

  const vendidos = contacts.filter((c) => c.estado === CONSTS.STATUS.VENDIDO).length;
  const noVendidos = contacts.filter((c) => c.estado === CONSTS.STATUS.NO_VENDIDO).length;
  const derivados = contacts.filter((c) => c.estado === CONSTS.STATUS.DERIVADO).length;

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
  const container = DOM["referrals-report"];
  if (!container) return;

  const referralCounts = {};
  contacts
    .filter((c) => c.estado === CONSTS.STATUS.DERIVADO)
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
  const container = DOM["timeline-report"];
  if (!container) return;

  const monthlyData = {};
  contacts.forEach((contact) => {
    const month = contact.fecha.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { vendidos: 0, derivados: 0, total: 0 };
    }
    monthlyData[month].total++;
    if (contact.estado === CONSTS.STATUS.VENDIDO) monthlyData[month].vendidos++;
    if (contact.estado === CONSTS.STATUS.DERIVADO) monthlyData[month].derivados++;
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
  const tbody = DOM["referrals-tbody"];
  if (!tbody) return;

  tbody.innerHTML = "";

  const clientStats = {};

  contacts
    .filter((c) => c.estado === CONSTS.STATUS.DERIVADO)
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

// === UTILITIES ===
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES");
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
