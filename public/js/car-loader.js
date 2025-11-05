// car-loader.js
import { db } from './firebase-config.js';
import { collection, getDocs } from 'firebase/firestore';

export async function loadAllCars() {
  try {
    console.log("Starting to load cars from Firebase...");
    
    const carsCollection = collection(db, 'cars');
    const querySnapshot = await getDocs(carsCollection);
    
    const cars = [];
    querySnapshot.forEach((doc) => {
      const carData = doc.data();
      cars.push({
        id: doc.id,
        name: carData.name || 'Unnamed Car',
        image_url: carData.image_url || '/assets/cars/default.jpg',
        power: carData.power || 0,
        speed: carData.speed || 0,
        luck: carData.luck || 0,
        structure: carData.structure || 0,
        price_gold: carData.price_gold || 0,
        price_tokens: carData.price_tokens || 0,
        minimumRequiredLevel: carData.minimumRequiredLevel || 1
      });
    });
    
    console.log(`✅ Successfully loaded ${cars.length} cars from Firebase`);
    return cars;
    
  } catch (error) {
    console.error('❌ Error loading cars:', error);
    return []; // Return empty array as fallback
  }
}

// Test function
export async function testFirebaseConnection() {
  try {
    const cars = await loadAllCars();
    if (cars.length > 0) {
      console.log("Firebase connection successful! First car:", cars[0]);
    } else {
      console.log("Firebase connected but no cars found");
    }
    return cars;
  } catch (error) {
    console.error("Firebase connection failed:", error);
    return null;
  }
}