import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import logo from "@/img/logo.png";

const schema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  async function onSubmit({ username, password }) {
    setLoading(true);
    try {
      await authService.login(username, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err.message?.includes("Invalid login")
        ? "Usuario o contraseña incorrectos"
        : err.message || "Error al iniciar sesión";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-card shadow-card p-8 md:p-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <img
            src={logo}
            alt="Granja Almeyra"
            className="w-45 h-45 object-contain"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div className="text-center">
            <h1 className="text-lg  italic mt-0.5">
              El origen de los mejores huevos
            </h1>
          </div>
          <p className="text-sm text-text-secondary font-medium mt-2">
            Bienvenido al CRM — iniciá sesión
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label="Usuario"
            type="text"
            placeholder="Ej: Nombre.Apellido"
            autoComplete="username"
            error={errors.username?.message}
            {...register("username")}
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="mt-2 w-full rounded-xl"
          >
            Iniciar Sesión
          </Button>
        </form>

        <p className="text-center text-xs text-text-muted mt-6">
          Sin registro público — contactá al administrador para obtener acceso
        </p>
      </div>
    </div>
  );
}
