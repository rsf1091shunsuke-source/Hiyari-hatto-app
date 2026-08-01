export interface StudentMaster {
  id: string;
  attendanceNumber: number;
  groupName: string;
}

export interface TaskMaster {
  id: string;
  name: string;
  order: number;
}

export interface RiskItemMaster {
  id: string;
  name: string;
  relatedTaskIds: string[];
  order: number;
  isSystemItem: boolean;
}

export type InputStep =
  | "attendance"
  | "task"
  | "riskItem"
  | "confirm"
  | "complete";
