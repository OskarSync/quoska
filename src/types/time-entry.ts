import type { TimeEntry } from "./database";

export type TimeEntryStatus = TimeEntry["status"];

export interface TimeEntryWithEmployee extends TimeEntry {
  employee_first_name: string;
  employee_last_name: string;
}

export interface TimeEntryWithProject extends TimeEntry {
  project_name: string | null;
  project_color: string | null;
}
