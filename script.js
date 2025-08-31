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

const PRODUCTOS_DISPONIBLES = [
  { id: "b1", name: "B1", category: "Individual" },
  { id: "b2", name: "B2", category: "Individual" },
  { id: "b3", name: "B3", category: "Individual" },
  { id: "caja_180_b1", name: "Caja 180 B1", category: "Caja Grande" },
  { id: "caja_180_b2", name: "Caja 180 B2", category: "Caja Grande" },
  { id: "caja_180_b3", name: "Caja 180 B3", category: "Caja Grande" },
  { id: "caja_18_doc_x6", name: "Caja 18 Docenas (x6)", category: "Caja Docenas" },
  { id: "caja_18_doc_x12", name: "Caja 18 Docenas (x12)", category: "Caja Docenas" },
  { id: "estuche_b2_x6", name: "Estuche B2 x6 (Licitación)", category: "Licitación" },
  { id: "estuche_b2_x12", name: "Estuche B2 x12 (Licitación)", category: "Licitación" },
  { id: "pack_6_maples_b1", name: "Pack 6 Maples B1", category: "Pack Maples" },
  { id: "pack_6_maples_b2", name: "Pack 6 Maples B2", category: "Pack Maples" },
  { id: "pack_6_maples_b3", name: "Pack 6 Maples B3", category: "Pack Maples" },
];

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
        "edit-contact-form", "edit-client-form", "coordinates-display", "edit-coordinates-display",
        "producto", "edit-producto", "filter-product", "product-report", "product-by-seller-report",
        "product-category-report", "total-products-requested", "unique-products", "top-product"
    ];
    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            DOM[id] = element;
        }
    });
}

// === INITIALIZATION ===
document.addEventListener("DOMContentLoaded", main);

function main() {
  cacheDOMElements();
  initAuth();
  setupEventListeners();
  addProductAlertStyles();
}

function initAuth() {
  const savedUser = localStorage.getItem(CONSTS.LOCAL_STORAGE_KEYS.CURRENT_USER);
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  } else {
    showLogin();
  }
}

function initApp() {
  loadData();
  updateDashboard();
  updateProductStats();
  renderContactsList();
  renderClientsList();
  updateClientSelect();
  updateProductSelect();
  addProductFilter();
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
    setTimeout(() => { DOM["login-error"].style.display = "none"; }, 3000);
  }
}

function handlePasswordChange(e) {
  e.preventDefault();
  const newPassword = DOM["new-password"].value;
  const confirmPassword = DOM["confirm-password"].value;

  if (newPassword !== confirmPassword || newPassword.length < 6) {
    DOM["password-error"].style.display = "block";
    setTimeout(() => { DOM["password-error"].style.display = "none"; }, 3000);
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
        if (screen) screen.style.display = "none";
    });
    if (DOM[screenId]) {
        DOM[screenId].style.display = screenId === "app-screen" ? "block" : "flex";
    }
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
  document.getElementById(sectionId)?.classList.add("active");
  if (event && event.target && event.target.tagName === 'BUTTON') {
    event.target.classList.add("active");
  }

  switch (sectionName) {
    case "dashboard": updateDashboard(); updateProductStats(); break;
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
      if (DOM[addressFieldId]) DOM[addressFieldId].value = data.display_name;
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
      if (isEditForm) { editTempCoordinates = coords; } else { tempCoordinates = coords; }
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
      if(isEditForm) { editTempCoordinates = coords; } else { tempCoordinates = coords; }
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
        if(isEditForm) { editTempCoordinates = coords; } else { tempCoordinates = coords; }
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
        await new Promise(resolve => setTimeout(resolve, 1000));
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
    DOM["login-form"]?.addEventListener("submit", handleLogin);
    DOM["password-change-form"]?.addEventListener("submit", handlePasswordChange);
    DOM["contact-form"]?.addEventListener("submit", handleContactSubmit);
    DOM["edit-contact-form"]?.addEventListener("submit", handleEditContactSubmit);
}

// === FORM HANDLING ===
function handleContactSubmit(e) {
    e.preventDefault();
    if (!validateProductSelection()) return;

    const formData = new FormData(e.target);
    const contact = {
        id: Date.now(),
        fecha: formData.get("fecha"),
        vendedor: formData.get("vendedor"),
        cliente: formData.get("cliente"),
        empresa: formData.get("empresa"),
        telefono: formData.get("telefono"),
        email: formData.get("email"),
        producto: formData.get("producto"),
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
    DOM["derivacion-group"].style.display = "none";
    updateDashboard();
    updateProductSelect();
}

function handleEditContactSubmit(e) {
    e.preventDefault();
    if (!validateEditProductSelection()) return;

    const contactId = DOM["edit-contact-id"].value;
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
        producto: formData.get("producto"),
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
}

// === PRODUCT SYSTEM ===
function updateProductSelect() {
  [DOM.producto, DOM["edit-producto"]].forEach(select => {
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Seleccionar Producto</option>';
    const groupedProducts = PRODUCTOS_DISPONIBLES.reduce((acc, product) => {
      acc[product.category] = acc[product.category] || [];
      acc[product.category].push(product);
      return acc;
    }, {});

    Object.entries(groupedProducts).forEach(([category, products]) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = category;
      products.forEach(product => {
        const option = document.createElement("option");
        option.value = product.name;
        option.textContent = product.name;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    });
    select.value = currentValue;
  });
}

// === REPORTS ===
// ... (rest of the functions remain the same)
