/*****************************************************
 *  BLOQUE 1 - SUPABASE, UTILIDADES, SESIÓN, INIT
 *****************************************************/

// === CONFIGURACIÓN SUPABASE ===
const SUPABASE_URL = "https://gntwqahvwwvkwhkdowwh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdudHdxYWh2d3d2a3doa2Rvd3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc0NjQsImV4cCI6MjA3OTgyMzQ2NH0.qAgbzFmnG5136V1pTStF_hW7jKaAzoIlSYoWt2qxM9E";

// Cliente global
(function initSupabaseClient() {
  try {
    if (window.supabase && typeof window.supabase.from === "function") {
      console.log("Using existing window.supabase client.");
      return;
    }
    if (typeof supabase !== "undefined" && supabase && typeof supabase.createClient === "function") {
      window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("Supabase UMD inicializado correctamente");
    } else {
      console.error("Supabase UMD no encontrado. Asegúrate de incluir el script de supabase en el HTML.");
    }
  } catch (err) {
    console.error("Error inicializando Supabase:", err);
  }
})();

// === COOKIES ===
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}
function getCookie(name) {
  return document.cookie.split("; ").reduce((acc, item) => {
    const [k, v] = item.split("=");
    return k === name ? decodeURIComponent(v) : acc;
  }, "");
}
function eraseCookie(name) {
  setCookie(name, "", -1);
}

// === ESTADO GLOBAL EN MEMORIA ===
let currentUser = null;
let contacts = [];
let clients = [];

// === UTILIDADES DE UI ===
function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "";
}
function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

// (El resto del BLOQUE 1 permanece igual que el tuyo, sin cambios importantes)
// ...

/*****************************************************
 *  BLOQUE 2 - LOGIN, PASSWORD, CONTACTOS (CORREGIDO)
 *****************************************************/

// === CONTACTOS: EDICIÓN / BORRADO ===

function editContact(id) {
  try {
    const c = contacts.find(x => x.id === id);
    if (!c) {
      console.warn("No se encontró el contacto con id:", id);
      return;
    }

    console.log("📝 Editando contacto:", c);

    // Mostrar modal
    const modal = document.getElementById("edit-contact-modal");
    if (!modal) {
      console.error("❌ No se encontró el modal de edición");
      return;
    }
    modal.style.display = "block";

    // Rellenar los campos
    const setVal = (fieldId, val) => {
      const el = document.getElementById(fieldId);
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

    // Mostrar u ocultar derivación si corresponde
    toggleEditDerivacion();
  } catch (err) {
    console.error("Error en editContact:", err);
  }
}

async function handleEditContactSubmit(e) {
  e.preventDefault();
  if (!currentUser) {
    alert("Sesión expirada, iniciá sesión nuevamente.");
    return;
  }

  const form = e.target;
  const formData = new FormData(form);
  const id = formData.get("edit-contact-id") || document.getElementById("edit-contact-id").value;

  const old = contacts.find(c => c.id === id);
  if (!old) {
    alert("No se encontró el contacto a editar.");
    return;
  }

  const updated = {
    ...old,
    fecha: formData.get("fecha"),
    vendedor: formData.get("vendedor"),
    cliente: formData.get("cliente"),
    empresa: formData.get("empresa"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
    producto: formData.get("producto") || old.producto,
    estado: formData.get("estado"),
    cliente_derivado: formData.get("cliente-derivado") || "",
    motivo: formData.get("motivo") || "",
    editado_por: currentUser.username,
    fecha_edicion: new Date().toISOString()
  };

  try {
    console.log("💾 Guardando cambios en Supabase:", updated);

    const { data, error } = await window.supabase
      .from("commercial_contacts")
      .update(updated)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("No se devolvieron datos desde Supabase");

    // Actualizar localmente
    const idx = contacts.findIndex(c => c.id === id);
    if (idx !== -1) contacts[idx] = data;

    closeEditContactModal();
    updateDashboard();
    renderContactsList();
    alert("✅ Contacto actualizado correctamente");
  } catch (err) {
    console.error("Error al editar contacto:", err);
    alert("❌ Error al guardar los cambios");
  }
}

async function deleteContact(id) {
  if (!confirm("¿Estás seguro de eliminar este contacto?")) return;

  try {
    await window.supabase.from("commercial_contacts").delete().eq("id", id);
    contacts = contacts.filter(c => c.id !== id);
    updateDashboard();
    renderContactsList();
    alert("🗑️ Contacto eliminado correctamente");
  } catch (e) {
    console.error("Error borrando contacto:", e);
    alert("Error borrando contacto");
  }
}

function closeEditContactModal() {
  const modal = document.getElementById("edit-contact-modal");
  if (modal) modal.style.display = "none";
}

// 🔹 Registrar funciones globalmente para uso desde HTML (onclick, submit, etc.)
window.editContact = editContact;
window.handleEditContactSubmit = handleEditContactSubmit;
window.deleteContact = deleteContact;
window.closeEditContactModal = closeEditContactModal;

console.log("✅ Funciones globales de edición de contactos registradas correctamente");



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
    coordinates: null
  };

  try {
    const saved = await saveClientToDB(client);
    clients.push(saved);
    showMessage("client-success-message");
    form.reset();
    const coordDisp = document.getElementById("coordinates-display");
    if (coordDisp) coordDisp.textContent = "";
    updateDashboard();
    renderClientsList();
    updateClientSelectFromClients();
  } catch (e) {
    console.error("Error guardando cliente:", e);
    alert("Error guardando cliente");
  }
}

// === CLIENTES: LISTA Y FILTROS ===

function renderClientsList(filtered = null) {
  const tbody = document.getElementById("clients-tbody");
  if (!tbody) return;

  const data = filtered || clients;
  tbody.innerHTML = "";

  data.forEach(c => {
    // Conteo de derivaciones que llegan a este cliente
    const derivCount = contacts.filter(x => x.cliente_derivado === c.company).length;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name || ""}</td>
      <td>${c.company || ""}</td>
      <td>${c.phone || "-"}</td>
      <td>${c.email || "-"}</td>
      <td>${c.address || "-"}</td>
      <td>${c.type || "-"}</td>
      <td><span class="status-badge status-${(c.status || "").toLowerCase()}">${c.status || "-"}</span></td>
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

  if (type) filtered = filtered.filter(c => c.type === type);
  if (status) filtered = filtered.filter(c => c.status === status);

  renderClientsList(filtered);
}

// === CLIENTES: EDICIÓN / BORRADO ===

// === CLIENTES: EDICIÓN / BORRADO ===

function editClient(id) {
  const c = clients.find(x => x.id === id);
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
}

function closeEditClientModal() {
  hideElement("edit-client-modal");
}

// === GUARDAR CAMBIOS DEL CLIENTE ===
// === CLIENTES: GUARDAR CAMBIOS / EDICIÓN / BORRADO ===

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
      registered_at: new Date().toISOString()
    };

    // agregar coordenadas solo si son válidas
    if (
      client.coordinates &&
      typeof client.coordinates === "object" &&
      client.coordinates.lat &&
      client.coordinates.lng
    ) {
      safe.coordinates = client.coordinates;
    }

    console.log("Actualizando cliente con ID:", client.id);

    // 1️⃣ Realizar UPDATE
    const { error } = await window.supabase
      .from("commercial_clients")
      .update(safe)
      .eq("id", client.id.toString().trim());

    if (error) throw error;

    // 2️⃣ Verificar que el registro existe y fue actualizado
    const { data: verify, error: verifyErr } = await window.supabase
      .from("commercial_clients")
      .select("*")
      .eq("id", client.id.toString().trim())
      .limit(1);

    if (verifyErr) throw verifyErr;
    if (!verify || verify.length === 0)
      throw new Error("No se actualizó ningún registro");

    console.log("Cliente actualizado correctamente:", verify[0]);
    return verify[0];
  } catch (e) {
    console.error("saveClientToDB error:", e);
    throw e;
  }
}

// === ENVÍO DEL FORMULARIO DE EDICIÓN ===
async function handleEditClientSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    alert("Sesión expirada. Iniciá sesión nuevamente.");
    return;
  }

  const form = e.target;
  const id = document.getElementById("edit-client-id").value;

  // armar el objeto actualizado
  const updatedClient = {
    id,
    name: form.querySelector("#edit-client-name").value.trim(),
    company: form.querySelector("#edit-client-company").value.trim(),
    phone: form.querySelector("#edit-client-phone").value.trim(),
    email: form.querySelector("#edit-client-email").value.trim(),
    address: form.querySelector("#edit-client-address").value.trim(),
    type: form.querySelector("#edit-client-type").value,
    status: form.querySelector("#edit-client-status").value,
    notes: form.querySelector("#edit-client-notes").value.trim()
  };

  // intentar leer las coordenadas visibles en el formulario
  const coordsDisplay = document.getElementById("edit-coordinates-display");
  if (coordsDisplay && coordsDisplay.dataset.lat && coordsDisplay.dataset.lng) {
    updatedClient.coordinates = {
      lat: parseFloat(coordsDisplay.dataset.lat),
      lng: parseFloat(coordsDisplay.dataset.lng)
    };
  }

  try {
    const saved = await saveClientToDB(updatedClient);
    const idx = clients.findIndex(c => c.id === id);
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

// === BORRADO DE CLIENTE ===
async function deleteClient(id) {
  if (!confirm("¿Estás seguro de eliminar este cliente?")) return;

  try {
    await deleteClientFromDB(id);
    clients = clients.filter(c => c.id !== id);
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
    const totalSales = contacts.filter(c => c.estado === "Vendido").length;
    const totalReferrals = contacts.filter(c => c.estado === "Derivado").length;
    const conversionRate = totalContacts ? Math.round((totalSales / totalContacts) * 100) : 0;
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === "Activo").length;

    // 🔸 Nuevo cálculo: total de productos solicitados
    const totalProducts = contacts.filter(c => c.producto && c.producto.trim() !== "").length;

    // Asignar valores al DOM
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

    // 🔸 Actualizar contador de productos solicitados
    const productsBox = document.getElementById("total-products");
    if (productsBox) productsBox.textContent = totalProducts;

  } catch (e) {
    console.warn("updateDashboard error:", e);
  }
}


// === SELECT DE CLIENTES PARA DERIVACIÓN ===

function updateClientSelectFromClients() {
  const sel = document.getElementById("cliente-derivado");
  const editSel = document.getElementById("edit-cliente-derivado");
  if (!sel && !editSel) return;

  const companies = [...new Set(clients.map(c => c.company).filter(Boolean))].sort();
  const fill = (select) => {
    if (!select) return;
    select.innerHTML = `<option value="">Seleccionar cliente</option>`;
    companies.forEach(name => {
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
  // Podría usarse para alimentar algo si hace falta; ahora mismo no estrictamente necesario.
}

// === REPORTES (VERSIÓN RESUMIDA) ===

function generateReports() {
  generateSalesReport();
  generateStatusReport();
  generateTopReferralsReport();
  generateTimelineReport();
  generateReferralsReport();

  // 🔸 Nuevos reportes
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
    "Natalia Montero"
  ];

  const salesData = vendedores.map(v => ({
    name: v,
    count: contacts.filter(c => c.vendedor === v && c.estado === "Vendido").length
  }));

  const max = Math.max(...salesData.map(d => d.count), 1);

  container.innerHTML = salesData.map(item => `
    <div class="chart-bar">
      <div class="chart-label">${item.name}</div>
      <div class="chart-value" style="width: ${Math.max((item.count / max) * 100, 5)}%">
        ${item.count} ventas
      </div>
    </div>
  `).join("");
}
// === NUEVOS REPORTES DE PRODUCTOS ===

// 🥚 Productos más solicitados
function generateTopProductsReport() {
  const container = document.getElementById("top-products-report");
  if (!container) return;

  const counts = {};
  contacts.forEach(c => {
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

  container.innerHTML = sorted.map(([prod, count], i) => `
    <div class="ranking-item">
      <span class="ranking-position">#${i + 1}</span>
      <span class="ranking-name">${prod}</span>
      <span class="ranking-value">${count}</span>
    </div>
  `).join("");
}

// 👩‍💼 Productos por vendedor
function generateProductsBySellerReport() {
  const container = document.getElementById("products-by-seller-report");
  if (!container) return;

  const sellers = {};
  contacts.forEach(c => {
    if (!c.vendedor || !c.producto) return;
    if (!sellers[c.vendedor]) sellers[c.vendedor] = {};
    const prod = c.producto.trim();
    sellers[c.vendedor][prod] = (sellers[c.vendedor][prod] || 0) + 1;
  });

  const html = Object.entries(sellers).map(([seller, products]) => {
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
  }).join("");

  container.innerHTML = html || `<p style="text-align:center;color:#666;">Sin registros de productos por vendedor</p>`;
}

// 📦 Solicitudes por categoría (usa el campo "type" del cliente derivado)
function generateRequestsByCategoryReport() {
  const container = document.getElementById("requests-by-category-report");
  if (!container) return;

  const counts = {};
  contacts.forEach(c => {
    if (c.type && c.type.trim() !== "") {
      counts[c.type] = (counts[c.type] || 0) + 1;
    }
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:#666;">No hay categorías registradas</p>`;
    return;
  }

  container.innerHTML = sorted.map(([cat, count]) => `
    <div class="ranking-item">
      <span class="ranking-name">${cat}</span>
      <span class="ranking-value">${count}</span>
    </div>
  `).join("");
}


// Resumen de estados
function generateStatusReport() {
  const container = document.getElementById("status-report");
  if (!container) return;

  const vendidos = contacts.filter(c => c.estado === "Vendido").length;
  const noVendidos = contacts.filter(c => c.estado === "No Vendido").length;
  const derivados = contacts.filter(c => c.estado === "Derivado").length;

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
    .filter(c => c.estado === "Derivado" && c.cliente_derivado)
    .forEach(c => {
      counts[c.cliente_derivado] = (counts[c.cliente_derivado] || 0) + 1;
    });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (!sorted.length) {
    container.innerHTML = `<p style="text-align:center;color:#666;">No hay derivaciones registradas</p>`;
    return;
  }

  container.innerHTML = sorted.map(([name, count], idx) => `
    <div class="ranking-item">
      <span class="ranking-position">#${idx + 1}</span>
      <span class="ranking-name">${name}</span>
      <span class="ranking-value">${count}</span>
    </div>
  `).join("");
}

// Evolución mensual simple
function generateTimelineReport() {
  const container = document.getElementById("timeline-report");
  if (!container) return;

  const monthly = {};
  contacts.forEach(c => {
    if (!c.fecha) return;
    const month = c.fecha.substring(0, 7);
    if (!monthly[month]) monthly[month] = { total: 0, vendidos: 0, derivados: 0 };
    monthly[month].total++;
    if (c.estado === "Vendido") monthly[month].vendidos++;
    if (c.estado === "Derivado") monthly[month].derivados++;
  });

  const months = Object.keys(monthly).sort().slice(-6);
  if (!months.length) {
    container.innerHTML = `<p style="text-align:center;color:#666;">No hay datos temporales</p>`;
    return;
  }

  container.innerHTML = months.map(m => {
    const d = monthly[m];
    const label = new Date(m + "-01").toLocaleDateString("es-ES", { month: "short", year: "numeric" });
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
  }).join("");
}

// Informe detallado de derivaciones
function generateReferralsReport() {
  const tbody = document.getElementById("referrals-tbody");
  if (!tbody) return;

  const stats = {};
  const todayMonth = new Date().toISOString().slice(0, 7);

  contacts
    .filter(c => c.estado === "Derivado" && c.cliente_derivado)
    .forEach(c => {
      const name = c.cliente_derivado;
      if (!stats[name]) {
        stats[name] = {
          total: 0,
          thisMonth: 0,
          lastContact: null,
          sellers: {}
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
    "Motivo"
  ];

  const rows = contacts.map(c => [
    c.fecha || "",
    c.vendedor || "",
    c.cliente || "",
    c.empresa || "",
    c.telefono || "",
    c.email || "",
    c.producto || "",
    c.estado || "",
    c.cliente_derivado || "",
    c.motivo || ""
  ]);

  const csvLines = [header, ...rows].map(cols =>
    cols
      .map(v => `"${(v || "").toString().replace(/"/g, '""')}"`)
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
    "Notas"
  ];

  const rows = clients.map(c => {
    const derivs = contacts.filter(x => x.cliente_derivado === c.company).length;
    return [
      c.name || "",
      c.company || "",
      c.phone || "",
      c.email || "",
      c.address || "",
      c.type || "",
      c.status || "",
      derivs,
      c.notes || ""
    ];
  });

  const csvLines = [header, ...rows].map(cols =>
    cols
      .map(v => `"${(v || "").toString().replace(/"/g, '""')}"`)
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
  report += `Ventas realizadas: ${contacts.filter(c => c.estado === "Vendido").length}\n`;
  report += `Derivaciones: ${contacts.filter(c => c.estado === "Derivado").length}\n`;
  report += `Clientes registrados: ${clients.length}\n\n`;

  const counts = {};
  contacts
    .filter(c => c.estado === "Derivado" && c.cliente_derivado)
    .forEach(c => {
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
 *  BLOQUE 4 - MAPA, GEOLOCALIZACIÓN, GLOBAL (CORREGIDO)
 *****************************************************/

// === MAPA DE CLIENTES (Versión final estable con Leaflet) ===
let mapView = null;
let markersLayer = null;

// Inicializa o reinicia el mapa
async function initLeafletMap() {
  try {
    const mapDiv = document.getElementById("map");
    if (!mapDiv) return;

    // Si ya existe, eliminarlo para evitar errores
    if (mapView) {
      mapView.remove();
      mapView = null;
    }

    mapView = L.map("map").setView([-34.6037, -58.3816], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapView);

    markersLayer = L.layerGroup().addTo(mapView);
    await showAllClientsOnMap();
  } catch (err) {
    console.error("initLeafletMap error:", err);
  }
}

// Muestra todos los clientes con coordenadas
async function showAllClientsOnMap() {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  if (!clients || clients.length === 0) {
    alert("No hay clientes registrados.");
    return;
  }

  const coords = [];

  for (const c of clients) {
    // Geocodificación si no tiene coordenadas
    if (!c.coordinates && c.address) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(c.address)}`;
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

        // 🔹 Calcular cantidad de derivaciones de este cliente
        const derivCount = contacts.filter(x => x.cliente_derivado === c.company).length;

        const marker = L.marker([lat, lng]).addTo(markersLayer);

        // 🔹 Popup con datos + cantidad de derivaciones
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

// Restablece la vista inicial
function resetMapView() {
  if (mapView) {
    mapView.setView([-34.6037, -58.3816], 6);
  }
}

// Botón "Ver en mapa"
function showClientsOnMap() {
  // Mostramos directamente la sección del mapa usando la función principal
  showSection("map-section");
}

// === GEOLOCALIZACIÓN ===

// Buscar coordenadas (formulario nuevo cliente)
async function geocodeCurrentAddress() {
  const addressInput = document.getElementById("client-address");
  const coordDisplay = document.getElementById("coordinates-display");
  if (!addressInput || !coordDisplay) return;

  const address = addressInput.value.trim();
  if (!address) return alert("Por favor ingresá una dirección para geocodificar.");

  coordDisplay.textContent = "Buscando ubicación...";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
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

// Buscar coordenadas (formulario editar cliente)
async function geocodeCurrentAddressEdit() {
  const addressInput = document.getElementById("edit-client-address");
  const coordDisplay = document.getElementById("edit-coordinates-display");
  if (!addressInput || !coordDisplay) return;

  const address = addressInput.value.trim();
  if (!address) return alert("Por favor ingresá una dirección para geocodificar.");

  coordDisplay.textContent = "Buscando ubicación...";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
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

// Obtener ubicación actual (modo edición)
function getCurrentLocationEdit() {
  const coordDisplay = document.getElementById("edit-coordinates-display");
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  coordDisplay.textContent = "Obteniendo tu ubicación actual...";
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(6);
      const lon = pos.coords.longitude.toFixed(6);
      coordDisplay.textContent = `Lat: ${lat}, Lng: ${lon}`;
      coordDisplay.dataset.lat = lat;
      coordDisplay.dataset.lng = lon;
      alert(`Ubicación actual:\nLat: ${lat}\nLng: ${lon}`);
    },
    err => {
      coordDisplay.textContent = "No se pudo obtener ubicación.";
      alert("Error al obtener ubicación: " + err.message);
    }
  );
}

// --- Mostrar secciones del mapa (solo afecta al mapa) ---
function showMapSection(sectionId) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // Si el usuario va al mapa directamente
  if (sectionId === "map-section") {
    setTimeout(() => {
      if (mapView) {
        mapView.invalidateSize();
      } else {
        initLeafletMap();
      }
    }, 400);
  }
}

// === REGISTRO GLOBAL (window) ===
window.showClientsOnMap = showClientsOnMap;
window.showMapSection = showMapSection;
window.geocodeCurrentAddress = geocodeCurrentAddress;
window.geocodeCurrentAddressEdit = geocodeCurrentAddressEdit;
window.getCurrentLocationEdit = getCurrentLocationEdit;
window.initLeafletMap = initLeafletMap;
window.resetMapView = resetMapView;

console.log("🌍 Funciones de geolocalización registradas correctamente en window");

// === DOM READY ===
document.addEventListener("DOMContentLoaded", () => {
  initApp().catch(err => console.error("initApp error:", err));
});
