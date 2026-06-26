import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Bell,
  Building2,
  Map,
  BarChart2,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";
import { authService } from "@/services/authService";
import useAuthStore from "@/store/authStore";
import useFollowupStore from "@/store/followupStore";
import { Badge } from "@/components/ui/Badge";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { to: "/contacts", label: "Contactos", icon: <Users size={18} /> },
  {
    to: "/seguimientos",
    label: "Seguimientos",
    icon: <Bell size={18} />,
    badge: true,
  },
  { to: "/clients", label: "Clientes", icon: <Building2 size={18} /> },
  { to: "/map", label: "Mapa", icon: <Map size={18} /> },
  { to: "/reports", label: "Informes", icon: <BarChart2 size={18} /> },
];

export function Sidebar() {
  const { userName, role } = useAuthStore();
  const navigate = useNavigate();
  const { pendingFollowups, fetchPendingFollowups } = useFollowupStore();

  useEffect(() => {
    fetchPendingFollowups();
  }, []); // eslint-disable-line

  const pendingCount = pendingFollowups.length;

  async function handleLogout() {
    try {
      await authService.logout();
      navigate("/login");
    } catch {
      toast.error("Error al cerrar sesión");
    }
  }

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-primary-200 h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-35 h-35 rounded-xl  flex items-center justify-center shrink-0">
              <img
                src="../../img/logo.png"
                alt="Logo"
                className="w-24 h-24 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.innerHTML =
                    '<span style="color:white;font-weight:700;font-size:13px">GA</span>';
                }}
              />
            </div>
            <div>
              <p className="text-sm  italic mt-0.5">CRM Comercial</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary-500 text-white shadow-sm font-semibold"
                    : "text-gray-400 hover:bg-primary-50 hover:text-primary-700"
                }`
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge && pendingCount > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 pb-4">
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-t border-gray-100 pt-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center text-sm font-bold text-primary-700 shrink-0">
              {userName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {userName}
              </p>
              <Badge label={role ?? ""} />
            </div>
          </div>

          <div className="border-t border-gray-100 mt-2 pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-primary-200 shadow-md flex">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors relative ${
                isActive
                  ? "text-primary-600 font-semibold"
                  : "text-gray-400 hover:text-gray-600"
              }`
            }
          >
            <span className="relative">
              {item.icon}
              {item.badge && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1.5 text-[8px] font-bold bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
