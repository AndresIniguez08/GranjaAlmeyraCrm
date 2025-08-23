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
  // Ocultar pantallas secundarias al cargar
  document.getElementById("app-screen").style.display = "none";
  document.getElementById("password-change-screen").style.display = "none";

  // Verificar si hay sesión activa
  const savedUser = localStorage.getItem("current-user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
  } else {
    showLogin();
  }

  // Configurar formularios
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document
    .getElementById("password-change-form")
    .addEventListener("submit", handlePasswordChange);
});

function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // Obtener datos actualizados de usuarios
  const userData = getUserData();

  if (userData[username] && userData[username].password === password) {
    currentUser = {
      username: username,
      name: userData[username].name,
      role: userData[username].role,
    };

    // Verificar si es primer login
    if (userData[username].firstLogin) {
      showPasswordChange();
    } else {
      // Guardar sesión y mostrar app
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

  // Actualizar contraseña en datos de usuario
  const userData = getUserData();
  userData[currentUser.username].password = newPassword;
  userData[currentUser.username].firstLogin = false;

  // Guardar datos actualizados
  localStorage.setItem("user-data", JSON.stringify(userData));

  // Guardar sesión y mostrar app
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

  // Limpiar campos
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

  // Limpiar campos del login
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("login-error").style.display = "none";
}

function showApp() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("password-change-screen").style.display = "none";
  document.getElementById("app-screen").style.display = "block";
  document.getElementById("current-user").textContent = currentUser.name;

  // Inicializar la aplicación
  init();
}

// === DATOS GLOBALES ===
let contacts = [];
let clients = [];
let map = null;
let markersLayer = null;

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

  // Actualizar contenido según la sección
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

function showSuccessMessage(elementId) {
  const message = document.getElementById(elementId);
  message.style.display = "block";
  setTimeout(() => {
    message.style.display = "none";
  }, 3000);
}

// === GEOLOCALIZACIÓN ===
async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (error) {
    console.error("Error geocodificando:", error);
  }
  return null;
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

// === MAPA ===
function initMap() {
  if (map) {
    map.remove();
  }

  // Centrar en Buenos Aires
  map = L.map("map").setView([-34.6037, -58.3816], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  showAllClients();
}

function showAllClients() {
  if (!markersLayer) return;

  markersLayer.clearLayers();

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
    }
  });
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
    ,
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

  // Formulario de clientes
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
        coordinates: null,
        registradoPor: currentUser.username,
        fechaRegistro: new Date().toISOString(),
      };

      // Geocodificar dirección
      geocodeAddress(client.address).then((coords) => {
        client.coordinates = coords;
        clients.push(client);
        saveData();

        showSuccessMessage("client-success-message");
        e.target.reset();
        updateDashboard();
        renderClientsList();
      });
    });
}

// === INICIALIZACIÓN ===
function init() {
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
