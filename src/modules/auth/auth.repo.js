/** @typedef {import("@prisma/client").PrismaClient} PrismaClient */

/**
 * @param {PrismaClient} prisma
 */
export function createAuthRepo(prisma) {
  return {
    /**
     * @param {{ email: string, passwordHash: string, fullName: string, phone?: string }} input
     */
    async createUser({ email, passwordHash, fullName, phone }) {
      return prisma.user.create({
        data: { email, passwordHash, fullName, phone: phone || null },
        select: { id: true, email: true, fullName: true, role: true },
      });
    },

    /** @param {string} email */
    async findUserByEmail(email) {
      return prisma.user.findUnique({ where: { email } });
    },

    /** @param {string} userId */
    async findUserById(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
        },
      });
    },

    /**
     * @param {{ userId: string, deviceId?: string, fcmToken?: string, refreshTokenHash: string, expiresAt: Date }} input
     */
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

    /** @param {string} sessionId
     * @param {string} refreshTokenHash
     */
    async updateSessionRefreshHash(sessionId, refreshTokenHash) {
      return prisma.session.update({
        where: { id: sessionId },
        data: { refreshTokenHash },
        select: { id: true },
      });
    },

    /** @param {string} sessionId
     * @param {string} fcmToken
     */
    async updateSessionFcmToken(sessionId, fcmToken) {
      return prisma.session.update({
        where: { id: sessionId },
        data: { fcmToken },
        select: { id: true, fcmToken: true },
      });
    },

    /** @param {string} sessionId */
    async findSessionById(sessionId) {
      return prisma.session.findUnique({ where: { id: sessionId } });
    },

    /** @param {string} sessionId */
    async revokeSession(sessionId) {
      return prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
        select: { id: true },
      });
    },

    /** @param {string} userId */
    async revokeAllUserSessions(userId) {
      return prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },

    /** @param {string} userId */
    async getUserActiveSessions(userId) {
      return prisma.session.findMany({
        where: { userId, revokedAt: null },
        select: { id: true, deviceId: true, fcmToken: true, expiresAt: true },
      });
    },

    /**
     * @param {{ userId?: string | null, email: string, ipAddress: string, userAgent?: string | null, successful: boolean }} input
     */
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

    /**
     * @param {string} email
     * @param {Date} sinceDate
     */
    async getRecentFailedLoginAttempts(email, sinceDate) {
      return prisma.loginAttempt.count({
        where: {
          email,
          successful: false,
          createdAt: { gte: sinceDate },
        },
      });
    },

    /**
     * @param {string} userId
     * @param {Date} lockUntil
     */
    async lockUserAccount(userId, lockUntil) {
      return prisma.user.update({
        where: { id: userId },
        data: { accountLockedUntil: lockUntil },
      });
    },

    /** @param {string} userId */
    async unlockUserAccount(userId) {
      return prisma.user.update({
        where: { id: userId },
        data: { accountLockedUntil: null },
      });
    },

    /**
     * @param {string} userId
     * @param {string} token
     * @param {Date} expiresAt
     */
    async createEmailVerificationToken(userId, token, expiresAt) {
      return prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expiresAt,
        },
      });
    },

    /** @param {string} token */
    async findUserByVerificationToken(token) {
      return prisma.user.findUnique({
        where: { emailVerificationToken: token },
      });
    },

    /** @param {string} userId */
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

