import { getLabUser } from "@/lib/auth/get-lab-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const { lab } = await getLabUser();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Bienvenido, {lab.name}</h1>
        <p className="text-muted-foreground">Panel de control — LabFlash</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Resultados este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lab.resultsThisMonth}</p>
            <p className="text-xs text-muted-foreground">
              {lab.plan === "free"
                ? "de 30 permitidos (plan gratuito)"
                : "plan pro — sin límite"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">
              Disponible en la siguiente fase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Órdenes pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">
              Disponible en la siguiente fase
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
