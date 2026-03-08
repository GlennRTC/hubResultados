import Link from "next/link";
import { loginAction } from "./actions";
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Accede al panel de tu laboratorio</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={loginAction} className="grid gap-4">
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
              required
              autoComplete="current-password"
            />
          </div>
          {error === "credenciales_invalidas" && (
            <p className="text-sm text-destructive">
              Correo o contraseña incorrectos. Intenta de nuevo.
            </p>
          )}
          <Button type="submit" className="w-full">
            Ingresar
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        ¿No tienes cuenta?&nbsp;
        <Link
          href="/register"
          className="underline underline-offset-4 hover:text-primary"
        >
          Registra tu laboratorio
        </Link>
      </CardFooter>
    </Card>
  );
}
