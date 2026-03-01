/**
 * Employee Tracking Socket Service
 *
 * Manages a singleton Firestore onSnapshot subscription for every employee's
 * presence/current doc.  Whenever a doc changes it pushes
 * `tracking:presence-update` to all connected admin sockets.
 *
 * Lifecycle:
 *  - start(io)  — called once from server.js after io is ready
 *  - stop()     — called during graceful shutdown
 */

const { firestoreA } = require('../config/firebaseProjectA');

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** uid → presence unsubscribe function */
const unsubscribeMap = new Map();

let ioRef = null;
let employeeListenerUnsubscribe = null;
let adminCount = 0; // track how many admin sockets are in the room

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveStatus(presence) {
  if (!presence) return 'offline';
  const lastSeenMs = presence.lastSeen?.toMillis?.() || 0;
  const isStale = Date.now() - lastSeenMs > STALE_THRESHOLD_MS;
  return isStale ? 'offline' : (presence.status || 'offline');
}

function buildPayload(emp, presenceData) {
  const effectiveStatus = resolveStatus(presenceData);
  return {
    uid: emp.uid,
    name: emp.name || emp.email || emp.uid,
    email: emp.email || '',
    effectiveStatus,
    presence: presenceData
      ? {
          currentApp: presenceData.currentApp || null,
          currentTitle: presenceData.currentTitle || null,
          category: presenceData.category || '',
          isIdle: presenceData.isIdle ?? false,
          isPaused: presenceData.isPaused ?? false,
          status: presenceData.status || 'offline',
          totalActiveMs: presenceData.totalActiveMs || 0,
          sessionStartedAt: presenceData.sessionStartedAt || null,
          lastSeen: presenceData.lastSeen?.toMillis?.() || null,
          effectiveStatus,
        }
      : null,
  };
}

// ─── Per-employee listeners ────────────────────────────────────────────────────

function watchEmployee(emp) {
  if (unsubscribeMap.has(emp.uid)) return; // already watching

  const presRef = firestoreA.doc(`users/${emp.uid}/presence/current`);
  const unsubPresence = presRef.onSnapshot(
    (snap) => {
      if (!ioRef) return;
      const presenceData = snap.exists ? snap.data() : null;
      const payload = buildPayload(emp, presenceData);
      ioRef.to('tracking:admins').emit('tracking:presence-update', payload);
    },
    (err) => {
      console.error(`[TrackingSocket] Presence snapshot error for ${emp.uid}:`, err.message);
    }
  );

  unsubscribeMap.set(emp.uid, unsubPresence);
  console.log(`[TrackingSocket] Watching presence for ${emp.name || emp.uid}`);
}

function unwatchEmployee(uid) {
  const unsub = unsubscribeMap.get(uid);
  if (unsub) {
    unsub();
    unsubscribeMap.delete(uid);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start all presence listeners and set up the admin socket room.
 * @param {import('socket.io').Server} io
 */
async function start(io) {
  ioRef = io;

  // Listen for admin clients joining / leaving the tracking room
  io.on('connection', (socket) => {
    socket.on('tracking:join', () => {
      socket.join('tracking:admins');
      adminCount++;
      console.log(`[TrackingSocket] Admin ${socket.id} joined tracking:admins (${adminCount} active)`);

      // Start Firestore listeners when the first admin connects
      if (adminCount === 1) {
        startFirestoreListeners();
      }
    });

    socket.on('tracking:leave', () => {
      if (socket.rooms.has('tracking:admins')) {
        socket.leave('tracking:admins');
        adminCount = Math.max(0, adminCount - 1);
        stopIfNoAdmins();
      }
    });

    socket.on('disconnect', () => {
      // Socket.IO auto-removes from rooms on disconnect, but we need to decrement
      // We check if this socket was in the tracking room
      // Note: rooms are already cleared by the time disconnect fires,
      // so we track via a socket-level flag
      if (socket._trackingAdmin) {
        adminCount = Math.max(0, adminCount - 1);
        console.log(`[TrackingSocket] Admin ${socket.id} disconnected (${adminCount} active)`);
        stopIfNoAdmins();
      }
    });

    // Track membership via a flag so we can decrement on disconnect
    const origJoin = socket.join.bind(socket);
    socket.join = function(room) {
      if (room === 'tracking:admins') socket._trackingAdmin = true;
      return origJoin(room);
    };
  });

  console.log('[TrackingSocket] Employee tracking socket service started (listeners are lazy — activated on first admin join)');
}

/**
 * Start Firestore onSnapshot listeners for all employees.
 * Called when the first admin joins the tracking room.
 */
function startFirestoreListeners() {
  if (employeeListenerUnsubscribe) return; // already running

  console.log('[TrackingSocket] Starting Firestore listeners (first admin connected)');

  // Watch all current employees via onSnapshot on the users collection
  employeeListenerUnsubscribe = firestoreA
    .collection('users')
    .where('role', '==', 'employee')
    .onSnapshot(
      async (snap) => {
        const currentUids = new Set(snap.docs.map((d) => d.id));

        // Start watching any new employees
        snap.docs.forEach((doc) => {
          const emp = { uid: doc.id, ...doc.data() };
          watchEmployee(emp);
        });

        // Stop watching removed employees
        for (const uid of unsubscribeMap.keys()) {
          if (!currentUids.has(uid)) {
            unwatchEmployee(uid);
            // Notify admins this employee is gone
            if (ioRef) {
              ioRef.to('tracking:admins').emit('tracking:employee-removed', { uid });
            }
          }
        }
      },
      (err) => {
        console.error('[TrackingSocket] Users collection snapshot error:', err.message);
      }
    );

  console.log('[TrackingSocket] Employee tracking socket service started (listeners are lazy — activated on first admin join)');
}

/**
 * Tear down Firestore listeners when no admins are connected.
 */
function stopIfNoAdmins() {
  if (adminCount > 0) return;
  console.log('[TrackingSocket] No admins connected — pausing Firestore listeners');
  stopFirestoreListeners();
}

function stopFirestoreListeners() {
  if (employeeListenerUnsubscribe) {
    employeeListenerUnsubscribe();
    employeeListenerUnsubscribe = null;
  }
  for (const uid of [...unsubscribeMap.keys()]) {
    unwatchEmployee(uid);
  }
}

/**
 * Stop all Firestore listeners (call during graceful shutdown).
 */
function stop() {
  stopFirestoreListeners();
  adminCount = 0;
  console.log('[TrackingSocket] Employee tracking socket service stopped');
}

module.exports = { start, stop };
