import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { TIPO_COLORS } from '@/utils/constants'

const ESTADO_COLORS = {
  Vendido: '#22c55e',
  'No Vendido': '#ef4444',
  Derivado: '#eab308',
}

const CLIENT_STATUS_COLORS = {
  Activo: '#3b82f6',
  Inactivo: '#9ca3af',
  Prospecto: '#a855f7',
}

const PALETTE = ['#ffd700', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#fb923c', '#06b6d4', '#f43f5e', '#84cc16', '#ec4899']

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-text-secondary mb-4 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}

function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function ReportCharts({ contacts, clients }) {
  // ── 1. Estado contactos (pie) ──────────────────────────────────────────────
  const estadoContactos = Object.entries(
    contacts.reduce((acc, c) => { acc[c.estado] = (acc[c.estado] ?? 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  // ── 2. Vendedor performance (bar) ─────────────────────────────────────────
  const porVendedor = Object.entries(
    contacts.reduce((acc, c) => {
      if (!c.vendedor) return acc
      if (!acc[c.vendedor]) acc[c.vendedor] = { vendedor: c.vendedor.split(' ')[0], total: 0, vendido: 0 }
      acc[c.vendedor].total++
      if (c.estado === 'Vendido') acc[c.vendedor].vendido++
      return acc
    }, {})
  ).map(([, v]) => v).sort((a, b) => b.total - a.total)

  // ── 3. Evolución mensual (line) ────────────────────────────────────────────
  const mensual = Object.entries(
    contacts.reduce((acc, c) => {
      if (!c.fecha) return acc
      const key = c.fecha.slice(0, 7)
      if (!acc[key]) acc[key] = { mes: key, total: 0, vendido: 0 }
      acc[key].total++
      if (c.estado === 'Vendido') acc[key].vendido++
      return acc
    }, {})
  )
    .map(([, v]) => v)
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-12)

  // ── 4. Productos solicitados (bar horizontal) ─────────────────────────────
  const porProducto = Object.entries(
    contacts.reduce((acc, c) => { if (c.producto) acc[c.producto] = (acc[c.producto] ?? 0) + 1; return acc }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // ── 5. Tipo de clientes (pie) ──────────────────────────────────────────────
  const tipoClientes = Object.entries(
    clients.reduce((acc, c) => { if (c.type) acc[c.type] = (acc[c.type] ?? 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  // ── 6. Estado de clientes (pie) ───────────────────────────────────────────
  const estadoClientes = Object.entries(
    clients.reduce((acc, c) => { if (c.status) acc[c.status] = (acc[c.status] ?? 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  // ── 7. Tasa de conversión por mes ─────────────────────────────────────────
  const conversion = mensual.map(m => ({
    mes: m.mes.slice(5),
    tasa: m.total > 0 ? +((m.vendido / m.total) * 100).toFixed(1) : 0,
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

      {/* 1. Estado contactos */}
      <ChartCard title="Estado de Contactos">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={estadoContactos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
              labelLine={false} label={CustomPieLabel}>
              {estadoContactos.map((entry) => (
                <Cell key={entry.name} fill={ESTADO_COLORS[entry.name] ?? '#999'} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 2. Rendimiento por vendedor */}
      <ChartCard title="Contactos por Vendedor">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={porVendedor} barSize={18} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="vendedor" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="total" name="Total" fill="#ffd700" radius={[4, 4, 0, 0]} />
            <Bar dataKey="vendido" name="Vendidos" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 3. Evolución mensual */}
      <ChartCard title="Evolución Mensual (últimos 12 meses)">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={mensual} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="total" name="Total" stroke="#ffd700" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="vendido" name="Vendidos" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 4. Productos más solicitados */}
      <ChartCard title="Top Productos Solicitados">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={porProducto} layout="vertical" barSize={14} margin={{ top: 4, right: 16, bottom: 0, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" name="Solicitudes" fill="#ffd700" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 5. Tipos de clientes */}
      <ChartCard title="Tipos de Clientes">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={tipoClientes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
              labelLine={false} label={CustomPieLabel}>
              {tipoClientes.map((entry) => (
                <Cell key={entry.name} fill={TIPO_COLORS[entry.name] ?? '#999'} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 6. Estado de clientes */}
      <ChartCard title="Estado de Cartera">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={estadoClientes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
              labelLine={false} label={CustomPieLabel}>
              {estadoClientes.map((entry) => (
                <Cell key={entry.name} fill={CLIENT_STATUS_COLORS[entry.name] ?? '#999'} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 7. Tasa de conversión */}
      <ChartCard title="Tasa de Conversión Mensual (%)">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={conversion} barSize={20} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Conversión']} />
            <Bar dataKey="tasa" name="Conversión" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  )
}
