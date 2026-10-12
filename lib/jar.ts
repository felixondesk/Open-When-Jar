export const PROMPTS = [
  "Open when you miss me",
  "Open when you’ve had a rough day",
  "Open when you need a laugh",
  "Open when you need encouragement",
  "Open when you cannot sleep",
  "Open on your birthday",
] as const;

export type Theme = "petal" | "blue" | "garden";
export type Availability = "anytime" | "scheduled";

export type Envelope = {
  id: string;
  label: string;
  message: string;
  transcript?: string;
  availability: Availability;
  unlockDate?: string;
  favourite?: boolean;
  opened?: boolean;
  locked?: boolean;
  color?: "petal" | "gold" | "sky";
  photoUrl?: string;
  photoName?: string;
  audioUrl?: string;
  audioDuration?: number;
};

export type DraftJar = {
  recipientName: string;
  creatorName: string;
  recipientEmail: string;
  coverNote: string;
  theme: Theme;
  envelopes: Envelope[];
};

export const SAMPLE_ENVELOPES: Envelope[] = [
  {
    id: "sample-miss",
    label: "Open when you miss me",
    message:
      "Hey Anu,\n\nIf you’re reading this, it probably means you’re missing me — and honestly, I’m probably missing you too. Just a little reminder that you’re always in my heart, no matter the distance.\n\nYou make my world brighter, kinder, and so much more fun. I’m grateful for you, always.\n\nMiss you, always.\nFelix",
    availability: "anytime",
    opened: true,
    color: "petal",
  },
  {
    id: "sample-laugh",
    label: "Open when you need a laugh",
    message:
      "Remember the time we took the wrong train and defended it as a spontaneous adventure? I still think that counts as excellent navigation.\n\nI hope this gives you the small smile I was aiming for.",
    availability: "anytime",
    color: "gold",
  },
  {
    id: "sample-birthday",
    label: "Open on your birthday",
    message: "This one is waiting for the right day.",
    availability: "scheduled",
    unlockDate: "Oct 12",
    locked: true,
    color: "sky",
  },
];

export const INITIAL_DRAFT: DraftJar = {
  recipientName: "",
  creatorName: "",
  recipientEmail: "",
  coverNote: "A few little reminders that I’m always with you.",
  theme: "petal",
  envelopes: [],
};

export function hasEnvelopeContent(message: string, hasImage: boolean, hasAudio: boolean) {
  return message.trim().length > 0 || hasImage || hasAudio;
}

export function isAllowedImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024;
}
