// script.js - Integración Supabase (todo en un archivo)
// ----------------------------------------------------
// Instrucciones:
// 1) Reemplazá los placeholders SUPABASE_URL y SUPABASE_ANON_KEY con tus datos.
// 2) Asegurate de crear las tablas 'users', 'clients' y 'contacts' en Supabase (SQL que te dejé antes).
// 3) Abrí la app en el navegador y probá login / crear cliente / crear contacto.
// ----------------------------------------------------

/* eslint-disable no-undef */
/* global L */ // leaflet

// === SUPABASE CONFIG ===
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// ---- PEGÁ AQUÍ TUS DATOS ----
const SUPABASE_URL = "https://gntwqahvwwvkwhkdowwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdudHdxYWh2d3d2a3doa2Rvd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc0NjQsImV4cCI6MjA3OTgyMzQ2NH0.qAgbzFmnG5136V1pTStF_hW7jKaAzoIlSYoWt2qxM9E";
// ----------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === DATOS GLOBALES ===
let contacts = [];
let clients = [];
let currentUser = null;
let map = null;
let markersLayer = null;
let tempCoordinates = null;
let editTempCoordinates = null;
let initialized = false;

// ======================= AUTENTICACIÓN (Login tipo A) =======================
async function loginUser(username, password) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (error || !data) {
      return { success: false, error };
    }
    currentUser = data;
    return { success: true, user: data };
  } catch (err) {
    console.error("loginUser error:", err);
    return { success: false, error: err };
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    showLoginError();
    return;
  }

  const { success, user } = await loginUser(username, password);
  if (!success) {
    showLoginError();
    return;
  }

  // Set currentUser minimized object for UI usage
  currentUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    first_login: user.first_login,
  };

  localStorage.setItem("current-user", JSON.stringify(currentUser));

  if (user.first_login) {
    showPasswordChange();
  } else {
    showApp();
  }
}

function showLoginError() {
  const el = document.getElementById("login-error");
  if (!el) return;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 3000);
}

async function handlePasswordChange(e) {
  e.preventDefault();
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (newPassword !== confirmPassword || newPassword.length < 6) {
    const el = document.getElementById("password-error");
    if (el) {
      el.style.display = "block";
      setTimeout(() => (el.style.display = "none"), 3000);
    }
    return;
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({ password: newPassword, first_login: false })
      .eq("username", currentUser.username);

    if (error) {
      console.error("Error updating password:", error);
    } else {
      // update local copy
      currentUser.first_login = false;
      localStorage.setItem("current-user", JSON.stringify(currentUser));
      showApp();
    }
  } catch (err) {
    console.error(err);
  }
}

// UI login/show functions (mantengo tu lógica)
function showPasswordChange() {
  const loginScreen = document.getElementById("login-screen");
  const passwordScreen = document.getElementById("password-change-screen");
  const appScreen = document.getElementById("app-screen");
  if (loginScreen) loginScreen.style.display = "none";
  if (passwordScreen) passwordScreen.style.display = "flex";
  if (appScreen) appScreen.style.display = "none";
  document.getElementById("new-password").value = "";
  document.getElementById("confirm-password").value = "";
}

function showLogin() {
  const loginScreen = document.getElementById("login-screen");
  const passwordScreen = document.getElementById("password-change-screen");
  const appScreen = document.getElementById("app-screen");
  if (loginScreen) loginScreen.style.display = "flex";
  if (passwordScreen) passwordScreen.style.display = "none";
  if (appScreen) appScreen.style.display = "none";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

function showApp() {
  const loginScreen = document.getElementById("login-screen");
  const passwordScreen = document.getElementById("password-change-screen");
  const appScreen = document.getElementById("app-screen");
  if (loginScreen) loginScreen.style.display = "none";
  if (passwordScreen) passwordScreen.style.display = "none";
  if (appScreen) appScreen.style.display = "block";
  const cu = document.getElementById("current-user");
  if (cu) cu.textContent = currentUser.name || currentUser.username;
  init(); // inicializa la app
}

function logout() {
  localStorage.removeItem("current-user");
  currentUser = null;
  showLogin();
}

// ======================= GEOLOCALIZACIÓN (mantengo) =======================
async function geocodeWithNominatim(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address
  )}&format=json&countrycodes=ar&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "GranjaAlmeyraCRM/1.0 (https://github.com/jponc/granja-almeyra-crm)",
      },
    });
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error("Error en geocodificación con Nominatim:", error);
    return null;
  }
}

async function reverseGeocodeWithNominatim(lat, lng, addressFieldId) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "GranjaAlmeyraCRM/1.0 (https://github.com/jponc/granja-almeyra-crm)",
      },
    });
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    if (data && data.display_name) {
      const addressField = document.getElementById(addressFieldId);
      if (addressField) addressField.value = data.display_name;
      return data.display_name;
    }
    return null;
  } catch (error) {
    console.error("Error en geocodificación inversa:", error);
    return null;
  }
}

async function getLocationByIP(displayElement, isEditForm) {
  if (displayElement) displayElement.textContent = "Intentando ubicación por IP (menos precisa)...";
  try {
    const response = await fetch("https://ip-api.com/json");
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    if (data && data.status === "success" && data.lat && data.lon) {
      const coords = { lat: data.lat, lng: data.lon };
      if (isEditForm) editTempCoordinates = coords;
      else tempCoordinates = coords;

      if (displayElement)
        displayElement.textContent = `Coordenadas (aprox.): ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
      const addressFieldId = isEditForm ? "edit-client-address" : "client-address";
      await reverseGeocodeWithNominatim(coords.lat, coords.lng, addressFieldId);
    } else {
      if (displayElement) displayElement.textContent = "No se pudo determinar la ubicación.";
    }
  } catch (err) {
    console.error("Error obteniendo ubicación por IP:", err);
    if (displayElement) displayElement.textContent = "No se pudo determinar la ubicación.";
  }
}

function getCurrentLocation() {
  const display = document.getElementById("coordinates-display");
  if (!navigator.geolocation) {
    if (display) display.textContent = "Geolocalización no disponible en este navegador";
    return;
  }
  if (display) display.textContent = "Obteniendo ubicación...";
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      tempCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (display) display.textContent = `Coordenadas: ${tempCoordinates.lat.toFixed(6)}, ${tempCoordinates.lng.toFixed(6)}`;
      await reverseGeocodeWithNominatim(tempCoordinates.lat, tempCoordinates.lng, "client-address");
    },
    async (error) => {
      console.warn("Error geoloc:", error);
      await getLocationByIP(display, false);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function getCurrentLocationEdit() {
  const display = document.getElementById("edit-coordinates-display");
  if (!navigator.geolocation) {
    if (display) display.textContent = "Geolocalización no disponible en este navegador";
    return;
  }
  if (display) display.textContent = "Obteniendo ubicación...";
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      editTempCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (display) display.textContent = `Coordenadas: ${editTempCoordinates.lat.toFixed(6)}, ${editTempCoordinates.lng.toFixed(6)}`;
      await reverseGeocodeWithNominatim(editTempCoordinates.lat, editTempCoordinates.lng, "edit-client-address");
    },
    async (error) => {
      console.warn("Error geoloc:", error);
      await getLocationByIP(display, true);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// ======================= FUNCIONES DB: LOAD / CRUD =======================
async function loadData() {
  try {
    const { data: contactsData, error: contactsErr } = await supabase.from("contacts").select("*");
    if (contactsErr) console.error("contacts load error:", contactsErr);
    const { data: clientsData, error: clientsErr } = await supabase.from("clients").select("*");
    if (clientsErr) console.error("clients load error:", clientsErr);
    contacts = contactsData || [];
    clients = clientsData || [];
  } catch (err) {
    console.error("loadData error:", err);
    contacts = contacts || [];
    clients = clients || [];
  }
}

// Insert client
async function insertClientToDB(client) {
  try {
    const payload = {
      id: client.id,
      name: client.name,
      company: client.company,
      phone: client.phone,
      email: client.email,
      address: client.address,
      type: client.type,
      status: client.status,
      notes: client.notes,
      lat: client.coordinates?.lat || null,
      lng: client.coordinates?.lng || null,
      registradoPor: client.registradoPor,
      fechaRegistro: client.fechaRegistro,
    };
    const { error } = await supabase.from("clients").insert(payload);
    if (error) console.error("insertClient error:", error);
  } catch (err) {
    console.error("insertClientToDB error:", err);
  }
}

// Update client
async function updateClientInDB(updatedClient) {
  try {
    const payload = {
      name: updatedClient.name,
      company: updatedClient.company,
      phone: updatedClient.phone,
      email: updatedClient.email,
      address: updatedClient.address,
      type: updatedClient.type,
      status: updatedClient.status,
      notes: updatedClient.notes,
      lat: updatedClient.coordinates?.lat || null,
      lng: updatedClient.coordinates?.lng || null,
      editadoPor: updatedClient.editadoPor,
      fechaEdicion: updatedClient.fechaEdicion,
    };
    const { error } = await supabase.from("clients").update(payload).eq("id", updatedClient.id);
    if (error) console.error("updateClient error:", error);
  } catch (err) {
    console.error("updateClientInDB error:", err);
  }
}

// Insert contact
async function insertContactToDB(contact) {
  try {
    const payload = {
      id: contact.id,
      fecha: contact.fecha,
      vendedor: contact.vendedor,
      cliente: contact.cliente,
      empresa: contact.empresa,
      telefono: contact.telefono,
      email: contact.email,
      producto: contact.Producto,
      estado: contact.estado,
      clienteDerivado: contact.clienteDerivado,
      motivo: contact.motivo,
      registradoPor: contact.registradoPor,
      fechaRegistro: contact.fechaRegistro,
    };
    const { error } = await supabase.from("contacts").insert(payload);
    if (error) console.error("insertContact error:", error);
  } catch (err) {
    console.error("insertContactToDB error:", err);
  }
}

// Update contact
async function updateContactInDB(contactObj) {
  try {
    const payload = {
      fecha: contactObj.fecha,
      vendedor: contactObj.vendedor,
      cliente: contactObj.cliente,
      empresa: contactObj.empresa,
      telefono: contactObj.telefono,
      email: contactObj.email,
      producto: contactObj.Producto,
      estado: contactObj.estado,
      clienteDerivado: contactObj.clienteDerivado,
      motivo: contactObj.motivo,
      editadoPor: contactObj.editadoPor,
      fechaEdicion: contactObj.fechaEdicion,
    };
    const { error } = await supabase.from("contacts").update(payload).eq("id", contactObj.id);
    if (error) console.error("updateContact error:", error);
  } catch (err) {
    console.error("updateContactInDB error:", err);
  }
}

// ======================= REALTIME =======================
function setupRealtime() {
  // contacts
  supabase
    .channel("realtime-contacts")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "contacts" },
      async (payload) => {
        // recarga ligera: lee toda la tabla y actualiza UI
        await loadData();
        renderContactsList();
        updateDashboard();
      }
    )
    .subscribe();

  // clients
  supabase
    .channel("realtime-clients")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "clients" },
      async (payload) => {
        await loadData();
        renderClientsList();
        updateDashboard();
        updateClientSelect();
      }
    )
    .subscribe();
}

// ======================= UI: RENDER / DASHBOARD / LISTS =======================
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES");
}

function updateDashboard() {
  const totalContacts = contacts.length;
  const totalSales = contacts.filter((c) => c.estado === "Vendido").length;
  const totalReferrals = contacts.filter((c) => c.estado === "Derivado").length;
  const conversionRate = totalContacts > 0 ? Math.round((totalSales / totalContacts) * 100) : 0;
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "Activo").length;

  const elTotalContacts = document.getElementById("total-contacts");
  const elTotalSales = document.getElementById("total-sales");
  const elTotalReferrals = document.getElementById("total-referrals");
  const elConversion = document.getElementById("conversion-rate");
  const elTotalClients = document.getElementById("total-clients");
  const elActiveClients = document.getElementById("active-clients");

  if (elTotalContacts) elTotalContacts.textContent = totalContacts;
  if (elTotalSales) elTotalSales.textContent = totalSales;
  if (elTotalReferrals) elTotalReferrals.textContent = totalReferrals;
  if (elConversion) elConversion.textContent = conversionRate + "%";
  if (elTotalClients) elTotalClients.textContent = totalClients;
  if (elActiveClients) elActiveClients.textContent = activeClients;
}

function renderContactsList(filteredContacts = null) {
  const contactsToShow = filteredContacts || contacts;
  const tbody = document.getElementById("contacts-tbody");
  if (!tbody) return;
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
            <td>${contact.Producto || "-"}</td>
            <td><span class="status-badge status-${contact.estado ? contact.estado.toLowerCase().replace(" ", "-") : "desconocido"}">${contact.estado || "-"}</span></td>
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
            <td>${client.address || ""}</td>
            <td>${client.type || "-"}</td>
            <td><span class="status-badge status-${client.status ? client.status.toLowerCase() : "desconocido"}">${client.status || "-"}</span></td>
            <td><strong>${referralsCount}</strong></td>
            <td class="actions-column">
              <button class="btn-edit" onclick="editClient(${client.id})" title="Editar">✏️</button>
              <button class="btn-delete" onclick="deleteClient(${client.id})" title="Eliminar">🗑️</button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function updateClientSelect() {
  const select = document.getElementById("cliente-derivado");
  if (!select) return;
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
  if (!select) return;
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
  if (!message) return;
  message.style.display = "block";
  setTimeout(() => (message.style.display = "none"), 3000);
}

// ======================= MAPA (Leaflet) =======================
async function initLeafletMap() {
  if (map) {
    map.remove();
  }
  map = L.map("map").setView([-34.6037, -58.3816], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  await showAllClients();
}

function initMap() {
  initLeafletMap();
}

async function showAllClients() {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  if (!clients || clients.length === 0) return;
  let bounds = [];
  let dataUpdated = false;
  for (const client of clients) {
    if (!client.lat && client.address) {
      try {
        const coords = await geocodeWithNominatim(client.address);
        if (coords) {
          client.lat = coords.lat;
          client.lng = coords.lng;
          dataUpdated = true;
          // Update DB with new coords
          await supabase.from("clients").update({ lat: client.lat, lng: client.lng }).eq("id", client.id);
        }
        await new Promise((r) => setTimeout(r, 1000)); // rate limit
      } catch (err) {
        console.error(err);
      }
    }
    if (client.lat && client.lng) {
      const referralsCount = contacts.filter((c) => c.clienteDerivado === client.company).length;
      let color = "#3388ff";
      if (client.status === "Inactivo") color = "#ff3333";
      if (client.status === "Prospecto") color = "#ffaa00";
      const marker = L.circleMarker([client.lat, client.lng], {
        color,
        fillColor: color,
        fillOpacity: 0.7,
        radius: Math.max(8, Math.min(20, 8 + referralsCount * 2)),
      }).addTo(markersLayer);
      marker.bindPopup(`
        <div>
          <strong>${client.company}</strong><br>
          ${client.name}<br>
          ${client.address || ""}<br>
          <em>${client.type || "-"} - ${client.status || "-"}</em><br>
          <strong>Derivaciones recibidas: ${referralsCount}</strong>
        </div>`);
      bounds.push([client.lat, client.lng]);
    }
  }
  if (dataUpdated) {
    // reload clients from db to ensure sync
    await loadData();
    renderClientsList();
  }
  if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
}

// ======================= FORM HANDLERS (adaptados a async DB ops) =======================

// Contact form submit (was in setupEventListeners)
async function handleContactFormSubmit(e) {
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
  await insertContactToDB(contact);

  showSuccessMessage("contact-success-message");
  e.target.reset();
  const deriv = document.getElementById("derivacion-group");
  if (deriv) deriv.style.display = "none";
  updateDashboard();
  renderContactsList();
}

// Client form submit
async function handleClientFormSubmit(e) {
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
    coordinates: tempCoordinates,
    lat: tempCoordinates?.lat || null,
    lng: tempCoordinates?.lng || null,
    registradoPor: currentUser.username,
    fechaRegistro: new Date().toISOString(),
  };

  clients.push(client);
  await insertClientToDB(client);

  showSuccessMessage("client-success-message");
  e.target.reset();
  tempCoordinates = null;
  const disp = document.getElementById("coordinates-display");
  if (disp) disp.textContent = "";
  updateDashboard();
  renderClientsList();
  updateClientSelect();
}

// Edit contact submit
async function handleEditContactSubmit(e) {
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

  await updateContactInDB(contacts[contactIndex]);

  closeEditContactModal();
  renderContactsList();
  updateDashboard();
  showSuccessMessage("contact-success-message");
}

// Edit client submit
async function handleEditClientSubmit(e) {
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
    coordinates: editTempCoordinates || clients[clientIndex].coordinates,
    lat: (editTempCoordinates && editTempCoordinates.lat) || clients[clientIndex].lat || null,
    lng: (editTempCoordinates && editTempCoordinates.lng) || clients[clientIndex].lng || null,
    editadoPor: currentUser.username,
    fechaEdicion: new Date().toISOString(),
  };

  clients[clientIndex] = updatedClient;
  await updateClientInDB(updatedClient);

  closeEditClientModal();
  renderClientsList();
  updateDashboard();
  updateClientSelect();
  showSuccessMessage("client-success-message");
}

// Delete contact (DB)
async function deleteContact(contactId) {
  if (!confirm("¿Estás seguro de que deseas eliminar este contacto?")) return;
  contacts = contacts.filter((c) => c.id != contactId);
  const { error } = await supabase.from("contacts").delete().eq("id", contactId);
  if (error) console.error("delete contact error:", error);
  renderContactsList();
  updateDashboard();
  showSuccessMessage("contact-success-message");
}

// Delete client (DB)
async function deleteClient(clientId) {
  if (!confirm("¿Estás seguro de que deseas eliminar este cliente?")) return;
  clients = clients.filter((c) => c.id != clientId);
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) console.error("delete client error:", error);
  renderClientsList();
  updateDashboard();
  updateClientSelect();
  showSuccessMessage("client-success-message");
}

// Edit modal openers (use existing UI fields)
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
  document.getElementById("edit-Producto").value = contact.Producto || "";
  document.getElementById("edit-estado").value = contact.estado || "";
  document.getElementById("edit-cliente-derivado").value = contact.clienteDerivado || "";
  document.getElementById("edit-motivo").value = contact.motivo || "";
  document.getElementById("edit-contact-modal").style.display = "block";
}

function closeEditContactModal() {
  const modal = document.getElementById("edit-contact-modal");
  if (modal) modal.style.display = "none";
}

function editClient(clientId) {
  const client = clients.find((c) => c.id == clientId);
  if (!client) return;
  document.getElementById("edit-client-id").value = client.id;
  document.getElementById("edit-client-name").value = client.name;
  document.getElementById("edit-client-company").value = client.company;
  document.getElementById("edit-client-phone").value = client.phone || "";
  document.getElementById("edit-client-email").value = client.email || "";
  document.getElementById("edit-client-address").value = client.address || "";
  document.getElementById("edit-client-type").value = client.type || "";
  document.getElementById("edit-client-status").value = client.status || "";
  document.getElementById("edit-client-notes").value = client.notes || "";
  editTempCoordinates = { lat: client.lat, lng: client.lng };
  const display = document.getElementById("edit-coordinates-display");
  if (editTempCoordinates && editTempCoordinates.lat) display.textContent = `Coordenadas: ${editTempCoordinates.lat.toFixed(6)}, ${editTempCoordinates.lng.toFixed(6)}`;
  document.getElementById("edit-client-modal").style.display = "block";
}

function closeEditClientModal() {
  const modal = document.getElementById("edit-client-modal");
  if (modal) modal.style.display = "none";
  editTempCoordinates = null;
  const display = document.getElementById("edit-coordinates-display");
  if (display) display.textContent = "";
}

// ======================= FILTROS / REPORTES / PRODUCTOS (mantengo) =======================
// Para evitar alargar, mantengo tus funciones tal cual (ya estaban en la parte que pegaste).
// Asumo las funciones generateReports, generateSalesReport, generateStatusReport, generateTopReferralsReport,
// generateTimelineReport, generateReferralsReport, PRODUCTOS_DISPONIBLES, updateProductSelect, etc.
// Si las tenés definidas más abajo en el archivo original, todo seguirá funcionando.
// (si no, podes pegar la otra mitad de tu script tal cual)

/* 
  --> Si tu archivo original contiene funciones largas de productos/reportes (que me pegaste),
  no es necesario repetirlas aquí; las dejamos tal cual en tu script original debajo de este bloque.
*/

// ======================= SETUP EVENT LISTENERS / INIT =======================
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.removeEventListener("submit", handleLogin);
    loginForm.addEventListener("submit", handleLogin);
  }

  const passwordForm = document.getElementById("password-change-form");
  if (passwordForm) {
    passwordForm.removeEventListener("submit", handlePasswordChange);
    passwordForm.addEventListener("submit", handlePasswordChange);
  }

  // Contact forms
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.removeEventListener("submit", handleContactFormSubmit);
    contactForm.addEventListener("submit", handleContactFormSubmit);
  }

  const editContactForm = document.getElementById("edit-contact-form");
  if (editContactForm) {
    editContactForm.removeEventListener("submit", handleEditContactSubmit);
    editContactForm.addEventListener("submit", handleEditContactSubmit);
  }

  // Client forms
  const clientForm = document.getElementById("client-form");
  if (clientForm) {
    clientForm.removeEventListener("submit", handleClientFormSubmit);
    clientForm.addEventListener("submit", handleClientFormSubmit);
  }

  const editClientForm = document.getElementById("edit-client-form");
  if (editClientForm) {
    editClientForm.removeEventListener("submit", handleEditClientSubmit);
    editClientForm.addEventListener("submit", handleEditClientSubmit);
  }

  // Buttons to get current location
  const locBtn = document.getElementById("get-location-btn");
  if (locBtn) locBtn.addEventListener("click", getCurrentLocation);
  const locEditBtn = document.getElementById("get-location-edit-btn");
  if (locEditBtn) locEditBtn.addEventListener("click", getCurrentLocationEdit);

  // Close modals on outside click
  window.addEventListener("click", function (event) {
    const contactModal = document.getElementById("edit-contact-modal");
    const clientModal = document.getElementById("edit-client-modal");
    if (event.target === contactModal) closeEditContactModal();
    if (event.target === clientModal) closeEditClientModal();
  });

  // Other UI handlers (toggles)
  const estadoSelect = document.getElementById("estado");
  if (estadoSelect) estadoSelect.addEventListener("change", toggleDerivacion);
  const editEstado = document.getElementById("edit-estado");
  if (editEstado) editEstado.addEventListener("change", toggleEditDerivacion);
}

async function init() {
  if (initialized) return;
  initialized = true;

  // Attach event listeners (login may already be attached by page load)
  setupEventListeners();

  // Load data from Supabase
  await loadData();

  // Setup realtime subscriptions
  setupRealtime();

  // Initialize UI
  updateDashboard();
  renderContactsList();
  renderClientsList();
  updateClientSelect();

  // init map later when requested (your UI triggers map init)
  // set default date if exists
  const fechaEl = document.getElementById("fecha");
  if (fechaEl) fechaEl.valueAsDate = new Date();
}

// ======================= UTILIDADES / VALIDACIONES (mantengo) =======================
// Mantengo tus funciones validateProductSelection, validateEditProductSelection,
// showProductAlert, closeProductAlert, updateProductSelect, etc. Pega esas funciones
// de la otra mitad de tu archivo aquí exactamente como estaban.

// ======================= EXPORTS PARA ONCLICK GLOBAL =======================
// Algunas funciones son llamadas desde HTML (onclick). Asegurate que estén en window.
window.logout = logout;
window.getCurrentLocation = getCurrentLocation;
window.getCurrentLocationEdit = getCurrentLocationEdit;
window.editContact = editContact;
window.deleteContact = deleteContact;
window.editClient = editClient;
window.deleteClient = deleteClient;
window.showClientsOnMap = showClientsOnMap;
window.showActiveClients = showActiveClients;
window.showByType = showByType;
window.showApp = showApp;
window.showLogin = showLogin;
window.showPasswordChange = showPasswordChange;
window.handleContactFormSubmit = handleContactFormSubmit;
window.handleClientFormSubmit = handleClientFormSubmit;
window.handleEditContactSubmit = handleEditContactSubmit;
window.handleEditClientSubmit = handleEditClientSubmit;
window.setupEventListeners = setupEventListeners;

// Initialize if user already logged (from a previous localStorage session)
document.addEventListener("DOMContentLoaded", function () {
  // If there's a saved current user (simple caching), restore it
  const savedUser = localStorage.getItem("current-user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  } else {
    showLogin();
  }

  // In any case, attach login form listener (if present)
  setupEventListeners();
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


// === INICIALIZACIÓN ===
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