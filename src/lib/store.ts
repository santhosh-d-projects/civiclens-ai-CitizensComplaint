// Ticket store — localStorage-backed so the dashboard survives reloads
// during the demo. Seed data is realistic Bengaluru complaints so the
// dashboard is meaningful from the first load.
import type { Category, Severity, Status } from "./triage";

export interface Ticket {
  id: string;
  text: string;
  location: string;
  reporter: string;
  category: Category;
  severity: Severity;
  reason: string;
  department: string;
  signals: string[];
  language: string;
  photo: string | null; // data URL, small images only
  status: Status;
  createdAt: string; // ISO
}

const STORAGE_KEY = "civiclens-tickets-v1";

let counter = 1000;
export function nextTicketId(): string {
  counter += 1;
  return `CL-${counter}`;
}

function daysAgo(n: number, hours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

export const SEED_TICKETS: Ticket[] = [
  {
    id: "CL-1042",
    text: "Huge pothole on Outer Ring Road near Marathahalli bridge, almost caused an accident yesterday. It has been there for 3 weeks.",
    location: "Outer Ring Road, Marathahalli",
    reporter: "Anitha R.",
    category: "roads",
    severity: "Critical",
    reason: "Immediate safety risk: accident risk, reported for days — needs same-day action.",
    department: "BBMP — Roads & Infrastructure",
    signals: ["accident risk", "pending for weeks"],
    language: "English",
    photo: null,
    status: "Open",
    createdAt: daysAgo(0, 2),
  },
  {
    id: "CL-1038",
    text: "Streetlight sparking near the school gate on 100 Feet Road, Indiranagar. Children walk past it every morning.",
    location: "100 Feet Road, Indiranagar",
    reporter: "Mohammed F.",
    category: "electricity",
    severity: "Critical",
    reason: "Immediate safety risk: sparking wire, near a school — needs same-day action.",
    department: "BESCOM — Street Lighting & Power",
    signals: ["sparking wire", "near a school"],
    language: "English",
    photo: null,
    status: "In Progress",
    createdAt: daysAgo(0, 5),
  },
  {
    id: "CL-1035",
    text: "Garbage not collected for 5 days in our lane, bins overflowing and stray dogs spreading it everywhere. Bad smell reaching homes.",
    location: "5th Cross, Koramangala 4th Block",
    reporter: "Lakshmi V.",
    category: "waste",
    severity: "High",
    reason: "Bad smell, pending for a week affecting daily movement — prioritise this week.",
    department: "BBMP — Solid Waste Management",
    signals: ["bad smell", "pending for a week"],
    language: "English",
    photo: null,
    status: "Open",
    createdAt: daysAgo(1, 3),
  },
  {
    id: "CL-1031",
    text: "Water pipe burst near the park, drinking water flooding the road for two days. No water supply in our flats since yesterday.",
    location: "HSR Layout Sector 2",
    reporter: "Suresh K.",
    category: "water",
    severity: "High",
    reason: "Burst pipe, no water supply affecting daily movement — prioritise this week.",
    department: "BWSSB — Water Supply",
    signals: ["burst pipe", "no water supply"],
    language: "English",
    photo: null,
    status: "In Progress",
    createdAt: daysAgo(1, 8),
  },
  {
    id: "CL-1027",
    text: "ಮರ ಬಿದ್ದು ರಸ್ತೆ ಬ್ಲಾಕ್ ಆಗಿದೆ, ವಾಹನಗಳು ಹೋಗಲು ಆಗುತ್ತಿಲ್ಲ. Fallen tree blocking the road near the bus stop.",
    location: "Malleshwaram 8th Cross",
    reporter: "Divya N.",
    category: "trees",
    severity: "Critical",
    reason: "Immediate safety risk: fallen tree, blocking the road — needs same-day action.",
    department: "BBMP — Forest & Horticulture",
    signals: ["fallen tree", "blocking the road"],
    language: "Mixed",
    photo: null,
    status: "Open",
    createdAt: daysAgo(0, 9),
  },
  {
    id: "CL-1022",
    text: "Drain blocked and sewage water overflowing onto the footpath near the market. Mosquitoes everywhere.",
    location: "Jayanagar 4th Block Market",
    reporter: "Ravi T.",
    category: "drainage",
    severity: "High",
    reason: "Sewage overflow, mosquito breeding risk affecting daily movement — prioritise this week.",
    department: "BWSSB — Underground Drainage",
    signals: ["sewage overflow", "mosquito breeding risk"],
    language: "English",
    photo: null,
    status: "Open",
    createdAt: daysAgo(2, 1),
  },
  {
    id: "CL-1018",
    text: "Streetlight not working on the lane behind the hospital for a week, the whole stretch is dark at night.",
    location: "Behind St. John's Hospital, Koramangala",
    reporter: "Priya S.",
    category: "electricity",
    severity: "Medium",
    reason: "Near a hospital — schedule a routine fix.",
    department: "BESCOM — Street Lighting & Power",
    signals: ["near a hospital"],
    language: "English",
    photo: null,
    status: "Resolved",
    createdAt: daysAgo(3, 4),
  },
  {
    id: "CL-1011",
    text: "Small pothole forming near the speed breaker, not big yet but growing after the rain.",
    location: "Whitefield Main Road",
    reporter: "Arjun M.",
    category: "roads",
    severity: "Low",
    reason: "Minor roads issue — add to the routine maintenance queue.",
    department: "BBMP — Roads & Infrastructure",
    signals: [],
    language: "English",
    photo: null,
    status: "Open",
    createdAt: daysAgo(4, 6),
  },
];

export function loadTickets(): Ticket[] {
  if (typeof window === "undefined") return SEED_TICKETS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TICKETS));
      return SEED_TICKETS;
    }
    const parsed = JSON.parse(raw) as Ticket[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_TICKETS;
  } catch {
    return SEED_TICKETS;
  }
}

export function saveTickets(tickets: Ticket[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    // localStorage full (large photos) — keep in-memory only this session
  }
}
