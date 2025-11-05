// frontend.js - COMPLETE VERSION WITH ALL EXISTING CODE + NEW FEATURES
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    getFirestore,
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    arrayUnion,
    arrayRemove,
    collection, 
    getDocs,
    query,
    orderBy,
    limit,
    where,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBucOCRKF5vsNwtMsCDMapUMpIoGnKlTY0",
    authDomain: "projectgear-b6776.firebaseapp.com",
    projectId: "projectgear-b6776",
    storageBucket: "projectgear-b6776.firebasestorage.app",
    messagingSenderId: "916044026836",
    appId: "1:916044026836:web:3d8f8421e1b63566303c41"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase initialized successfully!");

// ========== GLOBAL STATE ==========
let currentPage = 1;
let pageSize = 50;
let sortBy = 'fame';
let currentDifficulty = 'beginner';
let selectedTrack = null;
let currentTeamsTab = 'search';
let teams = [];
let joinRequests = [];
let currentTeam = null;
let currentInventoryFilter = 'all';
let currentInventorySort = 'name';

// ========== RARITY SYSTEM ==========
const RARITY_CONFIG = {
    common: {
        name: 'Common',
        color: '#888888',
        bgColor: 'rgba(136, 136, 136, 0.2)',
        borderColor: 'rgba(136, 136, 136, 0.5)',
        glow: 'rgba(136, 136, 136, 0.3)',
        emoji: '⚪'
    },
    uncommon: {
        name: 'Uncommon',
        color: '#00ff88',
        bgColor: 'rgba(0, 255, 136, 0.15)',
        borderColor: 'rgba(0, 255, 136, 0.4)',
        glow: 'rgba(0, 255, 136, 0.25)',
        emoji: '🟢'
    },
    rare: {
        name: 'Rare',
        color: '#0077ff',
        bgColor: 'rgba(0, 119, 255, 0.15)',
        borderColor: 'rgba(0, 119, 255, 0.4)',
        glow: 'rgba(0, 119, 255, 0.25)',
        emoji: '🔵'
    },
    epic: {
        name: 'Epic',
        color: '#a29bfe',
        bgColor: 'rgba(162, 155, 254, 0.15)',
        borderColor: 'rgba(162, 155, 254, 0.4)',
        glow: 'rgba(162, 155, 254, 0.25)',
        emoji: '🟣'
    },
    legendary: {
        name: 'Legendary',
        color: '#feca57',
        bgColor: 'rgba(254, 202, 87, 0.15)',
        borderColor: 'rgba(254, 202, 87, 0.4)',
        glow: 'rgba(254, 202, 87, 0.25)',
        emoji: '🟡'
    },
    mythic: {
        name: 'Mythic',
        color: '#ff6b6b',
        bgColor: 'rgba(255, 107, 107, 0.15)',
        borderColor: 'rgba(255, 107, 107, 0.4)',
        glow: 'rgba(255, 107, 107, 0.25)',
        emoji: '🔴'
    }
};

// ========== XP & LEVEL SYSTEM ==========
const XP_REQUIREMENTS = {
    1: 100, 2: 250, 3: 450, 4: 700, 5: 1000,
    6: 1350, 7: 1750, 8: 2200, 9: 2700, 10: 3250,
    11: 3850, 12: 4500, 13: 5200, 14: 5950, 15: 6750,
    16: 7600, 17: 8500, 18: 9450, 19: 10450, 20: 11500,
};

function getXPRequired(level) {
    return XP_REQUIREMENTS[level] || (level * level * 100);
}

async function checkLevelUp(userId, currentXP, currentLevel) {
    const xpRequired = getXPRequired(currentLevel);
    
    if (currentXP >= xpRequired) {
        const newLevel = currentLevel + 1;
        const remainingXP = currentXP - xpRequired;
        
        try {
            await updateDoc(doc(db, "users", userId), {
                level: newLevel,
                xp: remainingXP
            });
            
            console.log(`🎉 Level up! Now level ${newLevel}`);
            showLevelUpNotification(newLevel);
            
            if (remainingXP >= getXPRequired(newLevel)) {
                await checkLevelUp(userId, remainingXP, newLevel);
            }
            
            return true;
        } catch (error) {
            console.error("Error during level up:", error);
            return false;
        }
    }
    return false;
}

function showLevelUpNotification(newLevel) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #00ff88, #00ffff);
        color: #1a1a2e;
        padding: 2rem 3rem;
        border-radius: 15px;
        font-family: 'Orbitron', sans-serif;
        font-weight: 700;
        font-size: 1.5rem;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 0 50px rgba(0, 255, 255, 0.5);
        animation: levelUpPop 0.5s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
        <div>LEVEL UP!</div>
        <div style="font-size: 2rem; margin-top: 0.5rem;">Level ${newLevel}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function addXP(userId, xpAmount) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentXP = userData.xp || 0;
            const currentLevel = userData.level || 1;
            const newXP = currentXP + xpAmount;
            
            await updateDoc(userRef, { xp: newXP });
            await checkLevelUp(userId, newXP, currentLevel);
            return true;
        }
    } catch (error) {
        console.error("Error adding XP:", error);
        return false;
    }
}

// ========== CONDITION RECOVERY SYSTEM ==========
const CONDITION_RECOVERY_RATES = {
    online: 2,
    offline: 0.5
};

function initializeConditionRecovery() {
    setInterval(async () => {
        const user = auth.currentUser;
        if (!user) return;
        await recoverCondition(user.uid);
    }, 60000);
    
    if (auth.currentUser) {
        recoverCondition(auth.currentUser.uid);
    }
}

async function recoverCondition(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentCondition = userData.condition || 100;
            const lastConditionUpdate = userData.lastConditionUpdate?.toDate() || new Date();
            const now = new Date();
            const minutesPassed = Math.floor((now - lastConditionUpdate) / 60000);
            
            if (minutesPassed > 0) {
                const recoveryRate = document.hidden ? CONDITION_RECOVERY_RATES.offline : CONDITION_RECOVERY_RATES.online;
                const recoveryAmount = minutesPassed * recoveryRate;
                const newCondition = Math.min(100, currentCondition + recoveryAmount);
                
                if (newCondition > currentCondition) {
                    await updateDoc(userRef, {
                        condition: newCondition,
                        lastConditionUpdate: serverTimestamp()
                    });
                    
                    console.log(`❤️ Recovered ${recoveryAmount.toFixed(1)}% condition. Now at ${newCondition.toFixed(1)}%`);
                    
                    if (document.getElementById('condition')) {
                        document.getElementById('condition').textContent = `${Math.floor(newCondition)}%`;
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error recovering condition:", error);
    }
}

// ========== NAVBAR MANAGEMENT ==========
function loadNavbar() {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;

    navbarContainer.innerHTML = `
        <nav class="navbar">
            <div class="nav-container">
                <a href="index.html" class="nav-logo">
                    <i class="fas fa-car"></i>
                    CYBER GARAGE
                </a>
                <div class="nav-menu">
                    <a href="index.html" class="nav-link" id="nav-home"><i class="fas fa-home"></i> Home</a>
                    <a href="garage.html" class="nav-link" id="nav-garage"><i class="fas fa-warehouse"></i> Garage</a>
                    <a href="shop.html" class="nav-link" id="nav-shop"><i class="fas fa-shopping-cart"></i> Shop</a>
                    <a href="training.html" class="nav-link" id="nav-training"><i class="fas fa-dumbbell"></i> Training</a>
                    <a href="teams.html" class="nav-link" id="nav-teams"><i class="fa-solid fa-people-group"></i> Teams</a>
                    <a href="marketplace.html" class="nav-link" id="nav-marketplace"><i class="fas fa-shop"></i> Marketplace</a>
                    <a href="rankings.html" class="nav-link" id="nav-rankings"><i class="fas fa-trophy"></i> Rankings</a>
                    <a href="missions.html" class="nav-link" id="nav-missions"><i class="fas fa-flag-checkered"></i> Missions</a>
                </div>
                <div class="nav-user" id="nav-user" style="display: none;">
                    <span id="player-name-nav">Racer</span>
                    <button onclick="logout()" class="logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
                <div class="nav-guest" id="nav-guest">
                    <a href="index.html" class="auth-nav-btn">Login</a>
                </div>
            </div>
        </nav>
    `;
    
    setActiveNavLink();
    updateNavbarAuthState();
}

function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage) {
            link.classList.add('active');
        }
    });
}

function updateNavbarAuthState() {
    const user = auth.currentUser;
    const navUser = document.getElementById('nav-user');
    const navGuest = document.getElementById('nav-guest');
    const playerNameNav = document.getElementById('player-name-nav');

    if (user && navUser && navGuest) {
        navUser.style.display = 'flex';
        navGuest.style.display = 'none';
        if (playerNameNav) playerNameNav.textContent = 'Loading...';
    } else if (navUser && navGuest) {
        navUser.style.display = 'none';
        navGuest.style.display = 'flex';
    }
}

// ========== AUTHENTICATION FUNCTIONS ==========
async function handleAuth(event) {
    event.preventDefault();
    
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const authMessage = document.getElementById("authMessage");

    try {
        let userCredential;
        try {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (loginError) {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await initializeUser(userCredential.user);
        }

        const user = userCredential.user;
        authMessage.textContent = "Login successful! Loading your data...";
        authMessage.style.color = "green";
        sessionStorage.setItem("playerData", JSON.stringify({ uid: user.uid, email: user.email }));

    } catch (error) {
        authMessage.textContent = `Error: ${error.message}`;
        authMessage.style.color = "red";
    }
}

if (document.getElementById("authForm")) {
    document.getElementById("authForm").addEventListener("submit", handleAuth);
}

async function initializeUser(user) {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
        username: user.email.split("@")[0],
        email: user.email,
        gold: 100,
        tokens: 0,
        fame: 0,
        xp: 0,
        level: 1,
        condition: 100,
        lastConditionUpdate: serverTimestamp(),
        stats: { 
            power: 5, speed: 5, dexterity: 5, structure: 5, handling: 5, luck: 5 
        },
        inventory: [{ 
            id: "rusty_rider", 
            type: "car", 
            equipped: true,
            name: "Rusty Rider",            
            stats: { power: 1, speed: 1, handling: 1 }
        }],
        trainingCooldowns: {},
        trainingHistory: []
    });
    console.log("New player initialized!");
}

// ========== PLAYER DATA FUNCTIONS ==========
async function loadPlayerData(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("Loaded user data:", userData);
            updatePlayerUI(userData);
        } else {
            console.error("No user data found.");
        }
    } catch (error) {
        console.error("Error loading player data:", error);
    }
}

function updatePlayerUI(userData) {
    const usernameElements = document.querySelectorAll('#username, #player-name');
    usernameElements.forEach(element => {
        if (element) element.textContent = userData.username || "Racer";
    });

    const playerNameNav = document.getElementById('player-name-nav');
    if (playerNameNav) {
        playerNameNav.textContent = userData.username || userData.email?.split('@')[0] || "Racer";
    }
    
    const currentLevel = userData.level || 1;
    const currentXP = userData.xp || 0;
    const xpRequired = getXPRequired(currentLevel);
    const xpProgress = Math.min(100, (currentXP / xpRequired) * 100);
    
    const stats = userData.stats || {};
    const elements = {
        "level": currentLevel,
        "gold": userData.gold,
        "tokens": userData.tokens,
        "fame": userData.fame,
        "xp": `${currentXP}/${xpRequired}`,
        "condition": `${Math.floor(userData.condition || 100)}%`,
        "shop-gold": userData.gold,
        "power": stats.power,
        "speed": stats.speed,
        "dexterity": stats.dexterity,
        "handling": stats.handling,
        "structure": stats.structure,
        "luck": stats.luck,
        "power-display": stats.power,
        "speed-display": stats.speed,
        "dexterity-display": stats.dexterity,
        "handling-display": stats.handling,
        "structure-display": stats.structure,
        "luck-display": stats.luck
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value !== undefined ? value : 0;
    }
    
    const xpBar = document.getElementById('xp-progress-bar');
    if (xpBar) xpBar.style.width = `${xpProgress}%`;
    
    updateCarInfo(userData);
    
    if (document.getElementById("activity-type")) {
        document.getElementById("activity-type").textContent = 
            `Ready to race! | Gold: ${userData.gold || 0} | Level: ${userData.level || 1}`;
    }
    
    updateEquipmentDisplay(userData);
    updateUpgradeButtons();
    
    if (userData.inventory && document.getElementById('inventory-grid')) {
        displayInventory(userData.inventory);
    }

    updateEnhancedStatsDisplay(userData);
}

function updateCarInfo(userData) {
    const equippedCar = getEquippedCar(userData.inventory);
    
    const carImage = document.getElementById("image_url");
    if (carImage) {
        const imagePath = `images/cars/${equippedCar.id}.jpg`;
        carImage.src = imagePath;
        carImage.alt = equippedCar.name || "Rusty Rider";
        carImage.onerror = function() {
            console.log(`Car image not found: ${imagePath}, trying fallbacks...`);
            const fallbacks = [
                `images/cars/${equippedCar.id.toLowerCase().replace(/ /g, '_')}.jpg`,
                `images/cars/${equippedCar.id.toLowerCase().replace(/ /g, '-')}.jpg`,
                `images/cars/default_car.jpg`,
                'images/cars/rusty_rider.jpg'
            ];
            tryNextFallback(this, fallbacks, 0);
        };
        carImage.onload = function() {
            console.log(`✅ Car image loaded successfully: ${imagePath}`);
        };
    }
    
    const carName = document.getElementById("car-name");
    if (carName) carName.textContent = equippedCar.name || "Rusty Rider";
}

function updateEquipmentDisplay(userData) {
    const equippedCar = getEquippedCar(userData.inventory);
    
    const carImage = document.getElementById("current-car-image");
    const carName = document.getElementById("current-car-name");
    const carStats = document.getElementById("current-car-stats");
    
    if (carImage) {
        const imagePath = `images/cars/${equippedCar.id}.jpg`;
        carImage.src = imagePath;
        carImage.alt = equippedCar.name || "Rusty Rider";
        carImage.onerror = function() {
            console.log(`Car image not found for dashboard: ${imagePath}, trying fallbacks...`);
            const fallbacks = [
                `images/cars/${equippedCar.id.toLowerCase().replace(/ /g, '_')}.jpg`,
                `images/cars/${equippedCar.id.toLowerCase().replace(/ /g, '-')}.jpg`,
                `images/cars/default_car.jpg`,
                'images/cars/rusty_rider.jpg'
            ];
            tryNextFallback(this, fallbacks, 0);
        };
        carImage.onload = function() {
            console.log(`✅ Dashboard car image loaded successfully: ${imagePath}`);
        };
    }
    
    if (carName) carName.textContent = equippedCar.name || "Rusty Rider";
    
    if (carStats) {
        let bonusText = '';
        if (equippedCar.stats) {
            const bonuses = [];
            Object.entries(equippedCar.stats).forEach(([stat, value]) => {
                if (value > 0) bonuses.push(`+${value} ${stat}`);
            });
            if (bonuses.length > 0) bonusText = ` • ${bonuses.join(', ')}`;
        }
        carStats.innerHTML = `Equipped${bonusText}`;
    }
}

function tryNextFallback(imgElement, fallbacks, index) {
    if (index >= fallbacks.length) {
        console.log('All fallback images failed');
        return;
    }
    
    const nextSrc = fallbacks[index];
    console.log(`Trying fallback ${index + 1}: ${nextSrc}`);
    
    const testImg = new Image();
    testImg.onload = function() {
        console.log(`✅ Fallback image found: ${nextSrc}`);
        imgElement.src = nextSrc;
    };
    testImg.onerror = function() {
        tryNextFallback(imgElement, fallbacks, index + 1);
    };
    testImg.src = nextSrc;
}

function getEquippedCar(inventory) {
    if (!inventory || !Array.isArray(inventory)) {
        return { 
            id: "rusty_rider", 
            name: "Rusty Rider",
            stats: { power: 1, speed: 1 }
        };
    }
    
    const equippedCar = inventory.find(item => item.type === "car" && item.equipped);
    
    if (equippedCar) {
        console.log("Found equipped car:", equippedCar);
        return equippedCar;
    }
    
    console.log("No equipped car found, using default");
    return { 
        id: "rusty_rider", 
        name: "Rusty Rider",
        stats: { power: 1, speed: 1 }
    };
}

window.logout = function() {
    signOut(auth).then(() => {
        sessionStorage.removeItem("playerData");
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error("Logout error:", error);
    });
}

// ========== ENHANCED SHOP SYSTEM ==========
window.buyItem = async function(category, itemId, itemName, priceGold, priceTokens = 0) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to make purchases.');
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.gold < priceGold) {
                alert(`Not enough gold! You need ${priceGold} gold but only have ${userData.gold}.`);
                return;
            }
            
            if (userData.tokens < priceTokens) {
                alert(`Not enough Ignition Tokens! You need ${priceTokens} tokens but only have ${userData.tokens}.`);
                return;
            }
            
            const itemDoc = await getDoc(doc(db, category, itemId));
            const itemData = itemDoc.data();
            
            if (itemData.minimumRequiredLevel && userData.level < itemData.minimumRequiredLevel) {
                alert(`Level ${itemData.minimumRequiredLevel} required! You are level ${userData.level}.`);
                return;
            }
            
            let currencyMessage = `${priceGold} gold`;
            if (priceTokens > 0) currencyMessage += ` and ${priceTokens} Ignition Tokens`;
            
            if (!confirm(`Purchase ${itemName} for ${currencyMessage}?`)) return;
            
            const itemStats = {
                power: itemData.power || 0,
                speed: itemData.speed || 0,
                dexterity: itemData.dexterity || 0,
                handling: itemData.handling || 0,
                structure: itemData.structure || 0,
                luck: itemData.luck || 0
            };
            
            const newItem = {
                id: itemId,
                type: category.slice(0, -1),
                name: itemName,
                equipped: true,
                rarity: itemData.rarity || 'common',
                stats: itemStats,
                purchasedAt: new Date().toISOString()
            };
            
            const inventory = userData.inventory || [];
            const updatedInventory = inventory.map(item => {
                if (item.type === newItem.type) return { ...item, equipped: false };
                return item;
            });
            
            const existingItemIndex = updatedInventory.findIndex(item => 
                item.id === itemId && item.type === newItem.type
            );
            
            if (existingItemIndex !== -1) {
                updatedInventory[existingItemIndex].equipped = true;
            } else {
                updatedInventory.push(newItem);
            }
            
            const updateData = {
                gold: userData.gold - priceGold,
                inventory: updatedInventory
            };
            
            if (priceTokens > 0) updateData.tokens = userData.tokens - priceTokens;
            
            await updateDoc(userRef, updateData);
            alert(`🎉 Successfully purchased and equipped ${itemName} for ${currencyMessage}!`);
            await loadPlayerData(user.uid);
        }
    } catch (error) {
        alert('Error making purchase: ' + error.message);
    }
}

window.showCategory = async function(category, buttonElement) {
    if (buttonElement) updateActiveTab(buttonElement);
    
    const itemsList = document.getElementById('items-list');
    if (!itemsList) return;
    
    itemsList.innerHTML = '<div class="loading">Loading items...</div>';

    try {
        const querySnapshot = await getDocs(collection(db, category));
        itemsList.innerHTML = '';

        if (querySnapshot.empty) {
            itemsList.innerHTML = '<div class="error">No items found in this category.</div>';
            return;
        }

        const user = auth.currentUser;
        let userInventory = [];
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) userInventory = userDoc.data().inventory || [];
        }

        const itemsArray = [];
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            itemsArray.push({
                id: doc.id,
                ...item,
                minimumRequiredLevel: item.minimumRequiredLevel || 0,
                price_gold: item.price_gold || 0,
                price_tokens: item.price_tokens || 0
            });
        });

        itemsArray.sort((a, b) => a.minimumRequiredLevel - b.minimumRequiredLevel);

        itemsArray.forEach((item) => {
            const documentId = item.id;
            const imagePath = getCorrectImagePath(documentId, category, item);
            const itemType = category.slice(0, -1);
            const playerOwnsItem = userInventory.some(invItem => 
                invItem.id === documentId && invItem.type === itemType
            );
            
            const stats = [];
            if (item.power) stats.push({ emoji: '💪', label: 'Power', value: item.power });
            if (item.speed) stats.push({ emoji: '⚡', label: 'Speed', value: item.speed });
            if (item.handling) stats.push({ emoji: '🎯', label: 'Handling', value: item.handling });
            if (item.luck) stats.push({ emoji: '🍀', label: 'Luck', value: item.luck });
            if (item.structure) stats.push({ emoji: '🛡️', label: 'Structure', value: item.structure });
            if (item.dexterity) stats.push({ emoji: '🎮', label: 'Dexterity', value: item.dexterity });
            
            const statsHTML = stats.map(stat => `
                <div class="stat-item">
                    <span>${stat.emoji}</span>
                    <span>${stat.label}:</span>
                    <span class="stat-value">${stat.value}</span>
                </div>
            `).join('');
            
            let priceSectionHTML = '';
            if (item.price_gold > 0 || item.price_tokens > 0) {
                priceSectionHTML = '<div class="price-section">';
                if (item.price_gold > 0) {
                    priceSectionHTML += `
                        <div class="price-item buy-price">
                            <div class="price-label">💰 Gold Price</div>
                            <div class="price-value">${item.price_gold}</div>
                        </div>
                    `;
                }
                if (item.price_tokens > 0) {
                    priceSectionHTML += `
                        <div class="price-item token-price">
                            <div class="price-label">💎 Token Price</div>
                            <div class="price-value">${item.price_tokens}</div>
                        </div>
                    `;
                }
                priceSectionHTML += '</div>';
            }
            
            const itemContainer = document.createElement('div');
            itemContainer.className = 'item-container';
            itemContainer.innerHTML = `
                <div class="item-image-section">
                    <div class="item-name">${item.name}</div>
                    <img src="${imagePath}" alt="${item.name}" class="item-image" onerror="this.style.display='none'">
                </div>
                <div class="item-stats-section">
                    ${item.minimumRequiredLevel ? 
                        `<div class="requirements">📊 Level ${item.minimumRequiredLevel} Required</div>` : ''}
                    ${priceSectionHTML}
                    ${stats.length > 0 ? `<div class="stats-grid">${statsHTML}</div>` : ''}
                    <div class="item-actions-section">
                        <button class="action-btn buy-btn" 
                                onclick="buyItem('${category}', '${documentId}', '${item.name}', ${item.price_gold || 0}, ${item.price_tokens || 0})">
                            BUY
                        </button>
                        <button class="action-btn sell-btn" 
                                onclick="sellItem('${category}', '${documentId}', '${item.name}', ${item.sellValue || Math.floor(item.price_gold * 0.7)})"
                                ${!playerOwnsItem ? 'disabled' : ''}>
                            ${playerOwnsItem ? 'SELL' : 'OWNED'}
                        </button>
                    </div>
                </div>
            `;
            itemsList.appendChild(itemContainer);
        });
    } catch (error) {
        itemsList.innerHTML = `<div class="error">Error loading ${category}: ${error.message}</div>`;
    }
}

function getCorrectImagePath(documentId, category, itemData, context = 'shop') {
    let imagePath = '';

    if (itemData.image_url) {
        if (typeof itemData.image_url === 'string') {
            imagePath = itemData.image_url;
        } else if (typeof itemData.image_url === 'object' && itemData.image_url !== null) {
            imagePath = itemData.image_url.path || 
                       itemData.image_url.url || 
                       itemData.image_url.value ||
                       itemData.image_url.image_url ||
                       JSON.stringify(itemData.image_url);
        }
    }

    if (!imagePath || imagePath === 'undefined' || imagePath === 'null') {
        const imageName = documentId.toLowerCase().replace(/ /g, '_') + '.jpg';
        const categoryFolders = {
            'cars': 'images/cars/',
            'engines': 'images/engines/',
            'tires': 'images/tires/',
            'seats': 'images/seats/',
            'turbos': 'images/turbos/',
            'suspensions': 'images/suspensions/'
        };
        const folder = categoryFolders[category] || 'images/';
        imagePath = folder + imageName;
    }

    if (typeof imagePath === 'string') {
        imagePath = imagePath.replace(/^\/+/, '').replace(/^images\//, '');
        if (context === 'shop') {
            if (!imagePath.startsWith('images/') && !imagePath.startsWith('http')) {
                imagePath = 'images/' + imagePath;
            }
        } else {
            const filename = imagePath.split('/').pop();
            imagePath = `images/cars/${filename}`;
        }
    }

    return imagePath;
}

function updateActiveTab(activeButton) {
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    activeButton.classList.add('active');
}

window.sellItem = async function(category, itemId, itemName, sellPrice) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to sell items.');
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const inventory = userData.inventory || [];
            const itemType = category.slice(0, -1);
            const itemToSell = inventory.find(item => item.id === itemId && item.type === itemType);
            
            if (!itemToSell) {
                alert(`You don't own ${itemName} to sell!`);
                return;
            }
            
            if (itemToSell.equipped) {
                alert(`You cannot sell ${itemName} because it's currently equipped! Unequip it first.`);
                return;
            }
            
            if (!confirm(`Sell ${itemName} for ${sellPrice} gold?`)) return;
            
            const updatedInventory = inventory.filter(item => !(item.id === itemId && item.type === itemType));
            await updateDoc(userRef, { gold: (userData.gold || 0) + sellPrice, inventory: updatedInventory });
            alert(`💰 Sold ${itemName} for ${sellPrice} gold!`);
            await loadPlayerData(user.uid);
            
            if (document.getElementById('items-list')) {
                const activeButton = document.querySelector('.category-btn.active');
                if (activeButton) {
                    const category = activeButton.getAttribute('onclick').match(/'([^']+)'/)[1];
                    showCategory(category, activeButton);
                }
            }
        }
    } catch (error) {
        alert('Error selling item: ' + error.message);
    }
}

function initializeShop() {
    const itemsList = document.getElementById('items-list');
    if (itemsList) {
        const categoryButtons = document.querySelectorAll('.category-btn');
        categoryButtons.forEach(button => {
            button.addEventListener('click', function() {
                const category = this.getAttribute('onclick').match(/'([^']+)'/)[1];
                showCategory(category, this);
            });
        });
        
        const activeButton = document.querySelector('.category-btn.active');
        if (activeButton) showCategory('cars', activeButton);
        else if (categoryButtons.length > 0) showCategory('cars', categoryButtons[0]);
    }
}

// ========== RANKINGS SYSTEM ==========
async function loadRankings() {
    const rankingsTbody = document.getElementById('rankings-tbody');
    if (!rankingsTbody) return;
    
    try {
        rankingsTbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-row">
                    <i class="fas fa-spinner fa-spin"></i> Loading rankings...
                </td>
            </tr>
        `;

        const startRank = (currentPage - 1) * pageSize + 1;
        let playersQuery = query(collection(db, 'users'), orderBy(sortBy, 'desc'), limit(pageSize));
        const snapshot = await getDocs(playersQuery);
        const players = [];
        
        snapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
        displayRankings(players, startRank);
        updatePaginationControls();
        await loadPlayerRank();
    } catch (error) {
        rankingsTbody.innerHTML = `
            <tr>
                <td colspan="6" class="error-row">
                    <i class="fas fa-exclamation-triangle"></i> Error loading rankings: ${error.message}
                </td>
            </tr>
        `;
    }
}

function displayRankings(players, startRank) {
    const rankingsTbody = document.getElementById('rankings-tbody');
    if (!rankingsTbody) return;
    
    if (players.length === 0) {
        rankingsTbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data-row">No players found in this range</td>
            </tr>
        `;
        return;
    }

    rankingsTbody.innerHTML = players.map((player, index) => {
        const rank = startRank + index;
        const isCurrentUser = player.id === auth.currentUser?.uid;
        
        return `
            <tr class="${isCurrentUser ? 'current-user' : ''}">
                <td class="rank-cell">
                    <span class="rank-number">${rank}</span>
                    ${rank <= 3 ? `<i class="fas fa-medal rank-medal rank-${rank}"></i>` : ''}
                </td>
                <td class="player-cell">
                    <div class="player-info">
                        <span class="player-name">${player.username || 'Unknown Player'}</span>
                        ${isCurrentUser ? '<span class="you-badge">YOU</span>' : ''}
                    </div>
                </td>
                <td class="fame-cell">
                    <i class="fas fa-star"></i> ${player.fame || 0}
                </td>
                <td class="level-cell">
                    <i class="fas fa-level-up-alt"></i> ${player.level || 1}
                </td>
                <td class="car-cell">${getCurrentCarName(player) || 'No Car'}</td>
                <td class="value-cell">
                    <i class="fas fa-coins"></i> $${(player.garageValue || 0).toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');
}

function getCurrentCarName(player) {
    if (player.currentCar) return player.currentCar;
    if (player.inventory && Array.isArray(player.inventory)) {
        const equippedCar = player.inventory.find(item => item.type === 'car' && item.equipped);
        return equippedCar ? equippedCar.name : 'No Car';
    }
    return 'No Car';
}

async function loadPlayerRank() {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const playerRankSpan = document.getElementById('player-rank');
            const playerFameSpan = document.getElementById('player-fame');
            const playerHighlight = document.getElementById('player-highlight');
            
            if (playerRankSpan) playerRankSpan.textContent = `#${userData.globalRank || 'N/A'}`;
            if (playerFameSpan) playerFameSpan.textContent = (userData.fame || 0).toLocaleString();
            
            if (playerHighlight) {
                const playerHighlightContent = `
                    <div class="player-highlight-stats">
                        <div class="highlight-stat">
                            <span class="highlight-label">Global Rank</span>
                            <span class="highlight-value">#${userData.globalRank || 'N/A'}</span>
                        </div>
                        <div class="highlight-stat">
                            <span class="highlight-label">Fame Points</span>
                            <span class="highlight-value">${userData.fame || 0}</span>
                        </div>
                        <div class="highlight-stat">
                            <span class="highlight-label">Level</span>
                            <span class="highlight-value">${userData.level || 1}</span>
                        </div>
                        <div class="highlight-stat">
                            <span class="highlight-label">Garage Value</span>
                            <span class="highlight-value">$${(userData.garageValue || 0).toLocaleString()}</span>
                        </div>
                    </div>
                `;
                
                const contentElement = playerHighlight.querySelector('.player-highlight-content');
                if (contentElement) contentElement.innerHTML = playerHighlightContent;
                playerHighlight.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading player rank:', error);
    }
}

function updatePaginationControls() {
    const pageInfo = document.getElementById('page-info');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
    
    const startRank = (currentPage - 1) * pageSize + 1;
    const endRank = currentPage * pageSize;
    pageInfo.textContent = `${startRank}-${endRank}`;
    prevPageBtn.disabled = currentPage === 1;
}

function initializeRankings() {
    const rankingsTbody = document.getElementById('rankings-tbody');
    if (!rankingsTbody) return;
    
    const sortSelect = document.getElementById('sort-by');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            currentPage = 1;
            loadRankings();
        });
    }
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadRankings();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            currentPage++;
            loadRankings();
        });
    }
    
    loadRankings();
}

// ========== TRAINING SYSTEM ==========
function initializeTraining() {
    const tracksContainer = document.getElementById('tracks-container');
    if (!tracksContainer) return;
    
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentDifficulty = this.dataset.difficulty;
            difficultyButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            loadTracks(currentDifficulty);
        });
    });
    
    const modal = document.getElementById('training-modal');
    const closeModal = document.querySelector('.close-modal');
    const cancelTraining = document.getElementById('cancel-training');
    
    if (closeModal) closeModal.addEventListener('click', () => modal.style.display = 'none');
    if (cancelTraining) cancelTraining.addEventListener('click', () => modal.style.display = 'none');
    
    const startTraining = document.getElementById('start-training');
    if (startTraining) startTraining.addEventListener('click', startTrainingSession);
    
    loadTracks(currentDifficulty);
    loadTrainingHistory();
}

async function loadTracks(difficulty) {
    const tracksContainer = document.getElementById('tracks-container');
    if (!tracksContainer) return;
    
    try {
        tracksContainer.innerHTML = '<div class="loading">Loading tracks...</div>';
        const tracksQuery = query(collection(db, 'tracks'));
        const snapshot = await getDocs(tracksQuery);
        const tracks = [];
        
        snapshot.forEach(doc => {
            const trackData = doc.data();
            if (trackData.difficulty && trackData.difficulty.toLowerCase() === difficulty.toLowerCase()) {
                tracks.push({ id: doc.id, ...trackData });
            }
        });
        
        displayTracks(tracks);
    } catch (error) {
        tracksContainer.innerHTML = '<div class="error">Error loading tracks: ' + error.message + '</div>';
    }
}

async function displayTracks(tracks) {
    const tracksContainer = document.getElementById('tracks-container');
    const user = auth.currentUser;
    
    if (!tracksContainer || !user) return;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const cooldowns = userData.trainingCooldowns || {};
    const userCondition = userData.condition || 100;
    
    if (tracks.length === 0) {
        tracksContainer.innerHTML = '<div class="no-data">No tracks available for this difficulty</div>';
        return;
    }
    
    tracksContainer.innerHTML = tracks.map(track => {
        const isOnCooldown = cooldowns[track.id] && new Date(cooldowns[track.id]) > new Date();
        const hasEnoughCondition = userCondition >= (track.conditionCost || 0);
        const meetsRequirements = checkTrackRequirements(track, userData);
        const cooldownTime = isOnCooldown ? new Date(cooldowns[track.id]) : null;
        
        return `
            <div class="track-card ${isOnCooldown ? 'cooldown' : ''} ${!hasEnoughCondition || !meetsRequirements ? 'unavailable' : ''}">
                <div class="track-header">
                    <h4 class="track-name">${track.name || 'Unnamed Track'}</h4>
                    <span class="track-difficulty difficulty-${track.difficulty?.toLowerCase() || 'beginner'}">
                        ${(track.difficulty || 'Beginner').toUpperCase()}
                    </span>
                </div>
                <img src="${track.image || 'images/tracks/default.jpg'}" alt="${track.name || 'Track'}" class="track-image" onerror="this.src='images/tracks/default.jpg'">
                <p style="color: #88ffff; margin-bottom: 1rem;">${track.description || 'No description available'}</p>
                <div class="track-stats">
                    <div class="track-stat"><span class="stat-label">Distance</span><span class="stat-value">${track.distance || 0}km</span></div>
                    <div class="track-stat"><span class="stat-label">Condition Cost</span><span class="stat-value ${userCondition < (track.conditionCost || 0) ? 'error' : ''}">${track.conditionCost || 0}</span></div>
                    <div class="track-stat"><span class="stat-label">Cooldown</span><span class="stat-value">${formatCooldown(track.cooldown || 0)}</span></div>
                    <div class="track-stat"><span class="stat-label">Level Req.</span><span class="stat-value">${track.minRequirements?.minLevel || 1}</span></div>
                </div>
                <div class="time-requirements">
                    <div class="time-tier gold"><span>🏅 Gold</span><span>${formatTime(track.timeRequirements?.gold || 0)}</span></div>
                    <div class="time-tier silver"><span>🥈 Silver</span><span>${formatTime(track.timeRequirements?.silver || 0)}</span></div>
                    <div class="time-tier bronze"><span>🥉 Bronze</span><span>${formatTime(track.timeRequirements?.bronze || 0)}</span></div>
                </div>
                <div class="track-actions">
                    <button class="track-btn primary" onclick="selectTrack('${track.id}')" ${isOnCooldown || !hasEnoughCondition || !meetsRequirements ? 'disabled' : ''}>
                        ${isOnCooldown ? 'On Cooldown' : !hasEnoughCondition ? 'Low Condition' : !meetsRequirements ? 'Requirements' : 'Train'}
                    </button>
                </div>
                ${isOnCooldown ? `<div class="cooldown-timer">Available in: <span id="cooldown-${track.id}">${formatTimeRemaining(cooldownTime)}</span></div>` : ''}
            </div>
        `;
    }).join('');
    
    startCooldownTimers();
}

function checkTrackRequirements(track, userData) {
    if (track.minRequirements?.minLevel && userData.level < track.minRequirements.minLevel) return false;
    if (track.requirements?.minStats) {
        const userStats = userData.stats || {};
        for (const [stat, minValue] of Object.entries(track.requirements.minStats)) {
            if ((userStats[stat] || 0) < minValue) return false;
        }
    }
    return true;
}

window.selectTrack = function(trackId) {
    selectedTrack = trackId;
    showTrainingModal(trackId);
}

async function showTrainingModal(trackId) {
    const modal = document.getElementById('training-modal');
    const modalTrackName = document.getElementById('modal-track-name');
    const trainingInfo = document.getElementById('training-info');
    const startTrainingBtn = document.getElementById('start-training');
    
    if (!modal) return;
    
    try {
        const trackDoc = await getDoc(doc(db, 'tracks', trackId));
        if (!trackDoc.exists()) {
            alert('Track not found!');
            return;
        }
        
        const track = trackDoc.data();
        const user = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        modalTrackName.textContent = track.name || 'Unknown Track';
        trainingInfo.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <p style="color: #88ffff; margin-bottom: 0.5rem;">${track.description || 'No description available'}</p>
            </div>
            <div class="track-stats">
                <div class="track-stat">
                    <span class="stat-label">Your Condition</span>
                    <span class="stat-value ${userData.condition < (track.conditionCost || 0) ? 'error' : ''}">
                        ${userData.condition || 0}/${track.conditionCost || 0}
                    </span>
                </div>
                <div class="track-stat">
                    <span class="stat-label">Distance</span>
                    <span class="stat-value">${track.distance || 0}km</span>
                </div>
            </div>
            <div style="margin: 1rem 0; padding: 1rem; background: rgba(0, 255, 255, 0.05); border-radius: 8px;">
                <h4 style="color: #00ffff; margin-bottom: 0.5rem;">Potential Rewards:</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;">
                    <div style="text-align: center;">
                        <div style="color: #ffd700;">🏅 Gold</div>
                        <div>${formatTime(track.timeRequirements?.gold || 0)}</div>
                        <div>+${Math.round((track.baseReward?.gold || 0) * 1.5)} Gold</div>
                        <div>+${Math.round((track.baseReward?.xp || 0) * 1.5)} XP</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #c0c0c0;">🥈 Silver</div>
                        <div>${formatTime(track.timeRequirements?.silver || 0)}</div>
                        <div>+${track.baseReward?.gold || 0} Gold</div>
                        <div>+${track.baseReward?.xp || 0} XP</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #cd7f32;">🥉 Bronze</div>
                        <div>${formatTime(track.timeRequirements?.bronze || 0)}</div>
                        <div>+${Math.round((track.baseReward?.gold || 0) * 0.5)} Gold</div>
                        <div>+${Math.round((track.baseReward?.xp || 0) * 0.5)} XP</div>
                    </div>
                </div>
            </div>
            ${userData.condition < (track.conditionCost || 0) ? 
                '<p style="color: #ff6b6b; text-align: center;">❌ Not enough condition to train!</p>' : 
                '<p style="color: #00ff88; text-align: center;">✅ Ready to train!</p>'
            }
        `;
        startTrainingBtn.disabled = userData.condition < (track.conditionCost || 0);
        modal.style.display = 'block';
    } catch (error) {
        alert('Error loading track information');
    }
}

async function startTrainingSession() {
    if (!selectedTrack) return;
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const trackDoc = await getDoc(doc(db, 'tracks', selectedTrack));
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!trackDoc.exists() || !userDoc.exists()) {
            alert('Error starting training session');
            return;
        }
        
        const track = trackDoc.data();
        const userData = userDoc.data();
        
        if (userData.condition < (track.conditionCost || 0)) {
            alert('Not enough condition to train!');
            return;
        }
        
        const cooldowns = userData.trainingCooldowns || {};
        if (cooldowns[selectedTrack] && new Date(cooldowns[selectedTrack]) > new Date()) {
            alert('This track is still on cooldown!');
            return;
        }
        
        const completionTime = simulateTraining(track, userData);
        const reward = calculateTrainingReward(track, completionTime);
        const cooldownEnd = new Date(Date.now() + (track.cooldown || 0) * 1000);
        
        await updateDoc(doc(db, 'users', user.uid), {
            condition: (userData.condition || 0) - (track.conditionCost || 0),
            gold: (userData.gold || 0) + reward.gold,
            fame: (userData.fame || 0) + reward.fame,
            trainingCooldowns: { ...cooldowns, [selectedTrack]: cooldownEnd.toISOString() },
            trainingHistory: arrayUnion({
                trackId: selectedTrack,
                trackName: track.name || 'Unknown Track',
                completionTime: completionTime,
                reward: reward,
                conditionUsed: track.conditionCost || 0,
                completedAt: new Date().toISOString()
            })
        });
        
        await addXP(user.uid, reward.xp);
        document.getElementById('training-modal').style.display = 'none';
        showTrainingResults(track, completionTime, reward);
        await loadPlayerData(user.uid);
        loadTracks(currentDifficulty);
        loadTrainingHistory();
    } catch (error) {
        alert('Error starting training session');
    }
}

function calculateTrainingReward(track, completionTime) {
    let multiplier = 0.5;
    if (completionTime <= (track.timeRequirements?.gold || 0)) multiplier = 1.5;
    else if (completionTime <= (track.timeRequirements?.silver || 0)) multiplier = 1.0;
    
    const baseXP = track.baseReward?.xp || 25;
    const baseGold = track.baseReward?.gold || 50;
    const baseFame = track.baseReward?.fame || 5;
    
    return {
        gold: Math.round(baseGold * multiplier),
        xp: Math.round(baseXP * multiplier),
        fame: Math.round(baseFame * multiplier)
    };
}

function simulateTraining(track, userData) {
    const baseTime = ((track.timeRequirements?.gold || 0) + (track.timeRequirements?.bronze || 0)) / 2;
    const stats = userData.stats || {};
    let timeModifier = 1.0;
    timeModifier -= (stats.speed || 5) * 0.01;
    timeModifier -= (stats.handling || 5) * 0.005;
    timeModifier -= (stats.power || 5) * 0.003;
    timeModifier *= (0.9 + Math.random() * 0.2);
    const finalTime = baseTime * timeModifier;
    return Math.max((track.timeRequirements?.gold || 0) * 0.8, Math.min(finalTime, (track.timeRequirements?.bronze || 0) * 1.2));
}

function showTrainingResults(track, completionTime, reward) {
    let medal = '🥉 Bronze';
    if (completionTime <= (track.timeRequirements?.gold || 0)) medal = '🏅 Gold';
    else if (completionTime <= (track.timeRequirements?.silver || 0)) medal = '🥈 Silver';
    
    alert(`🎉 Training Complete!
Track: ${track.name || 'Unknown Track'}
Time: ${formatTime(completionTime)}
Medal: ${medal}

Rewards:
💰 +${reward.gold} Gold
⭐ +${reward.xp} XP
🏆 +${reward.fame} Fame
❤️ -${track.conditionCost || 0} Condition

Cooldown: ${formatCooldown(track.cooldown || 0)}`);
}

async function loadTrainingHistory() {
    const historyContainer = document.getElementById('training-history');
    if (!historyContainer) return;
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) return;
        const userData = userDoc.data();
        const history = userData.trainingHistory || [];
        const recentHistory = history.slice(-10).reverse();
        
        if (recentHistory.length === 0) {
            historyContainer.innerHTML = '<div class="no-data">No training history yet</div>';
            return;
        }
        
        historyContainer.innerHTML = recentHistory.map(session => `
            <div class="history-item">
                <div class="history-track">${session.trackName || 'Unknown Track'}</div>
                <div class="history-time">${formatTime(session.completionTime || 0)}</div>
                <div class="history-reward">+${session.reward?.gold || 0} Gold</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading training history:', error);
    }
}

function formatCooldown(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeRemaining(endTime) {
    if (!endTime) return '';
    const now = new Date();
    const diff = endTime - now;
    if (diff <= 0) return 'Ready!';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function startCooldownTimers() {
    setInterval(() => {
        const cooldownElements = document.querySelectorAll('[id^="cooldown-"]');
        cooldownElements.forEach(element => {
            const trackId = element.id.replace('cooldown-', '');
        });
    }, 1000);
}

// ========== STAT UPGRADE SYSTEM ==========
function calculateUpgradeCost(statLevel) {
    const baseCost = 5;
    const costIncrease = Math.floor(statLevel / 2);
    return baseCost + costIncrease;
}

window.upgradeStat = async function(statName) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to upgrade stats.');
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentStats = userData.stats || {};
            const currentLevel = currentStats[statName] || 1;
            const upgradeCost = calculateUpgradeCost(currentLevel);
            
            if (userData.gold < upgradeCost) {
                alert(`Not enough gold! You need ${upgradeCost} gold but only have ${userData.gold}.`);
                return;
            }
            
            if (!confirm(`Upgrade ${statName.toUpperCase()} from ${currentLevel} to ${currentLevel + 1} for ${upgradeCost} gold?`)) return;
            
            const updatedStats = { ...currentStats, [statName]: currentLevel + 1 };
            await updateDoc(userRef, { gold: userData.gold - upgradeCost, stats: updatedStats });
            alert(`✅ ${statName.toUpperCase()} upgraded to level ${currentLevel + 1} for ${upgradeCost} gold!`);
            await loadPlayerData(user.uid);
        }
    } catch (error) {
        alert('Error upgrading stat: ' + error.message);
    }
}

function initializeGarage() {
    const upgradeButtons = document.querySelectorAll('.upgrade-btn');
    if (upgradeButtons.length > 0) {
        const observer = new MutationObserver(() => updateUpgradeButtons());
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) observer.observe(statsContainer, { childList: true, subtree: true });
    }
}

function updateUpgradeButtons() {
    const user = auth.currentUser;
    if (!user) return;
    
    setTimeout(() => {
        const statElements = {
            'power': document.getElementById('power'),
            'speed': document.getElementById('speed'),
            'dexterity': document.getElementById('dexterity'),
            'structure': document.getElementById('structure'),
            'handling': document.getElementById('handling'),
            'luck': document.getElementById('luck')
        };
        
        for (const [statName, element] of Object.entries(statElements)) {
            if (element) {
                const currentLevel = parseInt(element.textContent) || 1;
                const upgradeCost = calculateUpgradeCost(currentLevel);
                const upgradeBtn = element.closest('.stat-item')?.querySelector('.upgrade-btn');
                if (upgradeBtn) {
                    upgradeBtn.textContent = `Upgrade (${upgradeCost} gold)`;
                    upgradeBtn.onclick = () => upgradeStat(statName);
                }
            }
        }
    }, 100);
}

// ========== ENHANCED INVENTORY DISPLAY ==========
function displayInventory(items) {
    const inventoryGrid = document.getElementById('inventory-grid');
    const inventoryCount = document.getElementById('inventory-count');
    
    if (!inventoryGrid) return;
    
    if (!items || items.length === 0) {
        inventoryGrid.innerHTML = `
            <div class="inventory-empty">
                <i class="fas fa-inbox"></i>
                <h4>Your inventory is empty</h4>
                <p>Visit the shop to purchase items</p>
            </div>
        `;
        if (inventoryCount) inventoryCount.textContent = '0 items';
        return;
    }

    let filteredItems = items;
    if (currentInventoryFilter !== 'all') {
        filteredItems = items.filter(item => item.type === currentInventoryFilter);
    }

    if (inventoryCount) {
        inventoryCount.textContent = `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}`;
    }

    const inventoryHTML = filteredItems.map(item => {
        const rarity = item.rarity || 'common';
        const isEquipped = item.equipped;
        const imagePath = getInventoryImagePath(item);
        const rarityColors = {
            common: '#888888', uncommon: '#00ff88', rare: '#0077ff',
            epic: '#a29bfe', legendary: '#feca57'
        };
        const color = rarityColors[rarity] || '#888888';
        let statBonusText = '';
        if (item.stats) {
            const bonuses = [];
            Object.entries(item.stats).forEach(([stat, value]) => {
                if (value > 0) bonuses.push(`+${value} ${stat}`);
            });
            if (bonuses.length > 0) statBonusText = `<div class="item-bonuses">${bonuses.join(', ')}</div>`;
        }
        
        return `
            <div class="inventory-item ${isEquipped ? 'equipped' : ''}">
                <div class="item-rarity" style="color: ${color}; border-color: ${color};">
                    ${rarity.toUpperCase()}
                </div>
                <div class="item-image-container">
                    <img src="${imagePath}" alt="${item.name}" class="item-preview-image"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div class="item-fallback-icon" style="display: none;">
                        <i class="${getItemIcon(item.type)}"></i>
                    </div>
                </div>
                <div class="item-name">${item.name}</div>
                <div class="item-type">${formatItemType(item.type)}</div>
                ${statBonusText}
                <div class="item-actions">
                    ${isEquipped ? 
                        `<button class="inventory-btn unequip-btn" onclick="unequipItem('${item.id}', '${item.type}')">
                            <i class="fas fa-times"></i> Unequip
                         </button>` :
                        `<button class="inventory-btn equip-btn" onclick="equipItem('${item.id}', '${item.type}')">
                            <i class="fas fa-check"></i> Equip
                         </button>`
                    }
                    <button class="inventory-btn sell-inv-btn" onclick="sellInventoryItem('${item.id}', '${item.type}', '${item.name}')">
                        <i class="fas fa-coins"></i> Sell
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    inventoryGrid.innerHTML = inventoryHTML;
    updateInventoryFilters();
}

function getInventoryImagePath(item) {
    const patterns = [
        `images/${item.type}s/${item.id}.jpg`,
        `images/${item.type}s/${item.id.toLowerCase().replace(/ /g, '_')}.jpg`,
        `images/${item.type}s/${item.id.toLowerCase().replace(/ /g, '-')}.jpg`,
        `images/cars/${item.id}.jpg`,
        `images/cars/${item.id.toLowerCase().replace(/ /g, '_')}.jpg`,
        `images/cars/${item.id.toLowerCase().replace(/ /g, '-')}.jpg`
    ];
    return patterns[0];
}

function updateEquippedItemsDisplay(inventory) {
    const equippedContainer = document.getElementById('equipped-items');
    if (!equippedContainer) return;
    
    const equippedItems = (inventory || []).filter(item => item.equipped && item.type !== 'car');
    
    if (equippedItems.length === 0) {
        equippedContainer.innerHTML = `
            <div class="no-equipped-items">
                <p>No parts equipped</p>
                <small>Equip items from your inventory</small>
            </div>
        `;
        return;
    }
    
    const equippedHTML = equippedItems.map(item => {
        const imagePath = getInventoryImagePath(item);
        return `
            <div class="equipped-item">
                <div class="equipped-item-image">
                    <img src="${imagePath}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div class="equipped-item-fallback">
                        <i class="${getItemIcon(item.type)}"></i>
                    </div>
                </div>
                <div class="equipped-item-info">
                    <div class="equipped-item-name">${item.name}</div>
                    <div class="equipped-item-type">${formatItemType(item.type)}</div>
                </div>
            </div>
        `;
    }).join('');
    equippedContainer.innerHTML = equippedHTML;
}

function formatItemType(type) {
    const typeMap = {
        'car': 'Car', 'engine': 'Engine', 'tire': 'Tires', 'turbo': 'Turbo',
        'suspension': 'Suspension', 'seat': 'Seats'
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function initializeInventory() {
    const inventoryGrid = document.getElementById('inventory-grid');
    if (!inventoryGrid) return;
    
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentInventoryFilter = this.dataset.filter;
            const user = auth.currentUser;
            if (user) loadPlayerData(user.uid);
        });
    });
    
    const sortSelect = document.getElementById('sort-inventory');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentInventorySort = this.value;
            const user = auth.currentUser;
            if (user) loadPlayerData(user.uid);
        });
    }
}

function updateInventoryFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === currentInventoryFilter) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

window.equipItem = async function(itemId, itemType) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const inventory = userData.inventory || [];
            const updatedInventory = inventory.map(item => {
                if (item.type === itemType) return { ...item, equipped: item.id === itemId };
                return item;
            });
            
            await updateDoc(userRef, { inventory: updatedInventory });
            await loadPlayerData(user.uid);
        }
    } catch (error) {
        alert('Error equipping item: ' + error.message);
    }
}

window.unequipItem = async function(itemId, itemType) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const inventory = userData.inventory || [];
            const updatedInventory = inventory.map(item => {
                if (item.id === itemId && item.type === itemType) return { ...item, equipped: false };
                return item;
            });
            
            await updateDoc(userRef, { inventory: updatedInventory });
            await loadPlayerData(user.uid);
        }
    } catch (error) {
        alert('Error unequipping item: ' + error.message);
    }
}

window.sellInventoryItem = async function(itemId, itemType, itemName) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to sell items.');
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const inventory = userData.inventory || [];
            const itemToSell = inventory.find(item => item.id === itemId && item.type === itemType);
            
            if (!itemToSell) {
                alert(`Item not found in inventory!`);
                return;
            }
            
            if (itemToSell.equipped) {
                alert(`You cannot sell ${itemName} because it's currently equipped! Unequip it first.`);
                return;
            }
            
            const estimatedValue = 100;
            const sellPrice = Math.floor(estimatedValue * 0.7);
            
            if (!confirm(`Sell ${itemName} for ${sellPrice} gold?`)) return;
            
            const updatedInventory = inventory.filter(item => !(item.id === itemId && item.type === itemType));
            await updateDoc(userRef, { gold: (userData.gold || 0) + sellPrice, inventory: updatedInventory });
            alert(`💰 Sold ${itemName} for ${sellPrice} gold!`);
            await loadPlayerData(user.uid);
        }
    } catch (error) {
        alert('Error selling item: ' + error.message);
    }
}

function getItemIcon(itemType) {
    const icons = {
        'car': 'fas fa-car', 'engine': 'fas fa-cogs', 'tire': 'fas fa-circle',
        'turbo': 'fas fa-bolt', 'suspension': 'fas fa-compress-alt', 
        'seat': 'fas fa-chair', 'default': 'fas fa-box'
    };
    return icons[itemType] || icons.default;
}

function calculateTotalStats(baseStats, inventory) {
    const totalStats = { ...baseStats };
    const equipmentBonuses = { power: 0, speed: 0, dexterity: 0, handling: 0, structure: 0, luck: 0 };
    
    if (inventory && Array.isArray(inventory)) {
        inventory.forEach(item => {
            if (item.equipped && item.stats) {
                Object.keys(item.stats).forEach(stat => {
                    if (equipmentBonuses.hasOwnProperty(stat)) {
                        equipmentBonuses[stat] += item.stats[stat] || 0;
                    }
                });
            }
        });
    }
    
    Object.keys(totalStats).forEach(stat => {
        totalStats[stat] = (totalStats[stat] || 0) + equipmentBonuses[stat];
    });
    
    return { base: baseStats, bonuses: equipmentBonuses, total: totalStats };
}

function updateEnhancedStatsDisplay(userData) {
    const stats = userData.stats || {};
    const inventory = userData.inventory || [];
    const calculatedStats = calculateTotalStats(stats, inventory);
    const statElements = {
        'power': { base: stats.power || 0, bonus: calculatedStats.bonuses.power },
        'speed': { base: stats.speed || 0, bonus: calculatedStats.bonuses.speed },
        'dexterity': { base: stats.dexterity || 0, bonus: calculatedStats.bonuses.dexterity },
        'handling': { base: stats.handling || 0, bonus: calculatedStats.bonuses.handling },
        'structure': { base: stats.structure || 0, bonus: calculatedStats.bonuses.structure },
        'luck': { base: stats.luck || 0, bonus: calculatedStats.bonuses.luck }
    };
    
    for (const [statId, values] of Object.entries(statElements)) {
        const element = document.getElementById(statId);
        const displayElement = document.getElementById(`${statId}-display`);
        if (element) {
            if (values.bonus > 0) {
                element.textContent = `${values.base} (+${values.bonus})`;
                element.style.color = '#00ff88';
            } else {
                element.textContent = values.base;
                element.style.color = '#00ffff';
            }
        }
        if (displayElement) {
            if (values.bonus > 0) {
                displayElement.textContent = `${values.base} (+${values.bonus})`;
                displayElement.style.color = '#00ff88';
            } else {
                displayElement.textContent = values.base;
                displayElement.style.color = '#00ffff';
            }
        }
    }
}

// ========== APPLICATION INITIALIZATION ==========
function initializePage() {
    const path = window.location.pathname;
    if (path.includes('garage.html')) initializeGarage();
    else if (path.includes('shop.html')) initializeShop();
    else if (path.includes('rankings.html')) initializeRankings();
    else if (path.includes('training.html')) initializeTraining();
    else if (document.getElementById('inventory-grid')) initializeInventory();
}

function onLoginSuccess(userData) {
    const authSection = document.getElementById('auth-section');
    const guestContent = document.getElementById('guest-content');
    const playerView = document.getElementById('player-view');
    
    if (authSection) authSection.style.display = 'none';
    if (guestContent) guestContent.style.display = 'none';
    if (playerView) playerView.style.display = 'block';
    
    updatePlayerUI(userData);
    if (userData.inventory) displayInventory(userData.inventory);
    initializeConditionRecovery();
}

function onLogout() {
    const authSection = document.getElementById('auth-section');
    const guestContent = document.getElementById('guest-content');
    const playerView = document.getElementById('player-view');
    
    if (authSection) authSection.style.display = 'block';
    if (guestContent) guestContent.style.display = 'block';
    if (playerView) playerView.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing application...");
    loadNavbar();
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User logged in:", user.uid);
            loadPlayerData(user.uid);
            initializeConditionRecovery();
            initializePage();
            onLoginSuccess({});
        } else {
            console.log("User logged out");
            onLogout();
        }
    });
});

// ========== GLOBAL FUNCTION EXPORTS ==========
window.loadPlayerData = loadPlayerData;
window.showCategory = showCategory;
window.buyItem = buyItem;
window.sellItem = sellItem;
window.upgradeStat = upgradeStat;
window.loadRankings = loadRankings;
window.logout = logout;
window.selectTrack = selectTrack;
window.equipItem = equipItem;
window.unequipItem = unequipItem;
window.sellInventoryItem = sellInventoryItem;

// ========== CSS STYLES ==========
const style = document.createElement('style');
style.textContent = `
    .token-price {
        background: linear-gradient(135deg, rgba(162, 155, 254, 0.1), rgba(162, 155, 254, 0.05)) !important;
        border: 1px solid rgba(162, 155, 254, 0.3) !important;
        color: #a29bfe !important;
    }
    
    @keyframes levelUpPop {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        70% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    
    .inventory-item {
        background: linear-gradient(135deg, rgba(26, 26, 46, 0.8), rgba(22, 33, 62, 0.8));
        border: 1px solid rgba(0, 255, 255, 0.3);
        border-radius: 12px;
        padding: 1rem;
        text-align: center;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
    }
    
    .inventory-item:hover {
        transform: translateY(-5px);
        border-color: #00ffff;
        box-shadow: 0 8px 25px rgba(0, 255, 255, 0.2);
    }
    
    .item-rarity {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        font-size: 0.7rem;
        padding: 0.2rem 0.5rem;
        border-radius: 10px;
        font-weight: 700;
    }
    
    .rarity-common { background: rgba(136, 136, 136, 0.3); color: #888; }
    .rarity-rare { background: rgba(0, 255, 136, 0.3); color: #00ff88; }
    .rarity-epic { background: rgba(162, 155, 254, 0.3); color: #a29bfe; }
    .rarity-legendary { background: rgba(254, 202, 87, 0.3); color: #feca57; }
    
    .item-icon {
        font-size: 2rem;
        margin-bottom: 0.8rem;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #00ffff;
    }
    
    .item-name {
        font-size: 0.9rem;
        color: #ffffff;
        margin-bottom: 0.5rem;
        font-weight: 600;
    }
    
    .item-type {
        font-size: 0.7rem;
        color: #88ffff;
        margin-bottom: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .item-quantity {
        background: rgba(0, 255, 255, 0.1);
        border: 1px solid rgba(0, 255, 255, 0.3);
        border-radius: 15px;
        padding: 0.3rem 0.8rem;
        font-size: 0.8rem;
        color: #00ffff;
        font-weight: 700;
    }
    
    .inventory-empty {
        grid-column: 1 / -1;
        text-align: center;
        padding: 3rem 2rem;
        color: #88ffff;
    }
    
    .inventory-empty i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .inventory-empty h4 {
        color: #00ffff;
        margin-bottom: 0.5rem;
    }
`;
document.head.appendChild(style);