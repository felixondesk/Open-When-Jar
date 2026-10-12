export type PlanStatus = {
  isOwner: boolean;
  planCode: string;
  seatLimit: number;
  jarsUsed: number;
  jarLimit: number;
  members: { username: string; displayName: string; isOwner: boolean }[];
  invitations: string[];
};

export function parsePlanStatus(value: unknown): PlanStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const plan = value as Record<string, unknown>;
  if (typeof plan.isOwner !== "boolean" || typeof plan.planCode !== "string" ||
      typeof plan.seatLimit !== "number" || typeof plan.jarsUsed !== "number" ||
      typeof plan.jarLimit !== "number" || !Array.isArray(plan.members) ||
      !Array.isArray(plan.invitations)) return null;
  const members = plan.members.filter((member): member is PlanStatus["members"][number] =>
    Boolean(member && typeof member === "object" &&
      typeof member.username === "string" && typeof member.displayName === "string" &&
      typeof member.isOwner === "boolean"));
  const invitations = plan.invitations.filter((email): email is string => typeof email === "string");
  return {
    isOwner: plan.isOwner,
    planCode: plan.planCode,
    seatLimit: plan.seatLimit,
    jarsUsed: plan.jarsUsed,
    jarLimit: plan.jarLimit,
    members,
    invitations,
  };
}
