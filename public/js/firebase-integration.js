// firebase-integration.js
import { db } from './firebase-config.js';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc
} from 'firebase/firestore';

// Player Management - MATCHING YOUR SCHEMA
export async function getPlayerData(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: userId,
        username: data.username || 'Unknown',
        gold: data.gold || 0,
        tokens: data.tokens || 0,
        level: data.level || 1,
        xp: data.xp || 0,
        condition: data.condition || 100,
        stats: data.stats || {
          dexterity: 5,
          handling: 5,
          luck: 5,
          power: 5,
          speed: 5,
          structure: 5
        },
        // Add other fields as needed
        password_hash: data.password_hash // Keep for reference
      };
    } else {
      console.log('No user found, creating default...');
      return null; // Handle new user creation in your auth flow
    }
  } catch (error) {
    console.error('Error getting player data:', error);
    return null;
  }
}

export async function updatePlayerData(userId, updates) {
  try {
    await updateDoc(doc(db, 'users', userId), updates);
    console.log('Player data updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating player data:', error);
    return false;
  }
}

// Shop Items - Loading from your cars collection
export async function loadShopItems(category) {
  try {
    const querySnapshot = await getDocs(collection(db, category));
    const items = [];
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return items;
  } catch (error) {
    console.error(`Error loading ${category}:`, error);
    return [];
  }
}

// Inventory Management - Using your subcollection
export async function getPlayerInventory(userId) {
  try {
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'inventory'));
    const inventory = [];
    querySnapshot.forEach((doc) => {
      inventory.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return inventory;
  } catch (error) {
    console.error('Error loading inventory:', error);
    return [];
  }
}

export async function addToInventory(userId, item) {
  try {
    await addDoc(collection(db, 'users', userId, 'inventory'), {
      ...item,
      acquiredAt: new Date().toISOString(),
      equipped: false
    });
    console.log('Item added to inventory');
    return true;
  } catch (error) {
    console.error('Error adding to inventory:', error);
    return false;
  }
}

// Currency operations
export async function updatePlayerCurrency(userId, goldChange = 0, diamondChange = 0) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentData = userDoc.data();
      const updates = {
        gold: (currentData.gold || 0) + goldChange,
        // Add diamonds field if you have it, or create it
        diamonds: (currentData.diamonds || 0) + diamondChange
      };
      
      await updateDoc(userRef, updates);
      return updates;
    }
    return null;
  } catch (error) {
    console.error('Error updating currency:', error);
    return null;
  }
}