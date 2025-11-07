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

// Debug Firestore permissions
window.testFirestorePermissions = async function() {
    const user = auth.currentUser;
    if (!user) {
        console.log("No user logged in");
        return;
    }

    console.log("=== TESTING FIRESTORE PERMISSIONS ===");
    console.log("User ID:", user.uid);
    console.log("User Email:", user.email);

    try {
        // Test 1: Try to read users collection
        console.log("🔍 Testing READ permission...");
        const usersQuery = query(collection(db, "users"), limit(1));
        const usersSnapshot = await getDocs(usersQuery);
        console.log("✅ READ permission: GRANTED");

        // Test 2: Try to write to user's own document
        console.log("📝 Testing WRITE permission...");
        const testData = {
            test: true,
            timestamp: new Date().toISOString()
        };
        
        await setDoc(doc(db, "users", user.uid), testData, { merge: true });
        console.log("✅ WRITE permission: GRANTED");

        // Test 3: Try to create a new document (simulate signup)
        console.log("🆕 Testing CREATE permission...");
        const testUserId = user.uid + "_test";
        const newUserData = {
            email: "test@test.com",
            username: "testuser",
            level: 1,
            createdAt: serverTimestamp()
        };
        
        await setDoc(doc(db, "users", testUserId), newUserData);
        console.log("✅ CREATE permission: GRANTED");
        
        // Clean up test document
        await deleteDoc(doc(db, "users", testUserId));
        console.log("✅ DELETE permission: GRANTED");

        console.log("🎉 ALL PERMISSIONS WORKING CORRECTLY!");

    } catch (error) {
        console.error("❌ Permission test failed:", error);
        console.log("Error code:", error.code);
        console.log("Error message:", error.message);
        
        if (error.code === 'permission-denied') {
            console.log("🔒 FIRESTORE RULES ARE BLOCKING ACCESS");
            console.log("Please check your Firestore security rules in Firebase Console");
        }
    }
};

// ========== SIGNUP FUNCTION ==========
window.signup = async function(email, password) {
    try {
        console.log("Creating account for:", email);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Signup successful:", userCredential.user);
        
        // Create initial player data in Firestore
        await createNewPlayer(userCredential.user.uid, email);

        // Wait a moment for Firestore to process the write
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return userCredential.user;
    } catch (error) {
        console.error("Signup error:", error.code, error.message);
        throw error;
    }
}

// ========== SIGNUP HANDLER ==========
window.handleSignup = async function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageEl = document.getElementById('authMessage');
    
    if (!email || !password) {
        if (messageEl) {
            messageEl.textContent = "Please enter both email and password";
            messageEl.style.color = "#ff6b6b";
        }
        return;
    }
    
    if (password.length < 6) {
        if (messageEl) {
            messageEl.textContent = "Password must be at least 6 characters";
            messageEl.style.color = "#ff6b6b";
        }
        return;
    }
    
    try {
        if (messageEl) {
            messageEl.textContent = "Creating account...";
            messageEl.style.color = "#00ffff";
        }
        
        await signup(email, password);
        
        if (messageEl) {
            messageEl.textContent = "Account created successfully!";
            messageEl.style.color = "#00ff88";
        }
        
        // Auto-login after successful signup with retry
        setTimeout(async () => {
            try {
                await login(email, password);
                if (messageEl) {
                    messageEl.textContent = "Auto-login successful!";
                    messageEl.style.color = "#00ff88";
                }
                
                // Force reload player data after a short delay
                setTimeout(() => {
                    const user = auth.currentUser;
                    if (user) {
                        loadPlayerData(user.uid);
                    }
                }, 1500);
                
            } catch (error) {
                if (messageEl) {
                    messageEl.textContent = `Account created but login failed: ${error.message}`;
                    messageEl.style.color = "#ff6b6b";
                }
            }
        }, 1000);
        
    } catch (error) {
        console.error("Signup error:", error);
        if (messageEl) {
            messageEl.textContent = `Signup failed: ${error.message}`;
            messageEl.style.color = "#ff6b6b";
        }
    }
}

// Debug function to check player data
window.debugPlayerData = async function() {
    const user = auth.currentUser;
    if (!user) {
        console.log("No user logged in");
        return;
    }
    
    console.log("=== DEBUG PLAYER DATA ===");
    console.log("User ID:", user.uid);
    console.log("User Email:", user.email);
    
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("Firestore Data:", userData);
            console.log("Inventory:", userData.inventory);
            console.log("Stats:", userData.stats);
        } else {
            console.log("❌ No data in Firestore");
        }
    } catch (error) {
        console.error("Debug error:", error);
    }
};

// Debug image loading for inventory items
window.debugInventoryImages = function() {
    const inventoryItems = document.querySelectorAll('.inventory-item');
    console.log(`🔍 Found ${inventoryItems.length} inventory items`);
    
    inventoryItems.forEach((item, index) => {
        const itemId = item.getAttribute('data-item-id');
        const itemType = item.getAttribute('data-item-type');
        const img = item.querySelector('.item-preview-image');
        
        console.log(`Item ${index + 1}:`, {
            id: itemId,
            type: itemType,
            currentSrc: img?.src,
            visible: img?.style.display !== 'none'
        });
        
        // Test what path would be generated
        const testItem = { id: itemId, type: itemType };
        const generatedPath = getInventoryImagePath(testItem);
        console.log(`   Generated path: ${generatedPath}`);
        
        // Test if image exists
        if (img) {
            const testImg = new Image();
            testImg.onload = function() {
                console.log(`   ✅ Image exists: ${img.src}`);
            };
            testImg.onerror = function() {
                console.log(`   ❌ Image missing: ${img.src}`);
                
                // Show fallbacks that would be tried
                const fallbacks = generateImageFallbacks(itemId, itemType);
                console.log(`   Fallbacks:`, fallbacks);
            };
            testImg.src = img.src;
        }
    });
};

// ========== AUTH STATE MANAGEMENT ==========
onAuthStateChanged(auth, (user) => {
    console.log("Auth state changed:", user);
    if (user) {
        console.log("User logged in:", user.email);
        document.body.classList.add('player-logged-in');
        document.body.classList.remove('player-logged-out');
        loadPlayerData(user.uid);
        initializeConditionRecovery();
        initializePage();
        updateNavbarAuthState();
    } else {
        console.log("User logged out");
        document.body.classList.add('player-logged-out');
        document.body.classList.remove('player-logged-in');
        updateNavbarAuthState();
    }
});

// Debug login function
window.debugAuth = async function() {
    const auth = getAuth();
    console.log("Current auth state:", auth.currentUser);
    console.log("Persisted auth:", await auth.currentUser?.getIdToken());
};

// Call this to check current state
setTimeout(() => {
    console.log("Checking initial auth state...");
    window.debugAuth();
}, 1000);

// Enhanced login function (YOUR ORIGINAL)
async function login(email, password) {
    try {
        console.log("Attempting login for:", email);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login successful:", userCredential.user);
        return userCredential.user;
    } catch (error) {
        console.error("Login error:", error.code, error.message);
        throw error;
    }
}

// ========== LOGOUT FUNCTION ==========
window.logout = function() {
    signOut(auth).then(() => {
        sessionStorage.removeItem("playerData");
        // Force a page refresh to reset everything
        window.location.reload();
    }).catch((error) => {
        console.error("Logout error:", error);
    });
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
            console.error("No user data found for:", userId);
            // Try to create the player data if it doesn't exist
            await createNewPlayer(userId, auth.currentUser?.email || "unknown");
            console.log("Created missing player data, reloading...");
            // Reload the data after creation
            await loadPlayerData(userId);
        }
    } catch (error) {
        console.error("Error loading player data:", error);
        // Try one more time after a delay
        setTimeout(async () => {
            try {
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    updatePlayerUI(userData);
                }
            } catch (retryError) {
                console.error("Retry failed:", retryError);
            }
        }, 2000);
    }
}

// Player data functions (YOUR ORIGINAL)
// ========== CREATE NEW PLAYER DATA ==========
async function createNewPlayer(uid, email) {
    try {
        console.log("🔄 Creating player data for:", uid);
        
        const playerData = {
            email: email,
            username: email.split('@')[0],
            level: 1,
            xp: 0,
            gold: 100,
            tokens: 0,
            fame: 0,
            condition: 100,
            lastConditionUpdate: serverTimestamp(),
            stats: {
                power: 5,
                speed: 5,
                dexterity: 5,
                handling: 5,
                structure: 5,
                luck: 5
            },
            inventory: [
                {
                    id: "rusty_rider",
                    type: "car",
                    name: "Rusty Rider",
                    equipped: true,
                    rarity: "common",
                    stats: {
                        power: 3,
                        speed: 2,
                        structure: 2,
                        dexterity: 1,
                        handling: 1,
                        luck: 0
                    }
                }
            ],
            trainingCooldowns: {},
            trainingHistory: [],
            createdAt: serverTimestamp()
        };
        
        console.log("📦 Player data prepared:", playerData);
        
        // Try to create the document
        await setDoc(doc(db, "users", uid), playerData);
        console.log("✅ Player data created successfully for:", uid);
        
        return true;
        
    } catch (error) {
        console.error("❌ Error creating player:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        // Specific error handling
        if (error.code === 'permission-denied') {
            console.error("🔒 PERMISSION DENIED - Firestore rules are blocking");
            alert("Firestore Permission Error: Cannot create player data. Please check security rules.");
        } else if (error.code === 'not-found') {
            console.error("🔍 COLLECTION NOT FOUND - Check if 'users' collection exists");
        } else {
            console.error("💥 UNKNOWN ERROR:", error);
        }
        
        throw error;
    }
}

// Enhanced update function for image paths
window.updateOldPlayerData = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert("Please log in first");
        return;
    }

    try {
        console.log("🔄 Updating image paths for player:", user.uid);
        
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            alert("No player data found");
            return;
        }
        
        const userData = userSnap.data();
        const inventory = userData.inventory || [];
        
        console.log("📦 Current inventory:", inventory);
        
        // Update all items with proper image paths
        const updatedInventory = inventory.map(item => {
            const updatedItem = { ...item };
            
            // Always set imagePath using the new function
            updatedItem.imagePath = getInventoryImagePath(item);
            
            console.log(`   ${item.type} ${item.id} -> ${updatedItem.imagePath}`);
            
            return updatedItem;
        });
        
        await updateDoc(userRef, {
            inventory: updatedInventory
        });
        
        console.log("✅ Inventory updated with new image paths");
        alert("Image paths updated! Refreshing...");
        
        // Reload to see changes
        setTimeout(() => {
            loadPlayerData(user.uid);
        }, 1000);
        
    } catch (error) {
        console.error("❌ Error updating image paths:", error);
        alert("Error: " + error.message);
    }
}

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

// Rest System
class RestSystem {
    constructor() {
        this.isResting = false;
        this.restEndTime = null;
        this.selectedRestTime = null;
        this.restInterval = null;
        this.luckMultiplier = 1;
        
        this.initializeRestSystem();
    }
    
    initializeRestSystem() {
        this.loadRestState();
        this.renderRestSection();
        // Delay event listeners to ensure DOM is ready
        setTimeout(() => {
            this.setupEventListeners();
            this.updateActionButtons();
        }, 100);
        this.startRestTimer();
    }
    
    renderRestSection() {
        const restSection = document.querySelector('.rest-section');
        if (!restSection) {
            console.warn('Rest section not found in DOM');
            return;
        }
        
        restSection.innerHTML = `
            <h3>🛌 Rest & Recovery</h3>
            ${this.isResting ? this.renderActiveRest() : this.renderRestOptions()}
        `;
        
        // Re-attach event listeners after rendering
        setTimeout(() => this.setupEventListeners(), 50);
    }
    
    renderActiveRest() {
        const timeLeft = this.getTimeLeft();
        const progress = this.getRestProgress();
        const rewards = this.calculateRewards();
        
        return `
            <div class="rest-timer">
                <div class="rest-time-remaining">${this.formatTime(timeLeft)}</div>
                <div class="rest-progress">
                    <div class="rest-progress-bar" style="width: ${progress}%"></div>
                </div>
                <div style="color: #88ffff; font-size: 0.8rem;">Resting in progress...</div>
            </div>
            
            <div class="rest-benefits">
                <div class="rest-benefit">
                    <div class="rest-benefit-value">+${rewards.condition}%</div>
                    <div class="rest-benefit-label">Condition Recovery</div>
                </div>
                <div class="rest-benefit">
                    <div class="rest-benefit-value">+${rewards.xp}</div>
                    <div class="rest-benefit-label">XP Gained</div>
                </div>
                <div class="rest-benefit">
                    <div class="rest-benefit-value">+${rewards.gold}</div>
                    <div class="rest-benefit-label">Gold Gained</div>
                </div>
                <div class="rest-benefit">
                    <div class="rest-benefit-value">${this.luckMultiplier.toFixed(1)}x</div>
                    <div class="rest-benefit-label">Luck Bonus</div>
                </div>
            </div>
            
            <div class="rest-actions">
                <button class="cancel-rest-btn" type="button">
                    ⏹️ Cancel Rest
                </button>
            </div>
            
            <div style="text-align: center; margin-top: 1rem; color: #88ffff; font-size: 0.8rem;">
                ⚠️ While resting, you can only manage inventory and trade items.
            </div>
        `;
    }
    
    renderRestOptions() {
        const restTimes = [1, 2, 3, 4, 5, 6, 7, 8];
        
        return `
            <div style="margin-bottom: 1rem; color: #88ffff;">
                Select rest duration to rapidly recover condition and earn rewards based on your luck.
            </div>
            
            <div class="rest-options">
                ${restTimes.map(hours => `
                    <div class="rest-option ${this.selectedRestTime === hours ? 'selected' : ''}" 
                         data-hours="${hours}">
                        ${hours}h
                    </div>
                `).join('')}
            </div>
            
            ${this.selectedRestTime ? this.renderRestPreview() : ''}
            
            <div class="rest-actions">
                <button class="start-rest-btn" type="button" ${!this.selectedRestTime ? 'disabled' : ''}>
                    🛌 Start Resting
                </button>
            </div>
        `;
    }
    
    renderRestPreview() {
        const rewards = this.calculateRewards();
        
        return `
            <div class="rest-benefits">
                <div class="rest-benefit">
                    <div class="rest-benefit-value">+${rewards.condition}%</div>
                    <div class="rest-benefit-label">Condition</div>
                </div>
                <div class="rest-benefit">
                    <div class="rest-benefit-value">+${rewards.xp}</div>
                    <div class="rest-benefit-label">XP</div>
                </div>
                <div class="rest-benefit">
                    <div class="rest-benefit-value">+${rewards.gold}</div>
                    <div class="rest-benefit-label">Gold</div>
                </div>
            </div>
            
            <div class="rest-luck-bonus">
                <div class="label">Luck Bonus Multiplier</div>
                <div class="value">${this.luckMultiplier.toFixed(1)}x</div>
            </div>
        `;
    }
    
    selectRestTime(hours) {
        this.selectedRestTime = hours;
        this.calculateLuckBonus();
        this.renderRestSection();
    }
    
    calculateLuckBonus() {
        // Safely get player luck with fallbacks
        let playerLuck = 50; // default
        if (window.gameState?.player?.stats?.luck) {
            playerLuck = window.gameState.player.stats.luck;
        } else if (window.gameState?.player?.luck) {
            playerLuck = window.gameState.player.luck;
        }
        this.luckMultiplier = 0.5 + (playerLuck / 100) * 1.5;
    }
    
    calculateRewards() {
        if (!this.selectedRestTime) return { condition: 0, xp: 0, gold: 0 };
        
        const baseCondition = this.selectedRestTime * 12;
        const baseXP = this.selectedRestTime * 25;
        const baseGold = this.selectedRestTime * 15;
        
        return {
            condition: Math.floor(baseCondition * this.luckMultiplier),
            xp: Math.floor(baseXP * this.luckMultiplier),
            gold: Math.floor(baseGold * this.luckMultiplier)
        };
    }
    
    startRest() {
        if (!this.selectedRestTime || this.isResting) {
            this.showNotification('Please select a rest time first!');
            return;
        }
        
        this.isResting = true;
        this.restEndTime = Date.now() + (this.selectedRestTime * 60 * 60 * 1000);
        
        document.body.classList.add('resting');
        this.saveRestState();
        this.renderRestSection();
        this.showNotification(`Started resting for ${this.selectedRestTime} hours!`);
        this.startRestTimer();
        
        // Update buttons after a short delay to ensure UI is updated
        setTimeout(() => this.updateActionButtons(), 100);
    }
    
    cancelRest() {
        if (!this.isResting) return;
        
        this.isResting = false;
        this.restEndTime = null;
        this.selectedRestTime = null;
        
        document.body.classList.remove('resting');
        this.saveRestState();
        this.renderRestSection();
        this.showNotification('Rest cancelled.');
        
        // Update buttons after a short delay
        setTimeout(() => this.updateActionButtons(), 100);
        
        if (this.restInterval) {
            clearInterval(this.restInterval);
            this.restInterval = null;
        }
    }
    
    completeRest() {
        if (!this.isResting) return;
        
        const rewards = this.calculateRewards();
        
        // Apply rewards safely
        if (window.gameState?.player) {
            window.gameState.player.condition = Math.min(100, (window.gameState.player.condition || 0) + rewards.condition);
            window.gameState.player.xp = (window.gameState.player.xp || 0) + rewards.xp;
            window.gameState.player.gold = (window.gameState.player.gold || 0) + rewards.gold;
            
            // Update UI if update function exists
            if (window.updatePlayerStats) {
                window.updatePlayerStats();
            }
        }
        
        this.isResting = false;
        this.restEndTime = null;
        this.selectedRestTime = null;
        
        document.body.classList.remove('resting');
        this.saveRestState();
        this.renderRestSection();
        
        this.showNotification(
            `Rest completed! Gained: +${rewards.condition}% condition, +${rewards.xp} XP, +${rewards.gold} gold`
        );
        
        // Update buttons after completion
        setTimeout(() => this.updateActionButtons(), 100);
        
        if (this.restInterval) {
            clearInterval(this.restInterval);
            this.restInterval = null;
        }
    }
    
    updateActionButtons() {
        // More specific selectors for training and challenge buttons
        const trainingButtons = document.querySelectorAll(`
            .training-btn, 
            button[onclick*="train"], 
            button[onclick*="Training"],
            .training-section button,
            [class*="train"] button
        `);
        
        const challengeButtons = document.querySelectorAll(`
            .accept-btn, 
            .decline-btn, 
            .challenge-btn, 
            .challenge-claim-btn,
            button[onclick*="challenge"],
            button[onclick*="Challenge"],
            .challenges-section button
        `);
        
        const pvpButtons = document.querySelectorAll(`
            .pvp-section button, 
            button[onclick*="race"], 
            button[onclick*="Race"],
            button[onclick*="pvp"],
            button[onclick*="PvP"]
        `);
        
        const allRestrictedButtons = [
            ...trainingButtons, 
            ...challengeButtons, 
            ...pvpButtons
        ];
        
        console.log(`Found ${allRestrictedButtons.length} buttons to update`);
        
        allRestrictedButtons.forEach(button => {
            if (this.isResting) {
                // Lock buttons
                button.disabled = true;
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
                button.setAttribute('title', 'Cannot perform this action while resting');
                button.setAttribute('data-was-disabled', 'true');
            } else {
                // Only unlock if we disabled it
                if (button.getAttribute('data-was-disabled') === 'true') {
                    button.disabled = false;
                    button.style.opacity = '1';
                    button.style.cursor = 'pointer';
                    button.removeAttribute('title');
                    button.removeAttribute('data-was-disabled');
                }
            }
        });
    }
    
    setupEventListeners() {
        // Remove existing listeners first to avoid duplicates
        this.removeEventListeners();
        
        // Rest option selection - use event delegation for better reliability
        const restOptions = document.querySelector('.rest-options');
        if (restOptions) {
            restOptions.addEventListener('click', (e) => {
                const option = e.target.closest('.rest-option');
                if (option) {
                    const hours = parseInt(option.getAttribute('data-hours'));
                    this.selectRestTime(hours);
                }
            });
        }
        
        // Start rest button
        const startBtn = document.querySelector('.start-rest-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startRest());
        }
        
        // Cancel rest button
        const cancelBtn = document.querySelector('.cancel-rest-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelRest());
        }
    }
    
    removeEventListeners() {
        // Clean up existing listeners if needed
        const restOptions = document.querySelector('.rest-options');
        if (restOptions) {
            restOptions.replaceWith(restOptions.cloneNode(true));
        }
    }
    
    startRestTimer() {
        if (this.restInterval) {
            clearInterval(this.restInterval);
        }
        
        this.restInterval = setInterval(() => {
            if (!this.isResting) return;
            
            const timeLeft = this.getTimeLeft();
            
            if (timeLeft <= 0) {
                this.completeRest();
            } else {
                // Only re-render every 10 seconds to improve performance
                if (Date.now() % 10000 < 1000) {
                    this.renderRestSection();
                }
            }
        }, 1000);
    }
    
    getTimeLeft() {
        if (!this.isResting || !this.restEndTime) return 0;
        return Math.max(0, this.restEndTime - Date.now());
    }
    
    getRestProgress() {
        if (!this.isResting || !this.selectedRestTime) return 0;
        
        const totalTime = this.selectedRestTime * 60 * 60 * 1000;
        const timePassed = totalTime - this.getTimeLeft();
        return (timePassed / totalTime) * 100;
    }
    
    formatTime(milliseconds) {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    showNotification(message) {
        // Remove existing notification
        const existingNotification = document.querySelector('.rest-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = 'rest-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00ff88, #00ffff);
            color: #1a1a2e;
            padding: 1rem;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 255, 255, 0.3);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
        `;
        
        // Add animation style if not exists
        if (!document.querySelector('#rest-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'rest-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
    
    saveRestState() {
        const restState = {
            isResting: this.isResting,
            restEndTime: this.restEndTime,
            selectedRestTime: this.selectedRestTime
        };
        localStorage.setItem('playerRestState', JSON.stringify(restState));
    }
    
    loadRestState() {
        const saved = localStorage.getItem('playerRestState');
        if (saved) {
            try {
                const restState = JSON.parse(saved);
                this.isResting = restState.isResting;
                this.restEndTime = restState.restEndTime;
                this.selectedRestTime = restState.selectedRestTime;
                
                if (this.isResting && this.restEndTime && Date.now() >= this.restEndTime) {
                    setTimeout(() => this.completeRest(), 100);
                } else if (this.isResting) {
                    document.body.classList.add('resting');
                    // Update buttons when loading resting state
                    setTimeout(() => this.updateActionButtons(), 200);
                }
            } catch (error) {
                console.error('Error loading rest state:', error);
                // Clear corrupted state
                localStorage.removeItem('playerRestState');
            }
        }
    }
}

// Global rest check function
function isPlayerResting() {
    return window.restSystem && window.restSystem.isResting;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.restSystem = new RestSystem();
});

// Update buttons when new content is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.restSystem) {
            window.restSystem.updateActionButtons();
        }
    }, 1000);
});

// ========== PLAYER DATA FUNCTIONS ==========
function updatePlayerUI(userData) {
    try {
        // Check if userData is valid
        if (!userData) {
            console.error("No user data provided to updatePlayerUI");
            return;
        }

        console.log("Updating UI with:", userData);

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
            "gold": userData.gold || 0,
            "tokens": userData.tokens || 0,
            "fame": userData.fame || 0,
            "xp": `${currentXP}/${xpRequired}`,
            "condition": `${Math.floor(userData.condition || 100)}%`,
            "shop-gold": userData.gold || 0,
            "power": stats.power || 10,
            "speed": stats.speed || 10,
            "dexterity": stats.dexterity || 10,
            "handling": stats.handling || 10,
            "structure": stats.structure || 10,
            "luck": stats.luck || 10,
            "power-display": stats.power || 10,
            "speed-display": stats.speed || 10,
            "dexterity-display": stats.dexterity || 10,
            "handling-display": stats.handling || 10,
            "structure-display": stats.structure || 10,
            "luck-display": stats.luck || 10
        };
        
        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
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
        
    } catch (error) {
        console.error("Error in updatePlayerUI:", error);
    }
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

// FIXED: Equipment display for the right panel
function updateEquipmentDisplay(userData) {
    const equippedCar = getEquippedCar(userData.inventory);
    
    // Update car display in equipment section
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
    }
    
    if (carName) {
        carName.textContent = equippedCar.name || "Rusty Rider";
    }
    
    if (carStats) {
        let bonusText = '';
        if (equippedCar.stats) {
            const bonuses = [];
            Object.entries(equippedCar.stats).forEach(([stat, value]) => {
                if (value > 0) {
                    bonuses.push(`+${value} ${stat}`);
                }
            });
            if (bonuses.length > 0) {
                bonusText = ` • ${bonuses.join(', ')}`;
            }
        }
        carStats.innerHTML = `Equipped${bonusText}`;
    }
    
    // Update other equipped items display
    updateEquippedItemsDisplay(userData.inventory);
    
}

// FIXED: Display all equipped items in the right panel (KEEP THIS ONE - REMOVE THE DUPLICATE BELOW)
function updateEquippedItemsDisplay(inventory) {
    const equippedContainer = document.getElementById('equipped-items');
    if (!equippedContainer) return;
    
    const equippedItems = (inventory || []).filter(item => item.equipped && item.type !== 'car');
    
    if (equippedItems.length === 0) {
        equippedContainer.innerHTML = `
            <div class="no-equipped-items">
                <i class="fas fa-wrench"></i>
                <p>No parts equipped</p>
                <small>Equip items from your inventory</small>
            </div>
        `;
        return;
    }
    
    const equippedHTML = equippedItems.map(item => {
        const imagePath = getInventoryImagePath(item);
        const rarity = item.rarity || 'common';
        const rarityColors = {
            common: '#888888', uncommon: '#00ff88', rare: '#0077ff',
            epic: '#a29bfe', legendary: '#feca57'
        };
        const color = rarityColors[rarity] || '#888888';
        
        let statText = '';
        if (item.stats) {
            const stats = [];
            Object.entries(item.stats).forEach(([stat, value]) => {
                if (value > 0) stats.push(`+${value} ${stat}`);
            });
            if (stats.length > 0) statText = `<div class="equipped-stats">${stats.join(', ')}</div>`;
        }
        
        return `
            <div class="equipped-item" data-item-id="${item.id}">
                <div class="equipped-item-header">
                    <div class="equipped-item-rarity" style="color: ${color}">${rarity.toUpperCase()}</div>
                    <button class="unequip-small-btn" onclick="unequipItem('${item.id}', '${item.type}')" title="Unequip">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="equipped-item-image">
                    <img src="${imagePath}" 
                         alt="${item.name}"
                         onerror="handleEquippedImageError(this, '${item.id}', '${item.type}')">
                    <div class="equipped-item-fallback">
                        <i class="${getItemIcon(item.type)}"></i>
                    </div>
                </div>
                <div class="equipped-item-info">
                    <div class="equipped-item-name">${item.name}</div>
                    <div class="equipped-item-type">${formatItemType(item.type)}</div>
                    ${statText}
                </div>
            </div>
        `;
    }).join('');
    
    equippedContainer.innerHTML = equippedHTML;
}

// NEW: Handle equipped item image errors
window.handleEquippedImageError = function(imgElement, itemId, itemType) {
    console.log(`Equipped item image failed: ${imgElement.src}`);
    
    const fallbackIcon = imgElement.nextElementSibling;
    if (fallbackIcon && fallbackIcon.classList.contains('equipped-item-fallback')) {
        imgElement.style.display = 'none';
        fallbackIcon.style.display = 'flex';
    }
};

function tryNextFallback(imgElement, fallbacks, index) {
    if (index >= fallbacks.length) {
        console.log('❌ All image fallbacks failed for:', imgElement.alt);
        return;
    }
    
    const nextSrc = fallbacks[index];
    console.log(`🔄 Trying fallback ${index + 1}/${fallbacks.length}: ${nextSrc}`);
    
    const testImg = new Image();
    testImg.onload = function() {
        console.log(`✅ Fallback image found: ${nextSrc}`);
        imgElement.src = nextSrc;
        imgElement.style.display = 'block';
        
        // Hide the fallback icon if it was shown
        const fallbackIcon = imgElement.nextElementSibling;
        if (fallbackIcon && fallbackIcon.classList.contains('item-fallback-icon')) {
            fallbackIcon.style.display = 'none';
        }
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

// Update the rankings display to include challenge buttons
function displayRankings(players, startRank) {
    const rankingsTbody = document.getElementById('rankings-tbody');
    if (!rankingsTbody) return;
    
    if (players.length === 0) {
        rankingsTbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data-row">No players found in this range</td>
            </tr>
        `;
        return;
    }

    const currentUserId = auth.currentUser?.uid;

    rankingsTbody.innerHTML = players.map((player, index) => {
        const rank = startRank + index;
        const isCurrentUser = player.id === currentUserId;
        
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
                    <i class="fas fa-star"></i>
                    ${player.fame || 0}
                </td>
                <td class="level-cell">
                    <i class="fas fa-level-up-alt"></i>
                    ${player.level || 1}
                </td>
                <td class="car-cell">
                    ${getCurrentCarName(player) || 'No Car'}
                </td>
                <td class="value-cell">
                    <i class="fas fa-coins"></i>
                    $${(player.gold || 0).toLocaleString()}
                </td>
                <td class="actions-cell">
                    ${!isCurrentUser ? `
                        <button class="action-btn challenge-btn" 
                                onclick="challengePlayer('${player.id}', '${player.username || 'Unknown Player'}', ${player.level || 1})"
                                title="Challenge to a race">
                            🏁 Challenge
                        </button>
                    ` : '<span class="self-text">-</span>'}
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
    // REST CHECK - Fixed syntax
    if (window.restSystem?.isResting) {
        alert('Cannot train while resting!');
        return false;
    } // <-- This was missing!

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
// FIXED: Enhanced inventory display with proper image handling
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

    // Filter items based on current filter
    let filteredItems = items;
    if (currentInventoryFilter !== 'all') {
        filteredItems = items.filter(item => item.type === currentInventoryFilter);
    }

    // Update count
    if (inventoryCount) {
        inventoryCount.textContent = `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}`;
    }

    // Display filtered items with PROPER image handling
    const inventoryHTML = filteredItems.map(item => {
        const rarity = item.rarity || 'common';
        const isEquipped = item.equipped;
        
        // Get image path for the item
        const imagePath = getInventoryImagePath(item);
        
        // Simple rarity colors
        const rarityColors = {
            common: '#888888',
            uncommon: '#00ff88', 
            rare: '#0077ff',
            epic: '#a29bfe',
            legendary: '#feca57'
        };
        
        const color = rarityColors[rarity] || '#888888';
        
        // Calculate stat bonuses
        let statBonusText = '';
        if (item.stats) {
            const bonuses = [];
            Object.entries(item.stats).forEach(([stat, value]) => {
                if (value > 0) {
                    bonuses.push(`+${value} ${stat}`);
                }
            });
            if (bonuses.length > 0) {
                statBonusText = `<div class="item-bonuses">${bonuses.join(', ')}</div>`;
            }
        }
        
        return `
            <div class="inventory-item ${isEquipped ? 'equipped' : ''}" data-item-id="${item.id}" data-item-type="${item.type}">
                <div class="item-rarity" style="color: ${color}; border-color: ${color};">
                    ${rarity.toUpperCase()}
                </div>
                <div class="item-image-container">
                    <img src="${imagePath}" 
                         alt="${item.name}" 
                         class="item-preview-image"
                         onerror="handleInventoryImageError(this, '${item.id}', '${item.type}')">
                    <div class="item-fallback-icon" style="display: none;">
                        <i class="${getItemIcon(item.type)}"></i>
                    </div>
                </div>
                <div class="item-name">${item.name}</div>
                <div class="item-type">${formatItemType(item.type)}</div>
                ${isEquipped ? '<div class="equipped-badge">EQUIPPED</div>' : ''}
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
                    <button class="inventory-btn sell-inv-btn" onclick="sellInventoryItem('${item.id}', '${item.type}', '${item.name}')" ${isEquipped ? 'disabled' : ''}>
                        <i class="fas fa-coins"></i> ${isEquipped ? 'Equipped' : 'Sell'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    inventoryGrid.innerHTML = inventoryHTML;
    updateInventoryFilters();
}

// Enhanced image error handler with multiple fallbacks
window.handleInventoryImageError = function(imgElement, itemId, itemType) {
    console.log(`🖼️ Image failed: ${imgElement.src}`);
    
    const fallbackIcon = imgElement.nextElementSibling;
    if (fallbackIcon && fallbackIcon.classList.contains('item-fallback-icon')) {
        imgElement.style.display = 'none';
        fallbackIcon.style.display = 'flex';
    }
    
    // Try multiple fallback patterns
    const fallbacks = generateImageFallbacks(itemId, itemType);
    tryNextFallback(imgElement, fallbacks, 0);
};

// Generate multiple fallback image paths
function generateImageFallbacks(itemId, itemType) {
    const baseId = itemId.toLowerCase().replace(/ /g, '_');
    const fallbacks = [];
    
    if (itemType === 'car') {
        fallbacks.push(
            `images/cars/${baseId}.jpg`,
            `images/cars/${baseId}.png`,
            `images/cars/${itemId}.jpg`,
            `images/cars/${itemId}.png`,
            `images/cars/${baseId.replace(/_/g, '-')}.jpg`,
            `images/cars/default_car.jpg`,
            'images/cars/rusty_rider.jpg'
        );
    } else {
        const typeFolder = `${itemType}s`;
        fallbacks.push(
            `images/${typeFolder}/${baseId}.jpg`,
            `images/${typeFolder}/${baseId}.png`,
            `images/${typeFolder}/${itemId}.jpg`,
            `images/${typeFolder}/${itemId}.png`,
            `images/${typeFolder}/${baseId.replace(/_/g, '-')}.jpg`,
            `images/${typeFolder}/default_${itemType}.jpg`,
            `images/cars/default_car.jpg`
        );
    }
    
    return fallbacks.filter((path, index, self) => self.indexOf(path) === index); // Remove duplicates
}
// FIXED: Enhanced inventory image path resolver
function getInventoryImagePath(item) {
    if (!item) return 'images/cars/default_car.jpg';
    
    // For cars, use the car images directory
    if (item.type === 'car') {
        const carId = item.id.toLowerCase().replace(/ /g, '_');
        const patterns = [
            `images/cars/${carId}.jpg`,
            `images/cars/${carId}.png`,
            `images/cars/${item.id}.jpg`,
            `images/cars/${item.id}.png`,
            `images/cars/default_car.jpg`,
            'images/cars/rusty_rider.jpg' // Ultimate fallback
        ];
        return patterns[0]; // Return the first pattern (will try others via onerror)
    }
    
    // For other item types, use their respective directories
    if (item.type) {
        const itemId = item.id.toLowerCase().replace(/ /g, '_');
        const typeFolder = `${item.type}s`; // engines, tires, turbos, etc.
        
        const patterns = [
            `images/${typeFolder}/${itemId}.jpg`,
            `images/${typeFolder}/${itemId}.png`,
            `images/${typeFolder}/${item.id}.jpg`,
            `images/${typeFolder}/${item.id}.png`,
            `images/${typeFolder}/default_${item.type}.jpg`,
            `images/cars/default_car.jpg` // Ultimate fallback
        ];
        return patterns[0];
    }
    
    // Ultimate fallback
    return 'images/cars/default_car.jpg';
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

// ========== PVP RACING SYSTEM ==========
let currentChallenge = null;
let activeRaces = [];


// Challenge another player to a race
window.challengePlayer = async function(playerId, playerName, playerLevel) {
    const user = auth.currentUser;
    if (!user) return;

    // Get current player data
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    const currentPlayerLevel = userData.level || 1;
    
    // Check level difference
    const levelDiff = Math.abs(currentPlayerLevel - playerLevel);
    const maxAllowedDiff = 10; // Maximum level difference for normal rewards
    
    if (levelDiff > maxAllowedDiff) {
        if (currentPlayerLevel < playerLevel) {
            if (!confirm(`⚠️ ${playerName} is ${levelDiff} levels higher than you!\nYou might lose more gold if you lose. Continue?`)) {
                return;
            }
        } else {
            if (!confirm(`⚠️ ${playerName} is ${levelDiff} levels lower than you!\nYour rewards will be reduced if you win. Continue?`)) {
                return;
            }
        }
    }
    
    // Check if player has enough condition
    if (userData.condition < 15) {
        alert("You need at least 15% condition to challenge other players!");
        return;
    }

    const betAmount = calculateBetAmount(userData.gold, userData.level, levelDiff);
    
    if (confirm(`Challenge ${playerName} to a race?\n\n- Cost: 15% condition\n- Bet: ${betAmount} gold\n- Level difference: ${levelDiff}`)) {
        try {
            // Create challenge in Firestore
            const challengeRef = await addDoc(collection(db, "challenges"), {
                challengerId: user.uid,
                challengerName: userData.username,
                challengerLevel: currentPlayerLevel,
                targetId: playerId,
                targetName: playerName,
                targetLevel: playerLevel,
                status: 'pending',
                createdAt: serverTimestamp(),
                conditionCost: 15,
                betAmount: betAmount,
                track: getRandomTrack(),
                levelDifference: levelDiff,
                expiresAt: new Date(Date.now() + 30 * 60000) // 30 minutes expiry
            });

            alert(`🎯 Challenge sent to ${playerName}!\nBet: ${betAmount} gold\nThey have 30 minutes to accept.`);
            
        } catch (error) {
            alert('Error sending challenge: ' + error.message);
        }
    }
};

// Calculate bet amount based on player gold and level difference
function calculateBetAmount(playerGold, playerLevel, levelDiff) {
    const baseBet = Math.min(50, Math.floor(playerGold * 0.1)); // 10% of gold or 50 max
    const levelPenalty = Math.max(0.1, 1 - (levelDiff * 0.05)); // 5% reduction per level difference
    
    let betAmount = Math.floor(baseBet * levelPenalty);
    
    // Ensure minimum bet
    betAmount = Math.max(10, betAmount);
    
    // Ensure bet doesn't exceed player's gold
    betAmount = Math.min(betAmount, playerGold);
    
    return betAmount;
}

// Accept a challenge
window.acceptChallenge = async function(challengeId) {

     // REST CHECK - Add this line to the very top
    if (window.restSystem?.isResting) {
        alert('Cannot accept challenges while resting!');
        return false;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
        const challengeDoc = await getDoc(doc(db, "challenges", challengeId));
        if (!challengeDoc.exists()) {
            alert('Challenge not found!');
            return;
        }

        const challenge = challengeDoc.data();
        
        // Check if challenge is for current user
        if (challenge.targetId !== user.uid) {
            alert('This challenge is not for you!');
            return;
        }

        // Check if challenge expired
        if (new Date() > challenge.expiresAt.toDate()) {
            alert('This challenge has expired!');
            return;
        }

        // Check condition for both players
        const challengerDoc = await getDoc(doc(db, "users", challenge.challengerId));
        const targetDoc = await getDoc(doc(db, "users", user.uid));
        
        const challengerData = challengerDoc.data();
        const targetData = targetDoc.data();

        if (challengerData.condition < challenge.conditionCost) {
            alert('Challenger does not have enough condition!');
            return;
        }

        if (targetData.condition < challenge.conditionCost) {
            alert('You do not have enough condition!');
            return;
        }

        // Check if players have enough gold for the bet
        if (challengerData.gold < challenge.betAmount) {
            alert('Challenger does not have enough gold for the bet!');
            return;
        }

        if (targetData.gold < challenge.betAmount) {
            alert('You do not have enough gold for the bet!');
            return;
        }

        if (confirm(`Accept race challenge from ${challenge.challengerName}?\n\n- Bet: ${challenge.betAmount} gold\n- Level difference: ${challenge.levelDifference}`)) {
            // Start the race
            await updateDoc(doc(db, "challenges", challengeId), {
                status: 'accepted',
                acceptedAt: serverTimestamp()
            });

            // Start the race simulation
            startPVPRace(challengeId, challenge);
        }
    } catch (error) {
        alert('Error accepting challenge: ' + error.message);
    }
};

// Simulate PVP race with enhanced rewards
async function startPVPRace(challengeId, challenge) {
      if (window.restSystem?.isResting) {
        alert('Cannot race while resting!');
        return false;
    }
    const user = auth.currentUser;
    
    try {
        // Get both players' data
        const challengerDoc = await getDoc(doc(db, "users", challenge.challengerId));
        const targetDoc = await getDoc(doc(db, "users", challenge.targetId));
        
        const challengerData = challengerDoc.data();
        const targetData = targetDoc.data();

        // Calculate race results based on stats, equipment, and level difference
        const challengerTime = calculateRaceTime(challengerData, challenge.track, challenge.levelDifference);
        const targetTime = calculateRaceTime(targetData, challenge.track, -challenge.levelDifference); // Negative for target

        const winnerId = challengerTime < targetTime ? challenge.challengerId : challenge.targetId;
        const loserId = challengerTime < targetTime ? challenge.targetId : challenge.challengerId;
        const winnerName = challengerTime < targetTime ? challenge.challengerName : challenge.targetName;
        const loserName = challengerTime < targetTime ? challenge.targetName : challenge.challengerName;
        const isDraw = Math.abs(challengerTime - targetTime) < 2; // Within 2 seconds is a draw

        // Calculate rewards based on level difference
        const rewards = calculatePVPRewards(
            challenge.betAmount, 
            challenge.levelDifference, 
            winnerId === challenge.challengerId ? challenge.challengerLevel : challenge.targetLevel,
            loserId === challenge.challengerId ? challenge.challengerLevel : challenge.targetLevel
        );

        // Update challenge with results
        await updateDoc(doc(db, "challenges", challengeId), {
            status: 'completed',
            completedAt: serverTimestamp(),
            challengerTime: challengerTime,
            targetTime: targetTime,
            winnerId: isDraw ? null : winnerId,
            winnerName: isDraw ? null : winnerName,
            loserId: isDraw ? null : loserId,
            isDraw: isDraw,
            betAmount: challenge.betAmount,
            goldTransfer: isDraw ? 0 : rewards.goldTransfer,
            xpReward: rewards.xpReward,
            fameTransfer: isDraw ? 0 : rewards.fameTransfer
        });

        // Process rewards and penalties
        if (isDraw) {
            // Draw - no gold/fame transfer, both get XP
            await updateDoc(doc(db, "users", challenge.challengerId), {
                condition: challengerData.condition - challenge.conditionCost,
                gold: challengerData.gold, // No change
                fame: challengerData.fame  // No change
            });

            await updateDoc(doc(db, "users", challenge.targetId), {
                condition: targetData.condition - challenge.conditionCost,
                gold: targetData.gold, // No change
                fame: targetData.fame  // No change
            });

            // Both get XP
            await addXP(challenge.challengerId, rewards.xpReward);
            await addXP(challenge.targetId, rewards.xpReward);

        } else {
            // Winner takes gold and fame from loser
            await updateDoc(doc(db, "users", winnerId), {
                condition: winnerId === challenge.challengerId ? 
                    challengerData.condition - challenge.conditionCost : 
                    targetData.condition - challenge.conditionCost,
                gold: winnerId === challenge.challengerId ? 
                    challengerData.gold + rewards.goldTransfer : 
                    targetData.gold + rewards.goldTransfer,
                fame: winnerId === challenge.challengerId ? 
                    challengerData.fame + rewards.fameTransfer : 
                    targetData.fame + rewards.fameTransfer
            });

            await updateDoc(doc(db, "users", loserId), {
                condition: loserId === challenge.challengerId ? 
                    challengerData.condition - challenge.conditionCost : 
                    targetData.condition - challenge.conditionCost,
                gold: loserId === challenge.challengerId ? 
                    challengerData.gold - challenge.betAmount : 
                    targetData.gold - challenge.betAmount,
                fame: loserId === challenge.challengerId ? 
                    Math.max(0, challengerData.fame - rewards.fameTransfer) : 
                    Math.max(0, targetData.fame - rewards.fameTransfer)
            });

            // Winner gets XP, loser gets reduced XP
            await addXP(winnerId, rewards.xpReward);
            await addXP(loserId, Math.floor(rewards.xpReward * 0.3)); // Loser gets 30% XP
        }

        // Show race results
        showRaceResults(challenge, challengerTime, targetTime, winnerName, loserName, isDraw, rewards);

        // Refresh player data
        if (user.uid === challenge.challengerId || user.uid === challenge.targetId) {
            await loadPlayerData(user.uid);
        }

    } catch (error) {
        console.error('Error in PVP race:', error);
        alert('Error processing race: ' + error.message);
    }
}

// Calculate race time with level difference consideration
function calculateRaceTime(playerData, track, levelDifference) {
    const stats = playerData.stats || {};
    const equipment = calculateTotalStats(stats, playerData.inventory);
    
    // Base time based on track difficulty
    let baseTime = 120; // 2 minutes base
    
    // Apply stat modifiers
    let timeModifier = 1.0;
    timeModifier -= (equipment.total.speed || 0) * 0.02;
    timeModifier -= (equipment.total.handling || 0) * 0.015;
    timeModifier -= (equipment.total.power || 0) * 0.01;
    
    // Level difference penalty/boost (max ±20% effect)
    const levelEffect = Math.max(-0.2, Math.min(0.2, levelDifference * 0.02));
    timeModifier *= (1 + levelEffect);
    
    // Add some randomness
    timeModifier *= (0.85 + Math.random() * 0.3);
    
    return Math.max(30, baseTime * timeModifier); // Minimum 30 seconds
}

// Calculate PVP rewards based on level difference
function calculatePVPRewards(betAmount, levelDifference, winnerLevel, loserLevel) {
    const baseXP = 25;
    const baseFame = 5;
    
    // Calculate level-based reward multiplier
    let rewardMultiplier = 1.0;
    
    if (levelDifference > 0) {
        // Higher level player beating lower level player - reduced rewards
        rewardMultiplier = Math.max(0.1, 1 - (levelDifference * 0.1));
    } else if (levelDifference < 0) {
        // Lower level player beating higher level player - bonus rewards
        rewardMultiplier = Math.min(2.0, 1 + (Math.abs(levelDifference) * 0.15));
    }
    
    return {
        goldTransfer: Math.floor(betAmount * rewardMultiplier),
        xpReward: Math.floor(baseXP * rewardMultiplier),
        fameTransfer: Math.floor(baseFame * rewardMultiplier),
        rewardMultiplier: rewardMultiplier
    };
}

function showRaceResults(challenge, time1, time2, winnerName, loserName, isDraw, rewards) {
    const levelDiffText = challenge.levelDifference === 0 ? 
        "Same level" : 
        `Level difference: ${challenge.levelDifference}`;
    
    const rewardInfo = isDraw ? 
        "🤝 Draw - No gold/fame transfer" :
        `💰 ${winnerName} won ${rewards.goldTransfer} gold from ${loserName}`;

    const resultHTML = `
        <div class="race-results">
            <h3>🏁 Race Results</h3>
            <div class="race-track">Track: ${challenge.track.name}</div>
            <div class="race-level-info">${levelDiffText}</div>
            <div class="race-times">
                <div class="racer-time">
                    <span>${challenge.challengerName}</span>
                    <span>${formatTime(time1)}</span>
                </div>
                <div class="racer-time">
                    <span>${challenge.targetName}</span>
                    <span>${formatTime(time2)}</span>
                </div>
            </div>
            <div class="race-outcome">
                ${isDraw ? "🤝 It's a draw!" : `🎉 Winner: ${winnerName}!`}
            </div>
            <div class="race-rewards">
                <div>${rewardInfo}</div>
                <div>⭐ ${rewards.xpReward} XP for winner</div>
                <div>🏆 ${rewards.fameTransfer} Fame transferred</div>
                <div>❤️ -15% Condition for both</div>
                ${rewards.rewardMultiplier !== 1 ? `<div>📊 Reward multiplier: ${rewards.rewardMultiplier.toFixed(2)}x</div>` : ''}
            </div>
        </div>
    `;
    
    // Create modal for results
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid #00ffff;
        border-radius: 15px;
        padding: 2rem;
        color: white;
        z-index: 10000;
        min-width: 400px;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
    `;
    modal.innerHTML = resultHTML;
    
    document.body.appendChild(modal);
    
    // Close on click
    setTimeout(() => {
        modal.addEventListener('click', () => modal.remove());
    }, 3000);
    
    // Auto-close after 10 seconds
    setTimeout(() => {
        if (modal.parentNode) modal.remove();
    }, 10000);
}

function getRandomTrack() {
    const tracks = [
        { name: "City Sprint", difficulty: "medium", distance: 5 },
        { name: "Mountain Pass", difficulty: "hard", distance: 8 },
        { name: "Desert Highway", difficulty: "easy", distance: 3 },
        { name: "Coastal Run", difficulty: "medium", distance: 6 },
        { name: "Neon Circuit", difficulty: "hard", distance: 7 }
    ];
    return tracks[Math.floor(Math.random() * tracks.length)];
}

// Accept a challenge
window.acceptChallenge = async function(challengeId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const challengeDoc = await getDoc(doc(db, "challenges", challengeId));
        if (!challengeDoc.exists()) {
            alert('Challenge not found!');
            return;
        }

        const challenge = challengeDoc.data();
        
        // Check if challenge is for current user
        if (challenge.targetId !== user.uid) {
            alert('This challenge is not for you!');
            return;
        }

        // Check condition for both players
        const challengerDoc = await getDoc(doc(db, "users", challenge.challengerId));
        const targetDoc = await getDoc(doc(db, "users", user.uid));
        
        const challengerData = challengerDoc.data();
        const targetData = targetDoc.data();

        if (challengerData.condition < challenge.conditionCost || targetData.condition < challenge.conditionCost) {
            alert('One of the players does not have enough condition!');
            return;
        }

        if (confirm(`Accept race challenge from ${challenge.challengerName}?`)) {
            // Start the race
            await updateDoc(doc(db, "challenges", challengeId), {
                status: 'accepted',
                acceptedAt: serverTimestamp()
            });

            // Start the race simulation
            startPVPRace(challengeId, challenge);
        }
    } catch (error) {
        alert('Error accepting challenge: ' + error.message);
    }
};

// ========== DAILY CHALLENGES SYSTEM ==========
let dailyChallenges = [];

async function loadDailyChallenges() {
    try {
        // In a real game, you'd fetch these from Firestore
        // For now, we'll generate some random challenges
        dailyChallenges = [
            {
                id: 'dc1',
                title: 'Speed Demon',
                description: 'Complete 3 training sessions',
                type: 'training',
                target: 3,
                progress: 0,
                reward: { gold: 50, xp: 25, tokens: 1 },
                completed: false
            },
            {
                id: 'dc2', 
                title: 'Gear Collector',
                description: 'Purchase 2 new items from shop',
                type: 'purchase',
                target: 2,
                progress: 0,
                reward: { gold: 75, xp: 30, tokens: 2 },
                completed: false
            },
            {
                id: 'dc3',
                title: 'Racing Rival',
                description: 'Win 2 PVP races',
                type: 'pvp_win',
                target: 2,
                progress: 0,
                reward: { gold: 100, xp: 50, tokens: 3 },
                completed: false
            }
        ];
        
        displayDailyChallenges();
    } catch (error) {
        console.error('Error loading daily challenges:', error);
    }
}

function displayDailyChallenges() {
    const challengesContainer = document.getElementById('daily-challenges');
    if (!challengesContainer) return;
    
    if (dailyChallenges.length === 0) {
        challengesContainer.innerHTML = '<div class="no-challenges">No daily challenges available</div>';
        return;
    }
    
    const challengesHTML = dailyChallenges.map(challenge => `
        <div class="challenge-item ${challenge.completed ? 'completed' : ''}">
            <div class="challenge-header">
                <h4>${challenge.title}</h4>
                <span class="challenge-progress">${challenge.progress}/${challenge.target}</span>
            </div>
            <p class="challenge-desc">${challenge.description}</p>
            <div class="challenge-rewards">
                ${challenge.reward.gold ? `<span class="reward-gold">💰 ${challenge.reward.gold}</span>` : ''}
                ${challenge.reward.xp ? `<span class="reward-xp">⭐ ${challenge.reward.xp}</span>` : ''}
                ${challenge.reward.tokens ? `<span class="reward-tokens">💎 ${challenge.reward.tokens}</span>` : ''}
            </div>
            <button class="challenge-claim-btn" 
                    onclick="claimChallengeReward('${challenge.id}')"
                    ${!challenge.completed ? 'disabled' : ''}>
                ${challenge.completed ? 'Claim Reward' : 'In Progress'}
            </button>
        </div>
    `).join('');
    
    challengesContainer.innerHTML = challengesHTML;
}

window.claimChallengeReward = async function(challengeId) {
    const user = auth.currentUser;
    if (!user) return;
    
    const challenge = dailyChallenges.find(c => c.id === challengeId);
    if (!challenge || !challenge.completed) return;
    
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const updateData = {
                gold: userData.gold + challenge.reward.gold,
                fame: userData.fame + (challenge.reward.fame || 0)
            };
            
            if (challenge.reward.tokens) {
                updateData.tokens = (userData.tokens || 0) + challenge.reward.tokens;
            }
            
            await updateDoc(userRef, updateData);
            await addXP(user.uid, challenge.reward.xp);
            
            // Mark challenge as claimed
            challenge.claimed = true;
            displayDailyChallenges();
            
            alert(`🎉 Challenge completed! Rewards claimed!`);
            await loadPlayerData(user.uid);
        }
    } catch (error) {
        alert('Error claiming reward: ' + error.message);
    }
};

// ========== PVP CHALLENGES DISPLAY ==========
// ========== PVP CHALLENGES DISPLAY ==========
async function loadPVPChallenges() {
    const user = auth.currentUser;
    if (!user) {
        console.log("No user logged in, skipping PVP challenges load");
        return;
    }

    try {
        console.log("Loading PVP challenges for user:", user.uid);
        
        // Only load challenges where current user is the target
        const challengesQuery = query(
            collection(db, "challenges"),
            where("targetId", "==", user.uid),
            where("status", "==", "pending")
        );
        
        const snapshot = await getDocs(challengesQuery);
        const challenges = [];
        
        snapshot.forEach(doc => {
            const challengeData = doc.data();
            // Check if challenge is still valid (not expired)
            if (challengeData.expiresAt) {
                const expiresAt = challengeData.expiresAt.toDate();
                if (expiresAt > new Date()) {
                    challenges.push({
                        id: doc.id,
                        ...challengeData
                    });
                } else {
                    // Auto-mark as expired if we find an expired challenge
                    markChallengeAsExpired(doc.id);
                }
            }
        });
        
        console.log(`Found ${challenges.length} valid PVP challenges`);
        displayPVPChallenges(challenges);
    } catch (error) {
        console.error('Error loading PVP challenges:', error);
        showPVPError(error);
    }
}

// Remove the problematic cleanupExpiredChallenges function and replace with:
async function markChallengeAsExpired(challengeId) {
    try {
        await updateDoc(doc(db, "challenges", challengeId), {
            status: 'expired',
            expiredAt: serverTimestamp()
        });
        console.log(`Marked challenge ${challengeId} as expired`);
    } catch (error) {
        console.error('Error marking challenge as expired:', error);
    }
}

// Simple cleanup for user's own challenges only
async function cleanupUserChallenges() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Only clean up challenges where user is involved
        const userChallengesQuery = query(
            collection(db, "challenges"),
            where("status", "==", "pending"),
            where("targetId", "==", user.uid) // Only challenges targeting current user
        );
        
        const snapshot = await getDocs(userChallengesQuery);
        
        const cleanupPromises = [];
        snapshot.forEach(doc => {
            const challenge = doc.data();
            if (challenge.expiresAt && challenge.expiresAt.toDate() <= new Date()) {
                cleanupPromises.push(
                    updateDoc(doc.ref, {
                        status: 'expired',
                        expiredAt: serverTimestamp()
                    })
                );
            }
        });
        
        if (cleanupPromises.length > 0) {
            await Promise.all(cleanupPromises);
            console.log(`Cleaned up ${cleanupPromises.length} expired user challenges`);
        }
    } catch (error) {
        console.error('Error in cleanupUserChallenges:', error);
    }
}

function displayPVPChallenges(challenges) {
    const challengesContainer = document.getElementById('pvp-challenges');
    if (!challengesContainer) return;
    
    const user = auth.currentUser;
    
    // Filter to show only challenges where current user is the target
    const incomingChallenges = challenges.filter(challenge => challenge.targetId === user.uid);
    
    if (incomingChallenges.length === 0) {
        challengesContainer.innerHTML = `
            <div class="no-challenges">
                <i class="fas fa-flag-checkered"></i>
                <p>No pending challenges</p>
                <small>Challenge other players from the Rankings page!</small>
            </div>
        `;
        return;
    }
    
    const challengesHTML = incomingChallenges.map(challenge => {
        const timeLeft = Math.max(0, Math.floor((challenge.expiresAt.toDate() - new Date()) / 60000));
        const minutes = Math.floor(timeLeft);
        const hours = Math.floor(minutes / 60);
        const displayTime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
        
        return `
            <div class="challenge-item">
                <div class="challenge-header">
                    <h4>🏁 Challenge from ${challenge.challengerName}</h4>
                    <span class="time-left ${timeLeft < 5 ? 'expiring' : ''}">${displayTime} left</span>
                </div>
                <div class="challenge-details">
                    <div class="challenge-detail">
                        <span class="label">Level:</span>
                        <span class="value">${challenge.challengerLevel} vs ${challenge.targetLevel || 1}</span>
                    </div>
                    <div class="challenge-detail">
                        <span class="label">Bet Amount:</span>
                        <span class="value">${challenge.betAmount} gold</span>
                    </div>
                    <div class="challenge-detail">
                        <span class="label">Condition Cost:</span>
                        <span class="value">${challenge.conditionCost}%</span>
                    </div>
                    <div class="challenge-detail">
                        <span class="label">Track:</span>
                        <span class="value">${challenge.track?.name || 'Random Track'}</span>
                    </div>
                </div>
                <div class="challenge-actions">
                    <button class="accept-btn" onclick="acceptChallenge('${challenge.id}')">
                        ✅ Accept Challenge
                    </button>
                    <button class="decline-btn" onclick="declineChallenge('${challenge.id}')">
                        ❌ Decline
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    challengesContainer.innerHTML = challengesHTML;
}

// Enhanced decline challenge function
window.declineChallenge = async function(challengeId) {
    if (!confirm('Are you sure you want to decline this challenge?')) return;

    try {
        await updateDoc(doc(db, "challenges", challengeId), {
            status: 'declined',
            declinedAt: serverTimestamp(),
            declinedBy: auth.currentUser.uid
        });
        
        alert('Challenge declined.');
        loadPVPChallenges(); // Refresh the list
    } catch (error) {
        console.error('Error declining challenge:', error);
        alert('Error declining challenge: ' + error.message);
    }
};

// Add function to clean up expired challenges
async function cleanupExpiredChallenges() {
    try {
        const challengesQuery = query(
            collection(db, "challenges"),
            where("status", "==", "pending"),
            where("expiresAt", "<=", new Date())
        );
        
        const snapshot = await getDocs(challengesQuery);
        const cleanupPromises = [];
        
        snapshot.forEach(doc => {
            cleanupPromises.push(
                updateDoc(doc.ref, {
                    status: 'expired',
                    expiredAt: serverTimestamp()
                })
            );
        });
        
        await Promise.all(cleanupPromises);
        if (cleanupPromises.length > 0) {
            console.log(`Cleaned up ${cleanupPromises.length} expired challenges`);
        }
    } catch (error) {
        console.error('Error cleaning up expired challenges:', error);
    }
}

// ========STAT BARS =========
function updateStatBars() {
    const stats = ['power', 'speed', 'dexterity', 'structure', 'handling', 'luck'];
    
    stats.forEach(stat => {
        const baseValue = parseInt(document.getElementById(`${stat}`).textContent) || 0;
        const bonusValue = 0; // This should come from your equipped items data
        const negativeValue = 0; // This should come from your negative effects data
        
        const totalValue = baseValue + bonusValue + negativeValue;
        
        // Calculate percentages
        const basePercent = totalValue > 0 ? (baseValue / totalValue) * 100 : 0;
        const bonusPercent = totalValue > 0 ? (bonusValue / totalValue) * 100 : 0;
        const negativePercent = totalValue > 0 ? (Math.abs(negativeValue) / totalValue) * 100 : 0;
        
        // Update the bars
        const baseBar = document.querySelector(`.stat-upgrade-item .stat-bar-base[data-stat="${stat}"]`);
        const bonusBar = document.querySelector(`.stat-upgrade-item .stat-bar-bonus[data-stat="${stat}"]`);
        const negativeBar = document.querySelector(`.stat-upgrade-item .stat-bar-negative[data-stat="${stat}"]`);
        
        if (baseBar) baseBar.style.width = `${basePercent}%`;
        if (bonusBar) bonusBar.style.width = `${bonusPercent}%`;
        if (negativeBar) negativeBar.style.width = `${negativePercent}%`;
        
        // Update values display
        const baseValueEl = document.querySelector(`.base-value[data-stat="${stat}"]`);
        const bonusValueEl = document.querySelector(`.bonus-value[data-stat="${stat}"]`);
        const negativeValueEl = document.querySelector(`.negative-value[data-stat="${stat}"]`);
        const totalValueEl = document.querySelector(`.total-value[data-stat="${stat}"]`);
        
        if (baseValueEl) baseValueEl.textContent = `Base: ${baseValue}`;
        if (bonusValueEl) bonusValueEl.textContent = bonusValue > 0 ? `+${bonusValue}` : '';
        if (negativeValueEl) negativeValueEl.textContent = negativeValue < 0 ? `${negativeValue}` : '';
        if (totalValueEl) totalValueEl.textContent = `Total: ${totalValue}`;
    });

   
}

// Player Listings Functions
class PlayerListings {
    constructor() {
        this.listings = [];
        this.filters = {
            category: 'all',
            sort: 'newest',
            search: ''
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadListings();
    }

    setupEventListeners() {
        // Search and filter
        document.getElementById('listing-search').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.filterListings();
        });

        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.filterListings();
        });

        document.getElementById('sort-filter').addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.sortListings();
        });

        // Create listing
        document.getElementById('create-listing-btn').addEventListener('click', () => {
            this.showCreateListingModal();
        });

        document.getElementById('create-listing-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createListing();
        });
    }

    async loadListings() {
        try {
            // Load active listings from Firebase
            const listingsRef = collection(db, 'marketplace/playerListings');
            const q = query(listingsRef, where('status', '==', 'active'));
            const querySnapshot = await getDocs(q);
            
            this.listings = [];
            querySnapshot.forEach((doc) => {
                this.listings.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.renderListings();
        } catch (error) {
            console.error('Error loading listings:', error);
        }
    }

    renderListings() {
        const grid = document.getElementById('listings-grid');
        const noListings = document.getElementById('no-listings');
        const count = document.getElementById('listings-count');

        if (this.listings.length === 0) {
            grid.innerHTML = '';
            noListings.style.display = 'block';
            count.textContent = '0';
            return;
        }

        noListings.style.display = 'none';
        count.textContent = this.listings.length.toString();

        grid.innerHTML = this.listings.map(listing => `
            <div class="listing-item" data-listing-id="${listing.id}">
                <div class="seller-info">
                    <div class="seller-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <span class="seller-name">${listing.sellerName}</span>
                    <div class="seller-rating">
                        <i class="fas fa-star"></i> ${listing.sellerRating || 'New'}
                    </div>
                </div>
                <div class="listing-image">
                    <img src="images/cars/${listing.itemData.image || 'default.jpg'}" alt="${listing.itemData.name}">
                </div>
                <div class="listing-info">
                    <h4>${listing.itemData.name}</h4>
                    <p>Level ${listing.itemData.minLevel} • ${this.formatItemType(listing.itemType)}</p>
                    <div class="listing-stats">
                        ${this.renderItemStats(listing.itemData)}
                    </div>
                    <div class="listing-price">
                        <span class="price">${this.formatPrice(listing.price)}</span>
                        <span class="currency">gold</span>
                    </div>
                    <div class="listing-time">
                        <i class="fas fa-clock"></i> ${this.formatTimeLeft(listing.endTime)}
                    </div>
                </div>
                <div class="listing-actions">
                    ${this.canBuy(listing) ? `
                        <button class="buyout-btn" onclick="playerListings.buyListing('${listing.id}')">
                            Buy Now
                        </button>
                    ` : `
                        <button class="buyout-btn disabled" disabled>
                            Level ${listing.itemData.minLevel} Required
                        </button>
                    `}
                </div>
            </div>
        `).join('');
    }

    filterListings() {
        let filtered = this.listings;

        // Category filter
        if (this.filters.category !== 'all') {
            filtered = filtered.filter(listing => listing.itemType === this.filters.category);
        }

        // Search filter
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(listing => 
                listing.itemData.name.toLowerCase().includes(searchTerm) ||
                listing.sellerName.toLowerCase().includes(searchTerm)
            );
        }

        this.sortListings(filtered);
    }

    sortListings(listings = this.listings) {
        switch (this.filters.sort) {
            case 'price-low':
                listings.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                listings.sort((a, b) => b.price - a.price);
                break;
            case 'ending':
                listings.sort((a, b) => a.endTime - b.endTime);
                break;
            default: // newest
                listings.sort((a, b) => b.createdAt - a.createdAt);
        }

        this.renderListings();
    }

    async showCreateListingModal() {
        await this.populateItemSelect();
        document.getElementById('create-listing-modal').style.display = 'block';
    }

    async populateItemSelect() {
        const select = document.getElementById('item-select');
        // This would load from user's inventory
        // For now, placeholder
        select.innerHTML = `
            <option value="">Choose an item...</option>
            <option value="car_1" data-type="vehicle">Sports Coupe</option>
            <option value="engine_1" data-type="engine">Turbo Engine</option>
        `;
    }

    async createListing() {
        const form = document.getElementById('create-listing-form');
        const formData = new FormData(form);
        
        const listingData = {
            sellerId: currentUser.uid,
            sellerName: currentUser.displayName,
            itemType: document.getElementById('item-select').selectedOptions[0].dataset.type,
            itemId: formData.get('item'),
            itemData: this.getItemData(formData.get('item')),
            price: parseInt(formData.get('price')),
            endTime: Date.now() + (parseInt(formData.get('duration')) * 1000),
            createdAt: Date.now(),
            status: 'active'
        };

        try {
            const docRef = await addDoc(collection(db, 'marketplace/playerListings'), listingData);
            console.log('Listing created:', docRef.id);
            this.closeModal();
            this.loadListings(); // Refresh listings
        } catch (error) {
            console.error('Error creating listing:', error);
        }
    }

    async buyListing(listingId) {
        const listing = this.listings.find(l => l.id === listingId);
        if (!listing) return;

        // Check if user has enough gold
        if (currentUser.gold < listing.price) {
            alert('Not enough gold!');
            return;
        }

        try {
            // Update listing status
            await updateDoc(doc(db, 'marketplace/playerListings', listingId), {
                status: 'sold',
                soldTo: currentUser.uid,
                soldAt: Date.now()
            });

            // Transfer gold (you'd need a transaction here)
            // Add item to buyer's inventory
            // Remove item from seller's inventory

            alert('Purchase successful!');
            this.loadListings(); // Refresh
        } catch (error) {
            console.error('Error buying listing:', error);
        }
    }

    // Helper functions
    formatPrice(price) {
        return price.toLocaleString();
    }

    formatTimeLeft(endTime) {
        const timeLeft = endTime - Date.now();
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        return hours > 24 ? `${Math.floor(hours / 24)}d left` : `${hours}h left`;
    }

    canBuy(listing) {
        return currentUser.level >= listing.itemData.minLevel;
    }

    formatItemType(type) {
        const types = {
            vehicle: 'Vehicle',
            engine: 'Engine',
            part: 'Part',
            cosmetic: 'Cosmetic'
        };
        return types[type] || type;
    }

    renderItemStats(itemData) {
        // This would render stats based on item type
        if (itemData.power) return `<span>Power: ${itemData.power}</span>`;
        if (itemData.speed) return `<span>Speed: ${itemData.speed}</span>`;
        return '';
    }

    getItemData(itemId) {
        // This would fetch actual item data from your items collection
        // Placeholder
        return {
            name: "Sports Coupe",
            minLevel: 5,
            power: 45,
            speed: 60,
            image: "sports_coupe.jpg"
        };
    }

    closeModal() {
        document.getElementById('create-listing-modal').style.display = 'none';
        document.getElementById('create-listing-form').reset();
    }
}

// Initialize
let playerListings;
document.addEventListener('DOMContentLoaded', () => {
    playerListings = new PlayerListings();
});

// Call this whenever stats change (after upgrades, equipment changes, etc.)---

// ========== ONBOARDING TUTORIAL SYSTEM ==========

class OnboardingTutorial {
    constructor() {
        this.currentSlide = 1;
        this.totalSlides = 8; // Updated to 8 slides
        this.debugMode = true; // Set to false when done testing
        this.init();
    }

    init() {
        console.log('🚀 OnboardingTutorial initialized with', this.totalSlides, 'slides');
        this.setupEventListeners();
        this.checkFirstTimeUser();
    }

    async checkFirstTimeUser() {
        console.log('🔍 Checking if first time user...');
        
        // Debug mode - always show tutorial
        if (this.debugMode) {
            console.log('🐛 DEBUG MODE: Forcing tutorial to show');
            setTimeout(() => {
                this.showTutorial();
            }, 1500);
            return;
        }

        // Production mode - check if completed before
        const userData = await this.getUserData();
        
        if (!userData || !userData.hasCompletedTutorial) {
            console.log('👋 First time user - showing tutorial');
            setTimeout(() => {
                this.showTutorial();
            }, 1000);
        } else {
            console.log('🎯 Returning user - tutorial already completed');
        }
    }

    async getUserData() {
        // Check localStorage for tutorial completion
        const tutorialCompleted = localStorage.getItem('ignition_tutorial_completed');
        console.log('📋 Tutorial completion status:', tutorialCompleted);
        return {
            hasCompletedTutorial: tutorialCompleted === 'true'
        };
    }

    showTutorial() {
        console.log('🎬 Showing tutorial...');
        const modal = document.getElementById('onboarding-modal');
        if (!modal) {
            console.error('❌ Modal element not found!');
            return;
        }
        
        // Reset to first slide
        this.currentSlide = 1;
        this.updateSlides();
        this.updateProgress();
        
        modal.style.display = 'block';
        console.log('✅ Tutorial visible - Slide', this.currentSlide);
    }

    hideTutorial() {
        const dontShowAgain = document.getElementById('dont-show-again');
        const shouldSavePreference = dontShowAgain && dontShowAgain.checked;
        
        if (shouldSavePreference) {
            console.log('💾 Saving tutorial preference: Do not show again');
            this.markTutorialCompleted();
        } else {
            console.log('🚫 Tutorial closed but will show again next time');
        }
        
        document.getElementById('onboarding-modal').style.display = 'none';
    }

    nextSlide() {
        if (this.currentSlide < this.totalSlides) {
            this.currentSlide++;
            this.updateSlides();
            this.updateProgress();
            console.log('➡️ Moved to slide', this.currentSlide);
        } else {
            console.log('🎯 Reached final slide');
        }
    }

    prevSlide() {
        if (this.currentSlide > 1) {
            this.currentSlide--;
            this.updateSlides();
            this.updateProgress();
            console.log('⬅️ Moved to slide', this.currentSlide);
        }
    }

    updateSlides() {
        // Hide all slides
        document.querySelectorAll('.tutorial-slide').forEach(slide => {
            slide.classList.remove('active');
        });

        // Show current slide
        const currentSlide = document.querySelector(`[data-slide="${this.currentSlide}"]`);
        if (currentSlide) {
            currentSlide.classList.add('active');
        }

        // Update button states
        this.updateButtonStates();
    }

    updateProgress() {
        const progress = (this.currentSlide / this.totalSlides) * 100;
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `Step ${this.currentSlide} of ${this.totalSlides}`;
        }
        
        console.log('📊 Progress:', progress.toFixed(1) + '%');
    }

    updateButtonStates() {
        const prevBtn = document.getElementById('prev-slide');
        const nextBtn = document.getElementById('next-slide');
        const skipBtn = document.getElementById('skip-tutorial');

        // Update prev button
        if (prevBtn) {
            prevBtn.disabled = this.currentSlide === 1;
            prevBtn.style.display = this.currentSlide === 1 ? 'none' : 'block';
        }

        // Update next button - hide on last slide
        if (nextBtn) {
            if (this.currentSlide === this.totalSlides) {
                nextBtn.style.display = 'none';
            } else {
                nextBtn.style.display = 'block';
            }
        }

        // Update skip button - hide on last slide
        if (skipBtn) {
            skipBtn.style.display = this.currentSlide === this.totalSlides ? 'none' : 'block';
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up tutorial event listeners...');
        
        // Navigation buttons
        const nextBtn = document.getElementById('next-slide');
        const prevBtn = document.getElementById('prev-slide');
        const skipBtn = document.getElementById('skip-tutorial');
        const startBtn = document.getElementById('start-racing-btn');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextSlide();
            });
        } else {
            console.error('❌ Next button not found');
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.prevSlide();
            });
        } else {
            console.error('❌ Previous button not found');
        }

        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                console.log('⏭️ Tutorial skipped by user');
                document.getElementById('onboarding-modal').style.display = 'none';
                // Don't save preference when skipping
            });
        } else {
            console.error('❌ Skip button not found');
        }

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log('🏁 Tutorial completed - starting racing!');
                this.hideTutorial();
            });
        } else {
            console.error('❌ Start racing button not found');
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('onboarding-modal');
            if (modal && modal.style.display === 'block') {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.nextSlide();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.prevSlide();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    console.log('ESC: Tutorial closed');
                    document.getElementById('onboarding-modal').style.display = 'none';
                }
            }
        });

        console.log('✅ Event listeners setup complete');
    }

    markTutorialCompleted() {
        console.log('💾 Saving tutorial completion to localStorage');
        localStorage.setItem('ignition_tutorial_completed', 'true');
        
        // Also save to Firebase user preferences if user is logged in
        this.saveTutorialCompletion();
    }

    async saveTutorialCompletion() {
        if (typeof currentUser !== 'undefined' && currentUser) {
            try {
                console.log('🔥 Saving tutorial completion to Firebase');
                await setDoc(doc(db, 'userPreferences', currentUser.uid), {
                    hasCompletedTutorial: true,
                    tutorialCompletedAt: new Date()
                }, { merge: true });
            } catch (error) {
                console.error('❌ Error saving tutorial completion to Firebase:', error);
            }
        } else {
            console.log('👤 No user logged in, skipping Firebase save');
        }
    }

    // Debug methods
    resetTutorial() {
        localStorage.removeItem('ignition_tutorial_completed');
        console.log('🔄 Tutorial reset - will show on next page load');
    }

    showTutorialManually() {
        console.log('🐛 Manual tutorial trigger');
        this.resetTutorial();
        this.showTutorial();
    }
}

// Initialize tutorial and expose for debugging
let onboardingTutorial;
document.addEventListener('DOMContentLoaded', () => {
    onboardingTutorial = new OnboardingTutorial();
    
    // Expose to global for easy console access
    window.debugTutorial = onboardingTutorial;
    
    // Add debug button to page (remove in production)
    if (onboardingTutorial.debugMode) {
        const debugBtn = document.createElement('button');
        debugBtn.innerHTML = '🔧 Show Tutorial';
        debugBtn.style.cssText = `
            position: fixed;
            top: 70px;
            right: 10px;
            z-index: 10000;
            background: linear-gradient(135deg, #00ff88, #00ffff);
            color: #1a1a2e;
            border: none;
            padding: 10px 15px;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3);
        `;
        debugBtn.onclick = () => onboardingTutorial.showTutorialManually();
        debugBtn.title = 'Debug: Show Tutorial';
        document.body.appendChild(debugBtn);
        console.log('🔧 Debug button added to page');
    }
});

// Console commands for testing:
console.log(`
🎮 Tutorial Debug Commands:
• debugTutorial.showTutorialManually() - Show tutorial now
• debugTutorial.resetTutorial() - Reset completion status
• localStorage.removeItem('ignition_tutorial_completed') - Clear storage
`);

// ========== APPLICATION INITIALIZATION ==========
function initializePage() {
    const path = window.location.pathname;
    if (path.includes('garage.html')) initializeGarage();
    else if (path.includes('shop.html')) initializeShop();
    else if (path.includes('rankings.html')) initializeRankings();
    else if (path.includes('training.html')) initializeTraining();
    else if (document.getElementById('inventory-grid')) initializeInventory();

    // Load challenges with error handling
    setTimeout(() => {
        loadDailyChallenges().catch(console.error);
        loadPVPChallenges().catch(console.error);
        cleanupExpiredChallenges().catch(console.error);
    }, 1000);
    
    // Refresh challenges every 30 seconds
    setInterval(loadPVPChallenges, 30000);
    setInterval(cleanupExpiredChallenges, 60000);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing application...");
    loadNavbar();    
    
    // Set up login form event listener
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const messageEl = document.getElementById('authMessage');
            
            login(email, password)
                .then(() => {
                    if (messageEl) {
                        messageEl.textContent = "Login successful!";
                        messageEl.style.color = "#00ff88";
                    }
                })
                .catch(error => {
                    if (messageEl) {
                        messageEl.textContent = `Error: ${error.message}`;
                        messageEl.style.color = "#ff6b6b";
                    }
                });
        });
    }
    
    
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
window.handleSignup = handleSignup;
window.signup = signup;

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