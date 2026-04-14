export function createAuthRepo(prisma) {
  return {
    async createUser({ email, passwordHash, fullName, phone }) {
      return prisma.user.create({
        data: { email, passwordHash, fullName, phone: phone || null },
        select: { id: true, email: true, fullName: true, role: true },
      });
    },

    async findUserByEmail(email) {
      return prisma.user.findUnique({ where: { email } });
    },

    async findUserById(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
        },
      });
    },

    async createSession({ userId, deviceId, fcmToken, refreshTokenHash, expiresAt }) {
      return prisma.session.create({
        data: {
          userId,
          deviceId: deviceId || null,
          fcmToken: fcmToken || null,
          refreshTokenHash,
          expiresAt,
        },
        select: { id: true, userId: true, expiresAt: true },
      });
    },

    async updateSessionRefreshHash(sessionId, refreshTokenHash) {
      return prisma.session.update({
        where: { id: sessionId },
        data: { refreshTokenHash },
        select: { id: true },
      });
    },

    async updateSessionFcmToken(sessionId, fcmToken) {
      return prisma.session.update({
        where: { id: sessionId },
        data: { fcmToken },
        select: { id: true, fcmToken: true },
      });
    },

    async findSessionById(sessionId) {
      return prisma.session.findUnique({ where: { id: sessionId } });
    },

    async revokeSession(sessionId) {
      return prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
        select: { id: true },
      });
    },

    async revokeAllUserSessions(userId) {
      return prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },

    async getUserActiveSessions(userId) {
      return prisma.session.findMany({
        where: { userId, revokedAt: null },
        select: { id: true, deviceId: true, fcmToken: true, expiresAt: true },
      });
    },

    async recordLoginAttempt({ userId, email, ipAddress, userAgent, successful }) {
      return prisma.loginAttempt.create({
        data: {
          userId: userId || null,
          email,
          ipAddress,
          userAgent: userAgent || null,
          successful,
        },
      });
    },

    async getRecentFailedLoginAttempts(email, sinceDate) {
      return prisma.loginAttempt.count({
        where: {
          email,
          successful: false,
          createdAt: { gte: sinceDate },
        },
      });
    },

    async lockUserAccount(userId, lockUntil) {
      return prisma.user.update({
        where: { id: userId },
        data: { accountLockedUntil: lockUntil },
      });
    },

    async unlockUserAccount(userId) {
      return prisma.user.update({
        where: { id: userId },
        data: { accountLockedUntil: null },
      });
    },

    async createEmailVerificationToken(userId, token, expiresAt) {
      return prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expiresAt,
        },
      });
    },

    async findUserByVerificationToken(token) {
      return prisma.user.findUnique({
        where: { emailVerificationToken: token },
      });
    },

    async markEmailAsVerified(userId) {
      return prisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });
    },
  };
}

