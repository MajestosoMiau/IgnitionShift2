const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Clean up expired challenges every 5 minutes
exports.cleanupExpiredChallenges = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const db = admin.firestore();
    
    try {
      console.log('🔄 Running challenge cleanup...');
      
      // Find expired pending challenges
      const challengesRef = db.collection('challenges');
      const expiredQuery = challengesRef
        .where('status', '==', 'pending')
        .where('expiresAt', '<=', now);
      
      const snapshot = await expiredQuery.get();
      
      let cleanupCount = 0;
      const batch = db.batch();
      
      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          status: 'expired',
          expiredAt: now
        });
        cleanupCount++;
      });
      
      if (cleanupCount > 0) {
        await batch.commit();
        console.log(`✅ Cleaned up ${cleanupCount} expired challenges`);
      } else {
        console.log('✅ No expired challenges found');
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error in challenge cleanup:', error);
      return null;
    }
  });