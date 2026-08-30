import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../lib/http.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { GOAL_TEMPLATES } from "../data/store.js";

export const meRouter = Router();
meRouter.use(requireAuth);
const uid = (req: unknown) => (req as AuthedRequest).userId;

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  dateOfBirth: z.coerce.date().optional(),
  biologicalSex: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  unitPreference: z.enum(["metric", "imperial"]).optional(),
  weekStartsMonday: z.boolean().optional(),
  fitnessGoal: z
    .enum(["build_muscle", "lose_fat", "get_stronger", "general_fitness", "athletic_performance", "maintain"])
    .optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  trainingLocation: z.enum(["gym", "home", "both"]).optional(),
  trainingFrequencyTarget: z.number().int().min(1).max(7).optional(),
  sessionLengthTargetMin: z.number().int().min(10).max(240).optional(),
});

/** Full profile bundle (S1/S2). */
meRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: uid(req) },
      include: {
        trainer: true,
        wallet: true,
        subscription: true,
        notificationPrefs: true,
        injuries: { where: { active: true } },
        equipment: { include: { equipment: true } },
        deviceConnections: true,
      },
    });
    const { passwordHash, appleSub, googleSub, ...safe } = user;
    res.json(safe);
  }),
);

meRouter.patch(
  "/",
  validate({ body: profileSchema }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: uid(req) }, data: req.body });
    const { passwordHash, appleSub, googleSub, ...safe } = user;
    res.json(safe);
  }),
);

// ── Camera & privacy settings (S8) ────────────────────────────────────────
meRouter.get("/settings", asyncHandler(async (req, res) => {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: uid(req) },
    select: { formDataVerbosity: true, saveHighlightClips: true, unitPreference: true, weekStartsMonday: true },
  });
  res.json(u);
}));

meRouter.put(
  "/settings",
  validate({
    body: z.object({
      formDataVerbosity: z.enum(["minimal", "categorical", "detailed"]).optional(),
      saveHighlightClips: z.boolean().optional(),
      unitPreference: z.enum(["metric", "imperial"]).optional(),
      weekStartsMonday: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const u = await prisma.user.update({
      where: { id: uid(req) },
      data: req.body,
      select: { formDataVerbosity: true, saveHighlightClips: true, unitPreference: true, weekStartsMonday: true },
    });
    res.json(u);
  }),
);

// ── GDPR: export + account deletion ──────────────────────────────────────
meRouter.get("/export", asyncHandler(async (req, res) => {
  const userId = uid(req);
  const [user, workouts, sessions, metrics, measurements, chat, goals, prs] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { trainer: true } }),
    prisma.workout.findMany({ where: { userId }, include: { exercises: true } }),
    prisma.workoutSession.findMany({ where: { userId }, include: { performances: { include: { sets: true } } } }),
    prisma.progressMetric.findMany({ where: { userId } }),
    prisma.bodyMeasurement.findMany({ where: { userId } }),
    prisma.chatMessage.findMany({ where: { userId } }),
    prisma.goal.findMany({ where: { userId }, include: { entries: true } }),
    prisma.personalRecord.findMany({ where: { userId } }),
  ]);
  const { passwordHash, ...safeUser } = user;
  res.setHeader("content-disposition", 'attachment; filename="forma-export.json"');
  res.json({ exportedAt: new Date().toISOString(), user: safeUser, workouts, sessions, metrics, measurements, chat, goals, personalRecords: prs });
}));

meRouter.delete(
  "/",
  validate({ body: z.object({ confirm: z.literal(true) }) }),
  asyncHandler(async (req, res) => {
    const userId = uid(req);
    // soft-delete + anonymize, then cascade-hard-delete via a worker/grace window
    await prisma.$transaction([
      prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date() } }),
      prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), email: `deleted+${userId}@forma.invalid`, name: "Deleted user", passwordHash: null, appleSub: null, googleSub: null },
      }),
    ]);
    res.status(204).end();
  }),
);

/** Onboarding — accepts the full profile plus trainer + equipment in one call. */
const onboardingSchema = profileSchema.extend({
  trainer: z
    .object({
      name: z.string().min(1).max(40).optional(),
      avatarId: z.string().optional(),
      voiceId: z.string().optional(),
      motivationLevel: z.number().min(0).max(1).optional(),
      coachingDirectness: z.number().min(0).max(1).optional(),
      formStrictness: z.number().min(0).max(1).optional(),
      speakingFrequency: z.number().min(0).max(1).optional(),
      coachingDetail: z.number().min(0).max(1).optional(),
      humor: z.number().min(0).max(1).optional(),
    })
    .optional(),
  equipmentKeys: z.array(z.string()).optional(),
  injuries: z.array(z.object({ tag: z.string(), note: z.string().optional() })).optional(),
});

meRouter.post(
  "/onboarding",
  validate({ body: onboardingSchema }),
  asyncHandler(async (req, res) => {
    const { trainer, equipmentKeys, injuries, ...profile } = req.body as z.infer<typeof onboardingSchema>;
    const userId = uid(req);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { ...profile, onboardingCompletedAt: new Date() } });

      if (trainer) await tx.trainer.update({ where: { userId }, data: trainer });

      if (equipmentKeys?.length) {
        const equipment = await tx.equipment.findMany({ where: { key: { in: equipmentKeys } } });
        await tx.userEquipment.deleteMany({ where: { userId } });
        await tx.userEquipment.createMany({
          data: equipment.map((e) => ({ userId, equipmentId: e.id })),
          skipDuplicates: true,
        });
      }

      if (injuries?.length) {
        await tx.injuryNote.createMany({ data: injuries.map((i) => ({ ...i, userId })) });
      }

      // seed the standard goal set
      for (const g of GOAL_TEMPLATES) {
        await tx.goal.upsert({
          where: { userId_key: { userId, key: g.key } },
          update: {},
          create: { userId, key: g.key, label: g.label, target: g.target, unit: g.unit, cadence: g.cadence, tone: g.tone },
        });
      }
    });

    res.json({ ok: true });
  }),
);

// ── injuries ────────────────────────────────────────────────────────────────
meRouter.get("/injuries", asyncHandler(async (req, res) => {
  res.json(await prisma.injuryNote.findMany({ where: { userId: uid(req) }, orderBy: { createdAt: "desc" } }));
}));
meRouter.post(
  "/injuries",
  validate({ body: z.object({ tag: z.string().min(1), note: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.injuryNote.create({ data: { ...req.body, userId: uid(req) } }));
  }),
);
meRouter.delete("/injuries/:id", asyncHandler(async (req, res) => {
  await prisma.injuryNote.deleteMany({ where: { id: req.params.id, userId: uid(req) } });
  res.status(204).end();
}));

// ── equipment / device connections ──────────────────────────────────────────
meRouter.get("/equipment", asyncHandler(async (req, res) => {
  const all = await prisma.equipment.findMany({ orderBy: { name: "asc" } });
  const mine = new Set(
    (await prisma.userEquipment.findMany({ where: { userId: uid(req) } })).map((e) => e.equipmentId),
  );
  res.json(all.map((e) => ({ ...e, owned: mine.has(e.id) })));
}));

meRouter.put(
  "/equipment",
  validate({ body: z.object({ equipmentKeys: z.array(z.string()) }) }),
  asyncHandler(async (req, res) => {
    const userId = uid(req);
    const equipment = await prisma.equipment.findMany({ where: { key: { in: req.body.equipmentKeys } } });
    await prisma.$transaction([
      prisma.userEquipment.deleteMany({ where: { userId } }),
      prisma.userEquipment.createMany({
        data: equipment.map((e) => ({ userId, equipmentId: e.id })),
        skipDuplicates: true,
      }),
    ]);
    res.json({ ok: true, count: equipment.length });
  }),
);

meRouter.get("/devices", asyncHandler(async (req, res) => {
  res.json(await prisma.deviceConnection.findMany({ where: { userId: uid(req) } }));
}));
meRouter.put(
  "/devices/:provider",
  validate({ body: z.object({ status: z.enum(["connected", "disconnected"]) }) }),
  asyncHandler(async (req, res) => {
    const userId = uid(req);
    const { provider } = req.params;
    const row = await prisma.deviceConnection.upsert({
      where: { userId_provider: { userId, provider } },
      update: { status: req.body.status, lastSyncAt: req.body.status === "connected" ? new Date() : undefined },
      create: { userId, provider, status: req.body.status, lastSyncAt: new Date() },
    });
    res.json(row);
  }),
);
