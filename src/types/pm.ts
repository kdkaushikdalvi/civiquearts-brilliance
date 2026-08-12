export interface Assignment {
  id: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  siteId?: string;
  siteName: string;
  assigneeId: string;
  assigneeName: string;
  month: number; // 0-11
  year: number;
  status: "In Progress" | "Completed";
  unitType?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
}

export interface Site {
  id: string;
  projectId: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  mobile?: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  assigneeId: string;
  assigneeName: string;
  month: number;
  year: number;
  generatedDate: string;
  generatedBy: string;
  total: number;
}
