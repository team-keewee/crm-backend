/**
 * Full API smoke test using an in-memory MongoDB. No external `mongod` required.
 * Run: npm run test:api
 */
import { describe, it, beforeAll, afterAll, expect, vi } from "vitest";
import type { Express } from "express";
import request from "supertest";
import mongoose from "mongoose";

let app: Express;
let connectDB: () => Promise<void>;
let disconnectDB: () => Promise<void>;
let User: typeof import("./models/User.js").User;
let hashPassword: (p: string) => Promise<string>;
let createApp: () => Express;

let mongod: import("mongodb-memory-server").MongoMemoryServer;
let adminToken: string;
let stdToken: string;
let accountId: string;
let contactId: string;
let dealId: string;
let engagementId: string;
let projectId: string;
let taskId: string;
let deliverableId: string;
let activityId: string;
let catalogId: string;
let stdUserId: string;

describe("CRM API (integration)", { timeout: 120_000 }, () => {
  beforeAll(async () => {
    const { MongoMemoryServer: MemSrv } = await import("mongodb-memory-server");
    mongod = await MemSrv.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = "dev-test-jwt-secret-min-32-chars-ok!";
    process.env.NODE_ENV = "test";
    vi.resetModules();

    const appMod = await import("./app.js");
    const dbMod = await import("./db/connection.js");
    const uMod = await import("./models/User.js");
    const aMod = await import("./services/authService.js");
    createApp = appMod.createApp;
    connectDB = dbMod.connectDB;
    disconnectDB = dbMod.disconnectDB;
    User = uMod.User;
    hashPassword = aMod.hashPassword;
    app = createApp();
    await connectDB();

    const database = mongoose.connection.db;
    if (database) await database.dropDatabase();

    const hash = await hashPassword("TestPassw0rd!Admin");
    await User.create({
      email: "admin@integration.test",
      passwordHash: hash,
      name: "Admin",
      role: "admin",
    });
    const h2 = await hashPassword("TestPassw0rd!Std");
    const std = await User.create({
      email: "user@integration.test",
      passwordHash: h2,
      name: "Standard",
      role: "standard",
    });
    stdUserId = std._id.toString();

    const ad = await request(app).post("/api/v1/auth/login").send({
      email: "admin@integration.test",
      password: "TestPassw0rd!Admin",
    });
    expect(ad.status).toBe(200);
    expect(ad.body.accessToken).toBeDefined();
    adminToken = ad.body.accessToken;

    const st = await request(app).post("/api/v1/auth/login").send({
      email: "user@integration.test",
      password: "TestPassw0rd!Std",
    });
    expect(st.status).toBe(200);
    stdToken = st.body.accessToken;
  });

  afterAll(async () => {
    await disconnectDB();
    await mongod.stop();
  });

  it("GET /health", async () => {
    const r = await request(app).get("/health");
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("ok");
  });

  it("GET /ready", async () => {
    const r = await request(app).get("/ready");
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("ready");
  });

  it("rejects /api/v1/accounts without auth", async () => {
    const r = await request(app).get("/api/v1/accounts");
    expect(r.status).toBe(401);
  });

  it("GET /api/v1/auth/me", async () => {
    const r = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.user.email).toBe("admin@integration.test");
  });

  it("GET /api/v1/users", async () => {
    const r = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBeGreaterThan(0);
  });

  it("POST /api/v1/accounts (create)", async () => {
    const r = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        legalName: "Acme Co",
        displayName: "Acme",
        status: "active",
      });
    expect(r.status).toBe(201);
    accountId = r.body.data.id;
  });

  it("GET /api/v1/accounts and PATCH", async () => {
    const r = await request(app)
      .get("/api/v1/accounts")
      .set("Authorization", `Bearer ${stdToken}`);
    expect(r.status).toBe(200);
    expect(r.body.data.some((x: { id: string }) => x.id === accountId)).toBe(true);

    const p = await request(app)
      .patch(`/api/v1/accounts/${accountId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ healthTags: ["good"] });
    expect(p.status).toBe(200);
  });

  it("POST /api/v1/contacts", async () => {
    const r = await request(app)
      .post("/api/v1/contacts")
      .set("Authorization", `Bearer ${stdToken}`)
      .send({
        accountId,
        name: "Jane",
        email: "jane@acme.com",
        isPrimary: true,
      });
    expect(r.status).toBe(201);
    contactId = r.body.data.id;
  });

  it("POST /api/v1/deals", async () => {
    const r = await request(app)
      .post("/api/v1/deals")
      .set("Authorization", `Bearer ${stdToken}`)
      .send({
        accountId,
        name: "Q1",
        stage: "proposal",
        expectedValue: 10000,
        leadSource: "inbound",
      });
    expect(r.status).toBe(201);
    dealId = r.body.data.id;
  });

  it("POST /api/v1/engagements", async () => {
    const r = await request(app)
      .post("/api/v1/engagements")
      .set("Authorization", `Bearer ${stdToken}`)
      .send({
        accountId,
        model: "retainer",
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        value: 5000,
      });
    expect(r.status).toBe(201);
    engagementId = r.body.data.id;
  });

  it("POST /api/v1/service-catalog (admin) and GET (standard OK)", async () => {
    const c = await request(app)
      .post("/api/v1/service-catalog")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Audit", slug: "audit", active: true });
    expect(c.status).toBe(201);
    catalogId = c.body.data.id;

    const fail = await request(app)
      .post("/api/v1/service-catalog")
      .set("Authorization", `Bearer ${stdToken}`)
      .send({ name: "X", slug: "x" });
    expect(fail.status).toBe(403);

    const g = await request(app)
      .get("/api/v1/service-catalog")
      .set("Authorization", `Bearer ${stdToken}`);
    expect(g.status).toBe(200);
  });

  it("POST /api/v1/projects with service catalog", async () => {
    const r = await request(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${stdToken}`)
      .send({
        accountId,
        engagementId,
        name: "Site build",
        type: "web",
        status: "active",
        serviceCatalogItemId: catalogId,
        memberIds: [stdUserId],
      });
    expect(r.status).toBe(201);
    projectId = r.body.data.id;
  });

  it("POST /api/v1/tasks and PATCH deal with catalog", async () => {
    const t = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${stdToken}`)
      .send({
        projectId,
        title: "Kickoff",
        status: "in_progress",
        assigneeId: stdUserId,
      });
    expect(t.status).toBe(201);
    taskId = t.body.data.id;

    const d = await request(app)
      .patch(`/api/v1/deals/${dealId}`)
      .set("Authorization", `Bearer ${stdToken}`)
      .send({ serviceCatalogItemId: catalogId, stage: "negotiation" });
    expect(d.status).toBe(200);
  });

  it("POST /api/v1/deliverables", async () => {
    const r = await request(app)
      .post("/api/v1/deliverables")
      .set("Authorization", `Bearer ${stdToken}`)
      .send({
        projectId,
        taskId,
        title: "Sitemap",
        approvalStatus: "in_review",
      });
    expect(r.status).toBe(201);
    deliverableId = r.body.data.id;
  });

  it("POST /api/v1/activities", async () => {
    const r = await request(app)
      .post("/api/v1/activities")
      .set("Authorization", `Bearer ${stdToken}`)
      .send({
        type: "call",
        subject: "Weekly",
        accountId,
        projectId,
      });
    expect(r.status).toBe(201);
    activityId = r.body.data.id;
  });

  it("GET /api/v1/dashboard/summary", async () => {
    const r = await request(app)
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${stdToken}`);
    expect(r.status).toBe(200);
    expect(r.body.data.dealPipeline).toBeDefined();
    expect(r.body.data.openTasksByAssignee).toBeDefined();
  });

  it("GET /api/v1/export CSVs", async () => {
    const a = await request(app)
      .get("/api/v1/export/accounts.csv")
      .set("Authorization", `Bearer ${stdToken}`);
    expect(a.status).toBe(200);
    expect(a.headers["content-type"]).toMatch(/csv/);
    expect(a.text).toContain("Acme Co");

    const d = await request(app)
      .get("/api/v1/export/deals.csv")
      .set("Authorization", `Bearer ${stdToken}`);
    expect(d.status).toBe(200);
    expect(d.text).toContain("Q1");
  });

  it("GET /api/v1/audit-logs (admin) and 403 (standard)", async () => {
    const ok = await request(app)
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(ok.status).toBe(200);
    expect(Array.isArray(ok.body.data)).toBe(true);
    const denied = await request(app)
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${stdToken}`);
    expect(denied.status).toBe(403);
  });

  it("admin-only DELETE account is forbidden when children exist", async () => {
    const r = await request(app)
      .delete(`/api/v1/accounts/${accountId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(r.status).toBe(400);
  });

  it("teardown: delete in safe order, then account", async () => {
    await request(app)
      .delete(`/api/v1/activities/${activityId}`)
      .set("Authorization", `Bearer ${stdToken}`);

    await request(app)
      .delete(`/api/v1/deliverables/${deliverableId}`)
      .set("Authorization", `Bearer ${stdToken}`);

    await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set("Authorization", `Bearer ${stdToken}`);

    await request(app)
      .delete(`/api/v1/projects/${projectId}`)
      .set("Authorization", `Bearer ${stdToken}`);

    await request(app)
      .delete(`/api/v1/deals/${dealId}`)
      .set("Authorization", `Bearer ${stdToken}`);

    await request(app)
      .delete(`/api/v1/engagements/${engagementId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    await request(app)
      .delete(`/api/v1/contacts/${contactId}`)
      .set("Authorization", `Bearer ${stdToken}`);

    const del = await request(app)
      .delete(`/api/v1/accounts/${accountId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(del.status).toBe(204);

    await request(app)
      .delete(`/api/v1/service-catalog/${catalogId}`)
      .set("Authorization", `Bearer ${adminToken}`);
  });
});
