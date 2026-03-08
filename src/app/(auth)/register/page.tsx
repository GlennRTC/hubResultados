import Link from "next/link";
import { registerAction } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const errorMessages: Record<string, string> = {
  datos_invalidos:
    "Por favor completa todos los campos correctamente. La contraseña debe tener al menos 8 caracteres.",
  email_en_uso: "Este correo ya está registrado. Intenta iniciar sesión.",
  error_registro: "Ocurrió un error al crear tu cuenta. Intenta de nuevo.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar laboratorio</CardTitle>
        <CardDescription>
          Crea tu cuenta para empezar a enviar resultados vía WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={registerAction} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="labName">Nombre del laboratorio</Label>
            <Input
              id="labName"
              name="labName"
              type="text"
              placeholder="Laboratorio Clínico San José"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fullName">Tu nombre completo</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="María García"
              required
              autoComplete="name"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="director@laboratorio.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && errorMessages[error] && (
            <p className="text-sm text-destructive">{errorMessages[error]}</p>
          )}
          <Button type="submit" className="w-full">
            Crear cuenta
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?&nbsp;
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Iniciar sesión
        </Link>
      </CardFooter>
    </Card>
  );
}
