import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Role, User } from "../types";
import {
  Users,
  Plus,
} from "lucide-react";

export const SalesTeamView: React.FC = () => {
  const { users, leads, projects, addUser, activeRole } = useApp();
  const canManageUsers = activeRole === Role.OWNER || activeRole === Role.ADMIN;
  const [showAddUser, setShowAddUser] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>(Role.EXECUTIVE);
  const [maxLeads, setMaxLeads] = useState("12");

  const getActiveLeadsCount = (userId: string) => {
    return leads.filter((l) => l.assigned_to === userId && l.status !== "BOOKED" && l.status !== "LOST").length;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newUser: User = {
      id: `user_${users.length + 1}`,
      name,
      email,
      phone: phone || "+91 99999 88888",
      role,
      active: true,
      project_assignments: projects.slice(0, 2).map((project) => project.id),
      max_hot_leads_per_day: Number(maxLeads) || 12,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await addUser(newUser);
    
    // Reset Form
    setShowAddUser(false);
    setName("");
    setEmail("");
    setPhone("");
    setRole(Role.EXECUTIVE);
    setMaxLeads("12");
  };

  return (
    <div className="space-y-6 select-none max-w-5xl mx-auto font-sans">
      
      {/* Header bar */}
      <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-zinc-150 text-sm flex items-center gap-1.5">
            <Users className="w-5 h-5 text-indigo-400" />
            Sales Operations & Allocations Team
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Register and allocate builder advisors, configure daily hot limits, and track direct executive callback workloads.
          </p>
        </div>

        {canManageUsers && <button
          onClick={() => setShowAddUser(!showAddUser)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
        >
          <Plus className="w-4 h-4" />
          <span>Register Advisor</span>
        </button>}
      </div>

      {/* User addition drawer */}
      {showAddUser && (
        <form onSubmit={handleCreateUser} className="bg-[#121214] border border-zinc-805 p-5 rounded-xl text-xs font-semibold text-zinc-350 shadow-lg space-y-4 animate-fade-in">
          <h4 className="font-bold text-zinc-150 text-sm">Register Team Advisor</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-zinc-450">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Suresh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650 font-sans"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-zinc-455">Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. suresh@propiq.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650 font-sans"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-zinc-455">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +91 99882 11223"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650"
              />
            </div>

            <div className="flex flex-col space-y-1 font-sans">
              <label className="text-zinc-455">Operations Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-200 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              >
                <option value={Role.EXECUTIVE}>Sales Executive (Rep)</option>
                <option value={Role.MANAGER}>Sales Manager</option>
                <option value={Role.ADMIN}>System Admin</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-zinc-455">Max Hot Leads Cap Limit (Per Day)</label>
              <input
                type="number"
                value={maxLeads}
                onChange={(e) => setMaxLeads(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:bg-zinc-850 focus:outline-none placeholder-zinc-650 font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-805">
            <button
              type="button"
              onClick={() => setShowAddUser(false)}
              className="px-3 py-1.5 text-zinc-450 hover:text-zinc-250 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white rounded-lg px-4 py-1.5 font-bold cursor-pointer font-sans hover:bg-indigo-705 transition-colors"
            >
              Register Member
            </button>
          </div>
        </form>
      )}

      {/* Grid of Team Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((usr) => {
          const loadNum = getActiveLeadsCount(usr.id);
          
          return (
            <div key={usr.id} className="bg-[#121214] rounded-xl border border-zinc-800 p-5 shadow-lg flex flex-col justify-between space-y-4">
              
              {/* Profile Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center justify-center font-bold">
                    {usr.name[0]}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-zinc-150 text-sm">{usr.name}</h4>
                    <span className="text-[9.5px] bg-zinc-805 text-zinc-400 font-mono font-bold uppercase rounded px-1.5 py-0.5 mt-1 block max-w-fit">
                      {usr.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[10px] text-emerald-430 font-bold uppercase font-mono">Active</span>
                </div>
              </div>

              {/* Data block details */}
              <div className="space-y-2 text-xs border-y border-zinc-805/80 py-3 text-zinc-350 font-semibold font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-550">Email Rep</span>
                  <span className="text-zinc-300 truncate max-w-[170px] font-mono font-medium">{usr.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-550">Phone Rep</span>
                  <span className="text-zinc-300 font-mono font-medium">{usr.phone}</span>
                </div>
                <div className="flex items-center justify-between pb-0.5">
                  <span className="text-zinc-550 shrink-0">Project Bounds</span>
                  <span className="text-zinc-350 text-[10px] font-sans truncate ml-2">
                    {usr.project_assignments.map((id) => projects.find((p) => p.id === id)?.name || id).join(", ")}
                  </span>
                </div>
              </div>

              {/* Workload statistics */}
              <div className="flex items-center justify-between text-xs font-semibold">
                <div>
                  <span className="text-[10px] text-zinc-550 block font-mono">ACTIVE WORKLOAD</span>
                  <span className={`text-sm font-black mt-0.5 block ${loadNum > 5 ? "text-amber-400" : "text-emerald-420"}`}>
                    {loadNum} lead files active
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-550 block font-mono">DAILY HOT CAP</span>
                  <span className="text-sm font-bold text-zinc-400 block mt-0.5">
                    {usr.max_hot_leads_per_day} daily cap
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
