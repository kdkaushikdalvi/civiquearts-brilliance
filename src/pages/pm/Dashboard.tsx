import AppShell from "@/components/pm/AppShell";
import { useData } from "@/contexts/DataContext";
import { formatINR } from "@/lib/pmFormat";
import { ClipboardList, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { assignments, projects, employees } = useData();
  const completed = assignments.filter((a) => a.status === "Completed");
  const inProgress = assignments.filter((a) => a.status === "In Progress");
  const totalBilled = completed.reduce((s, a) => s + (a.amount ?? 0), 0);

  const cards = [
    { label: "Total Assignments", value: assignments.length, icon: ClipboardList, color: "gradient-saffron" },
    { label: "In Progress", value: inProgress.length, icon: Loader2, color: "bg-yellow-500" },
    { label: "Completed", value: completed.length, icon: CheckCircle2, color: "gradient-green" },
    { label: "Total Billed", value: formatINR(totalBilled), icon: Wallet, color: "gradient-hero" },
  ];

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your assignments and billing</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-card rounded-xl p-5 shadow-card border border-border">
              <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
                <c.icon className="h-5 w-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-foreground">{c.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl p-5 shadow-card border border-border">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/app/assignments" className="block px-3 py-2 rounded-md hover:bg-secondary text-sm">
                → Create new assignments
              </Link>
              <Link to="/app/download-invoices" className="block px-3 py-2 rounded-md hover:bg-secondary text-sm">
                → Generate invoices
              </Link>
              <Link to="/app/master/project" className="block px-3 py-2 rounded-md hover:bg-secondary text-sm">
                → Manage projects ({projects.length})
              </Link>
              <Link to="/app/master/employee" className="block px-3 py-2 rounded-md hover:bg-secondary text-sm">
                → Manage employees ({employees.length})
              </Link>
            </div>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border">
            <h3 className="font-semibold mb-3">Recent Activity</h3>
            {assignments.slice(-5).reverse().map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="text-sm">
                  <div className="font-medium">{a.projectName} → {a.siteName}</div>
                  <div className="text-xs text-muted-foreground">{a.assigneeName}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${a.status === "Completed" ? "bg-green-accent/10 text-green-accent" : "bg-yellow-500/10 text-yellow-700"}`}>
                  {a.status}
                </span>
              </div>
            ))}
            {assignments.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet.</p>}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;
