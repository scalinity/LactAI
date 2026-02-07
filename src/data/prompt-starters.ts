export interface PromptStarter {
  id: string;
  category: PromptCategory;
  shortLabel: string;
  fullPrompt: string;
  icon: string;
}

export type PromptCategory =
  | "baby-care"
  | "feeding"
  | "quick-help"
  | "self-care"
  | "my-data"
  | "visuals";

export const CATEGORY_META: Record<PromptCategory, { icon: string }> = {
  "my-data": { icon: "\u{1F4CA}" },
  visuals: { icon: "\u{1F3A8}" },
  "baby-care": { icon: "\u{1F476}" },
  feeding: { icon: "\u{1F37C}" },
  "quick-help": { icon: "\u{1F4A1}" },
  "self-care": { icon: "\u{1F49C}" },
};

export const PROMPT_STARTERS: PromptStarter[] = [
  // My Data
  {
    id: "md-today",
    category: "my-data",
    shortLabel: "Today's summary",
    fullPrompt:
      "How much have I pumped and fed today compared to my recent average?",
    icon: "\u{1F4C5}",
  },
  {
    id: "md-trend",
    category: "my-data",
    shortLabel: "Supply trend",
    fullPrompt:
      "Based on my data, is my milk supply trending up, down, or stable?",
    icon: "\u{1F4C8}",
  },
  {
    id: "md-pattern",
    category: "my-data",
    shortLabel: "Best time to pump",
    fullPrompt:
      "Looking at my session data, what time of day do I tend to express the most milk?",
    icon: "\u{23F0}",
  },
  {
    id: "md-week",
    category: "my-data",
    shortLabel: "Weekly review",
    fullPrompt:
      "Give me a summary of my pumping and feeding week. How did I do?",
    icon: "\u{1F4CB}",
  },

  // Visuals
  {
    id: "vis-weekly",
    category: "visuals",
    shortLabel: "Weekly infographic",
    fullPrompt:
      "Create a visual infographic of my pumping and feeding data from this week",
    icon: "\u{1F4CA}",
  },
  {
    id: "vis-today",
    category: "visuals",
    shortLabel: "Today's visual",
    fullPrompt: "Generate a visual summary of today's sessions",
    icon: "\u{1F305}",
  },
  {
    id: "vis-sides",
    category: "visuals",
    shortLabel: "Left vs right",
    fullPrompt:
      "Create a visual comparing my left vs right side pumping output",
    icon: "\u{2696}\u{FE0F}",
  },
  {
    id: "vis-trend",
    category: "visuals",
    shortLabel: "Supply trend visual",
    fullPrompt:
      "Make an infographic showing my milk supply trend over the past month",
    icon: "\u{1F4C8}",
  },

  // Baby Care
  {
    id: "bc-sleep",
    category: "baby-care",
    shortLabel: "Sleep help",
    fullPrompt:
      "My baby is [age] and won't sleep longer than 2 hours at night. What can I try?",
    icon: "\u{1F634}",
  },
  {
    id: "bc-solids",
    category: "baby-care",
    shortLabel: "Starting solids",
    fullPrompt: "What are the signs my baby is ready for solid foods?",
    icon: "\u{1F34C}",
  },
  {
    id: "bc-normal",
    category: "baby-care",
    shortLabel: "Is this normal?",
    fullPrompt: "Is it normal for a [age] baby to [behavior]?",
    icon: "\u{1F914}",
  },
  {
    id: "bc-checkup",
    category: "baby-care",
    shortLabel: "4-month checkup",
    fullPrompt: "What questions should I ask at my baby's 4-month checkup?",
    icon: "\u{1FA7A}",
  },
  {
    id: "bc-milestone",
    category: "baby-care",
    shortLabel: "Baby milestone",
    fullPrompt: "My baby did [thing]. Is this a milestone I should record?",
    icon: "\u{2B50}",
  },

  // Pumping & Feeding
  {
    id: "pf-schedule",
    category: "feeding",
    shortLabel: "Pump schedule",
    fullPrompt:
      "Help me create a pumping schedule around my work hours: [hours]",
    icon: "\u{23F0}",
  },
  {
    id: "pf-supply",
    category: "feeding",
    shortLabel: "Milk supply",
    fullPrompt: "How do I increase my milk supply naturally?",
    icon: "\u{1F31F}",
  },
  {
    id: "pf-storage",
    category: "feeding",
    shortLabel: "Milk storage",
    fullPrompt: "How long can breast milk stay in the fridge/freezer?",
    icon: "\u{2744}\u{FE0F}",
  },

  // Quick Help
  {
    id: "qh-explain",
    category: "quick-help",
    shortLabel: "Explain a term",
    fullPrompt: "Explain [term] in simple terms",
    icon: "\u{1F4D6}",
  },
  {
    id: "qh-thankyou",
    category: "quick-help",
    shortLabel: "Thank you note",
    fullPrompt: "Write a short thank you note for a baby gift from [name]",
    icon: "\u{1F48C}",
  },
  {
    id: "qh-recipe",
    category: "quick-help",
    shortLabel: "Baby food recipe",
    fullPrompt:
      "Give me a simple recipe for homemade baby food with [ingredient]",
    icon: "\u{1F373}",
  },
  {
    id: "qh-boss",
    category: "quick-help",
    shortLabel: "Return to work",
    fullPrompt:
      "Help me write a message to my boss about my return-to-work schedule",
    icon: "\u{1F4BC}",
  },
  {
    id: "qh-quickmeal",
    category: "quick-help",
    shortLabel: "Quick meal",
    fullPrompt:
      "I have chicken, rice, and 20 minutes. What can I make one-handed?",
    icon: "\u{1F356}",
  },

  // Self Care
  {
    id: "sc-overwhelmed",
    category: "self-care",
    shortLabel: "Feeling overwhelmed",
    fullPrompt:
      "I'm feeling overwhelmed as a new mom. Can you help me process this?",
    icon: "\u{1F49B}",
  },
  {
    id: "sc-relax",
    category: "self-care",
    shortLabel: "Quick relaxation",
    fullPrompt:
      "Give me a 5-minute relaxation exercise I can do while the baby naps",
    icon: "\u{1F9D8}",
  },
];

/** Return a shuffled subset of prompts, one per category when possible. */
export function getRandomStarters(
  count: number,
  excludeIds: string[] = [],
): PromptStarter[] {
  const available = PROMPT_STARTERS.filter((p) => !excludeIds.includes(p.id));

  // Pick one from each category first for variety
  const categories = Object.keys(CATEGORY_META) as PromptCategory[];
  const picked: PromptStarter[] = [];
  const used = new Set<string>();

  for (const cat of categories) {
    const catItems = available.filter(
      (p) => p.category === cat && !used.has(p.id),
    );
    if (catItems.length > 0) {
      const item = catItems[Math.floor(Math.random() * catItems.length)];
      picked.push(item);
      used.add(item.id);
    }
  }

  // Fill remaining slots randomly
  const remaining = available.filter((p) => !used.has(p.id));
  shuffle(remaining);
  for (const item of remaining) {
    if (picked.length >= count) break;
    picked.push(item);
  }

  // Shuffle the final list so categories aren't always in order
  shuffle(picked);
  return picked.slice(0, count);
}

/** Fisher-Yates shuffle (in-place, unbiased). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
