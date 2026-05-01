import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AlertRecipients {
  emails: string[];
  companyName: string;
  companyId: string;
}

interface OverdueTask {
  id: string;
  title: string;
  next_due_date: string;
  priority: string;
  status: string;
  vessel_name: string;
  assigned_user_email: string | null;
}

interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit_of_measure: string;
  vessel_name: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("ALERT_FROM_EMAIL") ?? "alerts@yourdomain.com";

    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const todayStr = today.toISOString().split("T")[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];

    // Fetch all premium companies with notifications enabled
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name, contact_email, notification_emails")
      .eq("email_notifications_enabled", true);

    if (companiesError) throw companiesError;
    if (!companies || companies.length === 0) {
      return new Response(JSON.stringify({ message: "No companies with notifications enabled", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    const results: { company: string; sent: boolean; error?: string }[] = [];

    for (const company of companies) {
      try {
        // Build recipient list: contact email + additional emails
        const recipientSet = new Set<string>();
        if (company.contact_email) recipientSet.add(company.contact_email.toLowerCase());
        (company.notification_emails ?? []).forEach((e: string) => recipientSet.add(e.toLowerCase()));

        // Also include registered users for this company
        const { data: users } = await supabase
          .from("profiles")
          .select("email")
          .eq("company_id", company.id)
          .eq("status", "active");

        (users ?? []).forEach((u: { email: string }) => {
          if (u.email) recipientSet.add(u.email.toLowerCase());
        });

        const recipients: AlertRecipients = {
          emails: Array.from(recipientSet),
          companyName: company.name,
          companyId: company.id,
        };

        if (recipients.emails.length === 0) continue;

        // Fetch overdue and due-soon maintenance tasks
        const { data: overdueTasks } = await supabase
          .from("maintenance_tasks")
          .select(`
            id, title, next_due_date, priority, status,
            vessels(name),
            profiles:assigned_user_id(email)
          `)
          .eq("company_id", company.id)
          .in("status", ["overdue", "due_soon"])
          .lte("next_due_date", threeDaysStr)
          .neq("status", "completed")
          .order("next_due_date", { ascending: true });

        // Fetch low stock items
        const { data: lowStockItems } = await supabase
          .from("inventory_items")
          .select(`
            id, name, current_stock, minimum_stock, unit_of_measure,
            vessels(name)
          `)
          .eq("company_id", company.id)
          .filter("current_stock", "lte", supabase.rpc);

        // Manual low stock check
        const { data: allInventory } = await supabase
          .from("inventory_items")
          .select("id, name, current_stock, minimum_stock, unit_of_measure, vessel_id, vessels(name)")
          .eq("company_id", company.id);

        const lowStock: LowStockItem[] = (allInventory ?? [])
          .filter((item: any) => item.current_stock <= item.minimum_stock)
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            current_stock: item.current_stock,
            minimum_stock: item.minimum_stock,
            unit_of_measure: item.unit_of_measure,
            vessel_name: item.vessels?.name ?? "Unknown",
          }));

        const overdue: OverdueTask[] = (overdueTasks ?? []).map((t: any) => ({
          id: t.id,
          title: t.title,
          next_due_date: t.next_due_date,
          priority: t.priority,
          status: t.status,
          vessel_name: t.vessels?.name ?? "Unknown",
          assigned_user_email: t.profiles?.email ?? null,
        }));

        if (overdue.length === 0 && lowStock.length === 0) continue;

        // Build email HTML
        const emailHtml = buildAlertEmail(company.name, overdue, lowStock);
        const emailText = buildAlertText(company.name, overdue, lowStock);

        const subject = buildSubject(overdue.length, lowStock.length, company.name);

        if (resendApiKey) {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: recipients.emails,
              subject,
              html: emailHtml,
              text: emailText,
            }),
          });

          if (!resendResponse.ok) {
            const err = await resendResponse.text();
            throw new Error(`Resend error: ${err}`);
          }

          totalSent++;
          results.push({ company: company.name, sent: true });
        } else {
          // Log what would be sent (for testing without Resend key)
          console.log(`[check-alerts] Would send to ${recipients.emails.join(", ")} for ${company.name}:`, {
            overdueTasks: overdue.length,
            lowStockItems: lowStock.length,
          });
          results.push({ company: company.name, sent: false, error: "RESEND_API_KEY not configured" });
        }
      } catch (companyErr: any) {
        console.error(`Error processing company ${company.name}:`, companyErr);
        results.push({ company: company.name, sent: false, error: companyErr.message });
      }
    }

    return new Response(
      JSON.stringify({ message: "Alerts processed", totalSent, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("check-alerts error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSubject(overdueCount: number, lowStockCount: number, companyName: string): string {
  const parts: string[] = [];
  if (overdueCount > 0) parts.push(`${overdueCount} maintenance alert${overdueCount > 1 ? "s" : ""}`);
  if (lowStockCount > 0) parts.push(`${lowStockCount} low stock alert${lowStockCount > 1 ? "s" : ""}`);
  return `[YachtOps] ${parts.join(" & ")} — ${companyName}`;
}

function buildAlertEmail(companyName: string, overdue: OverdueTask[], lowStock: LowStockItem[]): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  let maintenanceSection = "";
  if (overdue.length > 0) {
    const rows = overdue.map(t => {
      const dueDate = new Date(t.next_due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const isOverdue = new Date(t.next_due_date) < new Date();
      const statusColor = isOverdue ? "#dc2626" : "#d97706";
      const statusLabel = isOverdue ? "OVERDUE" : "DUE SOON";
      const priorityColors: Record<string, string> = { critical: "#dc2626", high: "#d97706", medium: "#2563eb", low: "#6b7280" };
      const priorityColor = priorityColors[t.priority] ?? "#6b7280";

      return `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 12px 16px; font-size: 14px; color: #111827; font-weight: 500;">${t.title}</td>
          <td style="padding: 12px 16px; font-size: 13px; color: #6b7280;">${t.vessel_name}</td>
          <td style="padding: 12px 16px; font-size: 13px; color: ${statusColor}; font-weight: 600;">${statusLabel}</td>
          <td style="padding: 12px 16px; font-size: 13px; color: #6b7280;">${dueDate}</td>
          <td style="padding: 12px 16px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: white; background-color: ${priorityColor};">${t.priority}</span>
          </td>
        </tr>`;
    }).join("");

    maintenanceSection = `
      <div style="margin-bottom: 32px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 10px; height: 10px; background: #dc2626; border-radius: 50%; margin-right: 6px;"></span>
          Maintenance Alerts (${overdue.length})
        </h2>
        <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Task</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Vessel</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Due Date</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Priority</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  let inventorySection = "";
  if (lowStock.length > 0) {
    const rows = lowStock.map(item => `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 12px 16px; font-size: 14px; color: #111827; font-weight: 500;">${item.name}</td>
        <td style="padding: 12px 16px; font-size: 13px; color: #6b7280;">${item.vessel_name}</td>
        <td style="padding: 12px 16px; font-size: 13px; color: #dc2626; font-weight: 700;">${item.current_stock} ${item.unit_of_measure}</td>
        <td style="padding: 12px 16px; font-size: 13px; color: #6b7280;">${item.minimum_stock} ${item.unit_of_measure}</td>
      </tr>`).join("");

    inventorySection = `
      <div style="margin-bottom: 32px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">
          <span style="display: inline-block; width: 10px; height: 10px; background: #d97706; border-radius: 50%; margin-right: 6px;"></span>
          Low Stock Alerts (${lowStock.length})
        </h2>
        <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Item</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Vessel</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Current Stock</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Min. Required</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">YachtOps</p>
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">Fleet Management System</p>
            </td>
          </tr>

          <!-- Alert banner -->
          <tr>
            <td style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 32px;">
              <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
                Daily Alert Summary — ${today}
              </p>
              <p style="margin: 4px 0 0; font-size: 13px; color: #78350f;">
                ${companyName}: ${overdue.length > 0 ? `${overdue.length} maintenance task${overdue.length > 1 ? "s" : ""} need${overdue.length === 1 ? "s" : ""} attention` : ""}
                ${overdue.length > 0 && lowStock.length > 0 ? " &middot; " : ""}
                ${lowStock.length > 0 ? `${lowStock.length} inventory item${lowStock.length > 1 ? "s" : ""} below minimum stock` : ""}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              ${maintenanceSection}
              ${inventorySection}
              <div style="border-top: 1px solid #f3f4f6; padding-top: 20px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                  This is an automated alert from YachtOps. Log in to your dashboard to take action.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                You received this because email notifications are enabled for ${companyName}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildAlertText(companyName: string, overdue: OverdueTask[], lowStock: LowStockItem[]): string {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  let text = `YachtOps - Daily Alert Summary\n${today}\n${companyName}\n\n`;

  if (overdue.length > 0) {
    text += `MAINTENANCE ALERTS (${overdue.length})\n${"=".repeat(40)}\n`;
    overdue.forEach(t => {
      const isOverdue = new Date(t.next_due_date) < new Date();
      text += `- [${isOverdue ? "OVERDUE" : "DUE SOON"}] ${t.title} | ${t.vessel_name} | Due: ${t.next_due_date} | Priority: ${t.priority}\n`;
    });
    text += "\n";
  }

  if (lowStock.length > 0) {
    text += `LOW STOCK ALERTS (${lowStock.length})\n${"=".repeat(40)}\n`;
    lowStock.forEach(item => {
      text += `- ${item.name} | ${item.vessel_name} | Stock: ${item.current_stock} ${item.unit_of_measure} (min: ${item.minimum_stock})\n`;
    });
    text += "\n";
  }

  text += "Log in to your YachtOps dashboard to take action.\n";
  return text;
}
