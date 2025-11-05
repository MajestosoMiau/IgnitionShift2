import { doc, runTransaction } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

async function upgradeStat(userId, stat, cost) {
    const userRef = doc(db, "users", userId);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw "User not found";

            const userData = userDoc.data();
            if (userData.gold < cost) throw "Not enough gold";

            transaction.update(userRef, {
                gold: userData.gold - cost,
                [`stats.${stat}`]: (userData.stats[stat] || 0) + 1
            });
        });
        console.log(`${stat} upgraded successfully!`);
    } catch (error) {
        console.error("Upgrade failed:", error);
    }
}
