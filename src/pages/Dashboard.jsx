import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  PieChart,
  Pie,
  Cell,
  Label,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { contactService } from "@/services/contactService";
import { clientService } from "@/services/clientService";
import { PageHeader } from "@/components/layout/Layout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { monthKey, formatMonth } from "@/utils/formatters";
import { CHART_COLORS } from "@/utils/constants";
import useFollowupStore from "@/store/followupStore";
import { countByUrgency } from "@/utils/followupUtils";

// ── Estilos compartidos ────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  padding: "8px 12px",
};

const AXIS_TICK = { fontSize: 11, fill: "#9CA3AF" };

// ── MetricCard ─────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  valueClass = "text-gray-800 text-4xl",
  borderClass = "border-l-gray-300",
  subtext,
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 ${borderClass} h-full`}
    >
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className={`font-bold leading-none ${valueClass}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
}

// ── Donut chart con center label ───────────────────────────────────────────────

function DonutChart({ data, total, centerLabel }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="46%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={CHART_COLORS[entry.name] ?? "#9CA3AF"}
            />
          ))}
          <Label
            content={({ viewBox }) => {
              const { cx, cy } = viewBox;
              return (
                <g>
                  <text
                    x={cx}
                    y={cy - 7}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={28}
                    fontWeight={800}
                    fill="#1F2937"
                  >
                    {total}
                  </text>
                  <text
                    x={cx}
                    y={cy + 14}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={11}
                    fill="#9CA3AF"
                  >
                    {centerLabel}
                  </text>
                </g>
              );
            }}
            position="center"
          />
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend
          iconSize={9}
          iconType="circle"
          wrapperStyle={{
            fontSize: "12px",
            paddingTop: "10px",
            lineHeight: "1.8",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Chart container card ───────────────────────────────────────────────────────

function ChartCard({ title, children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-card border border-gray-200 p-5 ${className}`}
    >
      <h3 className="font-semibold text-xs text-gray-500 mb-4 uppercase tracking-widest">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Dashboard page ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const { pendingFollowups, fetchPendingFollowups } = useFollowupStore();

  useEffect(() => {
    async function load() {
      try {
        const [c, cl] = await Promise.all([
          contactService.getAllForReports(),
          clientService.getAllForReports(),
          fetchPendingFollowups(),
        ]);
        setContacts(c);
        setClients(cl);
      } catch (err) {
        toast.error("Error cargando dashboard: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ── Métricas ──────────────────────────────────────────────────────────────
  const total = contacts.length;
  const vendidos = contacts.filter((c) => c.estado === "Vendido").length;
  const derivados = contacts.filter((c) => c.estado === "Derivado").length;
  const noVendidos = contacts.filter((c) => c.estado === "No Vendido").length;
  const convRate = total ? Math.round((vendidos / total) * 100) : 0;
  const activeClients = clients.filter((c) => c.status === "Activo").length;
  const totalClients = clients.length;

  // ── Datos gráficos ────────────────────────────────────────────────────────
  const estadoData = [
    { name: "Vendido", value: vendidos },
    { name: "Derivado", value: derivados },
    { name: "No Vendido", value: noVendidos },
  ].filter((d) => d.value > 0);

  const typeCounts = {};
  clients.forEach((c) => {
    if (c.type) typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  });
  const clientTypeData = Object.entries(typeCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const monthly = {};
  contacts.forEach((c) => {
    const k = monthKey(c.fecha);
    if (!k) return;
    if (!monthly[k])
      monthly[k] = { month: k, total: 0, vendidos: 0, derivados: 0 };
    monthly[k].total++;
    if (c.estado === "Vendido") monthly[k].vendidos++;
    if (c.estado === "Derivado") monthly[k].derivados++;
  });
  const monthlyData = Object.values(monthly)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
    .map((m) => ({ ...m, month: formatMonth(m.month) }));

  const prodCounts = {};
  contacts.forEach((c) => {
    if (c.producto) prodCounts[c.producto] = (prodCounts[c.producto] || 0) + 1;
  });
  const topProducts = Object.entries(prodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const sellerCounts = {};
  contacts.forEach((c) => {
    if (c.vendedor)
      sellerCounts[c.vendedor] = (sellerCounts[c.vendedor] || 0) + 1;
  });
  const sellerData = Object.entries(sellerCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name: name.split(" ")[0], value }));

  const followupCounts = countByUrgency(pendingFollowups);

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Dashboard" subtitle="Resumen general del CRM" />

      {/* ── Alertas de seguimientos ───────────────────────────────────────── */}
      {(followupCounts.vencidos > 0 || followupCounts.hoy > 0 || followupCounts.proximos > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {followupCounts.vencidos > 0 && (
            <div
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-red-400 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/seguimientos?urgencia=vencido")}
            >
              <p className="text-sm font-medium text-gray-500 mb-1">Seguimientos vencidos</p>
              <p className="text-4xl font-bold text-red-500">{followupCounts.vencidos}</p>
              <p className="text-xs text-gray-400 mt-1">Requieren atención inmediata</p>
            </div>
          )}
          {followupCounts.hoy > 0 && (
            <div
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-amber-400 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/seguimientos?urgencia=hoy")}
            >
              <p className="text-sm font-medium text-gray-500 mb-1">Seguimientos para hoy</p>
              <p className="text-4xl font-bold text-amber-500">{followupCounts.hoy}</p>
              <p className="text-xs text-gray-400 mt-1">Pendientes de hoy</p>
            </div>
          )}
          {followupCounts.proximos > 0 && (
            <div
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-green-400 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/seguimientos?urgencia=futuro")}
            >
              <p className="text-sm font-medium text-gray-500 mb-1">Próximos 7 días</p>
              <p className="text-4xl font-bold text-green-500">{followupCounts.proximos}</p>
              <p className="text-xs text-gray-400 mt-1">Seguimientos programados</p>
            </div>
          )}
        </div>
      )}

      {/* ── Métricas grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="col-span-2">
          <MetricCard
            label="Total de Contactos"
            value={total}
            valueClass="text-gray-800 text-4xl"
            borderClass="border-l-amber-400"
          />
        </div>
        <div className="col-span-2">
          <MetricCard
            label="Clientes Registrados"
            value={totalClients}
            valueClass="text-gray-800 text-4xl"
            borderClass="border-l-blue-400"
          />
        </div>

        <MetricCard
          label="Vendidos"
          value={vendidos}
          valueClass="text-green-600 text-4xl"
          borderClass="border-l-green-500"
        />
        <MetricCard
          label="No Vendidos"
          value={noVendidos}
          valueClass="text-red-500 text-4xl"
          borderClass="border-l-red-400"
        />
        <MetricCard
          label="Derivaciones"
          value={derivados}
          valueClass="text-amber-600 text-4xl"
          borderClass="border-l-amber-500"
        />
        <MetricCard
          label="Clientes Activos"
          value={activeClients}
          valueClass="text-blue-600 text-4xl"
          borderClass="border-l-emerald-500"
        />

        <div className="col-span-1 md:col-span-2">
          <MetricCard
            label="Tasa de Conversión"
            value={`${convRate}%`}
            valueClass="text-violet-600 text-4xl"
            borderClass="border-l-violet-400"
          />
        </div>
        <div className="col-span-1 md:col-span-2">
          <MetricCard
            label="Producto Más Solicitado"
            value={topProducts[0]?.name ?? "—"}
            valueClass="text-gray-800 text-xl"
            borderClass="border-l-orange-400"
          />
        </div>
      </div>

      {/* ── Donuts ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Contactos por Estado">
          <DonutChart data={estadoData} total={total} centerLabel="contactos" />
        </ChartCard>

        <ChartCard title="Clientes por Tipo">
          <DonutChart
            data={clientTypeData}
            total={totalClients}
            centerLabel="clientes"
          />
        </ChartCard>
      </div>

      {/* ── Evolución mensual ──────────────────────────────────────────────── */}
      <ChartCard title="Evolución Mensual — últimos 12 meses" className="mb-6">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={monthlyData}
            margin={{ top: 4, right: 12, bottom: 0, left: -16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="month"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend
              iconSize={9}
              iconType="circle"
              wrapperStyle={{ fontSize: "12px" }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#F59E0B"
              strokeWidth={2.5}
              name="Total"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="vendidos"
              stroke="#10B981"
              strokeWidth={2.5}
              name="Vendidos"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="derivados"
              stroke="#8B5CF6"
              strokeWidth={2}
              name="Derivados"
              dot={false}
              strokeDasharray="4 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Barras ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Top Productos Solicitados">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart
              data={topProducts}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 96 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={96}
                tick={{ fontSize: 10, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar
                dataKey="value"
                fill="#F59E0B"
                radius={[0, 4, 4, 0]}
                name="Contactos"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Actividad por Vendedor">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart
              data={sellerData}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 56 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={56}
                tick={{ fontSize: 11, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar
                dataKey="value"
                fill="#3B82F6"
                radius={[0, 4, 4, 0]}
                name="Contactos"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Quick links */}
      <div className="mt-8 flex gap-5 flex-wrap pt-5 border-t border-gray-200">
        <Link
          to="/contacts"
          className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
        >
          → Ver todos los contactos
        </Link>
        <Link
          to="/clients"
          className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
        >
          → Ver base de clientes
        </Link>
        <Link
          to="/reports"
          className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
        >
          → Ir a Informes
        </Link>
      </div>
    </div>
  );
}
