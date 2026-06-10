import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  CheckSquare,
  User,
  Plus,
  Compass,
  CheckCircle2,
  PhoneCall,
} from "lucide-react";
import { Role } from "../types";

export const SalesTasksView: React.FC = () => {
  const {
    tasks,
    leads,
    users,
    toggleTaskStatus,
    addTask,
    projects,
    activeRole,
  } = useApp();
  const canCreateTask =
    activeRole === Role.OWNER ||
    activeRole === Role.MANAGER ||
    activeRole === Role.ADMIN;
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "OVERDUE" | "COMPLETED">("ALL");

  // New task form fields state
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskLeadId, setNewTaskLeadId] = useState("");
  const [newTaskType, setNewTaskType] = useState<"CALLBACK" | "SEND_BROCHURE" | "CONFIRM_VISIT" | "POST_VISIT_FEEDBACK">("CALLBACK");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");

  const getTaskBadgeStyle = (type: string) => {
    switch (type) {
      case "CALLBACK": return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      case "SEND_BROCHURE": return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "CONFIRM_VISIT": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      default: return "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskLeadId || !newTaskDue || !newTaskAssignee) return;

    await addTask({
      lead_id: newTaskLeadId,
      assigned_to: newTaskAssignee,
      task_type: newTaskType,
      due_at: new Date(newTaskDue).toISOString(),
      status: "PENDING",
      notes: newTaskNotes,
    });

    // Reset Form
    setShowCreateTask(false);
    setNewTaskLeadId("");
    setNewTaskDue("");
    setNewTaskNotes("");
  };

  const filteredTasks = tasks.filter(t => {
    const isOverdue = t.status === "PENDING" && new Date(t.due_at).getTime() < Date.now();
    
    if (activeTab === "PENDING") return t.status === "PENDING" && !isOverdue;
    if (activeTab === "OVERDUE") return t.status === "OVERDUE" || (t.status === "PENDING" && isOverdue);
    if (activeTab === "COMPLETED") return t.status === "COMPLETED";
    return true; // ALL
  });

  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto">
      
      {/* Header operations box */}
      <div className="bg-[#121214] p-5 rounded-xl border border-zinc-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-zinc-150 text-sm flex items-center gap-1.5">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            Active Follow-up Callback Queue
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Sales executives queues of callbacks and brochure dispatch tasks. Complete tasks in time to avoid Manager escalations.
          </p>
        </div>

        {canCreateTask && <button
          onClick={() => setShowCreateTask(!showCreateTask)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Manual Task</span>
        </button>}
      </div>

      {/* Task Creation Drawer */}
      {canCreateTask && showCreateTask && (
        <form onSubmit={handleCreateTask} className="bg-[#121214] border border-zinc-800 p-5 rounded-xl shadow-lg space-y-4 text-xs font-semibold text-zinc-300 animate-fade-in text-zinc-300">
          <h4 className="font-bold text-zinc-150 text-xs">Create Follow-up Callback Task</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">Select Target Lead</label>
              <select
                required
                value={newTaskLeadId}
                onChange={(e) => setNewTaskLeadId(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/55"
              >
                <option value="">-- Choose Buyer --</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({projects.find(p=>p.id===l.project_id)?.name})</option>)}
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">Task Category</label>
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value as any)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/55"
              >
                <option value="CALLBACK">Callback Discussion</option>
                <option value="SEND_BROCHURE">Send WhatsApp Brochure</option>
                <option value="CONFIRM_VISIT">Confirm Site Visit</option>
                <option value="POST_VISIT_FEEDBACK">Post Visit Review</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">Assign To Advisor</label>
              <select
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-205 focus:outline-none focus:ring-1 focus:ring-indigo-500/55"
              >
                <option value="">-- Choose sales advisor --</option>
                {users.filter(u=>u.role==="EXECUTIVE").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">Due Date & Time</label>
              <input
                type="datetime-local"
                required
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/55"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-zinc-400">Callback instruction notes</label>
              <input
                type="text"
                placeholder="What should advisor ask? (e.g. 'Push the payment scheme details')"
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                className="p-2 border border-zinc-800 rounded-lg bg-zinc-900 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/55 placeholder-zinc-600"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-805">
            <button
              type="button"
              onClick={() => setShowCreateTask(false)}
              className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-705 text-white rounded-lg px-4 py-1.5 font-bold cursor-pointer"
            >
              Enqueue Task Card
            </button>
          </div>
        </form>
      )}

      {/* Categories Tabs Selector */}
      <div className="flex border-b border-zinc-800 text-xs font-semibold text-zinc-500">
        {(["ALL", "PENDING", "OVERDUE", "COMPLETED"] as const).map((tab) => {
          const isActive = activeTab === tab;
          let count = 0;
          if (tab === "PENDING") count = tasks.filter(t => t.status === "PENDING" && new Date(t.due_at).getTime() >= Date.now()).length;
          else if (tab === "OVERDUE") count = tasks.filter(t => t.status === "OVERDUE" || (t.status === "PENDING" && new Date(t.due_at).getTime() < Date.now())).length;
          else if (tab === "COMPLETED") count = tasks.filter(t => t.status === "COMPLETED").length;
          else count = tasks.length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 px-4 focus:outline-none transition-all duration-150 border-b-2 font-mono uppercase tracking-wider relative cursor-pointer ${
                isActive
                  ? "border-indigo-500 text-indigo-400 font-bold"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <span>{tab} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Tasks Queue Grid */}
      <div className="space-y-3">
        {filteredLeadsCountAndFilteredArray(filteredTasks, leads, projects, users, toggleTaskStatus, getTaskBadgeStyle)}
      </div>

    </div>
  );
};

// Helper to keep components dry
function filteredLeadsCountAndFilteredArray(
  filteredTasks: any[],
  leads: any[],
  projects: any[],
  users: any[],
  toggleTaskStatus: (id: string) => void,
  getTaskBadgeStyle: (type: string) => string
) {
  if (filteredTasks.length === 0) {
    return (
      <div className="bg-[#121214] p-12 text-center text-zinc-500 rounded-xl border border-dashed border-zinc-800 font-semibold text-xs">
        <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
        <p className="text-zinc-200 text-sm font-bold">No active tasks in this queue segment!</p>
        <p className="text-zinc-500 text-[11px] mt-1 italic">Excellent job! All callback schedules are resolved inside SLA goals.</p>
      </div>
    );
  }

  return filteredTasks.map((t) => {
    const lead = leads.find(l => l.id === t.lead_id);
    const proj = lead && projects.find(p => p.id === lead.project_id);
    const reporter = users.find(u => u.id === t.assigned_to);
    
    const isOverdue = t.status === "PENDING" && new Date(t.due_at).getTime() < Date.now();
    const resolved = t.status === "COMPLETED";

    return (
      <div
        key={t.id}
        className={`bg-[#121214] rounded-xl border border-zinc-805 p-4 shadow-sm flex items-start gap-4 transition-all hover:border-zinc-700 ${
          isOverdue && !resolved ? "border-l-4 border-l-rose-500 bg-rose-550/5" : ""
        }`}
      >
        <input
          type="checkbox"
          checked={resolved}
          onChange={() => void toggleTaskStatus(t.id)}
          className="rounded border-zinc-800 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-1 shrink-0 cursor-pointer"
          title="Toggle task completion status"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-zinc-200 text-xs sm:text-sm truncate">
              Callback <span className="text-indigo-400">@{lead?.name || "Draft Lead"}</span>
            </span>
            <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase shrink-0 ${getTaskBadgeStyle(t.task_type)}`}>
              {t.task_type.replace(/_/g, " ")}
            </span>
            {isOverdue && !resolved && (
              <span className="bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold animate-pulse border border-rose-520/20">
                OVERDUE BY {Math.ceil((Date.now() - new Date(t.due_at).getTime()) / 60000)}m
              </span>
            )}
            {resolved && (
              <span className="bg-emerald-500/10 text-emerald-420 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border border-emerald-520/20">
                COMPLETED
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-400 mt-1.5 font-semibold">
            Notes: <span className="font-medium text-zinc-300">{t.notes || "No extra callback context."}</span>
          </p>

          <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-medium font-mono mt-2.5 flex-wrap">
            <div className="flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-zinc-600" />
              <span>Contact: {lead?.phone}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-zinc-600" />
              <span>RERA Project: {proj?.name}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-zinc-600" />
              <span>Assignee rep: {reporter?.name}</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-zinc-500 block font-mono font-semibold">DUE TIME</span>
          <span className={`text-xs font-mono font-bold block mt-0.5 ${isOverdue && !resolved ? "text-rose-400" : "text-zinc-300"}`}>
            {new Date(t.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(t.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  });
}
