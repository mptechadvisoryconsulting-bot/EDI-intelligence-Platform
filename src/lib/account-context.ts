import { db } from "@/lib/db";
import { requireSession, type SessionUser } from "@/lib/auth";
import { buildDefaultStorefrontContent } from "@/lib/business/storefront-defaults";

export type AccountContext = {
  accountId: string;
  accountName: string;
  accountSlug: string;
  membershipRole: string;
  user: SessionUser;
};

/**
 * Produce a deterministic account slug for the legacy one-user-per-workspace model.
 * The complete user id is included so two distinct users cannot collide merely because
 * their usernames normalize alike and their ids happen to share a short suffix.
 */
export function accountSlugForUser(user: Pick<SessionUser, "id" | "username">) {
  const base = user.username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "business";
  const stableUserId = user.id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return `${base}-${stableUserId}`;
}

/**
 * Resolve a user's primary active account. Existing users are lazily provisioned
 * with one unpublished governed storefront so migration does not alter public behavior.
 */
export async function getOrCreatePrimaryAccountForUser(user: SessionUser): Promise<AccountContext> {
  const existing = await db.accountMembership.findFirst({
    where: { userId: user.id, status: "active", account: { status: "active" } },
    orderBy: { createdAt: "asc" },
    include: { account: true },
  });

  if (existing) {
    return {
      accountId: existing.accountId,
      accountName: existing.account.name,
      accountSlug: existing.account.slug,
      membershipRole: existing.role,
      user,
    };
  }

  const slug = accountSlugForUser(user);
  const storefront = buildDefaultStorefrontContent();

  const account = await db.account.upsert({
    where: { slug },
    update: {},
    create: {
      name: user.name?.trim() || user.username,
      slug,
      storefront: {
        create: {
          status: "draft",
          themeContent: storefront.themeContent,
          sectionContent: storefront.sectionContent,
        },
      },
    },
  });

  const membership = await db.accountMembership.upsert({
    where: { accountId_userId: { accountId: account.id, userId: user.id } },
    update: { status: "active" },
    create: { accountId: account.id, userId: user.id, role: "owner", status: "active" },
  });

  return {
    accountId: account.id,
    accountName: account.name,
    accountSlug: account.slug,
    membershipRole: membership.role,
    user,
  };
}

/** Resolve the authenticated user's tenant account for account-scoped operations. */
export async function requireAccountContext(): Promise<AccountContext> {
  const user = await requireSession();
  return getOrCreatePrimaryAccountForUser(user);
}

/** Reject cross-account or inactive-account access before tenant-owned operations. */
export async function assertAccountAccess(accountId: string, userId: string) {
  const membership = await db.accountMembership.findFirst({
    where: {
      accountId,
      userId,
      status: "active",
      account: { status: "active" },
    },
    select: { status: true, role: true },
  });

  if (!membership) {
    throw new Error("Forbidden");
  }

  return membership;
}
