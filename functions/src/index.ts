import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

export const setAdminRole = onCall(async (request) => {
  const callerEmail = request.auth?.token?.email;
  const allowed = ["altanivelgroup@gmail.com"]; // add any additional owner emails

  if (!callerEmail || !allowed.includes(callerEmail)) {
    throw new HttpsError("permission-denied", "Only the owner can assign admin.");
  }

  const { uid, email } = (request.data || {}) as { uid?: string; email?: string };
  if (!uid && !email) {
    throw new HttpsError("invalid-argument", "Provide { uid } or { email }.");
  }

  const targetUid = uid ?? (await admin.auth().getUserByEmail(email!)).uid;
  await admin.auth().setCustomUserClaims(targetUid, { admin: true, role: "admin" });
  return { ok: true, uid: targetUid };
});

// Report Analytics HTTP Functions
async function requireAdmin(req: any, res: any) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "No token" });
    return null;
  }
  const decoded = await admin.auth().verifyIdToken(token).catch(() => null);
  if (!decoded || !(decoded.admin || decoded.role === "admin")) {
    res.status(403).json({ error: "Not admin" });
    return null;
  }
  return decoded;
}

export const reportAnalyticsGraph = onRequest({ cors: true }, async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  
  // Mock data for now - replace with real analytics data
  res.json({
    series: [
      {
        name: "Loads Posted",
        data: [12, 19, 3, 5, 2, 3, 8, 15, 22, 18, 25, 30]
      },
      {
        name: "Loads Completed",
        data: [8, 15, 2, 4, 1, 2, 6, 12, 18, 15, 20, 25]
      }
    ],
    range: "7d",
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"]
  });
});

export const reportAnalyticsBottomRow = onRequest({ cors: true }, async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  
  // Mock data for now - replace with real analytics data
  res.json({
    recentLoads: [
      {
        id: "load_001",
        origin: "Los Angeles, CA",
        destination: "Phoenix, AZ",
        rate: 2500,
        status: "completed",
        driver: "John Smith",
        completedAt: new Date().toISOString()
      },
      {
        id: "load_002",
        origin: "Dallas, TX",
        destination: "Houston, TX",
        rate: 1800,
        status: "in_transit",
        driver: "Mike Johnson",
        startedAt: new Date().toISOString()
      }
    ],
    totals: {
      totalRevenue: 125000,
      totalLoads: 45,
      avgRate: 2777
    }
  });
});

export const reportAnalyticsMetrics = onRequest({ cors: true }, async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) return;
  
  // Mock data for now - replace with real analytics data
  res.json({
    kpis: {
      loadsToday: {
        value: 12,
        change: "+15%",
        trend: "up"
      },
      avgRatePerMile: {
        value: 2.85,
        change: "+0.12",
        trend: "up"
      },
      activeDrivers: {
        value: 28,
        change: "+3",
        trend: "up"
      },
      totalRevenue: {
        value: 125000,
        change: "+8.5%",
        trend: "up"
      },
      completionRate: {
        value: 94.2,
        change: "+2.1%",
        trend: "up"
      },
      avgDeliveryTime: {
        value: 2.3,
        change: "-0.2",
        trend: "down"
      }
    }
  });
});