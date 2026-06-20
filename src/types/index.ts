// Database entity types
export type {
  Tenant,
  Employee,
  TimeEntry,
  BreakSession,
  TimeEntryAudit,
  CorrectionRequest,
  PublicHoliday,
  Notification,
  SubscriptionEvent,
  LeaveRequest,
  LeaveEntitlement,
  SickEntry,
  Project,
  ProjectAssignment,
} from "./database";

// Tenant types
export type {
  Plan,
  Bundesland,
  TenantInsert,
  TenantUpdate,
} from "./tenant";
export {
  BUNDESLAENDER,
  BUNDESLAND_LABELS,
} from "./tenant";

// Employee types
export type {
  Role,
  EmployeeInsert,
  InviteEmployeeInput,
  UpdateEmployeeInput,
} from "./employee";
export {
  FREE_PLAN_EMPLOYEE_LIMIT,
  inviteEmployeeSchema,
  updateEmployeeSchema,
} from "./employee";

// Time entry types
export type {
  TimeEntryStatus,
  TimeEntryWithEmployee,
} from "./time-entry";

// Auth types
export type {
  RegisterInput,
  LoginInput,
  AuthUser,
} from "./auth";
export {
  registerInputSchema,
  loginInputSchema,
} from "./auth";

// Compliance & clock types
export type {
  WarningLevel,
  ComplianceCategory,
  ComplianceWarning,
  ComplianceStatus,
  ClockInInput,
  ClockOutInput,
  StartBreakInput,
  EndBreakInput,
  TodaySummary,
  WeekSummary,
  ClockStatusResponse,
} from "./compliance";
export {
  clockInSchema,
  clockOutSchema,
  startBreakSchema,
  endBreakSchema,
} from "./compliance";

// Correction & edit types
export type {
  EditTimeEntryInput,
  SubmitCorrectionInput,
  ReviewCorrectionInput,
} from "./correction";
export {
  editTimeEntrySchema,
  submitCorrectionSchema,
  reviewCorrectionSchema,
} from "./correction";

// Holiday types
export type {
  HolidayCheckResult,
  WorkingDayInfo,
  WeekTargetHours,
  HolidayQueryInput,
  WeekQueryInput,
} from "./holiday";
export {
  holidayQuerySchema,
  weekQuerySchema,
} from "./holiday";

// Export & DSGVO types
export type {
  ExportQueryInput,
  ExportRow,
  EmployeeFullExport,
  AuditExportRow,
  AccountDeletionInput,
} from "./export";
export {
  exportQuerySchema,
  accountDeletionSchema,
} from "./export";

// Notification types
export type { NotificationType } from "./notification";
export {
  NOTIFICATION_ICON,
  notificationListSchema,
  markReadSchema,
} from "./notification";

// Leave types (Epic 9)
export type {
  LeaveType,
  LeaveRequestStatus,
  SubmitLeaveInput,
  ReviewLeaveInput,
  UpdateEntitlementInput,
  LeaveBalance,
} from "./leave";
export {
  DEFAULT_VACATION_DAYS,
  submitLeaveSchema,
  reviewLeaveSchema,
  updateEntitlementSchema,
} from "./leave";

// Sick types (Epic 10)
export type {
  CreateSickEntryInput,
  UpdateSickEntryInput,
} from "./sick";
export {
  createSickEntrySchema,
  updateSickEntrySchema,
  AU_ALLOWED_TYPES,
  AU_MAX_SIZE_BYTES,
  ENTGELTFORTZAHLUNG_DAYS,
} from "./sick";

// Project types (Epic 11)
export type {
  ProjectWithStats,
  ProjectReportRow,
  ProjectDetailRow,
  CreateProjectInput,
  UpdateProjectInput,
  AssignEmployeesInput,
  ProjectReportQuery,
} from "./project";
export {
  PROJECT_COLORS,
  createProjectSchema,
  updateProjectSchema,
  assignEmployeesSchema,
  projectReportQuerySchema,
} from "./project";

// Time entry extended types
export type {
  TimeEntryWithProject,
} from "./time-entry";

// API types
export type { ApiResponse } from "./api";
export { success, failure } from "./api";
