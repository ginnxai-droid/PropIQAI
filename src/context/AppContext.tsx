import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Channel,
  HandoffReason,
  LeadStatus,
  Priority,
  Role,
  SiteVisitStatus,
  type Conversation,
  type ExternalIntakeInput,
  type ExternalIntakeResult,
  type FollowupTask,
  type Handoff,
  type IntakeEvent,
  type InternalAlert,
  type Lead,
  type Project,
  type SiteVisit,
  type SlaEvent,
  type User,
} from "../types";
import { apiRequest } from "../lib/api";

type NewLeadInput = Omit<
  Lead,
  | "id"
  | "created_at"
  | "updated_at"
  | "score"
  | "priority"
  | "score_components"
  | "scoring_version"
  | "score_explanation"
  | "recalculated_at"
  | "sla_deadline"
  | "ai_qualification_status"
  | "ai_confidence"
  | "ai_signals"
  | "is_duplicate"
  | "duplicate_of_lead_id"
  | "intake_channel"
  | "campaign"
  | "preferred_location"
  | "received_at"
  | "business_hours_version"
>;

interface AppContextType {
  projects: Project[];
  users: User[];
  leads: Lead[];
  conversations: Conversation[];
  handoffs: Handoff[];
  siteVisits: SiteVisit[];
  tasks: FollowupTask[];
  slaEvents: SlaEvent[];
  alerts: InternalAlert[];
  intakeEvents: IntakeEvent[];
  activePage: string;
  selectedLeadId: string | null;
  activeRole: Role;
  organizationName: string;
  loading: boolean;
  error: string | null;
  operationError: string | null;
  clearOperationError: () => void;
  setActivePage: (page: string) => void;
  setSelectedLeadId: (id: string | null) => void;
  refresh: () => Promise<void>;
  addLead: (lead: NewLeadInput) => Promise<string>;
  addExternalIntake: (
    input: ExternalIntakeInput,
  ) => Promise<ExternalIntakeResult>;
  updateLead: (
    leadId: string,
    changes: Partial<
      Pick<
        Lead,
        | "buyer_type"
        | "apartment_preference"
        | "budget_min"
        | "budget_max"
        | "purchase_timeline"
        | "site_visit_interest"
        | "engagement_quality"
        | "callback_responsiveness"
        | "handoff_signals"
        | "recommended_next_action"
      >
    >,
  ) => Promise<void>;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  assignLead: (leadId: string, userId: string) => Promise<void>;
  scheduleSiteVisit: (
    visit: Omit<SiteVisit, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  updateSiteVisitStatus: (
    visitId: string,
    status: SiteVisitStatus,
  ) => Promise<void>;
  updateSiteVisitOutcome: (visitId: string, outcome: string) => Promise<void>;
  addTask: (
    task: Omit<FollowupTask, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  toggleTaskStatus: (taskId: string) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (
    projectId: string,
    changes: Partial<
      Pick<
        Project,
        | "name"
        | "location"
        | "developer_name"
        | "rera_number"
        | "price_min"
        | "price_max"
        | "possession_date"
        | "description"
        | "active"
      >
    >,
  ) => Promise<void>;
  createHandoff: (input: {
    lead_id: string;
    assigned_to: string;
    reason: HandoffReason;
  }) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  addConversationMessage: (
    leadId: string,
    speaker: "buyer" | "ai" | "human",
    text: string,
  ) => Promise<void>;
  updateAlertStatus: (
    alertId: string,
    status: "ACKNOWLEDGED" | "RESOLVED",
  ) => Promise<void>;
}

interface RawMember {
  id: string;
  role: Role;
  active: boolean;
  profiles:
    | {
        id: string;
        full_name: string;
        email: string;
        phone: string | null;
        active: boolean;
      }
    | {
        id: string;
        full_name: string;
        email: string;
        phone: string | null;
        active: boolean;
      }[];
  organization_member_projects: { project_id: string }[];
}

interface RawLead extends Omit<Lead, "isAfterHours"> {
  is_after_hours: boolean;
}

interface BootstrapData {
  organization: { id: string; name: string; slug: string };
  role: Role;
  projects: Project[];
  leads: RawLead[];
  conversations: Conversation[];
  handoffs: Handoff[];
  siteVisits: SiteVisit[];
  tasks: FollowupTask[];
  slaEvents: SlaEvent[];
  alerts: InternalAlert[];
  intakeEvents: IntakeEvent[];
  members: RawMember[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function profileFromMember(member: RawMember) {
  return Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
}

function mergeConversations(rows: Conversation[]): Conversation[] {
  const grouped = new Map<string, Conversation>();
  for (const row of rows) {
    const existing = grouped.get(row.lead_id);
    if (!existing) {
      grouped.set(row.lead_id, { ...row, transcript: [...row.transcript] });
      continue;
    }
    existing.transcript.push(...row.transcript);
    existing.key_questions = [
      ...new Set([...existing.key_questions, ...row.key_questions]),
    ];
    existing.objections = [
      ...new Set([...existing.objections, ...row.objections]),
    ];
    if (row.summary) {
      existing.summary = row.summary;
    }
  }
  return [...grouped.values()];
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [tasks, setTasks] = useState<FollowupTask[]>([]);
  const [slaEvents, setSlaEvents] = useState<SlaEvent[]>([]);
  const [alerts, setAlerts] = useState<InternalAlert[]>([]);
  const [intakeEvents, setIntakeEvents] = useState<IntakeEvent[]>([]);
  const [activePage, setActivePageState] = useState("dashboard");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<Role>(Role.EXECUTIVE);
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  useEffect(() => {
    const onApiError = (event: Event) => {
      setOperationError((event as CustomEvent<string>).detail);
    };
    window.addEventListener("propiq:api-error", onApiError);
    return () => window.removeEventListener("propiq:api-error", onApiError);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await apiRequest<{ data: BootstrapData }>("/api/bootstrap");
      const data = response.data;
      setProjects(data.projects);
      setLeads(
        data.leads.map(({ is_after_hours, ...lead }) => ({
          ...lead,
          isAfterHours: is_after_hours,
        })),
      );
      setConversations(mergeConversations(data.conversations));
      setHandoffs(data.handoffs);
      setSiteVisits(data.siteVisits);
      setTasks(data.tasks);
      setSlaEvents(data.slaEvents);
      setAlerts(data.alerts);
      setIntakeEvents(data.intakeEvents);
      setActiveRole(data.role);
      setOrganizationName(data.organization.name);
      setUsers(
        data.members.flatMap((member) => {
          const profile = profileFromMember(member);
          if (!profile) {
            return [];
          }
          return [
            {
              id: profile.id,
              name: profile.full_name,
              email: profile.email,
              phone: profile.phone ?? "",
              role: member.role,
              active: profile.active && member.active,
              project_assignments: member.organization_member_projects.map(
                (assignment) => assignment.project_id,
              ),
              max_hot_leads_per_day: 12,
              created_at: "",
              updated_at: "",
            },
          ];
        }),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Application data could not be loaded.",
      );
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const setActivePage = useCallback((page: string) => {
    setActivePageState(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const addLead = useCallback(
    async (leadData: NewLeadInput) => {
      const response = await apiRequest<{ data: { id: string } }>("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          ...leadData,
          is_after_hours: leadData.isAfterHours ?? false,
          isAfterHours: undefined,
          email: leadData.email || null,
        }),
      });
      await refresh();
      return response.data.id;
    },
    [refresh],
  );

  const updateLeadStatus = useCallback(
    async (leadId: string, status: LeadStatus) => {
      await apiRequest(`/api/leads/${leadId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await refresh();
    },
    [refresh],
  );

  const updateLead = useCallback(
    async (
      leadId: string,
      changes: Partial<
        Pick<
          Lead,
          | "buyer_type"
          | "apartment_preference"
          | "budget_min"
          | "budget_max"
          | "purchase_timeline"
          | "site_visit_interest"
          | "engagement_quality"
          | "callback_responsiveness"
          | "handoff_signals"
          | "recommended_next_action"
        >
      >,
    ) => {
      await apiRequest(`/api/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      await refresh();
    },
    [refresh],
  );

  const assignLead = useCallback(
    async (leadId: string, userId: string) => {
      await apiRequest(`/api/leads/${leadId}/assign`, {
        method: "POST",
        body: JSON.stringify({ assigned_to: userId }),
      });
      await refresh();
    },
    [refresh],
  );

  const scheduleSiteVisit = useCallback(
    async (
      visit: Omit<SiteVisit, "id" | "created_at" | "updated_at">,
    ) => {
      await apiRequest("/api/site-visits", {
        method: "POST",
        body: JSON.stringify(visit),
      });
      await refresh();
    },
    [refresh],
  );

  const updateSiteVisitStatus = useCallback(
    async (visitId: string, status: SiteVisitStatus) => {
      await apiRequest(`/api/site-visits/${visitId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
    },
    [refresh],
  );

  const updateSiteVisitOutcome = useCallback(
    async (visitId: string, outcome: string) => {
      await apiRequest(`/api/site-visits/${visitId}`, {
        method: "PATCH",
        body: JSON.stringify({ outcome }),
      });
      await refresh();
    },
    [refresh],
  );

  const addTask = useCallback(
    async (
      task: Omit<FollowupTask, "id" | "created_at" | "updated_at">,
    ) => {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify(task),
      });
      await refresh();
    },
    [refresh],
  );

  const toggleTaskStatus = useCallback(
    async (taskId: string) => {
      const task = tasks.find((candidate) => candidate.id === taskId);
      if (!task) {
        return;
      }
      const status =
        task.status === "PENDING" || task.status === "OVERDUE"
          ? "COMPLETED"
          : "PENDING";
      await apiRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
    },
    [refresh, tasks],
  );

  const addProject = useCallback(
    async (project: Project) => {
      const { id: _id, created_at: _created, updated_at: _updated, ...input } =
        project;
      await apiRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify(input),
      });
      await refresh();
    },
    [refresh],
  );

  const updateProject = useCallback(
    async (
      projectId: string,
      changes: Partial<
        Pick<
          Project,
          | "name"
          | "location"
          | "developer_name"
          | "rera_number"
          | "price_min"
          | "price_max"
          | "possession_date"
          | "description"
          | "active"
        >
      >,
    ) => {
      await apiRequest(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      await refresh();
    },
    [refresh],
  );

  const createHandoff = useCallback(
    async (input: {
      lead_id: string;
      assigned_to: string;
      reason: HandoffReason;
    }) => {
      await apiRequest("/api/handoffs", {
        method: "POST",
        body: JSON.stringify(input),
      });
      await refresh();
    },
    [refresh],
  );

  const addUser = useCallback(
    async (user: User) => {
      await apiRequest("/api/organization/members", {
        method: "POST",
        body: JSON.stringify({
          full_name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          project_ids: user.project_assignments,
        }),
      });
      await refresh();
    },
    [refresh],
  );

  const addConversationMessage = useCallback(
    async (
      leadId: string,
      speaker: "buyer" | "ai" | "human",
      text: string,
    ) => {
      await apiRequest(`/api/leads/${leadId}/conversations`, {
        method: "POST",
        body: JSON.stringify({
          channel: Channel.MANUAL,
          speaker,
          text,
          summary: "Manual interaction log.",
          sentiment: "neutral",
          key_questions: [],
          objections: [],
        }),
      });
      await refresh();
    },
    [refresh],
  );

  const addExternalIntake = useCallback(
    async (input: ExternalIntakeInput) => {
      const response = await apiRequest<{ data: ExternalIntakeResult }>(
        "/api/intake/manual",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      await refresh();
      return response.data;
    },
    [refresh],
  );

  const updateAlertStatus = useCallback(
    async (
      alertId: string,
      status: "ACKNOWLEDGED" | "RESOLVED",
    ) => {
      await apiRequest(`/api/alerts/${alertId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<AppContextType>(
    () => ({
      projects,
      users,
      leads,
      conversations,
      handoffs,
      siteVisits,
      tasks,
      slaEvents,
      alerts,
      intakeEvents,
      activePage,
      selectedLeadId,
      activeRole,
      organizationName,
      loading,
      error,
      operationError,
      clearOperationError: () => setOperationError(null),
      setActivePage,
      setSelectedLeadId,
      refresh,
      addLead,
      addExternalIntake,
      updateLead,
      updateLeadStatus,
      assignLead,
      scheduleSiteVisit,
      updateSiteVisitStatus,
      updateSiteVisitOutcome,
      addTask,
      toggleTaskStatus,
      addProject,
      updateProject,
      createHandoff,
      addUser,
      addConversationMessage,
      updateAlertStatus,
    }),
    [
      activePage,
      activeRole,
      alerts,
      addConversationMessage,
      addLead,
      addExternalIntake,
      addProject,
      addTask,
      addUser,
      assignLead,
      conversations,
      createHandoff,
      error,
      handoffs,
      intakeEvents,
      leads,
      loading,
      organizationName,
      operationError,
      projects,
      refresh,
      scheduleSiteVisit,
      selectedLeadId,
      setActivePage,
      siteVisits,
      tasks,
      slaEvents,
      toggleTaskStatus,
      updateLead,
      updateAlertStatus,
      updateLeadStatus,
      updateProject,
      updateSiteVisitOutcome,
      updateSiteVisitStatus,
      users,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
