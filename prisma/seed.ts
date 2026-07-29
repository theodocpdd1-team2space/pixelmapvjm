import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createDefaultProjectJson, toPrismaJson, type ProjectPageJson } from "../src/types/project";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

const defaultProjectJson: ProjectPageJson = {
  app: "PixelMapVJM",
  format: "pixelmapvjm-project",
  schemaVersion: 1,
  version: 1,
  page: {
    name: "Main Stage",
    canvas: {
      width: 3840,
      height: 2160,
      fps: 30,
      duration: 10,
      backgroundColor: "#000000",
      backgroundTransparent: false,
      gridSize: 64,
      snappingEnabled: true,
      gridVisible: true
    },
    screens: [],
    animationSettings: {
      pattern: "none",
      speed: 1,
      loop: true
    }
  }
};

async function main() {
  const passwordHash = await bcrypt.hash("devpassword123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@pixelmapvjm.local" },
    update: {
      name: "PixelMapVJM Admin",
      passwordHash,
      role: "ADMIN",
      accessStatus: "ACTIVE"
    },
    create: {
      name: "PixelMapVJM Admin",
      email: "admin@pixelmapvjm.local",
      passwordHash,
      role: "ADMIN",
      accessStatus: "ACTIVE",
      licenses: {
        create: {
          licenseKey: "PMVJM-LIFETIME-DEV-0001",
          type: "LIFETIME",
          status: "ACTIVE",
          maxDevices: 3
        }
      },
      devices: {
        create: {
          deviceHash: "dev-device-theos-macbook-pro",
          deviceName: "THEOS-MACBOOK-PRO"
        }
      }
    },
    include: { projects: true }
  });

  await prisma.user.upsert({
    where: { email: "invited@pixelmapvjm.local" },
    update: { name: "Invited Customer", passwordHash: null, role: "USER", accessStatus: "INVITED" },
    create: { name: "Invited Customer", email: "invited@pixelmapvjm.local", role: "USER", accessStatus: "INVITED" }
  });

  const activeDemo = await prisma.user.upsert({
    where: { email: "operator@pixelmapvjm.local" },
    update: { name: "Active Operator", passwordHash: await bcrypt.hash("operator123", 12), role: "USER", accessStatus: "ACTIVE" },
    create: { name: "Active Operator", email: "operator@pixelmapvjm.local", passwordHash: await bcrypt.hash("operator123", 12), role: "USER", accessStatus: "ACTIVE" },
    include: { projects: true }
  });
  if (activeDemo.projects.length === 0) {
    await prisma.project.create({ data: { userId: activeDemo.id, name: "Operator Demo Mapping", pages: { create: { name: "Main Stage", width: 1920, height: 1080, fps: 60, duration: 10, sortOrder: 0, projectJson: toPrismaJson(createDefaultProjectJson("Main Stage")) } } } });
  }

  if (user.projects.length === 0) {
    await prisma.project.create({
      data: {
        userId: user.id,
        name: "Concert Mapping 2026",
        pages: {
          create: [
            {
              name: "Main Stage",
              width: 3840,
              height: 2160,
              fps: 30,
              duration: 10,
              sortOrder: 0,
              projectJson: toPrismaJson(defaultProjectJson)
            },
            {
              name: "Technical Layout",
              width: 1920,
              height: 1080,
              fps: 30,
              duration: 10,
              sortOrder: 1,
              projectJson: toPrismaJson({
                ...defaultProjectJson,
                page: {
                  ...defaultProjectJson.page,
                  name: "Technical Layout",
                  canvas: {
                    ...defaultProjectJson.page.canvas,
                    width: 1920,
                    height: 1080
                  }
                }
              })
            }
          ]
        }
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
