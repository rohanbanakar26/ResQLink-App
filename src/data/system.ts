export interface RoleOption {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "citizen",
    label: "I need help",
    shortLabel: "Citizen",
    description: "Report emergencies, see nearby responders, and track help live.",
  },
  {
    id: "volunteer",
    label: "I want to help",
    shortLabel: "Volunteer",
    description: "Receive nearby tasks, go available instantly, and complete missions fast.",
  },
  {
    id: "ngo",
    label: "I represent an NGO",
    shortLabel: "NGO",
    description: "Coordinate incoming requests, volunteers, and area-level allocation.",
  },
];

export interface CategoryMeta {
  id: string;
  label: string;
  emoji: string;
  summary: string;
}

export const REQUEST_CATEGORIES: CategoryMeta[] = [
  { id: "food", label: "Food", emoji: "🍲", summary: "Food shortage, hunger support, community kitchens" },
  { id: "disaster", label: "Disaster", emoji: "🌪", summary: "Flood, fire, earthquake, collapse, urgent relief" },
  { id: "sanitation", label: "Sanitation", emoji: "🧹", summary: "Waste cleanup, hygiene, public sanitation needs" },
  { id: "others", label: "Others", emoji: "➕", summary: "Any other emergency that needs immediate help" },
];

export const DISASTER_TYPES = [
  "Earthquake",
  "Flood",
  "Fire",
  "Cyclone",
  "Landslide",
  "Building Collapse",
  "Industrial Accident",
  "Other",
];

export const SANITIZATION_TYPES = [
  "Garbage Accumulation",
  "Water Contamination",
  "Sewage Overflow",
  "Public Hygiene Issue",
  "Other",
];

export const VOLUNTEERS_NEEDED_OPTIONS = [
  { id: "1-5", label: "1–5 volunteers" },
  { id: "5-10", label: "5–10 volunteers" },
  { id: "10-50", label: "10–50 volunteers" },
  { id: "50-100", label: "50–100 volunteers" },
  { id: "100+", label: "100+ volunteers" },
];

export const PEOPLE_AFFECTED_OPTIONS = [
  { id: "1-5", label: "1–5 people" },
  { id: "5-20", label: "5–20 people" },
  { id: "20-50", label: "20–50 people" },
  { id: "50-100", label: "50–100 people" },
  { id: "100+", label: "100+ people" },
];

export const FOOD_TYPE_OPTIONS = [
  "Cooked Meals",
  "Raw Groceries",
  "Baby Food",
  "Water / Drinks",
  "Mixed / Any",
];

export const AREA_SIZE_OPTIONS = [
  { id: "small", label: "Small (single street/block)" },
  { id: "medium", label: "Medium (neighborhood)" },
  { id: "large", label: "Large (multiple blocks)" },
  { id: "very-large", label: "Very Large (entire area/district)" },
];

export interface UrgencyOption {
  id: string;
  label: string;
  color: string;
}

export const URGENCY_OPTIONS: UrgencyOption[] = [
  { id: "low", label: "Low", color: "hsl(var(--success))" },
  { id: "medium", label: "Medium", color: "hsl(var(--warning))" },
  { id: "high", label: "High", color: "hsl(var(--accent))" },
  { id: "critical", label: "Critical", color: "hsl(var(--emergency))" },
];

// Request state machine
export const REQUEST_STATUSES = [
  "Created",
  "Matching",
  "Assigned",
  "In Progress",
  "Verification Pending",
  "Completed",
  "Cancelled",
  "Failed",
];

export const STATUS_COPY: Record<string, string> = {
  Created: "Request created",
  Matching: "Finding help…",
  Assigned: "Volunteer assigned",
  "In Progress": "Help on the way",
  "Verification Pending": "Awaiting approval",
  "Completed": "Resolved ✓",
  Cancelled: "Cancelled",
  Failed: "Could not fulfill",
  // Legacy statuses
  Requested: "Request received",
  "Pending sync": "Waiting for network",
  Accepted: "NGO accepted",
  "Volunteer assigned": "Volunteer matched",
  "In progress": "Help on the way",
};

export const STATUS_COLORS: Record<string, string> = {
  Created: "bg-info/15 text-info border-info/30",
  Matching: "bg-warning/15 text-warning border-warning/30",
  Assigned: "bg-accent/15 text-accent border-accent/30",
  "In Progress": "bg-info/15 text-info border-info/30",
  "Verification Pending": "bg-warning/15 text-warning border-warning/30",
  "Completed": "bg-success/15 text-success border-success/30",
  Cancelled: "bg-muted text-muted-foreground border-border",
  Failed: "bg-emergency/15 text-emergency border-emergency/30",
};

export const NGO_SERVICE_CATEGORIES = [
  { id: "food", label: "Food & Nutrition", emoji: "🍲" },
  { id: "disaster", label: "Disaster Relief", emoji: "🌪" },
  { id: "medical", label: "Medical Aid", emoji: "🏥" },
  { id: "shelter", label: "Shelter & Housing", emoji: "🏠" },
  { id: "sanitation", label: "Sanitation & Hygiene", emoji: "🧹" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "senior", label: "Senior Care", emoji: "👴" },
  { id: "logistics", label: "Logistics & Transport", emoji: "🚛" },
];

export function getCategoryMeta(category: string): CategoryMeta {
  return REQUEST_CATEGORIES.find((c) => c.id === category) ?? REQUEST_CATEGORIES[3]; // default to Others
}
