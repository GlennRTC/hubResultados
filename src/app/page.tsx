import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Resultados de laboratorio,<br />al instante en WhatsApp
      </h1>
      <p className="max-w-md text-lg text-muted-foreground">
        LabFlash automatiza la entrega de resultados clínicos a tus pacientes — sin llamadas, sin papeleos.
      </p>
      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link href="/register">Registrar laboratorio</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Iniciar sesión</Link>
        </Button>
      </div>
    </main>
  );
}
