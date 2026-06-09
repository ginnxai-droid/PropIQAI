import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Project,
  User,
  Lead,
  Conversation,
  Handoff,
  SiteVisit,
  FollowupTask,
  Role,
  LeadStatus,
  Priority,
  LeadSource,
  BuyerType,
  PurchaseTimeline,
  Channel,
  HandoffReason,
  SiteVisitStatus,
} from "../types";
import {
  SAMPLE_PROJECTS,
  SAMPLE_USERS,
  SAMPLE_LEADS,
  SAMPLE_CONVERSATIONS,
  SAMPLE_HANDOFFS,
  SAMPLE_SITE_VISITS,
  SAMPLE_TASKS,
} from "../sampleData";

interface AppContextType {
  projects: Project[];
  users: User[];
  leads: Lead[];
  conversations: Conversation[];
  handoffs: Handoff[];
  siteVisits: SiteVisit[];
  tasks: FollowupTask[];
  activePage: string;
  selectedLeadId: string | null;
  activeRole: Role;
  setActivePage: (page: string) => void;
  setSelectedLeadId: (id: string | null) => void;
  setActiveRole: (role: Role) => void;
  
  // State Mutators for the demo
  addLead: (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => string;
  updateLeadStatus: (leadId: string, status: LeadStatus) => void;
  assignLead: (leadId: string, userId: string) => void;
  scheduleSiteVisit: (visit: Omit<SiteVisit, "id" | "created_at" | "updated_at">) => void;
  updateSiteVisitStatus: (visitId: string, status: any) => void;
  addTask: (task: Omit<FollowupTask, "id" | "created_at" | "updated_at">) => void;
  toggleTaskStatus: (taskId: string) => void;
  addProject: (project: Project) => void;
  addUser: (user: User) => void;
  addConversationMessage: (leadId: string, speaker: "buyer" | "ai" | "human", text: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(SAMPLE_PROJECTS);
  const [users, setUsers] = useState<User[]>(SAMPLE_USERS);
  const [leads, setLeads] = useState<Lead[]>(SAMPLE_LEADS);
  const [conversations, setConversations] = useState<Conversation[]>(SAMPLE_CONVERSATIONS);
  const [handoffs, setHandoffs] = useState<Handoff[]>(SAMPLE_HANDOFFS);
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>(SAMPLE_SITE_VISITS);
  const [tasks, setTasks] = useState<FollowupTask[]>(SAMPLE_TASKS);
  
  const [activePage, setActivePageState] = useState<string>("dashboard");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<Role>(Role.MANAGER);

  const setActivePage = (page: string) => {
    setActivePageState(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addLead = (leadData: Omit<Lead, "id" | "created_at" | "updated_at">) => {
    const newId = `lead_${leads.length + 1}`;
    const nowStr = new Date().toISOString();
    
    // Auto calculate priority and scoring based on PRD logic
    const score = leadData.score || 7.5;
    let priority = Priority.WARM;
    if (score >= 8.0) priority = Priority.HOT;
    else if (score >= 6.0) priority = Priority.WARM;
    else if (score >= 4.0) priority = Priority.NURTURE;
    else priority = Priority.COLD;

    const newLead: Lead = {
      ...leadData,
      id: newId,
      score,
      priority,
      created_at: nowStr,
      updated_at: nowStr,
    };

    setLeads((prev) => [newLead, ...prev]);

    // Create an initial conversion summary
    const newConv: Conversation = {
      id: `conv_${conversations.length + 1}`,
      lead_id: newId,
      channel: Channel.FORM,
      sentiment: "neutral",
      key_questions: [],
      objections: [],
      summary: `Automated Lead intake for ${leadData.name}. Qualify and schedule callback.`,
      transcript: [
        { speaker: "ai", text: `Hi ${leadData.name}, welcome to PropIQ. One of our specialists will reach out about project ${projects.find(p => p.id === leadData.project_id)?.name || "selected project"} shortly.`, time: "Just Now" }
      ],
      created_at: nowStr,
    };
    setConversations((prev) => [newConv, ...prev]);

    return newId;
  };

  const updateLeadStatus = (leadId: string, status: LeadStatus) => {
    const nowStr = new Date().toISOString();
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status, updated_at: nowStr } : l))
    );
  };

  const assignLead = (leadId: string, userId: string) => {
    const nowStr = new Date().toISOString();
    
    // Generate SLA Deadline for Hot/Warm leads
    const lead = leads.find(l => l.id === leadId);
    let sla_deadline: string | undefined = undefined;
    
    if (lead) {
      const deadline = new Date();
      if (lead.priority === Priority.HOT) {
        deadline.setMinutes(deadline.getMinutes() + 10); // 10 minutes SLA
      } else {
        deadline.setHours(deadline.getHours() + 4); // 4 hours SLA
      }
      sla_deadline = deadline.toISOString();
    }

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              assigned_to: userId,
              sla_deadline,
              status: l.status === LeadStatus.NEW ? LeadStatus.CONTACTED : l.status,
              updated_at: nowStr,
            }
          : l
      )
    );

    // Create / Update Handoff
    const newHandoff: Handoff = {
      id: `hand_${handoffs.length + 1}`,
      lead_id: leadId,
      assigned_to: userId,
      reason: lead?.site_visit_interest ? HandoffReason.SITE_VISIT_REQUEST : HandoffReason.HOT_LEAD,
      priority: lead?.priority || Priority.WARM,
      sla_deadline: sla_deadline || new Date(Date.now() + 3600000).toISOString(),
      status: "PENDING",
      created_at: nowStr,
      updated_at: nowStr,
    };
    setHandoffs((prev) => [newHandoff, ...prev]);

    // Create Followup Task
    const newTask: FollowupTask = {
      id: `task_${tasks.length + 1}`,
      lead_id: leadId,
      assigned_to: userId,
      task_type: "CALLBACK",
      due_at: sla_deadline || new Date(Date.now() + 3600000).toISOString(),
      status: "PENDING",
      notes: "First manual response followup callback assigned by system manager.",
      created_at: nowStr,
      updated_at: nowStr,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const scheduleSiteVisit = (visitData: Omit<SiteVisit, "id" | "created_at" | "updated_at">) => {
    const newId = `visit_${siteVisits.length + 1}`;
    const nowStr = new Date().toISOString();
    const newVisit: SiteVisit = {
      ...visitData,
      id: newId,
      created_at: nowStr,
      updated_at: nowStr,
    };
    setSiteVisits((prev) => [newVisit, ...prev]);

    // Automatically transition lead status
    updateLeadStatus(visitData.lead_id, LeadStatus.SITE_VISIT_SCHEDULED);
    
    // Add interactive prompt conversation
    addConversationMessage(
      visitData.lead_id,
      "ai",
      `Dynamic confirmation: Site visit successfully scheduled for ${visitData.preferred_date} at ${visitData.preferred_time}. Confirm details sent via automated WhatsApp channel.`
    );
  };

  const updateSiteVisitStatus = (visitId: string, status: any) => {
    const nowStr = new Date().toISOString();
    setSiteVisits((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, status, updated_at: nowStr } : v))
    );

    // Update associated lead status if completed
    const visit = siteVisits.find((v) => v.id === visitId);
    if (visit) {
      if (status === SiteVisitStatus.COMPLETED) {
        updateLeadStatus(visit.lead_id, LeadStatus.SITE_VISITED);
      }
    }
  };

  const addTask = (taskData: Omit<FollowupTask, "id" | "created_at" | "updated_at">) => {
    const newId = `task_${tasks.length + 1}`;
    const nowStr = new Date().toISOString();
    const newTask: FollowupTask = {
      ...taskData,
      id: newId,
      created_at: nowStr,
      updated_at: nowStr,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: t.status === "PENDING" || t.status === "OVERDUE" ? "COMPLETED" : "PENDING",
              updated_at: new Date().toISOString(),
            }
          : t
      )
    );
  };

  const addProject = (project: Project) => {
    setProjects((prev) => [...prev, project]);
  };

  const addUser = (user: User) => {
    setUsers((prev) => [...prev, user]);
  };

  const addConversationMessage = (leadId: string, speaker: "buyer" | "ai" | "human", text: string) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.lead_id === leadId);
      const nowStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      
      if (idx > -1) {
        return prev.map((c) =>
          c.lead_id === leadId
            ? {
                ...c,
                transcript: [...c.transcript, { speaker, text, time: nowStr }],
              }
            : c
        );
      } else {
        const newConv: Conversation = {
          id: `conv_${prev.length + 1}`,
          lead_id: leadId,
          channel: Channel.MANUAL,
          sentiment: "neutral",
          key_questions: [],
          objections: [],
          summary: `Direct interaction log.`,
          transcript: [{ speaker, text, time: nowStr }],
          created_at: new Date().toISOString(),
        };
        return [newConv, ...prev];
      }
    });

    // Update lead last contacting time
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() } : l));
  };

  return (
    <AppContext.Provider
      value={{
        projects,
        users,
        leads,
        conversations,
        handoffs,
        siteVisits,
        tasks,
        activePage,
        selectedLeadId,
        activeRole,
        setActivePage,
        setSelectedLeadId,
        setActiveRole,
        addLead,
        updateLeadStatus,
        assignLead,
        scheduleSiteVisit,
        updateSiteVisitStatus,
        addTask,
        toggleTaskStatus,
        addProject,
        addUser,
        addConversationMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
