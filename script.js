


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

// ---------------- AUTH (Login tipo A) ----------------
async function loginUser(username, password) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();
    if (error || !data) return { success: false, error };
    currentUser = data;
    return { success: true, user: data };
  } catch (err) {
    console.error("loginUser error:", err);
    return { success: false, error: err };
  }
  console.log("Resultado Supabase:", { data, error });

}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  if (!username || !password) { showLoginError(); return; }
  const { success, user } = await loginUser(username, password);
  if (!success) { showLoginError(); return; }
  currentUser = { id: user.id, username: user.username, name: user.name, role: user.role, first_login: user.first_login };
  localStorage.setItem("current-user", JSON.stringify(currentUser));
  if (user.first_login) showPasswordChange();
  else showApp();
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
    if (el) { el.style.display = "block"; setTimeout(() => (el.style.display = "none"), 3000); }
    return;
  }
  try {
    const { error } = await supabase
      .from("users")
      .update({ password: newPassword, first_login: false })
      .eq("username", currentUser.username);
    if (error) console.error("Error updating password:", error);
    else {
      currentUser.first_login = false;
      localStorage.setItem("current-user", JSON.stringify(currentUser));
      showApp();
    }
  } catch (err) { console.error(err); }
}

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
  init();
}

function logout() {
  localStorage.removeItem("current-user");
  currentUser = null;
  showLogin();
}

// ---------------- GEOLOCATION ----------------
async function geocodeWithNominatim(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&countrycodes=ar&limit=1`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "GranjaAlmeyraCRM/1.0 (https://github.com/jponc/granja-almeyra-crm)" }});
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    return null;
  } catch (error) { console.error("Error en geocodificación con Nominatim:", error); return null; }
}

async function reverseGeocodeWithNominatim(lat, lng, addressFieldId) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "GranjaAlmeyraCRM/1.0 (https://github.com/jponc/granja-almeyra-crm)" }});
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    if (data && data.display_name) {
      const addressField = document.getElementById(addressFieldId);
      if (addressField) addressField.value = data.display_name;
      return data.display_name;
    }
    return null;
  } catch (error) { console.error("Error en geocodificación inversa con Nominatim:", error); return null; }
}

async function getLocationByIP(displayElement, isEditForm) {
  if (displayElement) displayElement.textContent = "Intentando ubicación por IP (menos precisa)...";
  try {
    const response = await fetch("https://ip-api.com/json");
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    if (data && data.status === "success" && data.lat && data.lon) {
      const coords = { lat: data.lat, lng: data.lon };
      if (isEditForm) editTempCoordinates = coords; else tempCoordinates = coords;
      if (displayElement) displayElement.textContent = `Coordenadas (aprox.): ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
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
  if (!navigator.geolocation) { if (display) display.textContent = "Geolocalización no disponible en este navegador"; return; }
  if (display) display.textContent = "Obteniendo ubicación...";
  navigator.geolocation.getCurrentPosition(async (position) => {
    tempCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
    if (display) display.textContent = `Coordenadas: ${tempCoordinates.lat.toFixed(6)}, ${tempCoordinates.lng.toFixed(6)}`;
    await reverseGeocodeWithNominatim(tempCoordinates.lat, tempCoordinates.lng, "client-address");
  }, async (error) => {
    console.warn("Error geoloc:", error);
    await getLocationByIP(display, false);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

function getCurrentLocationEdit() {
  const display = document.getElementById("edit-coordinates-display");
  if (!navigator.geolocation) { if (display) display.textContent = "Geolocalización no disponible en este navegador"; return; }
  if (display) display.textContent = "Obteniendo ubicación...";
  navigator.geolocation.getCurrentPosition(async (position) => {
    editTempCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
    if (display) display.textContent = `Coordenadas: ${editTempCoordinates.lat.toFixed(6)}, ${editTempCoordinates.lng.toFixed(6)}`;
    await reverseGeocodeWithNominatim(editTempCoordinates.lat, editTempCoordinates.lng, "edit-client-address");
  }, async (error) => {
    console.warn("Error geoloc:", error);
    await getLocationByIP(display, true);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

// ---------------- DB: LOAD / CRUD ----------------
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

// ---------------- REALTIME ----------------
function setupRealtime() {
  supabase
    .channel("realtime-contacts")
    .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, async () => {
      await loadData();
      renderContactsList();
      updateDashboard();
    })
    .subscribe();

  supabase
    .channel("realtime-clients")
    .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, async () => {
      await loadData();
      renderClientsList();
      updateDashboard();
      updateClientSelect();
    })
    .subscribe();
}

// ---------------- UI / RENDER / DASHBOARD ----------------
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
  contactsToShow.slice().reverse().forEach((contact) => {
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

// ---------------- MAP (Leaflet) ----------------
async function initLeafletMap() {
  if (map) { map.remove(); }
  map = L.map("map").setView([-34.6037, -58.3816], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© OpenStreetMap contributors' }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  await showAllClients();
}

function initMap() { initLeafletMap(); }

async function showAllClients() {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  if (!clients || clients.length === 0) return;
  let bounds = [];
  let dataUpdated = false;
  for (const client of clients) {
    if ((!client.lat && !client.lng) && client.address) {
      try {
        const coords = await geocodeWithNominatim(client.address);
        if (coords) {
          client.lat = coords.lat; client.lng = coords.lng; dataUpdated = true;
          await supabase.from("clients").update({ lat: client.lat, lng: client.lng }).eq("id", client.id);
        }
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) { console.error(err); }
    }
    if (client.lat && client.lng) {
      const referralsCount = contacts.filter((c) => c.clienteDerivado === client.company).length;
      let color = "#3388ff"; if (client.status === "Inactivo") color = "#ff3333"; if (client.status === "Prospecto") color = "#ffaa00";
      const marker = L.circleMarker([client.lat, client.lng], { color, fillColor: color, fillOpacity: 0.7, radius: Math.max(8, Math.min(20, 8 + referralsCount * 2)) }).addTo(markersLayer);
      marker.bindPopup(`<div><strong>${client.company}</strong><br>${client.name}<br>${client.address || ""}<br><em>${client.type || "-"} - ${client.status || "-"}</em><br><strong>Derivaciones recibidas: ${referralsCount}</strong></div>`);
      bounds.push([client.lat, client.lng]);
    }
  }
  if (dataUpdated) { await loadData(); renderClientsList(); }
  if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
}

// ---------------- FORM HANDLERS (async DB ops) ----------------
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
  const deriv = document.getElementById("derivacion-group"); if (deriv) deriv.style.display = "none";
  updateDashboard(); renderContactsList();
}

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
  const disp = document.getElementById("coordinates-display"); if (disp) disp.textContent = "";
  updateDashboard(); renderClientsList(); updateClientSelect();
}

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
  closeEditContactModal(); renderContactsList(); updateDashboard(); showSuccessMessage("contact-success-message");
}

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
  closeEditClientModal(); renderClientsList(); updateDashboard(); updateClientSelect(); showSuccessMessage("client-success-message");
}

async function deleteContact(contactId) {
  if (!confirm("¿Estás seguro de que deseas eliminar este contacto?")) return;
  contacts = contacts.filter((c) => c.id != contactId);
  const { error } = await supabase.from("contacts").delete().eq("id", contactId);
  if (error) console.error("delete contact error:", error);
  renderContactsList(); updateDashboard(); showSuccessMessage("contact-success-message");
}

async function deleteClient(clientId) {
  if (!confirm("¿Estás seguro de que deseas eliminar este cliente?")) return;
  clients = clients.filter((c) => c.id != clientId);
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) console.error("delete client error:", error);
  renderClientsList(); updateDashboard(); updateClientSelect(); showSuccessMessage("client-success-message");
}

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

function closeEditContactModal() { const modal = document.getElementById("edit-contact-modal"); if (modal) modal.style.display = "none"; }

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

function closeEditClientModal() { const modal = document.getElementById("edit-client-modal"); if (modal) modal.style.display = "none"; editTempCoordinates = null; const display = document.getElementById("edit-coordinates-display"); if (display) display.textContent = ""; }

// ---------------- REPORTS / PRODUCTS ----------------
// Aquí incluí las funciones de productos/reportes de tu segundo fragmento.
// Si algo falta, copia pegalo exactamente desde tu fragmento original debajo de esta sección.
