import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdmin,
  verifyCsrf,
  clearSession,
  create,
  update,
  findUnique,
  findUniqueOrThrow,
  redirect,
} = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  verifyCsrf: vi.fn(),
  clearSession: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin,
  verifyCsrf,
  clearSession,
  createSession: vi.fn(),
  credentialsAreValid: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    tour: {
      create,
      update,
      findUnique,
      findUniqueOrThrow,
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/env", () => ({ getEnv: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  checkLoginRateLimit: vi.fn(),
  clearLoginFailures: vi.fn(),
  recordLoginFailure: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

import {
  createTourAction,
  logoutAction,
  togglePublishedAction,
  updateTourAction,
} from "@/app/actions";

describe("admin action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not mutate tours when admin authorization fails", async () => {
    requireAdmin.mockRejectedValue(new Error("unauthorized"));
    await expect(createTourAction({}, new FormData())).rejects.toThrow(
      "unauthorized",
    );
    expect(verifyCsrf).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("requires authorization and CSRF before logout clears the session", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });
    const data = new FormData();
    await logoutAction(data);
    expect(requireAdmin).toHaveBeenCalledBefore(verifyCsrf);
    expect(verifyCsrf).toHaveBeenCalledWith(data);
    expect(clearSession).toHaveBeenCalled();
  });

  it("returns a field error for a duplicate slug", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "6.19.1",
      }),
    );
    const data = new FormData();
    data.set("title", "Tour");
    data.set("slug", "my-tour");
    data.set("kuulaUrl", "https://kuula.co/share/abc");

    await expect(createTourAction({}, data)).resolves.toMatchObject({
      fields: { slug: ["Choose a unique slug."] },
    });
  });

  it("does not write a Kuula URL onto a native tour", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });
    findUnique.mockResolvedValue({
      provider: "venviewer-native",
      kuulaUrl: null,
    });
    const data = new FormData();
    data.set("title", "Tour");
    data.set("slug", "my-tour");
    data.set("kuulaUrl", "https://kuula.co/share/abc");

    await expect(
      updateTourAction("tour_native", {}, data),
    ).resolves.toMatchObject({
      error: "Native tours are not edited through the legacy Kuula form.",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("does not publish a native tour that has no renderable scene", async () => {
    requireAdmin.mockResolvedValue({ email: "admin@example.com" });
    findUniqueOrThrow.mockResolvedValue({
      published: false,
      provider: "venviewer-native",
    });
    findUnique.mockResolvedValue({
      id: "tour_native",
      title: "Lobby",
      slug: "lobby",
      provider: "venviewer-native",
      kuulaUrl: null,
      published: false,
      defaultSceneId: null,
      scenes: [],
      connections: [],
    });

    await togglePublishedAction("tour_native", new FormData());

    expect(update).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "/admin/tours/tour_native?error=native-unpublished",
    );
  });
});
