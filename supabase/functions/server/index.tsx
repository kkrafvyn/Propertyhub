import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
);

// Push notifications should read VAPID keys from Supabase function secrets.
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const PAYSTACK_SECRET_KEY =
  Deno.env.get('BACKEND_PAYSTACK_SECRET_KEY') ||
  Deno.env.get('PAYSTACK_SECRET_KEY') ||
  '';
const FLUTTERWAVE_SECRET_KEY =
  Deno.env.get('BACKEND_FLUTTERWAVE_SECRET_KEY') ||
  Deno.env.get('FLUTTERWAVE_SECRET_KEY') ||
  '';

const paymentHeaders = (secret: string) => ({
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
});

const jsonError = (c: any, error: string, status = 400) =>
  c.json({ success: false, error }, status);

const normalizeProviderResponse = async (response: Response) => {
  const payload = await response.json().catch(() => null);
  return { ok: response.ok, payload };
};

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// All mock data has been removed for production deployment

// Health check endpoint
app.get("/make-server-8669f8c6/health", (c) => {
  console.log("✅ Health check requested");
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    server: "PropertyHub Backend",
    version: "1.0.0"
  });
});

const initializePaymentHandler = async (c: any) => {
  try {
    const {
      email,
      amount,
      currency = "GHS",
      paymentMethod,
      callback_url,
      metadata = {},
      tx_ref,
    } = await c.req.json();

    if (!email || typeof email !== "string") {
      return jsonError(c, "A valid email is required.");
    }

    if (!amount || Number(amount) <= 0) {
      return jsonError(c, "A valid amount is required.");
    }

    if (!paymentMethod || !["paystack", "flutterwave"].includes(paymentMethod)) {
      return jsonError(c, "A supported payment method is required.");
    }

    if (paymentMethod === "paystack") {
      if (!PAYSTACK_SECRET_KEY) {
        return jsonError(c, "Paystack secret key is not configured.", 503);
      }

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: paymentHeaders(PAYSTACK_SECRET_KEY),
        body: JSON.stringify({
          email,
          amount: Math.round(Number(amount) * 100),
          currency,
          callback_url,
          metadata,
        }),
      });

      const { ok, payload } = await normalizeProviderResponse(response);

      if (!ok || !payload?.status || !payload?.data) {
        return jsonError(
          c,
          payload?.message || "Unable to initialize Paystack payment.",
          response.status || 502,
        );
      }

      return c.json({ success: true, data: payload.data });
    }

    if (!FLUTTERWAVE_SECRET_KEY) {
      return jsonError(c, "Flutterwave secret key is not configured.", 503);
    }

    const reference = tx_ref || `propertyhub_${Date.now()}`;
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: paymentHeaders(FLUTTERWAVE_SECRET_KEY),
      body: JSON.stringify({
        tx_ref: reference,
        amount: Number(amount),
        currency,
        redirect_url: callback_url,
        customer: {
          email,
        },
        customizations: {
          title: "PropertyHub Payment",
          description: metadata?.description || "PropertyHub checkout",
        },
        meta: metadata,
      }),
    });

    const { ok, payload } = await normalizeProviderResponse(response);

    if (!ok || payload?.status !== "success" || !payload?.data?.link) {
      return jsonError(
        c,
        payload?.message || "Unable to initialize Flutterwave payment.",
        response.status || 502,
      );
    }

    return c.json({
      success: true,
      data: {
        link: payload.data.link,
        tx_ref: reference,
      },
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return jsonError(c, "Failed to initialize payment.", 500);
  }
};

const verifyPaymentHandler = async (c: any) => {
  const paymentId = c.req.param("paymentId");

  if (!paymentId) {
    return jsonError(c, "Payment reference is required.");
  }

  try {
    if (PAYSTACK_SECRET_KEY) {
      const paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentId)}`,
        {
          headers: paymentHeaders(PAYSTACK_SECRET_KEY),
        },
      );

      const { ok, payload } = await normalizeProviderResponse(paystackResponse);
      if (ok && payload?.status && payload?.data) {
        return c.json({ success: true, data: payload.data });
      }
    }

    if (FLUTTERWAVE_SECRET_KEY) {
      const flutterwaveResponse = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(paymentId)}`,
        {
          headers: paymentHeaders(FLUTTERWAVE_SECRET_KEY),
        },
      );

      const { ok, payload } = await normalizeProviderResponse(flutterwaveResponse);
      if (ok && payload?.status === "success" && payload?.data) {
        return c.json({ success: true, data: payload.data });
      }
    }

    return jsonError(c, "Payment reference could not be verified.", 404);
  } catch (error) {
    console.error("Payment verification error:", error);
    return jsonError(c, "Failed to verify payment.", 500);
  }
};

app.post("/make-server-8669f8c6/api/v1/payments/initialize", initializePaymentHandler);
app.post("/make-server-8669f8c6/api/payments/initialize", initializePaymentHandler);
app.get("/make-server-8669f8c6/api/v1/payments/:paymentId/verify", verifyPaymentHandler);
app.get("/make-server-8669f8c6/api/payments/:paymentId/status", verifyPaymentHandler);

// Authentication endpoints
app.post("/make-server-8669f8c6/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });

    if (error) {
      console.error("Supabase signup error:", error);
      return c.json({ success: false, error: error.message }, 400);
    }

    const userId = data.user.id;
    const userProfile = {
      id: userId,
      name,
      email,
      role: 'user',
      avatar: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face`,
      joinDate: new Date().toISOString().split('T')[0],
      preferences: {
        theme: 'light',
        notifications: true,
        emailUpdates: true,
        currency: 'USD',
        language: 'en'
      }
    };

    await kv.set(`user:${userId}`, JSON.stringify(userProfile));

    return c.json({ 
      success: true, 
      user: userProfile,
      session: null
    });
  } catch (error) {
    console.error("Error during signup:", error);
    return c.json({ success: false, error: "Failed to create account" }, 500);
  }
});

app.post("/make-server-8669f8c6/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase login error:", error);
      return c.json({ success: false, error: error.message }, 400);
    }

    const userProfile = await kv.get(`user:${data.user.id}`);
    if (!userProfile) {
      return c.json({ success: false, error: "User profile not found" }, 404);
    }

    const user = JSON.parse(userProfile);

    return c.json({ 
      success: true, 
      user,
      session: data.session 
    });
  } catch (error) {
    console.error("Error during login:", error);
    return c.json({ success: false, error: "Failed to sign in" }, 500);
  }
});

// Chat endpoints
app.get("/make-server-8669f8c6/chat/rooms/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const rooms = await kv.getByPrefix(`chat:rooms:${userId}:`);
    
    return c.json({ 
      success: true, 
      rooms: rooms.map(room => JSON.parse(room)) 
    });
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    return c.json({ success: false, error: "Failed to fetch chat rooms" }, 500);
  }
});

app.post("/make-server-8669f8c6/chat/rooms", async (c) => {
  try {
    const { name, type, participants, createdBy, description } = await c.req.json();
    
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room = {
      id: roomId,
      name,
      type,
      participants,
      messages: [],
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      createdBy,
      description: description || null,
      avatar: null
    };

    for (const participantId of participants) {
      await kv.set(`chat:rooms:${participantId}:${roomId}`, JSON.stringify(room));
    }

    return c.json({ success: true, room });
  } catch (error) {
    console.error("Error creating chat room:", error);
    return c.json({ success: false, error: "Failed to create chat room" }, 500);
  }
});

app.get("/make-server-8669f8c6/chat/messages/:roomId", async (c) => {
  try {
    const roomId = c.req.param("roomId");
    const messages = await kv.getByPrefix(`chat:messages:${roomId}:`);
    
    const sortedMessages = messages
      .map(msg => JSON.parse(msg))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return c.json({ success: true, messages: sortedMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return c.json({ success: false, error: "Failed to fetch messages" }, 500);
  }
});

app.post("/make-server-8669f8c6/chat/messages", async (c) => {
  try {
    const { roomId, senderId, senderName, senderAvatar, content, type = 'text', fileUrl, thumbnailUrl, fileName, fileSize, mimeType, duration } = await c.req.json();
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      id: messageId,
      senderId,
      senderName,
      senderAvatar,
      content,
      timestamp: new Date().toISOString(),
      type,
      edited: false,
      ...(fileUrl && { fileUrl }),
      ...(thumbnailUrl && { thumbnailUrl }),
      ...(fileName && { fileName }),
      ...(fileSize && { fileSize }),
      ...(mimeType && { mimeType }),
      ...(duration && { duration })
    };

    await kv.set(`chat:messages:${roomId}:${messageId}`, JSON.stringify(message));

    const allRoomKeys = await kv.getByPrefix(`chat:rooms:`);
    const relevantRooms = [];
    
    for (const roomValue of allRoomKeys) {
      const room = JSON.parse(roomValue);
      if (room.id === roomId) {
        relevantRooms.push(room);
      }
    }

    for (const room of relevantRooms) {
      for (const participantId of room.participants) {
        const updatedRoom = {
          ...room,
          lastMessage: message,
          unreadCount: participantId === senderId ? 0 : room.unreadCount + 1
        };
        await kv.set(`chat:rooms:${participantId}:${roomId}`, JSON.stringify(updatedRoom));
        
        if (participantId !== senderId) {
          const notificationData = {
            message,
            room: {
              id: room.id,
              name: room.name,
              type: room.type
            },
            timestamp: new Date().toISOString()
          };
          
          await kv.set(`chat:notification:${participantId}:${messageId}`, JSON.stringify(notificationData));
        }
      }
    }

    return c.json({ success: true, message });
  } catch (error) {
    console.error("Error sending message:", error);
    return c.json({ success: false, error: "Failed to send message" }, 500);
  }
});

// Properties endpoints
app.get("/make-server-8669f8c6/properties", async (c) => {
  try {
    const properties = await kv.getByPrefix("property:");
    let propertyList = properties.map(prop => JSON.parse(prop));

    propertyList.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.rating - a.rating;
    });

    return c.json({ 
      success: true, 
      properties: propertyList,
      total: propertyList.length 
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return c.json({ success: false, error: "Failed to fetch properties" }, 500);
  }
});

// Users endpoints
app.get("/make-server-8669f8c6/users", async (c) => {
  try {
    const users = await kv.getByPrefix("user:");
    const userList = users.map(user => {
      const userData = JSON.parse(user);
      return {
        id: userData.id,
        name: userData.name,
        role: userData.role,
        avatar: userData.avatar
      };
    });
    
    return c.json({ success: true, users: userList });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ success: false, error: "Failed to fetch users" }, 500);
  }
});

app.get("/make-server-8669f8c6/users/:userId/chat-eligible", async (c) => {
  try {
    const userId = c.req.param("userId");
    const users = await kv.getByPrefix("user:");
    const userList = users
      .map((user) => JSON.parse(user))
      .filter((user) => user.id !== userId)
      .filter((user) => ["admin", "host", "manager"].includes(user.role))
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      }));

    return c.json({ success: true, users: userList });
  } catch (error) {
    console.error("Error fetching chat eligible users:", error);
    return c.json({ success: false, error: "Failed to fetch eligible users" }, 500);
  }
});

app.put("/make-server-8669f8c6/chat/rooms/:roomId/read/:userId", async (c) => {
  try {
    const roomId = c.req.param("roomId");
    const userId = c.req.param("userId");
    const roomData = await kv.get(`chat:rooms:${userId}:${roomId}`);

    if (!roomData) {
      return c.json({ success: false, error: "Room not found" }, 404);
    }

    const room = JSON.parse(roomData);
    const nextUnreadCount =
      typeof room.unreadCount === "object" && room.unreadCount !== null
        ? { ...room.unreadCount, [userId]: 0 }
        : 0;

    const updatedRoom = {
      ...room,
      unreadCount: nextUnreadCount,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`chat:rooms:${userId}:${roomId}`, JSON.stringify(updatedRoom));

    return c.json({ success: true, room: updatedRoom });
  } catch (error) {
    console.error("Error marking room as read:", error);
    return c.json({ success: false, error: "Failed to mark room as read" }, 500);
  }
});

// Push notification endpoints
app.get("/make-server-8669f8c6/push/vapid-key", (c) => {
  if (!VAPID_PUBLIC_KEY) {
    return c.json({ success: false, error: "VAPID public key is not configured" }, 503);
  }

  return c.json({ 
    success: true, 
    publicKey: VAPID_PUBLIC_KEY 
  });
});

app.post("/make-server-8669f8c6/push/devices", async (c) => {
  try {
    const { userId, subscription, token, platform, name, type, userAgent } = await c.req.json();

    const existingDeviceIds = await kv.getByPrefix(`user_device:${userId}:`);
    let existingDevice = null;

    for (const candidateId of existingDeviceIds) {
      const rawDevice = await kv.get(`push_device:${candidateId}`);
      if (!rawDevice) continue;

      const parsedDevice = JSON.parse(rawDevice);
      const matchingEndpoint =
        subscription?.endpoint &&
        parsedDevice.subscription?.endpoint === subscription.endpoint;
      const matchingToken = token && parsedDevice.token === token;

      if (matchingEndpoint || matchingToken) {
        existingDevice = parsedDevice;
        break;
      }
    }

    const deviceId =
      existingDevice?.id ||
      `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const device = {
      ...existingDevice,
      id: deviceId,
      userId,
      name,
      type,
      userAgent,
      subscription: subscription || existingDevice?.subscription,
      token: token || existingDevice?.token,
      platform: platform || existingDevice?.platform,
      lastSeen: new Date().toISOString(),
      isActive: true,
      createdAt: existingDevice?.createdAt || new Date().toISOString(),
    };

    await kv.set(`push_device:${deviceId}`, JSON.stringify(device));
    await kv.set(`user_device:${userId}:${deviceId}`, deviceId);
    
    return c.json({ success: true, device });
  } catch (error) {
    console.error("Error registering push device:", error);
    return c.json({ success: false, error: "Failed to register device" }, 500);
  }
});

app.get("/make-server-8669f8c6/push/devices/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const deviceKeys = await kv.getByPrefix(`user_device:${userId}:`);
    
    const devices = [];
    for (const deviceId of deviceKeys) {
      const deviceData = await kv.get(`push_device:${deviceId}`);
      if (deviceData) {
        devices.push(JSON.parse(deviceData));
      }
    }
    
    return c.json({ success: true, devices });
  } catch (error) {
    console.error("Error fetching push devices:", error);
    return c.json({ success: false, error: "Failed to fetch devices" }, 500);
  }
});

app.delete("/make-server-8669f8c6/push/devices/:deviceId", async (c) => {
  try {
    const deviceId = c.req.param("deviceId");
    const deviceData = await kv.get(`push_device:${deviceId}`);

    if (deviceData) {
      const device = JSON.parse(deviceData);
      await kv.del(`push_device:${deviceId}`);
      await kv.del(`user_device:${device.userId}:${deviceId}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting push device:", error);
    return c.json({ success: false, error: "Failed to delete device" }, 500);
  }
});

app.post("/make-server-8669f8c6/push/devices/unsubscribe", async (c) => {
  try {
    const { userId, endpoint, token } = await c.req.json();
    const deviceIds = await kv.getByPrefix(`user_device:${userId}:`);

    for (const deviceId of deviceIds) {
      const deviceData = await kv.get(`push_device:${deviceId}`);
      if (!deviceData) continue;

      const device = JSON.parse(deviceData);
      const matchingEndpoint = endpoint && device.subscription?.endpoint === endpoint;
      const matchingToken = token && device.token === token;

      if (matchingEndpoint || matchingToken) {
        await kv.del(`push_device:${deviceId}`);
        await kv.del(`user_device:${userId}:${deviceId}`);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error unsubscribing push device:", error);
    return c.json({ success: false, error: "Failed to unsubscribe device" }, 500);
  }
});

app.post("/make-server-8669f8c6/push/test", async (c) => {
  try {
    const { userId, title, body, icon, data } = await c.req.json();
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const notification = {
      id: notificationId,
      userId,
      title,
      body,
      icon: icon || null,
      data: data || {},
      type: data?.type || "test",
      read: false,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`notification:${userId}:${notificationId}`, JSON.stringify(notification));

    console.log(`Queued push notification for user ${userId}: ${title} - ${body}`);
    
    return c.json({ success: true, message: "Test notification queued", data: notification });
  } catch (error) {
    console.error("Error sending test notification:", error);
    return c.json({ success: false, error: "Failed to send test notification" }, 500);
  }
});

// Admin endpoints
app.get("/make-server-8669f8c6/admin/users", async (c) => {
  try {
    console.log("🔍 Admin users endpoint called");
    
    const adminUserId = c.req.header("X-Admin-User-ID");
    console.log("👤 Admin User ID:", adminUserId);
    
    if (!adminUserId) {
      console.log("❌ No admin user ID provided");
      return c.json({ success: false, error: "Admin user ID required" }, 400);
    }
    
    // Verify admin access
    const adminUser = await kv.get(`user:${adminUserId}`);
    if (!adminUser) {
      console.log("❌ Admin user not found in database:", adminUserId);
      return c.json({ success: false, error: "Admin user not found" }, 404);
    }
    
    const admin = JSON.parse(adminUser);
    console.log("👤 Admin user found:", admin.name, admin.role);
    
    if (admin.role !== 'admin') {
      console.log("❌ Access denied - user role:", admin.role);
      return c.json({ success: false, error: "Access denied - admin role required" }, 403);
    }
    
    console.log("📊 Fetching all users from database...");
    const users = await kv.getByPrefix("user:");
    console.log(`📊 Found ${users.length} users in database`);
    
    const userList = users.map(user => {
      const userData = JSON.parse(user);
      return {
        ...userData,
        status: userData.status || 'active',
        joinedAt: userData.joinDate || userData.joinedAt || new Date().toISOString(),
        lastLogin: userData.lastLogin || new Date().toISOString(),
        stats: {
          totalMessages: Math.floor(Math.random() * 100),
          totalBookings: Math.floor(Math.random() * 20),
          propertiesViewed: Math.floor(Math.random() * 50),
          ...userData.stats
        }
      };
    });
    
    const stats = {
      totalUsers: userList.length,
      activeUsers: userList.filter(u => u.status === 'active' || !u.status).length,
      newUsersThisMonth: Math.floor(userList.length * 0.2),
      suspendedUsers: userList.filter(u => u.status === 'suspended').length,
      totalAdmins: userList.filter(u => u.role === 'admin').length,
      totalHosts: userList.filter(u => u.role === 'host').length,
      totalManagers: userList.filter(u => u.role === 'manager').length
    };
    
    console.log("✅ Successfully prepared user data:", stats);
    
    return c.json({ success: true, users: userList, stats });
  } catch (error) {
    console.error("❌ Error fetching admin users:", error);
    return c.json({ 
      success: false, 
      error: "Failed to fetch users",
      details: error.message 
    }, 500);
  }
});

app.put("/make-server-8669f8c6/admin/users/:userId/role", async (c) => {
  try {
    const adminUserId = c.req.header("X-Admin-User-ID");
    const userId = c.req.param("userId");
    const { role } = await c.req.json();
    
    // Verify admin access
    const adminUser = await kv.get(`user:${adminUserId}`);
    if (!adminUser) {
      return c.json({ success: false, error: "Admin user not found" }, 404);
    }
    
    const admin = JSON.parse(adminUser);
    if (admin.role !== 'admin') {
      return c.json({ success: false, error: "Access denied" }, 403);
    }
    
    // Get user to update
    const userData = await kv.get(`user:${userId}`);
    if (!userData) {
      return c.json({ success: false, error: "User not found" }, 404);
    }
    
    const user = JSON.parse(userData);
    user.role = role;
    user.updatedAt = new Date().toISOString();
    
    await kv.set(`user:${userId}`, JSON.stringify(user));
    
    return c.json({ success: true, user });
  } catch (error) {
    console.error("Error updating user role:", error);
    return c.json({ success: false, error: "Failed to update user role" }, 500);
  }
});

app.put("/make-server-8669f8c6/admin/users/:userId/status", async (c) => {
  try {
    const adminUserId = c.req.header("X-Admin-User-ID");
    const userId = c.req.param("userId");
    const { status } = await c.req.json();
    
    // Verify admin access
    const adminUser = await kv.get(`user:${adminUserId}`);
    if (!adminUser) {
      return c.json({ success: false, error: "Admin user not found" }, 404);
    }
    
    const admin = JSON.parse(adminUser);
    if (admin.role !== 'admin') {
      return c.json({ success: false, error: "Access denied" }, 403);
    }
    
    // Get user to update
    const userData = await kv.get(`user:${userId}`);
    if (!userData) {
      return c.json({ success: false, error: "User not found" }, 404);
    }
    
    const user = JSON.parse(userData);
    user.status = status;
    user.updatedAt = new Date().toISOString();
    
    await kv.set(`user:${userId}`, JSON.stringify(user));
    
    return c.json({ success: true, user });
  } catch (error) {
    console.error("Error updating user status:", error);
    return c.json({ success: false, error: "Failed to update user status" }, 500);
  }
});

app.get("/make-server-8669f8c6/admin/chat/rooms", async (c) => {
  try {
    const adminUserId = c.req.header("X-Admin-User-ID");
    
    // Verify admin access
    const adminUser = await kv.get(`user:${adminUserId}`);
    if (!adminUser) {
      return c.json({ success: false, error: "Admin user not found" }, 404);
    }
    
    const admin = JSON.parse(adminUser);
    if (admin.role !== 'admin') {
      return c.json({ success: false, error: "Access denied" }, 403);
    }
    
    // Get all chat rooms across all users
    const allRoomKeys = await kv.getByPrefix("chat:rooms:");
    const roomsMap = new Map();
    
    for (const roomValue of allRoomKeys) {
      const room = JSON.parse(roomValue);
      if (!roomsMap.has(room.id)) {
        roomsMap.set(room.id, room);
      }
    }
    
    const rooms = Array.from(roomsMap.values()).map(room => ({
      ...room,
      lastMessage: room.lastMessage || null,
      participants: room.participants || []
    }));
    
    return c.json({ success: true, rooms });
  } catch (error) {
    console.error("Error fetching admin chat rooms:", error);
    return c.json({ success: false, error: "Failed to fetch chat rooms" }, 500);
  }
});

app.get("/make-server-8669f8c6/admin/chat/messages/:roomId", async (c) => {
  try {
    const adminUserId = c.req.header("X-Admin-User-ID");
    const roomId = c.req.param("roomId");
    
    // Verify admin access
    const adminUser = await kv.get(`user:${adminUserId}`);
    if (!adminUser) {
      return c.json({ success: false, error: "Admin user not found" }, 404);
    }
    
    const admin = JSON.parse(adminUser);
    if (admin.role !== 'admin') {
      return c.json({ success: false, error: "Access denied" }, 403);
    }
    
    const messages = await kv.getByPrefix(`chat:messages:${roomId}:`);
    
    const sortedMessages = messages
      .map(msg => JSON.parse(msg))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return c.json({ success: true, messages: sortedMessages });
  } catch (error) {
    console.error("Error fetching admin chat messages:", error);
    return c.json({ success: false, error: "Failed to fetch messages" }, 500);
  }
});

// Notification endpoints
app.get("/make-server-8669f8c6/notifications/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const limit = parseInt(c.req.query("limit") || "50");
    const unread = c.req.query("unread") === "true";
    const type = c.req.query("type");
    
    const notifications = await kv.getByPrefix(`notification:${userId}:`);
    
    let notificationList = notifications
      .map(notification => JSON.parse(notification))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (unread) {
      notificationList = notificationList.filter(n => !n.read);
    }
    
    if (type) {
      notificationList = notificationList.filter(n => n.type === type);
    }
    
    notificationList = notificationList.slice(0, limit);
    
    return c.json({ success: true, notifications: notificationList });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return c.json({ success: false, error: "Failed to fetch notifications" }, 500);
  }
});

app.put("/make-server-8669f8c6/notifications/:userId/:notificationId/read", async (c) => {
  try {
    const userId = c.req.param("userId");
    const notificationId = c.req.param("notificationId");
    
    const notificationData = await kv.get(`notification:${userId}:${notificationId}`);
    if (notificationData) {
      const notification = JSON.parse(notificationData);
      notification.read = true;
      await kv.set(`notification:${userId}:${notificationId}`, JSON.stringify(notification));
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return c.json({ success: false, error: "Failed to mark notification as read" }, 500);
  }
});

app.put("/make-server-8669f8c6/notifications/:userId/read-all", async (c) => {
  try {
    const userId = c.req.param("userId");
    const notifications = await kv.getByPrefix(`notification:${userId}:`);
    
    let updated = 0;
    for (const notificationValue of notifications) {
      const notification = JSON.parse(notificationValue);
      if (!notification.read) {
        notification.read = true;
        await kv.set(`notification:${userId}:${notification.id}`, JSON.stringify(notification));
        updated++;
      }
    }
    
    return c.json({ success: true, updated });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return c.json({ success: false, error: "Failed to mark all notifications as read" }, 500);
  }
});

app.delete("/make-server-8669f8c6/notifications/:userId/:notificationId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const notificationId = c.req.param("notificationId");
    
    await kv.del(`notification:${userId}:${notificationId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return c.json({ success: false, error: "Failed to delete notification" }, 500);
  }
});

Deno.serve(app.fetch);
