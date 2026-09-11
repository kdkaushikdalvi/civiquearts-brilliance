import { Mail, Phone, ShieldCheck, UserCircle } from "lucide-react";
import AppShell from "@/components/pm/AppShell";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const { supaUser } = useAuth();
  const metadata = supaUser?.user_metadata ?? {};
  const name = metadata.full_name || metadata.name || "Not provided";
  const mobile = metadata.mobile || metadata.phone || "Not provided";

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-600">
            Account
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your account details and sign-in information.
          </p>
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
              <UserCircle className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{name}</h2>
              <p className="text-sm text-slate-500">{supaUser?.email ?? "No email available"}</p>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <UserCircle className="h-4 w-4 text-violet-600" /> Full name
              </div>
              <p className="mt-2 font-semibold text-slate-900">{name}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Mail className="h-4 w-4 text-blue-600" /> Email address
              </div>
              <p className="mt-2 break-all font-semibold text-slate-900">{supaUser?.email ?? "Not provided"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Phone className="h-4 w-4 text-emerald-600" /> Mobile number
              </div>
              <p className="mt-2 font-semibold text-slate-900">{mobile}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <ShieldCheck className="h-4 w-4 text-amber-600" /> Account status
              </div>
              <p className="mt-2 font-semibold text-emerald-700">Active</p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

export default Profile;
