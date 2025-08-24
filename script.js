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
};

let currentUser = null;

// Inicializar el sistema
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("app-screen").style.display = "none";
  document.getElementById("password-change-screen").style.display = "none";

  const savedUser = localStorage.getItem("current-user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  } else {
    showLogin();
  }

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document
    .getElementById("password-change-form")
    .addEventListener("submit", handlePasswordChange);
});

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

  localStorage.setItem("user-data", JSON.stringify(userData));
  localStorage.setItem("current-user", JSON.stringify(currentUser));
  showApp();
}

function getUserData() {
  const savedUserData = localStorage.getItem("user-data");
  return savedUserData ? JSON.parse(savedUserData) : USERS;
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
  localStorage.removeItem("current-user");
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

// === CONFIGURACIÓN DE GOOGLE MAPS ===
// 🔑 PEGA TU API KEY DE GOOGLE AQUÍ 👇
const GOOGLE_MAPS_API_KEY = "TU_API_KEY_AQUI";

// Variables globales para geolocalización
let tempCoordinates = null;
let editTempCoordinates = null;
let googleMapsLoaded = false;
let geocoderInstance = null;

// Cargar Google Maps API
function loadGoogleMapsAPI() {
  if (googleMapsLoaded) return Promise.resolve();

  return new Promise((resolve, reject) => {
    // Verificar si ya está cargado
    if (window.google && window.google.maps) {
      googleMapsLoaded = true;
      geocoderInstance = new google.maps.Geocoder();
      resolve();
      return;
    }

    // Crear callback global
    window.initGoogleMaps = function () {
      googleMapsLoaded = true;
      geocoderInstance = new google.maps.Geocoder();
      resolve();
    };

    // Cargar script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Error cargando Google Maps API"));
    document.head.appendChild(script);
  });
}

// === FUNCIONES DE GEOLOCALIZACIÓN ===

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
      await reverseGeocodeGoogle(
        tempCoordinates.lat,
        tempCoordinates.lng,
        "client-address"
      );
    },
    function (error) {
      let errorMsg = "Error obteniendo ubicación: ";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg += "Permiso denegado. Habilita la geolocalización.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg += "Ubicación no disponible.";
          break;
        case error.TIMEOUT:
          errorMsg += "Tiempo de espera agotado.";
          break;
        default:
          errorMsg += "Error desconocido.";
          break;
      }
      display.textContent = errorMsg;
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
      await reverseGeocodeGoogle(
        editTempCoordinates.lat,
        editTempCoordinates.lng,
        "edit-client-address"
      );
    },
    function (error) {
      let errorMsg = "Error obteniendo ubicación: ";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg += "Permiso denegado. Habilita la geolocalización.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg += "Ubicación no disponible.";
          break;
        case error.TIMEOUT:
          errorMsg += "Tiempo de espera agotado.";
          break;
        default:
          errorMsg += "Error desconocido.";
          break;
      }
      display.textContent = errorMsg;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

// Geocodificación inversa con Google (coordenadas → dirección)
async function reverseGeocodeGoogle(lat, lng, addressFieldId) {
  try {
    // Asegurar que Google Maps esté cargado
    await loadGoogleMapsAPI();

    const latlng = { lat: lat, lng: lng };

    return new Promise((resolve, reject) => {
      geocoderInstance.geocode({ location: latlng }, (results, status) => {
        if (status === "OK" && results[0]) {
          const addressField = document.getElementById(addressFieldId);
          if (addressField) {
            // Usar la dirección formateada de Google
            addressField.value = results[0].formatted_address;
          }
          resolve(results[0].formatted_address);
        } else {
          console.warn("Geocodificación inversa falló:", status);
          reject(new Error(`Geocodificación inversa falló: ${status}`));
        }
      });
    });
  } catch (error) {
    console.error("Error en geocodificación inversa Google:", error);
  }
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
    tempCoordinates = await geocodeWithGoogle(address);

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
    editTempCoordinates = await geocodeWithGoogle(address);

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

// Geocodificación con Google Maps API
async function geocodeWithGoogle(address) {
  try {
    // Asegurar que Google Maps esté cargado
    await loadGoogleMapsAPI();

    return new Promise((resolve, reject) => {
      geocoderInstance.geocode(
        {
          address: address,
          region: "AR", // Priorizar resultados de Argentina
        },
        (results, status) => {
          if (status === "OK" && results[0]) {
            const location = results[0].geometry.location;
            resolve({
              lat: location.lat(),
              lng: location.lng(),
            });
          } else {
            let errorMsg = "Geocodificación falló";
            switch (status) {
              case "ZERO_RESULTS":
                errorMsg = "No se encontraron resultados para esa dirección";
                break;
              case "OVER_QUERY_LIMIT":
                errorMsg = "Límite de consultas excedido";
                break;
              case "REQUEST_DENIED":
                errorMsg = "Solicitud denegada - revisa tu API key";
                break;
              case "INVALID_REQUEST":
                errorMsg = "Solicitud inválida";
                break;
              default:
                errorMsg = `Error de geocodificación: ${status}`;
            }
            reject(new Error(errorMsg));
          }
        }
      );
    });
  } catch (error) {
    console.error("Error cargando Google Maps:", error);
    throw new Error("Error cargando servicio de geocodificación");
  }
}

// === FUNCIONES DE DATOS ===
function loadData() {
  const savedContacts = localStorage.getItem("commercial-contacts");
  const savedClients = localStorage.getItem("commercial-clients");

  if (savedContacts) {
    contacts = JSON.parse(savedContacts);
  }
  if (savedClients) {
    clients = JSON.parse(savedClients);
  }
}

function saveData() {
  localStorage.setItem("commercial-contacts", JSON.stringify(contacts));
  localStorage.setItem("commercial-clients", JSON.stringify(clients));
}

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
  document.getElementById("edit-producto").value = contact.producto;
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
            <td>${contact.producto}</td>
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

// === MAPA MEJORADO CON GOOGLE MAPS ===
async function initGoogleMap() {
  try {
    await loadGoogleMapsAPI();

    const mapElement = document.getElementById("map");

    // Crear mapa de Google
    const googleMap = new google.maps.Map(mapElement, {
      zoom: 10,
      center: { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
      mapTypeId: "roadmap",
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    // Agregar marcadores para clientes
    clients.forEach((client) => {
      if (client.coordinates) {
        const referralsCount = contacts.filter(
          (c) => c.clienteDerivado === client.company
        ).length;

        // Determinar color según estado
        let pinColor = "4285f4"; // Azul para activos
        if (client.status === "Inactivo") pinColor = "ea4335"; // Rojo
        if (client.status === "Prospecto") pinColor = "fbbc04"; // Amarillo

        // Crear marcador
        const marker = new google.maps.Marker({
          position: {
            lat: client.coordinates.lat,
            lng: client.coordinates.lng,
          },
          map: googleMap,
          title: client.company,
          icon: {
            url: `https://maps.google.com/mapfiles/ms/icons/${
              pinColor === "4285f4"
                ? "blue"
                : pinColor === "ea4335"
                ? "red"
                : "yellow"
            }-dot.png`,
            scaledSize: new google.maps.Size(32, 32),
          },
        });

        // Info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div>
              <strong>${client.company}</strong><br>
              ${client.name}<br>
              ${client.address}<br>
              <em>${client.type} - ${client.status}</em><br>
              <strong>Derivaciones recibidas: ${referralsCount}</strong>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(googleMap, marker);
        });
      }
    });
  } catch (error) {
    console.error("Error inicializando mapa Google:", error);
    // Fallback al mapa de Leaflet si falla
    initLeafletMap();
  }
}

// Mapa de respaldo con Leaflet (mantener el código original)
function initLeafletMap() {
  if (map) {
    map.remove();
  }

  map = L.map("map").setView([-34.6037, -58.3816], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // Código original para mostrar clientes...
  showAllClients();
}

// Modificar la función initMap para usar Google Maps
function initMap() {
  // Intentar Google Maps primero, luego Leaflet como respaldo
  if (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== "TU_API_KEY_AQUI") {
    initGoogleMap();
  } else {
    console.warn("Google Maps API key no configurada, usando Leaflet");
    initLeafletMap();
  }
}

// === MOSTRAR CLIENTES EN EL MAPA ===
function showAllClients() {
  markersLayer.clearLayers();

  if (clients.length === 0) return;

  let bounds = [];

  clients.forEach((client) => {
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
  });

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
  setTimeout(() => {
    showAllClients();
  }, 100);
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
        c.producto,
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
