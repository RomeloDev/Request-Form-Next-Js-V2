import type { UserProfile } from "@/lib/profile";

function displayValue(
  value: string | null | undefined,
  fallback: string,
): string {
  const trimmed = value?.trim();

  return trimmed ? trimmed : fallback;
}

function roleLabel(role: string): string {
  const trimmed = role.trim();

  if (!trimmed) return "Not assigned";

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

/**
 * Read-only identity summary. The current Laravel contract does not allow
 * changing these fields, so this section intentionally has no inputs.
 */
export default function ProfileIdentityOverview({
  profile,
}: {
  profile: UserProfile;
}) {
  const fallbackName =
    `${profile.firstName} ${profile.lastName}`.trim() || "Not provided";
  const position = profile.position_label?.trim() || profile.position;
  const branchName = profile.branch_name?.trim() || profile.branch;

  const fields = [
    { label: "Full name", value: displayValue(profile.name, fallbackName) },
    {
      label: "First name",
      value: displayValue(profile.firstName, "Not provided"),
    },
    {
      label: "Last name",
      value: displayValue(profile.lastName, "Not provided"),
    },
    {
      label: "Employee ID",
      value: displayValue(profile.employee_id, "Not provided"),
    },
    { label: "Email", value: displayValue(profile.email, "Not provided") },
    {
      label: "Contact number",
      value: displayValue(profile.contact, "Not provided"),
    },
    {
      label: "Username",
      value: displayValue(profile.userName, "Not provided"),
    },
    { label: "Role", value: roleLabel(profile.role) },
    {
      label: "Position",
      value: displayValue(position, "Not assigned"),
    },
    {
      label: "Branch code",
      value: displayValue(profile.branch_code, "Not assigned"),
    },
    {
      label: "Branch name",
      value: displayValue(branchName, "Not assigned"),
    },
  ];

  return (
    <section
      aria-labelledby="profile-identity-title"
      className="rounded-2xl border border-line/60 bg-white p-5 shadow-sm sm:p-6"
    >
      <div>
        <h2
          id="profile-identity-title"
          className="text-xl font-semibold text-ink"
        >
          Identity details
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
          These details come from the authenticated Laravel profile and are
          read-only. Ask an administrator if something needs to be corrected.
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => (
          <div
            key={field.label}
            className="min-w-0 rounded-xl border border-line/60 bg-slate-50/50 px-4 py-3"
          >
            <dt className="text-sm leading-6 font-medium text-muted">
              {field.label}
            </dt>
            <dd className="mt-1 text-base leading-7 font-medium wrap-anywhere text-ink">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
