"use client";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GuidePage() {
  return (
    <AppShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Guide</h1>
          <p className="text-muted-foreground">
            Learn how to use MobilityPulse and manage your charging infrastructure.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>How MobilityPulse works</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              MobilityPulse is a comprehensive OCPP (Open Charge Point Protocol)
              Charge Management System. It allows you to centrally manage,
              monitor, and control electric vehicle charging stations.
            </p>
            <p>
              The system consists of a central dashboard (this interface) and a
              backend server that communicates directly with your charging
              hardware using standard OCPP 1.6 and 2.1 protocols.
            </p>
            <p>
              From here, you can group chargers into <strong>Locations</strong>{" "}
              and <strong>Charge Groups</strong>, manage access with{" "}
              <strong>RFID cards</strong>, and track <strong>Transactions</strong>{" "}
              and usage statistics.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adding a New Charger</CardTitle>
            <CardDescription>Step-by-step instructions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Ensure you have created a <strong>Location</strong> (Charging
                Station) first. Navigate to the <em>Locations</em> page to create
                one if needed.
              </li>
              <li>
                Navigate to the <strong>Chargers</strong> page using the sidebar menu.
              </li>
              <li>
                Click the <strong>Add Charger</strong> button in the top right corner.
              </li>
              <li>
                Fill out the required details:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li><strong>Identity:</strong> The exact ChargeBox ID configured in your hardware.</li>
                  <li><strong>Location:</strong> Select the station this charger belongs to.</li>
                  <li><strong>Power Capacity:</strong> Enter the max power output.</li>
                </ul>
              </li>
              <li>
                Save the charger. Once created, configure your physical charging
                hardware to connect to our OCPP WebSocket URL using the Identity
                you specified.
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
