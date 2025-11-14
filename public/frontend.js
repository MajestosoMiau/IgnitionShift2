// frontend.js - COMPLETE VERSION WITH GARAGE DISPLAY FIXES
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

// Enhanced login function
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

// Player data functions
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
            wins: 0,
            losses: 0,
            draws: 0,
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
                    <img src="images/logo.jpg" alt="IGNITION SHIFT" class="logo-image">
                </a>
                <div class="nav-menu">
                    <a href="index.html" class="nav-link" id="nav-home"><i class="fas fa-home"></i> Home</a>
                    <a href="garage.html" class="nav-link" id="nav-garage"><i class="fas fa-warehouse"></i> Garage</a>
                    <a href="shop.html" class="nav-link" id="nav-shop"><i class="fas fa-shopping-cart"></i> Shop</a>
                    <a href="training.html" class="nav-link" id="nav-training"><i class="fas fa-dumbbell"></i> Training</a>
                    <a href="teams.html" class="nav-link" id="nav-teams"><i class="fa-solid fa-people-group"></i> Teams</a>
                    <a href="marketplace.html" class="nav-link" id="nav-marketplace"><i class="fas fa-shop"></i> Marketplace</a>
                    <a href="rankings.html" class="nav-link" id="nav-rankings"><i class="fas fa-trophy"></i> Rankings</a>
                    <a href="missions.html" class="nav-link" id="nav-missions"><i class="fas fa-flag-checkered"></i> Missions <span id="challenge-indicator" class="nav-notification" style="display: none;"></span></a>
                    <a href="achievements.html" class="nav-link" id="nav-achievements"><i class="fas fa-trophy-alt"></i> Achievements <span id="challenge-indicator" class="nav-notification" style="display: none;"></span></a>
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
    const navGold = document.getElementById('nav-gold');
    const navLevel = document.getElementById('nav-level');

    if (user && navUser && navGuest) {
        navUser.style.display = 'flex';
        navGuest.style.display = 'none';
        if (playerNameNav) playerNameNav.textContent = 'Loading...';
        
        // Load user data to update gold and level
        loadPlayerData(user.uid).then(() => {
            // These will be updated when player data loads
        });
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

// ========== PLAYER DATA FUNCTIONS - FIXED GARAGE DISPLAY ==========
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

         // Update navbar username if user is logged in
        const user = auth.currentUser;
        if (user) {
            const navUser = document.getElementById('nav-user');
            if (navUser) {
                const userNameElement = navUser.querySelector('.user-name');
                if (userNameElement) {
                    const displayName = userData.username || userData.email?.split('@')[0] || "Racer";
                    userNameElement.textContent = `Welcome, ${displayName}!`;
                }
            }}
        
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
        
        // FIXED: Call the stat bars update function
        updateStatBars(userData);

        // Update navbar user info
        const playerNameNav = document.getElementById('player-name-nav');
        const navGold = document.getElementById('nav-gold');
        const navLevel = document.getElementById('nav-level');
        
        if (playerNameNav) playerNameNav.textContent = userData.username || userData.email?.split('@')[0] || "Racer";
        if (navGold) navGold.textContent = userData.gold || 0;
        if (navLevel) navLevel.textContent = userData.level || 1;
        
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

// FIXED: Display all equipped items in the right panel
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
            // Add this after successful purchase
window.trackItemPurchase();
        }
    } catch (error) {
        alert('Error making purchase: ' + error.message);
    }

    
}

// Add this comprehensive challenge-only items list
const CHALLENGE_ONLY_ITEMS = [
    'turbo_twister', 'moonlight_grasp', 'repair_kit', 'advanvced_repair_kit',
    'sandstorm_cushion'
    // Add any other special items that should only come from challenges
];

// Enhanced filtering function
function isChallengeOnlyItem(itemId, itemType) {
    return CHALLENGE_ONLY_ITEMS.includes(itemId);
}

// Debug function to check shop items
window.debugShopItems = async function(category) {
    console.log(`🔍 DEBUGGING SHOP ITEMS IN ${category}`);
    
    const querySnapshot = await getDocs(collection(db, category));
    const allItems = [];
    
    querySnapshot.forEach((doc) => {
        const item = doc.data();
        const isChallengeOnly = isChallengeOnlyItem(doc.id, category.slice(0, -1));
        
        allItems.push({
            id: doc.id,
            name: item.name,
            isChallengeOnly: isChallengeOnly,
            category: category
        });
        
        if (isChallengeOnly) {
            console.log(`🚫 CHALLENGE-ONLY ITEM FOUND: ${item.name} (${doc.id})`);
        }
    });
    
    console.log('📋 ALL ITEMS IN CATEGORY:', allItems);
    return allItems;
};

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
        const seenItems = new Map();
        
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const documentId = doc.id;
            
            // 🚫 SIMPLE FILTERING: Skip items that have ANY source field
            // (assuming only challenge/quest items will have this field)
            if (item.source) {
                console.log(`🚫 FILTERED OUT SPECIAL ITEM: ${item.name} (Source: ${item.source})`);
                return; // Skip this item entirely
            }
            
            // Only show items with NO source field (regular shop items)
            
            const itemKey = `${item.name}_${item.minimumRequiredLevel}_${item.price_gold}`;
            
            if (seenItems.has(itemKey)) {
                console.warn(`🚫 DUPLICATE ITEM SKIPPED: ${item.name} (ID: ${documentId})`);
                return;
            }
            
            seenItems.set(itemKey, { id: documentId, ...item });
            
            itemsArray.push({
                id: documentId,
                ...item,
                minimumRequiredLevel: item.minimumRequiredLevel || 1,
                price_gold: item.price_gold || 0,
                price_tokens: item.price_tokens || 0
            });
        });

        console.log(`🛍️ Processed ${itemsArray.length} regular shop items after filtering special items`);

        // Sort by minimumRequiredLevel (lowest to highest)
        itemsArray.sort((a, b) => {
            const levelA = a.minimumRequiredLevel || 1;
            const levelB = b.minimumRequiredLevel || 1;
            return levelA - levelB;
        });

        // Clear and display items
        itemsList.innerHTML = '';
        
        if (itemsArray.length === 0) {
            itemsList.innerHTML = '<div class="error">No purchasable items found in this category.</div>';
            return;
        }
        
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
                    ${item.minimumRequiredLevel > 1 ? 
                        `<div class="requirements">📊 Level ${item.minimumRequiredLevel} Required</div>` : ''}
                    ${priceSectionHTML}
                    ${stats.length > 0 ? `<div class="stats-grid">${statsHTML}</div>` : ''}
                    <div class="item-actions-section">
                        <button class="action-btn buy-btn" 
                                onclick="buyItem('${category}', '${documentId}', '${item.name}', ${item.price_gold || 0}, ${item.price_tokens || 0})"
                                ${playerOwnsItem ? 'disabled' : ''}>
                            ${playerOwnsItem ? 'OWNED' : 'BUY'}
                        </button>
                        <button class="action-btn sell-btn" 
                                onclick="sellItem('${category}', '${documentId}', '${item.name}', ${item.sellValue || Math.floor(item.price_gold * 0.7)})"
                                ${!playerOwnsItem ? 'disabled' : ''}>
                            ${playerOwnsItem ? 'SELL' : 'LOCKED'}
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

window.debugShopSorting = async function(category) {
    const querySnapshot = await getDocs(collection(db, category));
    const itemsArray = [];
    
    querySnapshot.forEach((doc) => {
        const item = doc.data();
        itemsArray.push({
            id: doc.id,
            name: item.name,
            level: item.minimumRequiredLevel || 1
        });
    });

    console.log('BEFORE SORTING:', itemsArray);
    
    itemsArray.sort((a, b) => (a.level || 1) - (b.level || 1));
    
    console.log('AFTER SORTING:', itemsArray);
};

window.debugShopDuplicates = async function(category) {
    console.log(`🔍 DEBUGGING DUPLICATES IN ${category.toUpperCase()}`);
    
    const querySnapshot = await getDocs(collection(db, category));
    const allItems = [];
    const duplicateItems = new Map();
    
    querySnapshot.forEach((doc) => {
        const item = doc.data();
        const itemKey = `${item.name}_${item.minimumRequiredLevel}_${item.price_gold}`;
        
        allItems.push({
            id: doc.id,
            name: item.name,
            level: item.minimumRequiredLevel,
            price: item.price_gold,
            key: itemKey
        });
        
        if (duplicateItems.has(itemKey)) {
            duplicateItems.get(itemKey).push(doc.id);
        } else {
            duplicateItems.set(itemKey, [doc.id]);
        }
    });
    
    console.log('📋 ALL ITEMS FOUND:', allItems);
    console.log('🆔 DUPLICATE ANALYSIS:');
    
    let hasDuplicates = false;
    duplicateItems.forEach((ids, key) => {
        if (ids.length > 1) {
            hasDuplicates = true;
            console.log(`🚨 DUPLICATE: "${key}" - Document IDs:`, ids);
        }
    });
    
    if (!hasDuplicates) {
        console.log('✅ No duplicates found in Firestore data');
        console.log('🔧 The issue might be in the rendering logic');
    }
};

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
                        <span class="player-name clickable" 
                              onclick="viewPlayerProfile('${player.id}', '${player.username || 'Unknown Player'}', ${player.level || 1})"
                              title="View Profile">
                            ${player.username || 'Unknown Player'}
                        </span>
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
    
    // Add clickable style
    const style = document.createElement('style');
    style.textContent = `
        .player-name.clickable {
            cursor: pointer;
            transition: all 0.3s ease;
            padding: 0.2rem 0.5rem;
            border-radius: 5px;
        }
        
        .player-name.clickable:hover {
            background: rgba(0, 255, 255, 0.1);
            color: #00ffff;
            transform: translateX(5px);
        }
    `;
    document.head.appendChild(style);
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
    
    const userDoc = await getDoc(doc(db, "users", user.uid));
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
        const userDoc = await getDoc(doc(db, "users", user.uid));
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
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
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
        
        await updateDoc(doc(db, "users", user.uid), {
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
window.trackTrainingComplete();
}

async function loadTrainingHistory() {
    const historyContainer = document.getElementById('training-history');
    if (!historyContainer) return;
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
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
            window.trackStatUpgrade();
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

// ========== ENHANCED INVENTORY DISPLAY WITH CONSUMABLE SUPPORT ==========
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
        const isConsumable = item.type === 'consumable';
        const quantity = item.quantity || 1;
        
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
        
        // Calculate stat bonuses (for equipment) or effects (for consumables)
        let bonusText = '';
        if (item.stats && !isConsumable) {
            const bonuses = [];
            Object.entries(item.stats).forEach(([stat, value]) => {
                if (value > 0) {
                    bonuses.push(`+${value} ${stat}`);
                }
            });
            if (bonuses.length > 0) {
                bonusText = `<div class="item-bonuses">${bonuses.join(', ')}</div>`;
            }
        } else if (isConsumable && item.effect) {
            // Show consumable effect
            const effectText = getConsumableEffectText(item);
            if (effectText) {
                bonusText = `<div class="item-effect">${effectText}</div>`;
            }
        }
        
        return `
            <div class="inventory-item ${isEquipped ? 'equipped' : ''} ${isConsumable ? 'consumable' : ''}" data-item-id="${item.id}" data-item-type="${item.type}">
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
                    ${isConsumable && quantity > 1 ? `<div class="item-quantity">x${quantity}</div>` : ''}
                </div>
                <div class="item-name">${item.name}</div>
                <div class="item-type">${formatItemType(item.type)}</div>
                ${isEquipped ? '<div class="equipped-badge">EQUIPPED</div>' : ''}
                ${bonusText}
                <div class="item-actions">
                    ${isConsumable ? 
                        `<button class="inventory-btn use-btn" onclick="useConsumableItem('${item.id}')">
                            <i class="fas fa-bolt"></i> Use
                         </button>` :
                        (isEquipped ? 
                            `<button class="inventory-btn unequip-btn" onclick="unequipItem('${item.id}', '${item.type}')">
                                <i class="fas fa-times"></i> Unequip
                             </button>` :
                            `<button class="inventory-btn equip-btn" onclick="equipItem('${item.id}', '${item.type}')">
                                <i class="fas fa-check"></i> Equip
                             </button>`
                        )
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
        'car': 'Car', 
        'engine': 'Engine', 
        'tire': 'Tires', 
        'turbo': 'Turbo',
        'suspension': 'Suspension', 
        'seat': 'Seats',
        'consumable': 'Consumable'
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
        'car': 'fas fa-car', 
        'engine': 'fas fa-cogs', 
        'tire': 'fas fa-circle',
        'turbo': 'fas fa-bolt', 
        'suspension': 'fas fa-compress-alt', 
        'seat': 'fas fa-chair', 
        'consumable': 'fas fa-potion',
        'default': 'fas fa-box'
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

// ========== CONSUMABLE USAGE SYSTEM ==========
window.useConsumableItem = async function(itemId) {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to use items.');
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const inventory = userData.inventory || [];
            const consumable = inventory.find(item => item.id === itemId && item.type === 'consumable');
            
            if (!consumable) {
                alert('Item not found in inventory!');
                return;
            }

            // Check if player has at least one
            const currentQuantity = consumable.quantity || 1;
            if (currentQuantity <= 0) {
                alert('You don\'t have any of this item left!');
                return;
            }

            // Apply the consumable effect
            const success = await applyConsumableEffect(user.uid, consumable, userData);
            
            if (success) {
                // Update inventory - remove one or remove item if last one
                const updatedInventory = inventory.map(item => {
                    if (item.id === itemId && item.type === 'consumable') {
                        const newQuantity = (item.quantity || 1) - 1;
                        if (newQuantity <= 0) {
                            return null; // Mark for removal
                        }
                        return { ...item, quantity: newQuantity };
                    }
                    return item;
                }).filter(item => item !== null); // Remove null items

                await updateDoc(userRef, { inventory: updatedInventory });
                await loadPlayerData(user.uid);
                
                // Show success message
                showConsumableEffectMessage(consumable);
            }
        }
    } catch (error) {
        console.error('Error using consumable:', error);
        alert('Error using item: ' + error.message);
    }
}

// Apply consumable effects based on item data
async function applyConsumableEffect(userId, consumable, userData) {
    const userRef = doc(db, "users", userId);
    const updateData = {};
    
    if (!consumable.effect) {
        console.error('Consumable has no effect data:', consumable);
        return false;
    }

    try {
        switch(consumable.effect.type) {
            case 'condition_restore':
                // Repair kit - restore condition
                const restoreAmount = consumable.effect.value;
                const currentCondition = userData.condition || 0;
                const newCondition = Math.min(100, currentCondition + restoreAmount);
                
                updateData.condition = newCondition;
                console.log(`🔧 Condition restored: ${currentCondition}% → ${newCondition}%`);
                break;
                
            case 'stat_boost':
                // Temporary stat boosts (future feature)
                console.log('📈 Stat boost applied:', consumable.effect);
                break;
                
            case 'energy_restore':
                // Energy restoration (future feature)
                console.log('⚡ Energy restored:', consumable.effect);
                break;
                
            default:
                console.warn('Unknown consumable effect type:', consumable.effect.type);
                return false;
        }
        
        // Apply the updates to Firestore
        if (Object.keys(updateData).length > 0) {
            await updateDoc(userRef, updateData);
        }
        
        return true;
        
    } catch (error) {
        console.error('Error applying consumable effect:', error);
        return false;
    }
}

// Show visual feedback when consumable is used
function showConsumableEffectMessage(consumable) {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #00ff88, #00ffff);
        color: #1a1a2e;
        padding: 1.5rem 2rem;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0, 255, 255, 0.4);
        z-index: 10000;
        animation: popIn 0.5s ease;
        text-align: center;
        font-family: 'Orbitron', sans-serif;
        font-weight: bold;
        font-size: 1.2rem;
        max-width: 300px;
    `;
    
    let effectText = '';
    if (consumable.effect) {
        switch(consumable.effect.type) {
            case 'condition_restore':
                effectText = `Condition +${consumable.effect.value}%`;
                break;
            case 'stat_boost':
                effectText = 'Stats boosted!';
                break;
            case 'energy_restore':
                effectText = 'Energy restored!';
                break;
            default:
                effectText = 'Effect applied!';
        }
    }
    
    message.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎯</div>
        <div>${consumable.name} Used!</div>
        <div style="font-size: 1rem; margin-top: 0.5rem; color: #1a1a2e;">${effectText}</div>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        if (message.parentNode) {
            message.remove();
        }
    }, 3000);
}

// Helper function to display consumable effect text
function getConsumableEffectText(item) {
    if (!item.effect) return '';
    
    switch(item.effect.type) {
        case 'condition_restore':
            return `Restores ${item.effect.value}% condition`;
        case 'stat_boost':
            return `Boosts stats temporarily`;
        case 'energy_restore':
            return `Restores energy`;
        default:
            return 'Consumable item';
    }
}

// Add CSS for consumable-specific styles
const consumableCSS = `
    .inventory-item.consumable {
        border: 2px solid #a29bfe;
        background: linear-gradient(135deg, #1a1a2e, #2d1b33);
    }
    
    .inventory-item.consumable .item-image-container {
        position: relative;
    }
    
    .item-quantity {
        position: absolute;
        bottom: 5px;
        right: 5px;
        background: rgba(255, 107, 53, 0.9);
        color: white;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 0.7rem;
        font-weight: bold;
        border: 1px solid #1a1a2e;
        min-width: 20px;
        text-align: center;
        z-index: 10;
    }
    
    .item-effect {
        font-size: 0.8rem;
        color: #a29bfe;
        margin-top: 5px;
        text-align: center;
    }
    
    .use-btn {
        background: linear-gradient(135deg, #a29bfe, #6c5ce7) !important;
    }
    
    .use-btn:hover {
        background: linear-gradient(135deg, #6c5ce7, #a29bfe) !important;
    }
    
    @keyframes popIn {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        70% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
`;

// ========== DEBUG: ADD TEST CONSUMABLES TO INVENTORY ==========
window.addTestConsumables = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in first!');
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const inventory = userData.inventory || [];
            
            // Add test repair kits
            const testConsumables = [
                {
                    id: 'repair_kit',
                    name: 'Repair Kit',
                    type: 'consumable',
                    rarity: 'common',
                    effect: {
                        type: 'condition_restore',
                        value: 40
                    },
                    quantity: 3,
                    description: 'Restores 40% condition instantly'
                },
                {
                    id: 'advanced_repair_kit',
                    name: 'Advanced Repair Kit', 
                    type: 'consumable',
                    rarity: 'rare',
                    effect: {
                        type: 'condition_restore',
                        value: 100
                    },
                    quantity: 1,
                    description: 'Fully restores condition to 100% instantly'
                }
            ];
            
            // Add to inventory (avoid duplicates)
            let updatedInventory = [...inventory];
            testConsumables.forEach(newItem => {
                const existingIndex = updatedInventory.findIndex(item => 
                    item.id === newItem.id && item.type === newItem.type
                );
                
                if (existingIndex >= 0) {
                    // Update quantity if exists
                    updatedInventory[existingIndex].quantity = 
                        (updatedInventory[existingIndex].quantity || 1) + newItem.quantity;
                } else {
                    // Add new item
                    updatedInventory.push(newItem);
                }
            });
            
            await updateDoc(userRef, { inventory: updatedInventory });
            await loadPlayerData(user.uid);
            
            alert('🎁 Test consumables added to inventory!\n\n- 3x Repair Kit (40% condition)\n- 1x Advanced Repair Kit (100% condition)\n\nGo to Inventory to test them!');
        }
    } catch (error) {
        console.error('Error adding test consumables:', error);
        alert('Error: ' + error.message);
    }
};

// Also add this to see your current inventory in console
window.debugInventory = function() {
    const user = auth.currentUser;
    if (!user) {
        console.log('Please log in first!');
        return;
    }
    
    getDoc(doc(db, "users", user.uid)).then(doc => {
        if (doc.exists()) {
            const userData = doc.data();
            console.log('📦 Current Inventory:', userData.inventory || []);
            console.log('🔧 Current Condition:', userData.condition || 0);
        }
    });
};

console.log('🔧 Debug commands available:');
console.log('addTestConsumables() - Add repair kits to test');
console.log('debugInventory() - Show current inventory in console');

// ========== FIXED PVP RACING SYSTEM ==========
let currentChallenge = null;
let activeRaces = [];
let hasShownRaceResults = false;
let lastNotificationCheck = 0;
let processedNotifications = new Set(); // Track shown notifications

// ========== ADD THESE HELPER FUNCTIONS ==========
function formatNotificationTime(timestamp) {
    if (!timestamp) return 'Just now';
    
    try {
        const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / (3600000 * 24));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        
        return time.toLocaleDateString();
    } catch (error) {
        console.log('Error formatting time:', error);
        return 'Recently';
    }
}

// FIXED: Notification display that doesn't auto-popup the main modal
async function displayPendingNotifications() {
    const user = auth.currentUser;
    if (!user) return;

    // Prevent multiple simultaneous checks
    const now = Date.now();
    if (now - lastNotificationCheck < 10000) { // 10 second cooldown
        return;
    }
    lastNotificationCheck = now;

    try {
        console.log('🔔 Checking for notifications and race results...');
        
        let hasNewNotifications = false;
        let notifications = [];

        // Check notifications collection
        try {
            const notificationsQuery = query(
                collection(db, "notifications"),
                where("userId", "==", user.uid),
                where("read", "==", false),
                orderBy("timestamp", "desc"),
                limit(10)
            );
            
            const snapshot = await getDocs(notificationsQuery);
            
            snapshot.forEach(doc => {
                const notification = {
                    id: doc.id,
                    ...doc.data()
                };
                
                // Check if we've already shown this notification
                const notificationKey = `${notification.challengeId}-${notification.timestamp}`;
                if (!processedNotifications.has(notificationKey)) {
                    notifications.push(notification);
                    processedNotifications.add(notificationKey);
                    hasNewNotifications = true;
                }
            });

            console.log(`📬 Found ${notifications.length} new unread notifications`);

            // Mark as read immediately if we have new ones
            if (notifications.length > 0) {
                const updatePromises = notifications.map(notification => 
                    updateDoc(doc(db, "notifications", notification.id), {
                        read: true,
                        readAt: serverTimestamp()
                    })
                );
                
                await Promise.all(updatePromises);
                console.log('✅ Notifications marked as read');
            }
        } catch (error) {
            console.log('Notifications error:', error.message);
        }

        // ONLY show the small sidebar notifications, NOT the main modal
        if (hasNewNotifications && notifications.length > 0) {
            showEnhancedNotificationsModal(notifications); // This is the small sidebar one
        }

        // DO NOT automatically show race results modal here
        // The race results modal should only show when manually clicked
        
        // Clean up old processed notifications (prevent memory leak)
        if (processedNotifications.size > 100) {
            const array = Array.from(processedNotifications);
            processedNotifications = new Set(array.slice(-50));
        }
        
    } catch (error) {
        console.error('Error in notification system:', error);
    }
}

// FIXED: Better race results checking
async function checkUserRaceResultsSimple() {
    const user = auth.currentUser;
    if (!user) return [];

    try {
        console.log('🏁 Checking for user race results...');
        
        // Get challenges where user is involved
        const challengesQuery = query(
            collection(db, "challenges"),
            where("status", "==", "completed"),
            
            orderBy("completedAt", "desc"),
            limit(15)
        );
        
        const snapshot = await getDocs(challengesQuery);
        const userRaceResults = [];
        
        snapshot.forEach(doc => {
            const challenge = doc.data();
            const challengeId = doc.id;
            
            // Check if current user is involved in this challenge
            if (challenge.challengerId === user.uid || challenge.targetId === user.uid) {
                userRaceResults.push({
                    id: challengeId,
                    ...challenge
                });
            }
        });

        console.log(`📊 Found ${userRaceResults.length} race results for user`);

        // Filter to only show results from last 48 hours and remove duplicates
        const recentResults = userRaceResults.filter((result, index, self) => {
            if (!result.completedAt) return false;
            
            // Remove duplicates based on challenge ID
            const firstIndex = self.findIndex(r => r.id === result.id);
            if (firstIndex !== index) return false;
            
            const resultTime = result.completedAt.toDate ? result.completedAt.toDate() : new Date(result.completedAt);
            const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
            return resultTime > twoDaysAgo;
        }).slice(0, 8); // Limit to 8 most recent

        return recentResults;
        
    } catch (error) {
        console.error('Error checking user race results:', error);
        return [];
    }
}

// 🎉 ENHANCED: Much better race results modal with rich information
function showEnhancedRaceResultsModal(results) {
    const existingModal = document.getElementById('enhanced-race-results-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'enhanced-race-results-modal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #0c0c1e, #1a1a3e);
        border: 3px solid #ff6b35;
        border-radius: 20px;
        padding: 2.5rem;
        color: white;
        z-index: 10000;
        min-width: 550px;
        max-width: 700px;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 0 50px rgba(255, 107, 53, 0.4);
        font-family: 'Orbitron', sans-serif;
    `;
    
    const resultsHTML = results.map((result, index) => {
        const isUserChallenger = result.challengerId === auth.currentUser.uid;
        const userTime = isUserChallenger ? result.challengerTime : result.targetTime;
        const opponentTime = isUserChallenger ? result.targetTime : result.challengerTime;
        const userWon = result.winnerId === auth.currentUser.uid;
        const isDraw = result.isDraw;
        
        const timeDifference = Math.abs(userTime - opponentTime);
        const closeness = timeDifference < 2 ? "⚡ Very Close!" : timeDifference < 5 ? "🔥 Close Race" : "🏁 Solid Win";
        
        return `
            <div class="enhanced-race-result" style="
                padding: 1.5rem;
                margin-bottom: 1.5rem;
                background: ${userWon ? 
                    'linear-gradient(135deg, rgba(46, 204, 113, 0.15), rgba(39, 174, 96, 0.1))' : 
                    isDraw ?
                    'linear-gradient(135deg, rgba(52, 152, 219, 0.15), rgba(41, 128, 185, 0.1))' :
                    'linear-gradient(135deg, rgba(231, 76, 60, 0.15), rgba(192, 57, 43, 0.1))'
                };
                border-radius: 12px;
                border-left: 6px solid ${userWon ? '#2ecc71' : isDraw ? '#3498db' : '#e74c3c'};
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div style="font-weight: bold; font-size: 1.2rem; color: ${userWon ? '#2ecc71' : isDraw ? '#3498db' : '#e74c3c'};">
                        ${isDraw ? '🤝 DRAW' : (userWon ? '🏆 VICTORY' : '💔 DEFEAT')}
                    </div>
                    <div style="font-size: 0.9rem; color: #bbb;">
                        ${formatNotificationTime(result.completedAt)}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: center; margin-bottom: 1rem;">
                    <div style="text-align: center;">
                        <div style="font-weight: bold; color: ${isUserChallenger ? '#ffd700' : '#fff'};">
                            ${result.challengerName} ${isUserChallenger ? '(YOU)' : ''}
                        </div>
                        <div style="font-size: 1.4rem; font-weight: bold; color: #ff6b35;">
                            ${formatTime(result.challengerTime)}
                        </div>
                        <div style="font-size: 0.8rem; color: #bbb;">
                            Level ${result.challengerLevel}
                        </div>
                    </div>
                    
                    <div style="text-align: center; color: #ff6b35; font-weight: bold;">VS</div>
                    
                    <div style="text-align: center;">
                        <div style="font-weight: bold; color: ${!isUserChallenger ? '#ffd700' : '#fff'};">
                            ${result.targetName} ${!isUserChallenger ? '(YOU)' : ''}
                        </div>
                        <div style="font-size: 1.4rem; font-weight: bold; color: #ff6b35;">
                            ${formatTime(result.targetTime)}
                        </div>
                        <div style="font-size: 0.8rem; color: #bbb;">
                            Level ${result.targetLevel}
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-bottom: 1rem; padding: 0.5rem; background: rgba(255, 107, 53, 0.1); border-radius: 8px;">
                    <div style="color: #ff6b35; font-weight: bold;">${closeness}</div>
                    <div style="font-size: 0.9rem; color: #ddd;">Time Difference: ${formatTime(timeDifference)}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                    <div style="text-align: center; padding: 0.5rem; background: rgba(255, 215, 0, 0.1); border-radius: 6px;">
                        <div style="color: #ffd700;">💰 Gold</div>
                        <div style="font-weight: bold;">${isDraw ? 'No Transfer' : `+${result.goldTransfer}`}</div>
                    </div>
                    <div style="text-align: center; padding: 0.5rem; background: rgba(52, 152, 219, 0.1); border-radius: 6px;">
                        <div style="color: #3498db;">⭐ XP</div>
                        <div style="font-weight: bold;">+${result.xpReward || 25}</div>
                    </div>
                    <div style="text-align: center; padding: 0.5rem; background: rgba(46, 204, 113, 0.1); border-radius: 6px;">
                        <div style="color: #2ecc71;">🏆 Fame</div>
                        <div style="font-weight: bold;">${isDraw ? 'No Change' : `+${result.fameTransfer || 5}`}</div>
                    </div>
                    <div style="text-align: center; padding: 0.5rem; background: rgba(231, 76, 60, 0.1); border-radius: 6px;">
                        <div style="color: #e74c3c;">❤️ Condition</div>
                        <div style="font-weight: bold;">-${result.conditionCost || 15}%</div>
                    </div>
                </div>
                
                ${result.track ? `
                    <div style="text-align: center; margin-top: 1rem; padding: 0.5rem; background: rgba(155, 89, 182, 0.1); border-radius: 6px;">
                        <div style="color: #9b59b6;">🏁 ${result.track.name}</div>
                        <div style="font-size: 0.8rem; color: #bbb;">Difficulty: ${result.track.difficulty || 'Medium'} • Distance: ${result.track.distance || 5}km</div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <h2 style="color: #ff6b35; margin: 0 0 0.5rem 0; font-size: 2rem; text-shadow: 0 0 10px rgba(255, 107, 53, 0.5);">
                🏁 RACE RESULTS
            </h2>
            <div style="color: #bbb; font-size: 1rem;">Recent PVP Battles</div>
        </div>
        
        <div style="max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
            ${results.length > 0 ? resultsHTML : `
                <div style="text-align: center; padding: 3rem; color: #bbb; font-size: 1.1rem;">
                    🏁 No recent race results found<br>
                    <span style="font-size: 0.9rem;">Challenge other players to start racing!</span>
                </div>
            `}
        </div>
        
        <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #333;">
            <button onclick="document.getElementById('enhanced-race-results-modal').remove()" 
                    style="background: linear-gradient(135deg, #ff6b35, #ff8e53); color: white; border: none; padding: 0.8rem 2rem; border-radius: 25px; cursor: pointer; font-weight: bold; font-size: 1rem; font-family: 'Orbitron', sans-serif;">
                CLOSE RESULTS
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// FIXED: Enhanced notifications modal without spam
function showEnhancedNotificationsModal(notifications) {
    const existingModal = document.getElementById('enhanced-notifications-modal');
    if (existingModal) existingModal.remove();
    
    // Filter out welcome messages if we have real race results
    const filteredNotifications = notifications.filter(notif => 
        !notif.message.includes('Welcome to PVP Racing') && 
        !notif.message.includes('welcome')
    );
    
    if (filteredNotifications.length === 0) return;
    
    const modal = document.createElement('div');
    modal.id = 'enhanced-notifications-modal';
    modal.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid #00ffff;
        border-radius: 15px;
        padding: 1.5rem;
        color: white;
        z-index: 10000;
        width: 400px;
        max-height: 70vh;
        overflow-y: auto;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
        font-family: 'Orbitron', sans-serif;
    `;
    
    const notificationsHTML = filteredNotifications.map(notif => `
        <div class="enhanced-notification" style="
            padding: 1rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 255, 136, 0.05));
            border-radius: 10px;
            border-left: 4px solid #00ffff;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        ">
            <div style="font-weight: bold; color: #00ffff; margin-bottom: 0.5rem; font-size: 1.1rem;">
                🏁 Race Update
            </div>
            <div style="margin-bottom: 0.5rem; line-height: 1.4;">${notif.message}</div>
            <div style="font-size: 0.8rem; color: #88ffff; display: flex; justify-content: space-between;">
                <span>${formatNotificationTime(notif.timestamp)}</span>
                ${notif.challengeId ? '<span>#' + notif.challengeId.slice(-6) + '</span>' : ''}
            </div>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="color: #00ffff; margin: 0; font-size: 1.3rem;">📬 Race Notifications</h3>
            <button onclick="document.getElementById('enhanced-notifications-modal').remove()" 
                    style="background: none; border: none; color: #ff6b6b; font-size: 1.5rem; cursor: pointer; padding: 0;">&times;</button>
        </div>
        <div>
            ${notificationsHTML}
        </div>
        <div style="text-align: center; margin-top: 1rem;">
            <button onclick="document.getElementById('enhanced-notifications-modal').remove()" 
                    style="background: linear-gradient(135deg, #00ff88, #00ffff); color: #1a1a2e; border: none; padding: 0.5rem 1.5rem; border-radius: 20px; cursor: pointer; font-weight: bold;">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-close after 8 seconds
    setTimeout(() => {
        if (modal.parentNode) modal.remove();
    }, 8000);
}

// FIXED: Enhanced PVP race completion with better notifications
async function completeEnhancedPVPRace(challengeId, challenge) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        console.log('🏁 Completing enhanced PvP race...');

        // Get both players' data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const opponentId = user.uid === challenge.challengerId ? challenge.targetId : challenge.challengerId;
        const opponentDoc = await getDoc(doc(db, "users", opponentId));
        
        if (!userDoc.exists() || !opponentDoc.exists()) {
            throw new Error('Player data not found');
        }

        const userData = userDoc.data();
        const opponentData = opponentDoc.data();

        // Calculate race times
        const userTime = calculateEnhancedRaceTime(userData, challenge.track, 
            user.uid === challenge.challengerId ? challenge.levelDifference : -challenge.levelDifference,
            opponentData.level || 1);
            
        const opponentTime = calculateEnhancedRaceTime(opponentData, challenge.track,
            user.uid === challenge.challengerId ? -challenge.levelDifference : challenge.levelDifference,
            userData.level || 1);

        // Determine winner
        let winnerId, isDraw;
        
        if (Math.abs(userTime - opponentTime) < 1.5) {
            isDraw = true;
            winnerId = null;
        } else if (userTime < opponentTime) {
            isDraw = false;
            winnerId = user.uid;
        } else {
            isDraw = false;
            winnerId = opponentId;
        }

        // Calculate rewards
        const rewards = calculateEnhancedPVPRewards(
            challenge.betAmount, 
            challenge.levelDifference, 
            user.uid === winnerId ? userData.level : opponentData.level,
            user.uid === winnerId ? opponentData.level : userData.level,
            user.uid === winnerId ? userData.stats : opponentData.stats,
            user.uid === winnerId ? opponentData.stats : userData.stats,
            user.uid === winnerId ? userData.gold : opponentData.gold,
            user.uid === winnerId ? opponentData.gold : userData.gold
        );

        const winnerName = winnerId === challenge.challengerId ? challenge.challengerName : challenge.targetName;
        const loserName = winnerId === challenge.challengerId ? challenge.targetName : challenge.challengerName;
        
        // Create result message
        const resultMessage = isDraw ? 
            `🤝 Race ended in a draw! ${challenge.challengerName}: ${formatTime(userTime)} vs ${challenge.targetName}: ${formatTime(opponentTime)}` :
            `🏁 ${winnerName} defeated ${loserName}! Won ${rewards.goldTransfer} gold! ${formatTime(userTime)} vs ${formatTime(opponentTime)}`;

        // Update challenge with results
        const updateData = {
            status: 'completed',
            completedAt: serverTimestamp(),
            challengerTime: user.uid === challenge.challengerId ? userTime : opponentTime,
            targetTime: user.uid === challenge.targetId ? userTime : opponentTime,
            isDraw: isDraw,
            goldTransfer: isDraw ? 0 : rewards.goldTransfer,
            xpReward: rewards.xpReward,
            fameTransfer: isDraw ? 0 : rewards.fameTransfer,
            resultMessage: resultMessage,
            track: challenge.track || { name: 'Unknown Track' },
            conditionCost: challenge.conditionCost || 15
        };

        if (!isDraw) {
            updateData.winnerId = winnerId;
            updateData.winnerName = winnerName;
            updateData.loserId = winnerId === challenge.challengerId ? challenge.targetId : challenge.challengerId;
        }

        await updateDoc(doc(db, "challenges", challengeId), updateData);

        // Update player stats
        if (isDraw) {
            await updateDoc(doc(db, "users", user.uid), {
                condition: Math.max(0, userData.condition - (challenge.conditionCost || 15))
            });
            await updateDoc(doc(db, "users", opponentId), {
                condition: Math.max(0, opponentData.condition - (challenge.conditionCost || 15))
            });
        } else {
            if (user.uid === winnerId) {
                await updateDoc(doc(db, "users", user.uid), {
                    condition: Math.max(0, userData.condition - (challenge.conditionCost || 15)),
                    gold: userData.gold + rewards.goldTransfer,
                    fame: (userData.fame || 0) + rewards.fameTransfer
                });
                await updateDoc(doc(db, "users", opponentId), {
                    condition: Math.max(0, opponentData.condition - (challenge.conditionCost || 15)),
                    gold: Math.max(0, opponentData.gold - challenge.betAmount)
                });
            } else {
                await updateDoc(doc(db, "users", opponentId), {
                    condition: Math.max(0, opponentData.condition - (challenge.conditionCost || 15)),
                    gold: opponentData.gold + rewards.goldTransfer,
                    fame: (opponentData.fame || 0) + rewards.fameTransfer
                });
                await updateDoc(doc(db, "users", user.uid), {
                    condition: Math.max(0, userData.condition - (challenge.conditionCost || 15)),
                    gold: Math.max(0, userData.gold - challenge.betAmount)
                });
            }
        }

        // Create notifications
        await notifyBothPlayers(challengeId, resultMessage, challenge.challengerId, challenge.targetId);

        console.log('🎉 Enhanced PvP race completed successfully!');

    } catch (error) {
        console.error('❌ Error in enhanced PVP race:', error);
        alert('Error processing race: ' + error.message);
    }
}

// FIXED: Better notification checker (only shows sidebar, not main modal)
function startNotificationChecker() {
    console.log('🔔 Starting enhanced notification checker...');
    
    // Check every 2 minutes - only for sidebar notifications
    setInterval(() => {
        if (auth.currentUser) {
            displayPendingNotifications().catch(error => {
                console.log('Notification check failed:', error.message);
            });
        }
    }, 120000);
    
    // Initial check after 5 seconds - only for sidebar
    setTimeout(() => {
        if (auth.currentUser) {
            displayPendingNotifications().catch(error => {
                console.log('Initial notification check failed:', error.message);
            });
        }
    }, 5000);
}

function addManualNotificationCheck() {
    const existingBtn = document.getElementById('check-notifications-btn');
    if (existingBtn) existingBtn.remove();
    
    if (!auth.currentUser) return;
    
    const btn = document.createElement('button');
    btn.id = 'check-notifications-btn';
    btn.innerHTML = '🔔 Race Results';
    btn.style.cssText = `
        position: fixed;
        bottom: 70px;
        right: 20px;
        z-index: 10000;
        background: linear-gradient(135deg, #ff6b35, #ff8e53);
        color: white;
        border: none;
        padding: 12px 18px;
        border-radius: 25px;
        cursor: pointer;
        font-family: 'Orbitron', sans-serif;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 20px rgba(255, 107, 53, 0.4);
        transition: all 0.3s ease;
    `;
    
    btn.onmouseenter = () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.boxShadow = '0 6px 25px rgba(255, 107, 53, 0.6)';
    };
    
    btn.onmouseleave = () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 4px 20px rgba(255, 107, 53, 0.4)';
    };
    
    btn.onclick = async () => {
        console.log('🔔 Manual race results check triggered');
        
        // ONLY show the main race results modal when manually clicked
        const raceResults = await checkUserRaceResultsSimple();
        if (raceResults.length > 0) {
            showEnhancedRaceResultsModal(raceResults); // This is the big main modal
        } else {
            // Show empty state if no results
            showEnhancedRaceResultsModal([]);
        }
        
        // Also check for new notifications for the sidebar
        hasShownRaceResults = false;
        processedNotifications.clear();
        await displayPendingNotifications(); // This will show sidebar notifications only
    };
    
    document.body.appendChild(btn);
}

// FIXED: Auth state change handler
onAuthStateChanged(auth, (user) => {
    if (user) {
        addManualNotificationCheck();
        startNotificationChecker();
        // Reset flags when user logs in
        hasShownRaceResults = false;
        lastNotificationCheck = 0;
    } else {
        const btn = document.getElementById('check-notifications-btn');
        if (btn) btn.remove();
        // Reset flags when user logs out
        hasShownRaceResults = false;
        lastNotificationCheck = 0;
    }
});

// FIXED: Enhanced race time calculation with BETTER level difference handling
function calculateEnhancedRaceTime(playerData, track, levelDifference, opponentLevel) {
    const stats = playerData.stats || {};
    const equipment = calculateTotalStats(stats, playerData.inventory);
    
    let baseTime = 120;
    
    const statModifiers = {
        speed: 0.025,
        handling: 0.02,
        power: 0.015,
        dexterity: 0.01,
        luck: 0.005
    };
    
    let timeModifier = 1.0;
    
    Object.entries(statModifiers).forEach(([stat, modifier]) => {
        timeModifier -= (equipment.total[stat] || 0) * modifier;
    });
    
    const levelEffect = calculateLevelEffect(levelDifference, opponentLevel);
    timeModifier *= (1 + levelEffect);
    
    const itemEffect = calculateItemEffects(playerData.inventory);
    timeModifier *= (1 + itemEffect);
    
    timeModifier *= (0.90 + Math.random() * 0.2);
    
    return Math.max(30, baseTime * timeModifier);
}

// FIXED: Better level effect calculation
function calculateLevelEffect(levelDifference, opponentLevel) {
    if (levelDifference === 0) return 0;
    
    let baseEffect;
    
    if (levelDifference > 0) {
        // Higher level player - should be faster
        baseEffect = Math.max(-0.4, Math.min(-0.05, -levelDifference * 0.02));
    } else {
        // Lower level player - should be slower  
        baseEffect = Math.max(0.05, Math.min(0.4, Math.abs(levelDifference) * 0.025));
    }
    
    const levelScale = Math.min(1.5, Math.max(0.5, opponentLevel / 30));
    
    return baseEffect * levelScale;
}

function calculateItemEffects(inventory) {
    let totalEffect = 0;
    const equippedItems = inventory?.filter(item => item.equipped) || [];
    
    equippedItems.forEach(item => {
        if (item.stats) {
            const itemMultiplier = getItemTypeMultiplier(item.type);
            
            Object.entries(item.stats).forEach(([stat, value]) => {
                const statEffect = calculateStatEffect(stat, value);
                totalEffect += statEffect * itemMultiplier;
            });
        }
    });
    
    return Math.max(-0.2, Math.min(0.2, totalEffect));
}

function getItemTypeMultiplier(itemType) {
    const multipliers = {
        'engine': 1.2,
        'turbo': 1.1,
        'tire': 1.0,
        'suspension': 0.9,
        'seat': 0.7,
        'car': 1.5
    };
    return multipliers[itemType] || 1.0;
}

function calculateStatEffect(stat, value) {
    const effectRates = {
        'power': 0.002,
        'speed': 0.003,
        'handling': 0.0025,
        'dexterity': 0.0015,
        'luck': 0.001
    };
    return (value || 0) * (effectRates[stat] || 0.001);
}

// 🎯 ENHANCED BETTING SYSTEM FOR RICHER PLAYERS
function calculateEnhancedBetAmount(playerGold, playerLevel, opponentLevel, playerFame = 0) {
    const levelDiff = Math.abs(playerLevel - opponentLevel);
    
    let baseBet;
    if (playerGold < 1000) {
        baseBet = Math.min(50, Math.floor(playerGold * 0.1));
    } else if (playerGold < 10000) {
        baseBet = Math.min(500, Math.floor(playerGold * 0.05));
    } else if (playerGold < 50000) {
        baseBet = Math.min(2000, Math.floor(playerGold * 0.03));
    } else {
        baseBet = Math.min(5000, Math.floor(playerGold * 0.02));
    }
    
    const fameMultiplier = 1 + (Math.min(playerFame, 1000) / 10000);
    
    let levelMultiplier = 1.0;
    if (levelDiff > 5) {
        levelMultiplier = 1 + (levelDiff * 0.02);
    }
    
    let betAmount = Math.floor(baseBet * fameMultiplier * levelMultiplier);
    
    betAmount = Math.max(10, betAmount);
    betAmount = Math.min(betAmount, playerGold);
    betAmount = Math.min(betAmount, playerGold * 0.8);
    
    console.log(`💰 Bet calculation: base=${baseBet}, fameMult=${fameMultiplier.toFixed(2)}, levelMult=${levelMultiplier.toFixed(2)}, final=${betAmount}`);
    
    return betAmount;
}

// Enhanced reward calculation for bigger stakes
function calculateEnhancedPVPRewards(betAmount, levelDifference, winnerLevel, loserLevel, winnerStats, loserStats, winnerGold = 0, loserGold = 0) {
    const baseXP = 25;
    const baseFame = 5;
    
    const statAdvantage = calculateStatAdvantage(winnerStats, loserStats);
    const levelAdvantage = calculateLevelAdvantage(winnerLevel, loserLevel);
    
    let rewardMultiplier = 1.0;
    
    if (levelDifference < 0) {
        rewardMultiplier = Math.min(3.0, 1 + (Math.abs(levelDifference) * 0.25));
    } else if (levelDifference > 0) {
        rewardMultiplier = Math.max(0.3, 1 - (levelDifference * 0.15));
    }
    
    rewardMultiplier *= (1 + statAdvantage * 0.15);
    
    const wealthFactor = calculateWealthFactor(winnerGold, loserGold, betAmount);
    rewardMultiplier *= wealthFactor;
    
    const goldTransfer = Math.floor(betAmount * rewardMultiplier);
    const xpReward = Math.floor(baseXP * rewardMultiplier);
    const fameTransfer = Math.floor(baseFame * rewardMultiplier);
    
    return {
        goldTransfer: goldTransfer,
        xpReward: xpReward,
        fameTransfer: fameTransfer,
        rewardMultiplier: rewardMultiplier,
        statAdvantage: statAdvantage,
        levelAdvantage: levelAdvantage,
        wealthFactor: wealthFactor
    };
}

function calculateStatAdvantage(winnerStats, loserStats) {
    let advantage = 0;
    const stats = ['power', 'speed', 'handling', 'dexterity'];
    
    stats.forEach(stat => {
        const winnerStat = winnerStats?.[stat] || 0;
        const loserStat = loserStats?.[stat] || 0;
        advantage += (winnerStat - loserStat) / 100;
    });
    
    return Math.max(-0.5, Math.min(0.5, advantage));
}

function calculateLevelAdvantage(winnerLevel, loserLevel) {
    return (winnerLevel - loserLevel) / 50;
}

function calculateWealthFactor(winnerGold, loserGold, betAmount) {
    if (winnerGold > 10000 && loserGold > 10000) {
        return 1.5;
    }
    if (winnerGold > 5000 || loserGold > 5000) {
        return 1.25;
    }
    if (betAmount > 1000) {
        return 1.3;
    }
    return 1.0;
}

// Challenge another player to a race
window.challengePlayer = async function(playerId, playerName, playerLevel) {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    const currentPlayerLevel = userData.level || 1;
    const playerGold = userData.gold || 0;
    const playerFame = userData.fame || 0;
    
    const levelDiff = Math.abs(currentPlayerLevel - playerLevel);
    const maxAllowedDiff = 15;
    
    let opponentGold = 0;
    try {
        const opponentDoc = await getDoc(doc(db, "users", playerId));
        if (opponentDoc.exists()) {
            opponentGold = opponentDoc.data().gold || 0;
        }
    } catch (error) {
        console.log('Could not fetch opponent gold data');
    }
    
    if (levelDiff > maxAllowedDiff) {
        if (currentPlayerLevel < playerLevel) {
            if (!confirm(`⚠️ ${playerName} is ${levelDiff} levels higher than you!\n\nThis is a HIGH RISK race!\n• You might lose MORE gold if you lose\n• But win BIG if you win!\n\nContinue?`)) {
                return;
            }
        } else {
            if (!confirm(`⚠️ ${playerName} is ${levelDiff} levels lower than you!\n\nThis race has REDUCED REWARDS:\n• You win less gold if you win\n• But still risk your bet amount\n\nContinue?`)) {
                return;
            }
        }
    }
    
    if (userData.condition < 15) {
        alert("You need at least 15% condition to challenge other players!");
        return;
    }

    const betAmount = calculateEnhancedBetAmount(playerGold, currentPlayerLevel, playerLevel, playerFame);
    
    const betMessage = `Challenge ${playerName} to a race?\n\n` +
        `💰 BET: ${betAmount} gold\n` +
        `❤️ CONDITION COST: 15%\n` +
        `📊 LEVEL DIFFERENCE: ${levelDiff}\n` +
        `🎯 POTENTIAL WIN: ${Math.floor(betAmount * 2.5)} gold\n` +
        `⚠️ POTENTIAL LOSS: ${betAmount} gold\n\n` +
        `Accept this challenge?`;
    
    if (confirm(betMessage)) {
        try {
            const challengeRef = await addDoc(collection(db, "challenges"), {
                challengerId: user.uid,
                challengerName: userData.username,
                challengerLevel: currentPlayerLevel,
                challengerGold: playerGold,
                targetId: playerId,
                targetName: playerName,
                targetLevel: playerLevel,
                targetGold: opponentGold,
                status: 'pending',
                createdAt: serverTimestamp(),
                conditionCost: 15,
                betAmount: betAmount,
                track: getRandomTrack(),
                levelDifference: levelDiff,
                expiresAt: new Date(Date.now() + 30 * 60000)
            });

            alert(`🎯 Challenge sent to ${playerName}!\n\nBet: ${betAmount} gold\nThey have 30 minutes to accept.`);
            
        } catch (error) {
            alert('Error sending challenge: ' + error.message);
        }
    }

    console.log('🎯 Challenge sent - target will see notification');
};

// Accept a challenge
window.acceptChallenge = async function(challengeId) {
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
        
        if (challenge.targetId !== user.uid) {
            alert('This challenge is not for you!');
            return;
        }

        const challengerDoc = await getDoc(doc(db, "users", challenge.challengerId));
        const targetDoc = await getDoc(doc(db, "users", user.uid));
        
        const challengerData = challengerDoc.data();
        const targetData = targetDoc.data();

        if (challengerData.condition < challenge.conditionCost || targetData.condition < challenge.conditionCost) {
            alert('One of the players does not have enough condition!');
            return;
        }

        if (confirm(`Accept race challenge from ${challenge.challengerName}?\n\nBet Amount: ${challenge.betAmount} gold\nCondition Cost: ${challenge.conditionCost}%`)) {
            await updateDoc(doc(db, "challenges", challengeId), {
                status: 'accepted',
                acceptedAt: serverTimestamp()
            });

            startEnhancedPVPRace(challengeId, challenge);
        }
    } catch (error) {
        alert('Error accepting challenge: ' + error.message);
    }

    await checkPendingChallenges();
};

// ========== PENDING CHALLENGES CHECK ==========
async function checkPendingChallenges() {
    const user = auth.currentUser;
    if (!user) {
        console.log("No user logged in, skipping pending challenges check");
        return;
    }

    try {
        console.log("🔍 Checking for pending challenges...");
        
        const receivedChallengesQuery = query(
            collection(db, "challenges"),
            where("targetId", "==", user.uid),
            where("status", "==", "pending")
        );
        
        const receivedSnapshot = await getDocs(receivedChallengesQuery);
        let pendingCount = 0;
        
        receivedSnapshot.forEach(doc => {
            const challenge = doc.data();
            if (challenge.expiresAt) {
                const expiresAt = challenge.expiresAt.toDate();
                if (expiresAt > new Date()) {
                    pendingCount++;
                }
            }
        });
        
        console.log(`📬 Pending challenges: ${pendingCount}`);
        
        updateChallengeIndicator(pendingCount);
        
    } catch (error) {
        console.error('Error checking pending challenges:', error);
    }
}

// Update the red dot indicator in navbar
function updateChallengeIndicator(pendingCount) {
    const challengeIndicator = document.getElementById('challenge-indicator');
    if (challengeIndicator) {
        if (pendingCount > 0) {
            challengeIndicator.style.display = 'block';
            challengeIndicator.textContent = pendingCount;
        } else {
            challengeIndicator.style.display = 'none';
        }
    }
}

// FIXED: Enhanced PVP race function - updates BOTH players stats properly
async function startEnhancedPVPRace(challengeId, challenge) {
    if (window.restSystem?.isResting) {
        alert('Cannot race while resting!');
        return false;
    }
    
    const user = auth.currentUser;
    if (!user) {
        console.error('❌ No user in startEnhancedPVPRace');
        return;
    }

    try {
        console.log('🏁 Starting ENHANCED PvP race for challenge:', challengeId);

        // Get both players' data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const opponentId = user.uid === challenge.challengerId ? challenge.targetId : challenge.challengerId;
        const opponentDoc = await getDoc(doc(db, "users", opponentId));
        
        if (!userDoc.exists() || !opponentDoc.exists()) {
            throw new Error('Player data not found');
        }

        const userData = userDoc.data();
        const opponentData = opponentDoc.data();

        // Calculate race times
        const userTime = calculateEnhancedRaceTime(userData, challenge.track, 
            user.uid === challenge.challengerId ? challenge.levelDifference : -challenge.levelDifference,
            opponentData.level || 1);
            
        const opponentTime = calculateEnhancedRaceTime(opponentData, challenge.track,
            user.uid === challenge.challengerId ? -challenge.levelDifference : challenge.levelDifference,
            userData.level || 1);

        // FIXED: Proper winner determination
        let winnerId, isDraw;
        
        if (Math.abs(userTime - opponentTime) < 1.5) {
            // It's a draw if times are very close
            isDraw = true;
            winnerId = null;
        } else if (userTime < opponentTime) {
            // User wins
            isDraw = false;
            winnerId = user.uid;
        } else {
            // Opponent wins
            isDraw = false;
            winnerId = opponentId;
        }

        console.log('⏱️ Race times:', {
            userTime: userTime,
            opponentTime: opponentTime,
            difference: Math.abs(userTime - opponentTime),
            isDraw: isDraw,
            winnerId: winnerId,
            userLevel: userData.level,
            opponentLevel: opponentData.level,
            levelDifference: challenge.levelDifference
        });

        // Calculate rewards
        const rewards = calculateEnhancedPVPRewards(
            challenge.betAmount, 
            challenge.levelDifference, 
            user.uid === winnerId ? userData.level : opponentData.level,
            user.uid === winnerId ? opponentData.level : userData.level,
            user.uid === winnerId ? userData.stats : opponentData.stats,
            user.uid === winnerId ? opponentData.stats : userData.stats,
            user.uid === winnerId ? userData.gold : opponentData.gold,
            user.uid === winnerId ? opponentData.gold : userData.gold
        );

        const winnerName = winnerId === challenge.challengerId ? challenge.challengerName : challenge.targetName;
        const loserName = winnerId === challenge.challengerId ? challenge.targetName : challenge.challengerName;
        
        // Create result message for BOTH players
        const resultMessage = isDraw ? 
            `🤝 Race ended in a draw! Times: ${formatTime(userTime)} vs ${formatTime(opponentTime)}` :
            `🏁 ${winnerName} won ${rewards.goldTransfer} gold from ${loserName}! Times: ${formatTime(userTime)} vs ${formatTime(opponentTime)}`;

        // Update challenge with results
        const updateData = {
            status: 'completed',
            completedAt: serverTimestamp(),
            challengerTime: user.uid === challenge.challengerId ? userTime : opponentTime,
            targetTime: user.uid === challenge.targetId ? userTime : opponentTime,
            isDraw: isDraw,
            goldTransfer: isDraw ? 0 : rewards.goldTransfer,
            xpReward: rewards.xpReward,
            fameTransfer: isDraw ? 0 : rewards.fameTransfer,
            resultMessage: resultMessage,
            track: challenge.track || { name: 'Unknown Track' }
        };

        if (!isDraw) {
            updateData.winnerId = winnerId;
            updateData.winnerName = winnerName;
            updateData.loserId = winnerId === challenge.challengerId ? challenge.targetId : challenge.challengerId;
        }

        console.log('📝 Updating challenge with results...');
        await updateDoc(doc(db, "challenges", challengeId), updateData);
        console.log('✅ Challenge updated successfully!');

        // 🎯 FIXED: Update BOTH players stats properly
        console.log('🔄 Updating BOTH players stats...');
        
        if (isDraw) {
            // Draw - both players lose condition and get XP
            await updateDoc(doc(db, "users", user.uid), {
                condition: userData.condition - challenge.conditionCost
            });
            await addXP(user.uid, rewards.xpReward);
            
            await updateDoc(doc(db, "users", opponentId), {
                condition: opponentData.condition - challenge.conditionCost
            });
            await addXP(opponentId, rewards.xpReward);
            
            console.log('🤝 Draw: Both players lost condition and gained XP');
        } else {
            if (user.uid === winnerId) {
                // User wins - gains gold and fame
                await updateDoc(doc(db, "users", user.uid), {
                    condition: userData.condition - challenge.conditionCost,
                    gold: userData.gold + rewards.goldTransfer,
                    fame: (userData.fame || 0) + rewards.fameTransfer        
                });
                await addXP(user.uid, rewards.xpReward);
                
                // Opponent loses - loses gold
                await updateDoc(doc(db, "users", opponentId), {
                    condition: opponentData.condition - challenge.conditionCost,
                    gold: Math.max(0, opponentData.gold - challenge.betAmount),
                    fame: Math.max(0, (opponentData.fame || 0) - Math.floor(rewards.fameTransfer * 0.5))
                });
                await addXP(opponentId, Math.floor(rewards.xpReward * 0.3));
                
                console.log('🏆 User won: Gained gold/fame, opponent lost gold');
                if (window.trackPVPWin) window.trackPVPWin();
            } else {
                // Opponent wins - gains gold and fame
                await updateDoc(doc(db, "users", opponentId), {
                    condition: opponentData.condition - challenge.conditionCost,
                    gold: opponentData.gold + rewards.goldTransfer,
                    fame: (opponentData.fame || 0) + rewards.fameTransfer        
                });
                await addXP(opponentId, rewards.xpReward);
                
                // User loses - loses gold
                await updateDoc(doc(db, "users", user.uid), {
                    condition: userData.condition - challenge.conditionCost,
                    gold: Math.max(0, userData.gold - challenge.betAmount),
                    fame: Math.max(0, (userData.fame || 0) - Math.floor(rewards.fameTransfer * 0.5))
                });
                await addXP(user.uid, Math.floor(rewards.xpReward * 0.3));
                
                console.log('😞 User lost: Lost gold, opponent gained gold/fame');
            }
        }

        console.log('✅ Both players stats updated successfully!');

        // Create notifications for BOTH players
        console.log('📢 Creating notifications for both players...');
        await notifyBothPlayers(challengeId, resultMessage, challenge.challengerId, challenge.targetId);

        // Show results to current player
        showEnhancedRaceResults(challenge, userTime, opponentTime, winnerName, isDraw, rewards, userData.gold, opponentData.gold);

        // Refresh player data
        if (window.loadPlayerData) {
            await loadPlayerData(user.uid);
        }

        console.log('🎉 Enhanced PvP race completed successfully!');

    } catch (error) {
        console.error('❌ Error in enhanced PVP race:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        alert('Error processing race: ' + error.message);
    }
}

// 🎯 ENHANCED: Improved results display that works for both players
function showEnhancedRaceResults(challenge, time1, time2, winnerName, isDraw, rewards, userGold, opponentGold) {
    const existingModal = document.querySelector('.race-results-modal');
    if (existingModal) existingModal.remove();

    const levelDiffText = challenge.levelDifference === 0 ? 
        "Same level" : 
        `Level difference: ${challenge.levelDifference}`;
    
    const wealthInfo = userGold > 10000 || opponentGold > 10000 ? 
        `💰 High Stakes Match (Wealth multiplier: ${rewards.wealthFactor.toFixed(1)}x)` : 
        '';
    
    const resultHTML = `
        <div class="race-results">
            <h3>🏁 Race Results</h3>
            ${wealthInfo ? `<div class="wealth-info" style="color: #feca57; text-align: center; margin-bottom: 1rem;">${wealthInfo}</div>` : ''}
            <div class="race-track">Track: ${challenge.track?.name || 'Unknown Track'}</div>
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
                ${!isDraw ? `
                    <div>💰 ${winnerName} won ${rewards.goldTransfer} gold</div>
                    <div>⭐ ${rewards.xpReward} XP for winner</div>
                    <div>🏆 ${rewards.fameTransfer} Fame transferred</div>
                ` : `
                    <div>🤝 Draw - No gold/fame transfer</div>
                    <div>⭐ ${rewards.xpReward} XP for both players</div>
                `}
                <div>❤️ -${challenge.conditionCost}% Condition for both</div>
                ${rewards.rewardMultiplier !== 1 ? `
                    <div class="reward-breakdown">
                        <h4>Reward Breakdown:</h4>
                        <div>📊 Multiplier: ${rewards.rewardMultiplier.toFixed(2)}x</div>
                        ${rewards.statAdvantage !== 0 ? `<div>🎯 Stat Advantage: ${(rewards.statAdvantage * 100).toFixed(1)}%</div>` : ''}
                        ${rewards.levelAdvantage !== 0 ? `<div>📈 Level Advantage: ${(rewards.levelAdvantage * 100).toFixed(1)}%</div>` : ''}
                        ${rewards.wealthFactor !== 1 ? `<div>💰 Wealth Factor: ${rewards.wealthFactor.toFixed(1)}x</div>` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="result-notification">
                <p>🏁 Race completed! Check "Race Results" for future updates.</p>
            </div>
        </div>
    `;
    
    // Create modal for results
    const modal = document.createElement('div');
    modal.className = 'race-results-modal';
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
        min-width: 450px;
        max-width: 500px;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
    `;
    modal.innerHTML = resultHTML;
    
    document.body.appendChild(modal);
    
    // Close on click
    setTimeout(() => {
        modal.addEventListener('click', () => modal.remove());
    }, 3000);
    
    // Auto-close after 15 seconds
    setTimeout(() => {
        if (modal.parentNode) modal.remove();
    }, 15000);
}

function getRandomTrack() {
    const tracks = [
        { name: "Golden Horizon", difficulty: "medium", distance: 6 },
        { name: "Nova Grandstand", difficulty: "hard", distance: 7 },
        { name: "Crystal Speedway", difficulty: "easy", distance: 4 },
        { name: "Ironclad Arena", difficulty: "medium", distance: 5 },
        { name: "Steel Vortex", difficulty: "hard", distance: 6 }
    ];
    return tracks[Math.floor(Math.random() * tracks.length)];
}

// ========== FIXED NOTIFICATION FUNCTION ==========
async function notifyBothPlayers(challengeId, message, player1Id, player2Id) {
    try {
        console.log('📢 Creating notifications for both players...');
        
        const notificationsRef = collection(db, 'notifications');
        const notificationData = {
            challengeId: challengeId,
            message: message,
            timestamp: serverTimestamp(),
            read: false,
            type: 'race_result'
        };

        // Create notifications for both players
        const promises = [
            addDoc(notificationsRef, {
                ...notificationData,
                userId: player1Id
            }),
            addDoc(notificationsRef, {
                ...notificationData,
                userId: player2Id
            })
        ];

        await Promise.all(promises);
        console.log('✅ Notifications created successfully for both players');
        return true;
        
    } catch (error) {
        console.error('❌ Error creating notifications:', error);
        // Don't throw error - just log it so the race can complete
        return false;
    }
}

// Initialize the PVP system when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 PVP Racing System Initialized');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            checkPendingChallenges();
            setInterval(checkPendingChallenges, 120000);
        }
    });
});

// ========== ENHANCED DAILY CHALLENGES SYSTEM ==========
let dailyChallenges = [];
let challengeProgress = {};
let lastChallengeReset = null;

// All possible challenges pool
const CHALLENGE_POOL = [
    // Training challenges
    {
        id: 'training_beginner',
        title: 'Training Rookie',
        description: 'Complete 2 training sessions',
        type: 'training_complete',
        target: 2,
        reward: { gold: 40, xp: 20, tokens: 1 },
        difficulty: 'easy'
    },
    {
        id: 'training_pro',
        title: 'Training Pro',
        description: 'Complete 5 training sessions',
        type: 'training_complete',
        target: 5,
        reward: { gold: 80, xp: 40, tokens: 2 },
        difficulty: 'medium'
    },
    {
        id: 'training_master',
        title: 'Training Master',
        description: 'Complete 10 training sessions',
        type: 'training_complete',
        target: 10,
        reward: { gold: 150, xp: 75, tokens: 3 },
        difficulty: 'hard'
    },

    // Shopping challenges
    {
        id: 'shopper',
        title: 'Shopper',
        description: 'Purchase 1 new item',
        type: 'item_purchase',
        target: 1,
        reward: { gold: 30, xp: 15, tokens: 1 },
        difficulty: 'easy'
    },
    {
        id: 'collector',
        title: 'Collector',
        description: 'Purchase 3 new items',
        type: 'item_purchase',
        target: 3,
        reward: { gold: 70, xp: 35, tokens: 2 },
        difficulty: 'medium'
    },
    {
        id: 'gear_enthusiast',
        title: 'Gear Enthusiast',
        description: 'Purchase 5 new items',
        type: 'item_purchase',
        target: 5,
        reward: { gold: 120, xp: 60, tokens: 3 },
        difficulty: 'hard'
    },

    // PVP challenges
    {
        id: 'pvp_beginner',
        title: 'PVP Rookie',
        description: 'Win 1 PVP race',
        type: 'pvp_win',
        target: 1,
        reward: { gold: 50, xp: 25, tokens: 1, fame: 40 },
        difficulty: 'easy'
    },
    {
        id: 'pvp_warrior',
        title: 'PVP Warrior',
        description: 'Win 3 PVP races',
        type: 'pvp_win',
        target: 3,
        reward: { gold: 100, xp: 50, tokens: 2, fame: 80 },
        difficulty: 'medium'
    },
    {
        id: 'pvp_champion',
        title: 'PVP Champion',
        description: 'Win 5 PVP races',
        type: 'pvp_win',
        target: 5,
        reward: { gold: 200, xp: 100, tokens: 4, fame: 150 },
        difficulty: 'hard'
    },

    // Stat challenges
    {
        id: 'stat_learner',
        title: 'Stat Learner',
        description: 'Upgrade any stat 1 time',
        type: 'stat_upgrade',
        target: 1,
        reward: { gold: 40, xp: 20, tokens: 1 },
        difficulty: 'easy'
    },
    {
        id: 'stat_trained',
        title: 'Stat Trained',
        description: 'Upgrade any stat 3 times',
        type: 'stat_upgrade',
        target: 3,
        reward: { gold: 90, xp: 45, tokens: 2 },
        difficulty: 'medium'
    },
    {
        id: 'stat_master',
        title: 'Stat Master',
        description: 'Upgrade any stat 5 times',
        type: 'stat_upgrade',
        target: 5,
        reward: { gold: 150, xp: 75, tokens: 3 },
        difficulty: 'hard'
    },

    // Condition challenges
    {
        id: 'condition_care',
        title: 'Condition Care',
        description: 'Maintain above 80% condition for 30 minutes',
        type: 'condition_maintain',
        target: 1800, // 30 minutes in seconds
        reward: { gold: 40, xp: 20, tokens: 1 },
        difficulty: 'easy'
    },
    {
        id: 'condition_expert',
        title: 'Condition Expert',
        description: 'Maintain above 80% condition for 2 hours',
        type: 'condition_maintain',
        target: 7200, // 2 hours in seconds
        reward: {item: 'repair_kit' },
        difficulty: 'medium'
    },
    {
        id: 'condition_master',
        title: 'Condition Master',
        description: 'Maintain above 80% condition for 4 hours',
        type: 'condition_maintain',
        target: 14400, // 4 hours in seconds
        reward: { item: 'advanced_repair_kit' },
        difficulty: 'hard'
    },

    // Mixed challenges
    {
        id: 'all_rounder',
        title: 'All-Rounder',
        description: 'Complete 2 training sessions and win 1 PVP race',
        type: 'mixed_activities',
        target: 3,
        reward: { gold: 120, xp: 60, tokens: 2, fame: 100},
        difficulty: 'medium'
    },
    {
        id: 'pro_racer',
        title: 'Pro Racer',
        description: 'Win 2 PVP races and upgrade 2 stats',
        type: 'mixed_activities',
        target: 4,
        reward: { gold: 180, xp: 90, tokens: 3, fame: 200},
        difficulty: 'hard'
    },

    // SPECIAL CHALLENGES - Item Rewards Only
    {
        id: 'power_demon',
        title: '💪 Power Demon',
        description: 'Complete 3 training sessions with Power stat ≥ 35',
        type: 'special_training',
        target: 3,
        reward: { 
            item: 'turbo_twister'
        },
        difficulty: 'special',
        rarity: 0.1,
        conditions: {
            minStats: { power: 20 }
        }
    },
    {
        id: 'handling_master',
        title: '🌀 Handling Master', 
        description: 'Win 2 PVP races with Handling stat ≥ 30',
        type: 'special_pvp',
        target: 2,
        reward: {
            item: 'precision_gears'
        },
        difficulty: 'special',
        rarity: 0.08,
        conditions: {
            minStats: { handling: 15 }
        }
    },
    {
        id: 'desert_expert',
        title: '🏜️ Desert Expert',
        description: 'Win 2 race with Desert Stormer equipped',
        type: 'special_equipment',
        target: 2,
        reward: {
            item: 'sandstorm_cushion'
        },
        difficulty: 'special',
        rarity: 0.05,
        conditions: {
            // NO conditions for appearance - anyone can see it!
        }
    },
    {
        id: 'nocturnal_racer',
        title: '🌙 Nocturnal Racer',
        description: 'Complete 10 trainings between 10PM-4AM',
        type: 'special_time',
        target: 10,
        reward: {
            item: 'moonlight_grasp'
        },
        difficulty: 'special', 
        rarity: 0.07,
        conditions: {
            // NO conditions for appearance - anyone can see it!
        }
    }
];

// Initialize daily challenges with rotation
async function initializeDailyChallenges() {
    await checkChallengeReset();
    await loadChallengeProgress();
    startChallengeTracking();
    startMissionsAutoRefresh();
}

// Check if challenges need to be reset (daily)
async function checkChallengeReset() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        const lastReset = userData.lastChallengeReset;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        // Reset if never reset before or if it's a new day
        if (!lastReset || lastReset.toDate().getTime() < today) {
            console.log('🔄 Resetting daily challenges for new day');
            await generateDailyChallenges();
            await updateDoc(doc(db, "users", user.uid), {
                lastChallengeReset: serverTimestamp()
            });
        } else {
            await loadDailyChallenges();
        }
    } catch (error) {
        console.error('Error checking challenge reset:', error);
        await loadDailyChallenges(); // Fallback
    }
}

// Generate random daily challenges WITH SPECIAL CHALLENGES
async function generateDailyChallenges() {
    // Clear existing progress
    challengeProgress = {};
    
    // Select 5 random challenges with balanced difficulty
    const selectedChallenges = [];
    const difficulties = ['easy', 'medium', 'hard'];
    
    difficulties.forEach(difficulty => {
        const difficultyChallenges = CHALLENGE_POOL.filter(c => c.difficulty === difficulty && !c.rarity);
        const randomChallenge = difficultyChallenges[Math.floor(Math.random() * difficultyChallenges.length)];
        if (randomChallenge) {
            selectedChallenges.push({
                ...randomChallenge,
                progress: 0,
                completed: false,
                claimed: false
            });
        }
    });
    
    // Add 2 more random challenges of any difficulty (non-special)
    const remainingChallenges = CHALLENGE_POOL.filter(c => !c.rarity && !selectedChallenges.some(sc => sc.id === c.id));
    for (let i = 0; i < 2 && remainingChallenges.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * remainingChallenges.length);
        selectedChallenges.push({
            ...remainingChallenges[randomIndex],
            progress: 0,
            completed: false,
            claimed: false
        });
        remainingChallenges.splice(randomIndex, 1);
    }
    
    // 🎰 SPECIAL CHALLENGE ROLL - 25% chance to get one
    if (Math.random() < 0.25) {
        const specialChallenges = CHALLENGE_POOL.filter(c => c.rarity);
        let selectedSpecial = null;
        
        // Weighted random selection based on rarity
        const totalRarity = specialChallenges.reduce((sum, challenge) => sum + challenge.rarity, 0);
        let random = Math.random() * totalRarity;
        
        for (const challenge of specialChallenges) {
            random -= challenge.rarity;
            if (random <= 0) {
                selectedSpecial = challenge;
                break;
            }
        }
        
        if (selectedSpecial) {
            // Check if player meets conditions before offering
            const canUnlock = await checkSpecialChallengeConditions(selectedSpecial);
            if (canUnlock) {
                selectedChallenges.push({
                    ...selectedSpecial,
                    progress: 0,
                    completed: false,
                    claimed: false,
                    isSpecial: true
                });
                console.log(`🎰 SPECIAL CHALLENGE UNLOCKED: ${selectedSpecial.title}`);
            }
        }
    }
    
    dailyChallenges = selectedChallenges;
    
    // Initialize progress for new challenges
    dailyChallenges.forEach(challenge => {
        challengeProgress[challenge.id] = {
            progress: 0,
            completed: false,
            claimed: false,
            assignedAt: Date.now()
        };
    });
    
    console.log('🎲 Generated new daily challenges:', dailyChallenges.map(c => c.title));
    await saveChallengeProgress();
    displayDailyChallenges();
}

// SIMPLIFIED: Check if player meets special challenge conditions (FOR APPEARANCE ONLY)
async function checkSpecialChallengeConditions(challenge) {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) return false;
        
        const userData = userDoc.data();
        const conditions = challenge.conditions;
        
        // If no conditions, always show the challenge
        if (!conditions || Object.keys(conditions).length === 0) {
            console.log(`✅ No conditions - showing challenge: ${challenge.title}`);
            return true;
        }
        
        // Only check stat requirements for appearance
        if (conditions.minStats) {
            for (const [stat, minValue] of Object.entries(conditions.minStats)) {
                if ((userData[stat] || 0) < minValue) {
                    console.log(`❌ Special challenge hidden: ${stat} ${userData[stat]} < ${minValue}`);
                    return false;
                }
            }
        }
        
        console.log(`✅ Conditions met - showing challenge: ${challenge.title}`);
        return true;
        
    } catch (error) {
        console.error('Error checking special challenge conditions:', error);
        return false;
    }
}

// Check special challenge requirements DURING completion (not just for appearance)
async function checkSpecialChallengeCompletion(challenge) {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) return false;
        
        const userData = userDoc.data();
        
        // Check car requirement for desert_expert challenge
        if (challenge.id === 'desert_expert') {
            const equippedCar = userData.equippedCar || userData.currentCar || userData.car || userData.vehicle;
            if (equippedCar !== 'desert_stormer') {
                console.log(`🚗 Car requirement not met: need desert_stormer, have ${equippedCar}`);
                return false;
            }
        }
        
        // Check time requirement for nocturnal_racer challenge  
        if (challenge.id === 'nocturnal_racer') {
            const now = new Date();
            const currentHour = now.getHours();
            // 10PM-4AM window (overnight)
            if (!(currentHour >= 22 || currentHour < 4)) {
                console.log(`⏰ Time requirement not met: need 10PM-4AM, current hour: ${currentHour}`);
                return false;
            }
        }
        
        // Check stat requirements for power/handling challenges during completion
        if (challenge.conditions && challenge.conditions.minStats) {
            for (const [stat, minValue] of Object.entries(challenge.conditions.minStats)) {
                const userStat = userData[stat] || userData[`${stat}Stat`] || userData[`${stat}_stat`] || 0;
                if (userStat < minValue) {
                    console.log(`📊 Stat requirement not met: ${stat} ${userStat} < ${minValue}`);
                    return false;
                }
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('Error checking special challenge completion:', error);
        return false;
    }
}

// Load daily challenges from progress
async function loadDailyChallenges() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            challengeProgress = userData.challengeProgress || {};
            
            // Reconstruct challenges from progress
            dailyChallenges = [];
            Object.keys(challengeProgress).forEach(challengeId => {
                const template = CHALLENGE_POOL.find(c => c.id === challengeId);
                if (template) {
                    const progressData = challengeProgress[challengeId];
                    dailyChallenges.push({
                        ...template,
                        progress: progressData.progress || 0,
                        completed: progressData.completed || false,
                        claimed: progressData.claimed || false
                    });
                }
            });
            
            // If no challenges exist, generate new ones
            if (dailyChallenges.length === 0) {
                await generateDailyChallenges();
            }
            
            console.log('📋 Loaded daily challenges:', dailyChallenges.length);
            displayDailyChallenges();
        }
    } catch (error) {
        console.error('Error loading daily challenges:', error);
    }
}

// Load player's challenge progress from Firestore
async function loadChallengeProgress() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            challengeProgress = userData.challengeProgress || {};
            
            // Update challenges with current progress
            dailyChallenges.forEach(challenge => {
                if (challengeProgress[challenge.id]) {
                    challenge.progress = challengeProgress[challenge.id].progress || 0;
                    challenge.completed = challengeProgress[challenge.id].completed || false;
                    challenge.claimed = challengeProgress[challenge.id].claimed || false;
                }
            });
            
            console.log('📊 Challenge progress loaded:', challengeProgress);
            displayDailyChallenges(); // Refresh display after loading progress
        }
    } catch (error) {
        console.error('Error loading challenge progress:', error);
    }
}

// Save challenge progress to Firestore
async function saveChallengeProgress() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await updateDoc(doc(db, "users", user.uid), {
            challengeProgress: challengeProgress,
            lastChallengeUpdate: serverTimestamp()
        });
    } catch (error) {
        console.error('Error saving challenge progress:', error);
    }
}

// Start tracking game events for challenges
function startChallengeTracking() {
    console.log('🎯 Starting challenge event tracking...');
    
    // Track training sessions
    window.trackTrainingComplete = function() {
        updateChallengeProgress('training_complete', 1);
    };
    
    // Track item purchases
    window.trackItemPurchase = function() {
        updateChallengeProgress('item_purchase', 1);
    };
    
    // Track PVP wins
    window.trackPVPWin = function() {
        updateChallengeProgress('pvp_win', 1);
    };
    
    // Track stat upgrades
    window.trackStatUpgrade = function() {
        updateChallengeProgress('stat_upgrade', 1);
    };
    
    // Track condition maintenance (check every minute)
    setInterval(() => {
        trackConditionMaintenance();
    }, 60000);
}

// Enhanced progress tracking with special challenge completion checks
async function updateChallengeProgress(challengeType, amount = 1) {
    const user = auth.currentUser;
    if (!user) return;

    console.log(`📈 Updating challenge: ${challengeType} +${amount}`);
    
    let updated = false;
    
    for (const challenge of dailyChallenges) {
        if (!challenge.completed && !challenge.claimed) {
            let shouldUpdate = false;
            
            // Regular challenge type matching
            if (challenge.type === challengeType) {
                shouldUpdate = true;
            }
            // Mixed activities challenge
            else if (challenge.type === 'mixed_activities' && 
                    (challengeType === 'training_complete' || 
                     challengeType === 'pvp_win' || 
                     challengeType === 'stat_upgrade')) {
                shouldUpdate = true;
            }
            // Special challenges
            else if (challenge.type.startsWith('special_') && 
                    challengeType === challenge.type.replace('special_', '')) {
                shouldUpdate = true;
            }
            
            if (shouldUpdate) {
                // For special challenges, check car/time requirements at progress time
                if (challenge.isSpecial && !await checkSpecialChallengeCompletion(challenge)) {
                    console.log(`⏸️ Special challenge progress paused - requirements not met: ${challenge.title}`);
                    continue; // Skip this challenge if requirements aren't met
                }
                
                const oldProgress = challenge.progress;
                challenge.progress = Math.min(challenge.target, challenge.progress + amount);
                
                // Check if challenge is now completed
                if (challenge.progress >= challenge.target && !challenge.completed) {
                    challenge.completed = true;
                    console.log(`🎉 Challenge completed: ${challenge.title}`);
                    showChallengeCompleteNotification(challenge);
                }
                
                // Update progress in storage
                challengeProgress[challenge.id] = {
                    progress: challenge.progress,
                    completed: challenge.completed,
                    claimed: challenge.claimed,
                    lastUpdated: Date.now()
                };
                
                updated = true;
                
                console.log(`   ${challenge.title}: ${oldProgress} → ${challenge.progress}/${challenge.target}`);
            }
        }
    }
    
    if (updated) {
        await saveChallengeProgress();
        displayDailyChallenges();
    }
}

// Track condition maintenance
async function trackConditionMaintenance() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const condition = userData.condition || 0;
            
            if (condition >= 80) {
                // Add 60 seconds (1 minute) to condition maintenance progress
                updateChallengeProgress('condition_maintain', 60);
            } else {
                // Reset progress if condition drops below 80%
                dailyChallenges.forEach(challenge => {
                    if (challenge.type === 'condition_maintain' && !challenge.completed) {
                        const oldProgress = challengeProgress[challenge.id]?.progress || 0;
                        if (oldProgress > 0) {
                            console.log(`🔄 Resetting condition challenge - condition dropped to ${condition}%`);
                            challenge.progress = 0;
                            challengeProgress[challenge.id] = {
                                progress: 0,
                                completed: false,
                                claimed: false
                            };
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error tracking condition:', error);
    }
}

// Display daily challenges with progress
function displayDailyChallenges() {
    const challengesContainer = document.getElementById('daily-challenges');
    if (!challengesContainer) return;
    
    if (dailyChallenges.length === 0) {
        challengesContainer.innerHTML = '<div class="no-challenges">No daily challenges available</div>';
        return;
    }
    
    const resetTime = getNextResetTime();
    
    const challengesHTML = `
        <div class="challenge-reset-info">
            <i class="fas fa-sync-alt"></i> New challenges in: ${resetTime}
        </div>
        ${dailyChallenges.map(challenge => {
            const progressPercent = Math.min(100, (challenge.progress / challenge.target) * 100);
            const isCompleted = challenge.completed && !challenge.claimed;
            const isClaimed = challenge.claimed;
            const isSpecial = challenge.isSpecial;
            const hasItemReward = challenge.reward.item;
            
            return `
                <div class="challenge-item ${isCompleted ? 'completed' : ''} ${isClaimed ? 'claimed' : ''} ${isSpecial ? 'special-challenge' : ''} ${hasItemReward ? 'has-item-reward' : ''}">
                    ${isSpecial ? '<div class="special-badge">SPECIAL</div>' : ''}
                    
                    <div class="challenge-content ${hasItemReward ? 'with-item' : ''}">
                        <div class="challenge-main">
                            <div class="challenge-header">
                                <h4>${challenge.title} 
                                    <span class="challenge-difficulty difficulty-${challenge.difficulty}">
                                        ${challenge.difficulty.toUpperCase()}
                                    </span>
                                </h4>
                                <span class="challenge-progress">${challenge.progress}/${challenge.target}</span>
                            </div>
                            <p class="challenge-desc">${challenge.description}</p>
                            <div class="progress-bar ${hasItemReward ? 'small-progress' : ''}">
                                <div class="progress-fill" style="width: ${progressPercent}%"></div>
                            </div>
                            <div class="challenge-rewards">
                                ${challenge.reward.gold ? `<span class="reward-gold">💰 ${challenge.reward.gold}</span>` : ''}
                                ${challenge.reward.xp ? `<span class="reward-xp">⭐ ${challenge.reward.xp}</span>` : ''}
                                ${challenge.reward.tokens ? `<span class="reward-tokens">💎 ${challenge.reward.tokens}</span>` : ''}
                            </div>
                        </div>
                        
                        ${hasItemReward ? `
                            <div class="item-reward-preview">
                                <div class="item-image">
                                    <img src="images/items/${challenge.reward.item}.jpg" alt="${challenge.reward.item}" 
                                         onerror="this.src='images/items/default.jpg'">
                                </div>
                                
                            </div>
                        ` : ''}
                    </div>
                    
                    <button class="challenge-claim-btn" 
                            onclick="claimChallengeReward('${challenge.id}')"
                            ${!isCompleted ? 'disabled' : ''}>
                        ${isClaimed ? 'Claimed ✓' : (isCompleted ? 'Claim Reward' : 'In Progress')}
                    </button>
                </div>
            `;
        }).join('')}
    `;
    
    challengesContainer.innerHTML = challengesHTML;
}

function getNextResetTime() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

// Grant item reward from database
async function grantItemReward(userId, itemId) {
    try {
        // First, get item data from items collection
        const itemDoc = await getDoc(doc(db, "items", itemId));
        if (!itemDoc.exists()) {
            console.error(`Item ${itemId} not found in database`);
            return false;
        }
        
        const itemData = itemDoc.data();
        
        // Add to user's inventory
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            [`inventory.${itemId}`]: {
                ...itemData,
                obtainedAt: serverTimestamp(),
                source: 'special_challenge'
            }
        });
        
        console.log(`🎁 Granted item: ${itemId} to user ${userId}`);
        return true;
        
    } catch (error) {
        console.error('Error granting item reward:', error);
        return false;
    }
}

// Claim challenge reward
window.claimChallengeReward = async function(challengeId) {
    const user = auth.currentUser;
    if (!user) return;
    
    const challenge = dailyChallenges.find(c => c.id === challengeId);
    if (!challenge || !challenge.completed || challenge.claimed) return;
    
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const updateData = {};
            
            // Handle regular rewards
            if (challenge.reward.gold) {
                updateData.gold = userData.gold + challenge.reward.gold;
            }
            if (challenge.reward.xp) {
                await addXP(user.uid, challenge.reward.xp);
            }
            if (challenge.reward.tokens) {
                updateData.tokens = (userData.tokens || 0) + challenge.reward.tokens;
            }
            
            // 🎁 Handle ITEM reward (for special challenges)
            if (challenge.reward.item) {
                await grantItemReward(user.uid, challenge.reward.item);
            }
            
            // Mark challenge as claimed
            challenge.claimed = true;
            challengeProgress[challenge.id].claimed = true;
            
            // Only update if we have regular rewards
            if (Object.keys(updateData).length > 0) {
                await updateDoc(userRef, updateData);
            }
            
            await saveChallengeProgress();
            displayDailyChallenges();
            
            showRewardNotification(challenge);
            await loadPlayerData(user.uid);
        }
    } catch (error) {
        console.error('Error claiming reward:', error);
        alert('Error claiming reward: ' + error.message);
    }
};

// Show challenge completion notification
function showChallengeCompleteNotification(challenge) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00ff88, #00ffff);
        color: #1a1a2e;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 255, 255, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        cursor: pointer;
        font-family: 'Orbitron', sans-serif;
        font-weight: bold;
        max-width: 300px;
    `;
    
    notification.innerHTML = `
        <div>🎉 Challenge Complete!</div>
        <div style="font-size: 0.9rem; margin-top: 0.5rem;">${challenge.title}</div>
        <div style="font-size: 0.8rem; margin-top: 0.3rem;">Click to claim rewards</div>
    `;
    
    notification.onclick = () => {
        claimChallengeReward(challenge.id);
        notification.remove();
    };
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Show reward notification
function showRewardNotification(challenge) {
    let rewardText = `🎉 Rewards Claimed!\n\n${challenge.title}\n\n`;
    
    if (challenge.reward.gold) rewardText += `💰 +${challenge.reward.gold} Gold\n`;
    if (challenge.reward.xp) rewardText += `⭐ +${challenge.reward.xp} XP\n`;
    if (challenge.reward.tokens) rewardText += `💎 +${challenge.reward.tokens} Tokens\n`;
    if (challenge.reward.item) rewardText += `🎁 +${challenge.reward.item} (New Item!)\n`;
    
    alert(rewardText);
}

// Auto-refresh challenges every 10 seconds when on missions page
function startMissionsAutoRefresh() {
    if (window.location.pathname.includes('missions.html')) {
        setInterval(() => {
            loadChallengeProgress().then(() => {
                displayDailyChallenges();
            });
        }, 10000); // Refresh every 10 seconds
    }
}

// Add this function to test special challenges - call it from browser console
window.forceSpecialChallenges = async function() {
    console.log('🎯 FORCING SPECIAL CHALLENGES FOR TESTING');
    
    // Clear current challenges
    dailyChallenges = [];
    challengeProgress = {};
    
    // Add ALL special challenges
    const specialChallenges = CHALLENGE_POOL.filter(c => c.rarity);
    
    for (const challenge of specialChallenges) {
        const canUnlock = await checkSpecialChallengeConditions(challenge);
        if (canUnlock) {
            dailyChallenges.push({
                ...challenge,
                progress: 0,
                completed: false,
                claimed: false,
                isSpecial: true
            });
            
            challengeProgress[challenge.id] = {
                progress: 0,
                completed: false,
                claimed: false,
                assignedAt: Date.now()
            };
        }
    }
    
    await saveChallengeProgress();
    displayDailyChallenges();
    console.log('✅ Special challenges forced:', dailyChallenges.map(c => c.title));
};

// Call this from browser console: forceSpecialChallenges()

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
        const challengeRef = doc(db, "challenges", challengeId);
        const challengeSnap = await getDoc(challengeRef);
        
        if (challengeSnap.exists()) {
            const challenge = challengeSnap.data();
            const user = auth.currentUser;
            
            // Only allow if user is involved in this challenge (SAFE)
            if (user && (challenge.challengerId === user.uid || challenge.targetId === user.uid)) {
                await updateDoc(challengeRef, {
                    status: 'expired',
                    expiredAt: serverTimestamp()
                });
                console.log(`Marked challenge ${challengeId} as expired`);
            }
        }
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

    await checkPendingChallenges();
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

// ========== STAT BARS SYSTEM - COMPLETELY FIXED ==========
// FIXED: This function now properly updates all stat bars with three colors
function updateStatBars(userData) {
    if (!userData) {
        console.error('No user data provided to updateStatBars');
        return;
    }

    const stats = userData.stats || {};
    const inventory = userData.inventory || [];
    const calculatedStats = calculateTotalStats(stats, inventory);
    
    console.log('Updating stat bars with:', calculatedStats);

    const statConfigs = [
        { stat: 'power', color1: '#ff6b6b', color2: '#00ff88', color3: '#ff4757' },
        { stat: 'speed', color1: '#00a8ff', color2: '#00ff88', color3: '#ff4757' },
        { stat: 'dexterity', color1: '#9c88ff', color2: '#00ff88', color3: '#ff4757' },
        { stat: 'handling', color1: '#fbc531', color2: '#00ff88', color3: '#ff4757' },
        { stat: 'structure', color1: '#7c3320ff', color2: '#00ff88', color3: '#ff4757' },
        { stat: 'luck', color1: '#00d2d3', color2: '#00ff88', color3: '#ff4757' }
    ];

    statConfigs.forEach(config => {
        const baseValue = calculatedStats.base[config.stat] || 0;
        const bonusValue = calculatedStats.bonuses[config.stat] || 0;
        const totalValue = calculatedStats.total[config.stat] || 0;
        
        // Calculate percentages for the bar segments
        const maxStatValue = 50; // Maximum stat value for 100% bar width
        const basePercent = Math.min(100, (baseValue / maxStatValue) * 100);
        const bonusPercent = Math.min(100 - basePercent, (bonusValue / maxStatValue) * 100);
        const negativeValue = Math.max(0, baseValue - totalValue); // Calculate negative effect if any
        const negativePercent = negativeValue > 0 ? Math.min(100 - basePercent - bonusPercent, (negativeValue / maxStatValue) * 100) : 0;
        
        // Find or create stat bar container
        let statBarContainer = document.querySelector(`.stat-bar-container[data-stat="${config.stat}"]`) ||
                              document.querySelector(`[data-stat="${config.stat}"] .stat-bars`) ||
                              document.querySelector(`.stat-upgrade-item[data-stat="${config.stat}"] .stat-bars`);
        
        // If no container exists, create one
        if (!statBarContainer) {
            const statItem = document.querySelector(`[data-stat="${config.stat}"]`) || 
                           document.querySelector(`.stat-upgrade-item[data-stat="${config.stat}"]`);
            if (statItem) {
                statBarContainer = document.createElement('div');
                statBarContainer.className = 'stat-bars';
                statBarContainer.style.cssText = `
                    display: flex;
                    width: 100%;
                    height: 20px;
                    background: rgba(0, 255, 255, 0.1);
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 5px 0;
                `;
                statItem.appendChild(statBarContainer);
            }
        }

        if (statBarContainer) {
            // Clear existing bars
            statBarContainer.innerHTML = '';
            
            // Create base stat bar (color1)
            if (basePercent > 0) {
                const baseBar = document.createElement('div');
                baseBar.className = 'stat-bar-base';
                baseBar.style.cssText = `
                    width: ${basePercent}%;
                    background: ${config.color1};
                    height: 100%;
                    transition: width 0.5s ease-in-out;
                `;
                baseBar.setAttribute('data-stat', config.stat);
                baseBar.title = `Base: ${baseValue}`;
                statBarContainer.appendChild(baseBar);
            }
            
            // Create bonus stat bar (color2)
            if (bonusPercent > 0) {
                const bonusBar = document.createElement('div');
                bonusBar.className = 'stat-bar-bonus';
                bonusBar.style.cssText = `
                    width: ${bonusPercent}%;
                    background: ${config.color2};
                    height: 100%;
                    transition: width 0.5s ease-in-out;
                `;
                bonusBar.setAttribute('data-stat', config.stat);
                bonusBar.title = `Bonus: +${bonusValue}`;
                statBarContainer.appendChild(bonusBar);
            }
            
            // Create negative stat bar (color3) if there are negative effects
            if (negativePercent > 0) {
                const negativeBar = document.createElement('div');
                negativeBar.className = 'stat-bar-negative';
                negativeBar.style.cssText = `
                    width: ${negativePercent}%;
                    background: ${config.color3};
                    height: 100%;
                    transition: width 0.5s ease-in-out;
                `;
                negativeBar.setAttribute('data-stat', config.stat);
                negativeBar.title = `Negative: -${negativeValue}`;
                statBarContainer.appendChild(negativeBar);
            }
            
            // Update value displays
            const baseValueEl = document.querySelector(`.base-value[data-stat="${config.stat}"]`) ||
                              document.querySelector(`[data-stat="${config.stat}"] .base-value`);
            const bonusValueEl = document.querySelector(`.bonus-value[data-stat="${config.stat}"]`) ||
                               document.querySelector(`[data-stat="${config.stat}"] .bonus-value`);
            const totalValueEl = document.querySelector(`.total-value[data-stat="${config.stat}"]`) ||
                               document.querySelector(`[data-stat="${config.stat}"] .total-value`);
            
            if (baseValueEl) baseValueEl.textContent = `Base: ${baseValue}`;
            if (bonusValueEl) bonusValueEl.textContent = bonusValue > 0 ? `+${bonusValue}` : '';
            if (totalValueEl) totalValueEl.textContent = `Total: ${totalValue}`;
            
            // If no value displays exist, create them
            if (!baseValueEl || !bonusValueEl || !totalValueEl) {
                const valueContainer = document.querySelector(`[data-stat="${config.stat}"] .stat-values`) ||
                                     document.createElement('div');
                if (!valueContainer.className) valueContainer.className = 'stat-values';
                
                valueContainer.innerHTML = `
                    <div class="base-value" data-stat="${config.stat}">Base: ${baseValue}</div>
                    <div class="bonus-value" data-stat="${config.stat}">${bonusValue > 0 ? `+${bonusValue}` : ''}</div>
                    <div class="total-value" data-stat="${config.stat}">Total: ${totalValue}</div>
                `;
                
                const statItem = document.querySelector(`[data-stat="${config.stat}"]`);
                if (statItem && !statItem.querySelector('.stat-values')) {
                    statItem.appendChild(valueContainer);
                }
            }
        }
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
        
        // Only initialize if we're on the marketplace page
        if (this.isOnMarketplacePage()) {
            this.init();
        }
    }

    isOnMarketplacePage() {
        return window.location.pathname.includes('marketplace.html') || 
               document.getElementById('listings-grid') !== null;
    }

    init() {
        if (!this.isOnMarketplacePage()) return;
        
        try {
            this.setupEventListeners();
            this.loadListings();
        } catch (error) {
            console.log('PlayerListings not initialized (not on marketplace page)');
        }
    }

    setupEventListeners() {
        // Safely get elements with null checks
        const searchInput = document.getElementById('listing-search');
        const categoryFilter = document.getElementById('category-filter');
        const sortFilter = document.getElementById('sort-filter');
        const createBtn = document.getElementById('create-listing-btn');
        const createForm = document.getElementById('create-listing-form');

        // Search and filter with null checks
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.filterListings();
            });
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.filterListings();
            });
        }

        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.sortListings();
            });
        }

        // Create listing with null checks
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.showCreateListingModal();
            });
        }

        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createListing();
            });
        }
    }

    async loadListings() {
        // Only load if we're on the marketplace page
        if (!this.isOnMarketplacePage()) return;

        try {
            const grid = document.getElementById('listings-grid');
            if (grid) {
                grid.innerHTML = '<div class="loading">Loading listings...</div>';
            }

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
            const grid = document.getElementById('listings-grid');
            if (grid) {
                grid.innerHTML = '<div class="error">Error loading listings</div>';
            }
        }
    }

    renderListings() {
        const grid = document.getElementById('listings-grid');
        const noListings = document.getElementById('no-listings');
        const count = document.getElementById('listings-count');

        // Safe element checks
        if (!grid) return;

        if (this.listings.length === 0) {
            grid.innerHTML = '';
            if (noListings) noListings.style.display = 'block';
            if (count) count.textContent = '0';
            return;
        }

        if (noListings) noListings.style.display = 'none';
        if (count) count.textContent = this.listings.length.toString();

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
        const modal = document.getElementById('create-listing-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    async populateItemSelect() {
        const select = document.getElementById('item-select');
        if (!select) return;
        
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
        if (!form) return;
        
        const formData = new FormData(form);
        
        // Safe reference to currentUser
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to create listings.');
            return;
        }
        
        const listingData = {
            sellerId: user.uid,
            sellerName: user.displayName || user.email.split('@')[0],
            itemType: document.getElementById('item-select')?.selectedOptions[0]?.dataset?.type || 'vehicle',
            itemId: formData.get('item'),
            itemData: this.getItemData(formData.get('item')),
            price: parseInt(formData.get('price')) || 0,
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
            alert('Error creating listing: ' + error.message);
        }
    }

    async buyListing(listingId) {
        const listing = this.listings.find(l => l.id === listingId);
        if (!listing) return;

        // Safe reference to currentUser
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to buy items.');
            return;
        }

        // Check if user has enough gold (you'll need to load user data)
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        if (!userData || userData.gold < listing.price) {
            alert('Not enough gold!');
            return;
        }

        try {
            // Update listing status
            await updateDoc(doc(db, 'marketplace/playerListings', listingId), {
                status: 'sold',
                soldTo: user.uid,
                soldAt: Date.now()
            });

            // Transfer gold (you'd need a transaction here)
            // Add item to buyer's inventory
            // Remove item from seller's inventory

            alert('Purchase successful!');
            this.loadListings(); // Refresh
        } catch (error) {
            console.error('Error buying listing:', error);
            alert('Error purchasing item: ' + error.message);
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
        const user = auth.currentUser;
        if (!user) return false;
        
        // You'll need to load user level from Firestore
        // For now, return true as placeholder
        return true;
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
        const modal = document.getElementById('create-listing-modal');
        const form = document.getElementById('create-listing-form');
        
        if (modal) modal.style.display = 'none';
        if (form) form.reset();
    }
}

// Safe initialization - only on marketplace pages
let playerListings;
document.addEventListener('DOMContentLoaded', () => {
    // Only create PlayerListings if we're on the marketplace page
    if (window.location.pathname.includes('marketplace.html') || 
        document.getElementById('listings-grid')) {
        playerListings = new PlayerListings();
    }
});


// ========== ULTRA-SAFE CLEANUP ==========
async function safeUserChallengeCleanup() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        console.log("🔍 Checking user's sent challenges...");
        
        // ONLY clean challenges user sent (challengerId)
        const userChallengesQuery = query(
            collection(db, "challenges"),
            where("challengerId", "==", user.uid),
            where("status", "==", "pending")
        );
        
        const snapshot = await getDocs(userChallengesQuery);
        const now = new Date();
        let cleanedUp = 0;
        
        for (const doc of snapshot.docs) {
            const challenge = doc.data();
            const expiresAt = challenge.expiresAt?.toDate();
            
            // Check if challenge expired
            if (expiresAt && expiresAt <= now) {
                try {
                    console.log(`🕒 Expiring challenge: ${doc.id}`);
                    await updateDoc(doc.ref, {
                        status: 'expired',
                        expiredAt: serverTimestamp()
                    });
                    cleanedUp++;
                } catch (updateError) {
                    console.error(`❌ Failed to update challenge ${doc.id}:`, updateError);
                }
            }
        }
        
        if (cleanedUp > 0) {
            console.log(`✅ Cleaned up ${cleanedUp} expired challenges`);
        }
        
    } catch (error) {
        console.error('❌ Safe cleanup error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Debug: Check what permissions we actually have
        if (error.code === 'permission-denied') {
            console.log('🔒 Permission denied - checking user challenges access...');
        }
    }
}

// Debug function to check challenge permissions
// Debug function to check challenges data
window.debugChallenges = async function() {
    const user = auth.currentUser;
    if (!user) {
        console.log("No user logged in");
        return;
    }

    console.log("=== DEBUG CHALLENGES ===");
    console.log("User ID:", user.uid);

    try {
        // Check challenges where user is challenger
        const challengerQuery = query(
            collection(db, "challenges"),
            where("challengerId", "==", user.uid)
        );
        const challengerSnap = await getDocs(challengerQuery);
        
        console.log("Challenges where user is challenger:");
        challengerSnap.forEach(doc => {
            console.log(`- ${doc.id}:`, doc.data());
        });

        // Check challenges where user is target
        const targetQuery = query(
            collection(db, "challenges"),
            where("targetId", "==", user.uid)
        );
        const targetSnap = await getDocs(targetQuery);
        
        console.log("Challenges where user is target:");
        targetSnap.forEach(doc => {
            console.log(`- ${doc.id}:`, doc.data());
        });

    } catch (error) {
        console.error("Error debugging challenges:", error);
    }
};

// ========== PLAYER PROFILE SYSTEM ==========
let currentViewedPlayer = null;

// Create and show player profile
window.viewPlayerProfile = async function(playerId, playerName, playerLevel) {
    console.log('👤 Loading profile for:', playerName);
    
    try {
        // Show loading modal immediately
        showLoadingModal();
        
        // Load player data
        const playerDoc = await getDoc(doc(db, "users", playerId));
        
        if (!playerDoc.exists()) {
            throw new Error('Player data not found');
        }

        const playerData = playerDoc.data();
        
        // Calculate stats
        const raceStats = await calculatePlayerRaceStats(playerId);
        const equippedCar = getEquippedCar(playerData.inventory || []);
        const equippedItems = (playerData.inventory || []).filter(item => item.equipped && item.type !== 'car');
        const stats = playerData.stats || {};
        const totalStats = calculateTotalStats(stats, playerData.inventory);
        
        // Create and show the compact profile modal
        createCompactProfileModal(playerData, playerName, playerLevel, playerId, raceStats, equippedCar, equippedItems, totalStats);
        
    } catch (error) {
        console.error('Error loading player profile:', error);
        showErrorModal(error.message);
    }
};

// Show loading state
function showLoadingModal() {
    const modalHTML = `
        <div id="player-profile-modal" class="modal" style="display: block; z-index: 10000;">
            <div class="modal-content" style="max-width: 400px;">
                <div style="text-align: center; padding: 2rem; color: #88ffff;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 1rem;"></i>
                    <div>Loading profile...</div>
                </div>
            </div>
        </div>
    `;
    
    closePlayerProfile();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// SINGLE PROFILE-ONLY image function
function getProfileImagePath(item) {
    if (!item) return 'images/cars/default_car.jpg';
    
    // For cars in profile - use direct path without container styling
    if (item.type === 'car') {
        const carId = item.id.toLowerCase().replace(/ /g, '_');
        return `images/cars/${carId}.jpg`;
    }
    
    // For other items in profile
    if (item.type) {
        const itemId = item.id.toLowerCase().replace(/ /g, '_');
        const typeFolder = `${item.type}s`;
        return `images/${typeFolder}/${itemId}.jpg`;
    }
    
    return 'images/cars/default_car.jpg';
}

// Create compact profile modal - USING THE SINGLE PROFILE FUNCTION
function createCompactProfileModal(playerData, playerName, playerLevel, playerId, raceStats, equippedCar, equippedItems, totalStats) {
    // Calculate total bonuses from equipped items
    const itemBonuses = calculateItemBonuses(equippedItems);
    
    const modalHTML = `
        <div id="player-profile-modal" class="modal" style="display: block; z-index: 10000;">
            <div class="modal-content" style="max-width: 400px;">
                <span class="close-modal" onclick="closePlayerProfile()" style="float: right; font-size: 1.5rem; cursor: pointer; color: #ff6b6b;">&times;</span>
                
                <!-- Compact Header -->
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <h2 style="color: #00ffff; margin: 0 0 0.5rem 0; font-size: 1.3rem;">${escapeHtml(playerName)}</h2>
                    <div style="background: linear-gradient(135deg, #00ff88, #00ffff); color: #1a1a2e; padding: 0.3rem 1rem; border-radius: 15px; font-weight: bold; display: inline-block;">
                        Level ${playerLevel}
                    </div>
                </div>

                <!-- Car & Stats Side by Side -->
                <div style="display: grid; grid-template-columns: 100px 1fr; gap: 1rem; margin-bottom: 1.5rem; align-items: start;">
                    <!-- Car Image - USING THE SINGLE PROFILE FUNCTION -->
                    <div style="text-align: center; padding: 0; margin: 0 0 0 15px;">
                        <img src="${getProfileImagePath(equippedCar)}" alt="${equippedCar.name}" 
                             style="width: 100px; height: 75px; object-fit: cover; border-radius: 8px; border: 2px solid #00ffff;"
                             onerror="this.src='images/cars/default_car.jpg'">
                        <div style="font-size: 0.8rem; color: #00ffff; margin-top: 0.5rem; font-weight: bold;">${equippedCar.name}</div>
                    </div>
                    
                    <!-- Stats -->
                    <div>
                        <div style="font-size: 0.9rem; color: #00ffff; margin-bottom: 0.5rem; font-weight: bold; text-align: center;">STATS</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; font-size: 0.75rem;">
                            <div style="color: #88ffff; text-align: center;">Power:</div>
                            <div style="color: #00ffff; text-align: center; font-weight: bold;">${totalStats.total.power || 0}</div>
                            <div style="color: #88ffff; text-align: center;">Speed:</div>
                            <div style="color: #00ffff; text-align: center; font-weight: bold;">${totalStats.total.speed || 0}</div>
                            <div style="color: #88ffff; text-align: center;">Dexterity:</div>
                            <div style="color: #00ffff; text-align: center; font-weight: bold;">${totalStats.total.dexterity || 0}</div>
                            <div style="color: #88ffff; text-align: center;">Structure:</div>
                            <div style="color: #00ffff; text-align: center; font-weight: bold;">${totalStats.total.structure || 0}</div>
                            <div style="color: #88ffff; text-align: center;">Handling:</div>
                            <div style="color: #00ffff; text-align: center; font-weight: bold;">${totalStats.total.handling || 0}</div>
                            <div style="color: #88ffff; text-align: center;">Luck:</div>
                            <div style="color: #00ffff; text-align: center; font-weight: bold;">${totalStats.total.luck || 0}</div>
                        </div>
                    </div>
                </div>

                <!-- Equipped Items - Compact - USING THE SINGLE PROFILE FUNCTION -->
                <div style="margin-bottom: 1.5rem;">
                    <div style="font-size: 0.9rem; color: #00ffff; margin-bottom: 0.5rem; font-weight: bold; text-align: center;">EQUIPPED ITEMS</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;">
                        ${equippedItems.length > 0 ? 
                            equippedItems.slice(0, 4).map(item => {
                                const imagePath = getProfileImagePath(item);
                                return `
                                <div style="background: rgba(0, 255, 255, 0.1); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 6px; padding: 0.5rem; text-align: center; min-width: 70px;">
                                    <img src="${imagePath}" alt="${item.name}"
                                         style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px; margin-bottom: 0.3rem;"
                                         onerror="this.src='images/items/default_item.jpg'">
                                    <div style="font-size: 0.7rem; color: #ffffff; font-weight: bold; margin-bottom: 0.2rem;">${escapeHtml(item.name)}</div>
                                    <div style="font-size: 0.6rem; color: #00ff88;">
                                        ${item.stats ? Object.entries(item.stats)
                                            .filter(([stat, value]) => value > 0)
                                            .map(([stat, value]) => `+${value} ${stat.charAt(0).toUpperCase()}`)
                                            .join(' ') : ''}
                                    </div>
                                </div>
                            `}).join('') : 
                            '<div style="text-align: center; color: #88ffff; font-size: 0.8rem; padding: 0.5rem;">No items equipped</div>'
                        }
                        ${equippedItems.length > 4 ? 
                            `<div style="background: rgba(0, 255, 255, 0.1); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 6px; padding: 0.5rem; text-align: center; min-width: 70px; display: flex; align-items: center; justify-content: center;">
                                <div style="font-size: 0.7rem; color: #ffffff;">+${equippedItems.length - 4} more</div>
                            </div>` : ''
                        }
                    </div>
                </div>

                <!-- Stats Grid - Moved to bottom -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; margin-bottom: 1.5rem;">
                    <div style="text-align: center; background: rgba(0, 255, 255, 0.1); padding: 0.8rem; border-radius: 8px;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #00ff88;">${raceStats.wins}</div>
                        <div style="font-size: 0.7rem; color: #88ffff;">WINS</div>
                    </div>
                    <div style="text-align: center; background: rgba(0, 255, 255, 0.1); padding: 0.8rem; border-radius: 8px;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #ff6b6b;">${raceStats.losses}</div>
                        <div style="font-size: 0.7rem; color: #88ffff;">LOSSES</div>
                    </div>
                    <div style="text-align: center; background: rgba(0, 255, 255, 0.1); padding: 0.8rem; border-radius: 8px;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #feca57;">${raceStats.draws || 0}</div>
                        <div style="font-size: 0.7rem; color: #88ffff;">DRAWS</div>
                    </div>
                </div>

                <!-- Challenge Button -->
                <div style="text-align: center;">
                    ${getChallengeButtonHTML(playerId, playerName, playerLevel)}
                </div>
            </div>
        </div>
    `;
    
    closePlayerProfile();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Add this new function for profile image error handling
window.handleProfileImageError = function(imgElement, itemId, itemType) {
    console.log(`🖼️ Profile image failed: ${imgElement.src}`);
    
    // Use the same fallback logic as inventory
    const fallbacks = generateImageFallbacks(itemId, itemType);
    tryNextFallback(imgElement, fallbacks, 0);
};

// Calculate total bonuses from equipped items
function calculateItemBonuses(equippedItems) {
    const bonuses = {
        power: 0,
        speed: 0,
        handling: 0,
        luck: 0,
        dexterity: 0,
        structure: 0
    };
    
    equippedItems.forEach(item => {
        if (item.stats) {
            Object.entries(item.stats).forEach(([stat, value]) => {
                if (bonuses.hasOwnProperty(stat)) {
                    bonuses[stat] += value;
                }
            });
        }
    });
    
    return bonuses;
}

// Show error modal
function showErrorModal(message) {
    const modalHTML = `
        <div id="player-profile-modal" class="modal" style="display: block; z-index: 10000;">
            <div class="modal-content" style="max-width: 350px;">
                <span class="close-modal" onclick="closePlayerProfile()" style="float: right; font-size: 1.5rem; cursor: pointer; color: #ff6b6b;">&times;</span>
                <div style="text-align: center; padding: 1.5rem; color: #ff6b6b;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem; margin-bottom: 1rem;"></i>
                    <div style="font-size: 0.9rem;">Error loading profile</div>
                    <div style="font-size: 0.8rem; margin-top: 0.5rem; color: #88ffff;">${escapeHtml(message)}</div>
                    <button onclick="closePlayerProfile()" 
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.8rem;">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    closePlayerProfile();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close profile modal
window.closePlayerProfile = function() {
    const modal = document.getElementById('player-profile-modal');
    if (modal) modal.remove();
};

// Calculate player race statistics
async function calculatePlayerRaceStats(playerId) {
    try {
        const challengesQuery = query(
            collection(db, "challenges"),
            where("status", "==", "completed")
        );
        
        const snapshot = await getDocs(challengesQuery);
        let wins = 0, losses = 0, draws = 0;
        
        snapshot.forEach(doc => {
            const challenge = doc.data();
            
            if (challenge.isDraw && 
                (challenge.challengerId === playerId || challenge.targetId === playerId)) {
                draws++;
            } else if (challenge.winnerId === playerId) {
                wins++;
            } else if (challenge.loserId === playerId) {
                losses++;
            }
        });
        
        return { wins, losses, draws };
    } catch (error) {
        console.error('Error calculating race stats:', error);
        return { wins: 0, losses: 0, draws: 0 };
    }
}

// Get challenge button HTML
function getChallengeButtonHTML(playerId, playerName, playerLevel) {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        return '<button disabled style="background: #666; color: #ccc; border: none; padding: 0.6rem 1.5rem; border-radius: 20px; font-size: 0.8rem; cursor: not-allowed;">Login to Challenge</button>';
    }
    
    if (currentUser.uid === playerId) {
        return '<button disabled style="background: #666; color: #ccc; border: none; padding: 0.6rem 1.5rem; border-radius: 20px; font-size: 0.8rem; cursor: not-allowed;">❌ Cannot Challenge Yourself</button>';
    }
    
    return `
        <button onclick="challengePlayer('${playerId}', '${playerName}', ${playerLevel}); closePlayerProfile();"
                style="background: linear-gradient(135deg, #00ff88, #00ffff); color: #1a1a2e; border: none; padding: 0.8rem 2rem; border-radius: 25px; font-weight: bold; cursor: pointer; font-size: 0.9rem; transition: all 0.3s ease;">
            🏁 Challenge Player
        </button>
    `;
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initialize in rankings page
function initializePlayerProfilesSystem() {
    console.log('✅ Player profile system ready');
}


// ========== ACHIEVEMENTS SYSTEM ==========
let playerAchievements = {};
let currentAchievementFilter = 'all';

// Achievement categories and data - UPDATED WITH BADGE IMAGES
const ACHIEVEMENTS_DATA = [
    // === TRAINING ACHIEVEMENTS ===
    {
        id: 'training_novice',
        name: 'Training Novice',
        description: 'Complete your first training session',
        category: 'training',
        target: 1,
        type: 'training_complete',
        reward: { badge: 'training_novice_badge', tokens: 1 },
        rarity: 'common',
        hidden: false,
        badgeImage: 'images/badges/training_novice.jpg'
    },
    {
        id: 'training_enthusiast', 
        name: 'Training Enthusiast',
        description: 'Complete 50 training sessions',
        category: 'training',
        target: 50,
        type: 'training_complete',
        reward: { badge: 'training_enthusiast_badge', tokens: 3 },
        rarity: 'uncommon',
        hidden: false,
        badgeImage: 'images/badges/training_enthusiast.jpg'
    },
    {
        id: 'training_master',
        name: 'Training Master',
        description: 'Complete 200 training sessions',
        category: 'training',
        target: 200,
        type: 'training_complete',
        reward: { badge: 'training_master_badge', tokens: 9 },
        rarity: 'rare',
        hidden: true,
        badgeImage: 'images/badges/training_master.jpg'
    },

    // === PVP ACHIEVEMENTS ===
    {
        id: 'pvp_rookie',
        name: 'PVP Rookie',
        description: 'Win your first PVP race',
        category: 'pvp',
        target: 1,
        type: 'pvp_win',
        reward: { badge: 'pvp_rookie_badge', tokens: 1 },
        rarity: 'common',
        hidden: false,
        badgeImage: 'images/badges/pvp_rookie.jpg'
    },
    {
        id: 'pvp_champion',
        name: 'PVP Champion',
        description: 'Win 100 PVP races',
        category: 'pvp',
        target: 100,
        type: 'pvp_win',
        reward: { badge: 'pvp_champion_badge', tokens: 8 },
        rarity: 'epic',
        hidden: true,
        badgeImage: 'images/badges/pvp_champion.jpg'
    },

    // === STAT ACHIEVEMENTS ===
    {
        id: 'power_demon',
        name: 'Power Demon',
        description: 'Reach 50 Power stat',
        category: 'stats',
        target: 50,
        type: 'stat_threshold',
        stat: 'power',
        reward: { badge: 'power_demon_badge', tokens: 2 },
        rarity: 'rare',
        hidden: false,
        badgeImage: 'images/badges/power_demon.jpg'
    },
    {
        id: 'handling_guru',
        name: 'Handling Guru',
        description: 'Reach 50 Handling stat',
        category: 'stats',
        target: 50,
        type: 'stat_threshold', 
        stat: 'handling',
        reward: { badge: 'handling_guru_badge', tokens: 2 },
        rarity: 'rare',
        hidden: false,
        badgeImage: 'images/badges/handling_guru.jpg'
    }
];

// ========== GLOBAL FUNCTIONS ==========
window.showAchievementDetails = function(achievementId) {
    console.log('🔍 Showing details for:', achievementId);
    
    const achievement = ACHIEVEMENTS_DATA.find(a => a.id === achievementId);
    const progress = playerAchievements[achievementId] || { progress: 0, completed: false };
    
    if (!achievement) {
        console.log('❌ Achievement not found:', achievementId);
        return;
    }
    
    const detailsPanel = document.getElementById('achievement-details');
    const isUnlocked = !achievement.hidden || progress.completed;
    
    if (!isUnlocked) {
        console.log('🔒 Achievement locked and hidden');
        return;
    }
    
    const progressPercent = Math.min(100, (progress.progress / achievement.target) * 100);
    
    detailsPanel.innerHTML = `
        <div class="achievement-detail-content">
            <div class="achievement-detail-header">
                <div class="detail-badge-image">
                    <img src="${achievement.badgeImage}" alt="${achievement.name}" 
                         onerror="this.src='images/badges/default_badge.jpg'">
                </div>
                <div class="detail-title">
                    <h3>${achievement.name}</h3>
                    <span class="detail-rarity rarity-${achievement.rarity}">
                        ${achievement.rarity.toUpperCase()}
                    </span>
                </div>
            </div>
            
            <div class="detail-description">
                ${achievement.description}
            </div>
            
            <div class="detail-requirements">
                <h4>REQUIREMENTS</h4>
                <p class="requirement-text">
                    ${getRequirementText(achievement)}: ${progress.progress}/${achievement.target}
                </p>
                ${!progress.completed ? `
                    <div class="progress-container">
                        <div class="progress-text">
                            <span>Progress</span>
                            <span>${Math.floor(progressPercent)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="detail-reward">
                <h4>REWARD</h4>
                <div class="reward-badge">${achievement.reward.badge}</div>
                ${achievement.reward.tokens ? `
                    <div class="reward-tokens">
                        +${achievement.reward.tokens} Tokens
                    </div>
                ` : ''}
                
                ${progress.completed && !progress.claimed ? `
                    <button class="claim-reward-btn" onclick="claimAchievementReward('${achievementId}')">
                        <i class="fas fa-gift"></i> Claim Reward
                    </button>
                ` : progress.claimed ? `
                    <div class="claimed-badge"><i class="fas fa-check"></i> Claimed</div>
                ` : ''}
            </div>
        </div>
    `;
    
    console.log('✅ Details panel updated for:', achievement.name);
};

window.claimAchievementReward = async function(achievementId) {
    console.log('🎁 Claiming reward for:', achievementId);
    
    const user = auth.currentUser;
    if (!user) return;
    
    const achievement = ACHIEVEMENTS_DATA.find(a => a.id === achievementId);
    const progress = playerAchievements[achievementId];
    
    if (!achievement || !progress.completed || progress.claimed) return;
    
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const updateData = {};
            
            if (achievement.reward.tokens) {
                updateData.tokens = (userData.tokens || 0) + achievement.reward.tokens;
            }
            
            playerAchievements[achievementId].claimed = true;
            
            await updateDoc(userRef, {
                ...updateData,
                achievements: playerAchievements
            });
            
            displayAchievements();
            showAchievementDetails(achievementId);
            
            alert(`🎉 Reward claimed!\n\n+${achievement.reward.tokens} Tokens\nBadge: ${achievement.reward.badge}`);
        }
    } catch (error) {
        console.error('Error claiming achievement reward:', error);
        alert('Error claiming reward: ' + error.message);
    }
};

// ========== TEAM SYSTEM FUNCTIONS ==========

// Global variables
window.currentTeam = null;
window.teamMembers = [];
window.teamJoinRequests = [];
window.currentTeamsTab = 'my-team';

// Team level configuration
const TEAM_LEVEL_CONFIG = {
    1: { 
        maxMembers: 2, 
        upgradeCost: 5000,
        bannerImage: 'team_level_1_banner.jpg',
        colorTheme: '#00ffff'
    },
    2: { 
        maxMembers: 3, 
        upgradeCost: 15000,
        bannerImage: 'team_level_2_banner.jpg', 
        colorTheme: '#00ff88'
    },
    3: { 
        maxMembers: 4, 
        upgradeCost: 30000,
        bannerImage: 'team_level_3_banner.jpg',
        colorTheme: '#0077ff'
    },
    4: { 
        maxMembers: 5, 
        upgradeCost: 60000,
        bannerImage: 'team_level_4_banner.jpg',
        colorTheme: '#a29bfe'
    },
    5: { 
        maxMembers: 6, 
        upgradeCost: 120000,
        bannerImage: 'team_level_5_banner.jpg',
        colorTheme: '#feca57'
    },
    6: { 
        maxMembers: 7, 
        upgradeCost: 240000,
        bannerImage: 'team_level_6_banner.jpg',
        colorTheme: '#ff6b6b'
    },
    7: { 
        maxMembers: 8, 
        upgradeCost: 480000,
        bannerImage: 'team_level_7_banner.jpg',
        colorTheme: '#9b59b6'
    },
    8: { 
        maxMembers: 9, 
        upgradeCost: 960000,
        bannerImage: 'team_level_8_banner.jpg',
        colorTheme: '#1abc9c'
    },
    9: { 
        maxMembers: 10, 
        upgradeCost: 1920000,
        bannerImage: 'team_level_9_banner.jpg',
        colorTheme: '#e74c3c'
    },
    10: { 
        maxMembers: 20, 
        upgradeCost: 0,
        bannerImage: 'team_level_10_banner.jpg',
        colorTheme: '#f1c40f'
    }
};

// Emblem options
const TEAM_EMBLEMS = [
    'dragon_emblem', 'phoenix_emblem', 'wolf_emblem', 'lion_emblem', 
    'eagle_emblem', 'shark_emblem', 'tiger_emblem', 'bear_emblem',
    'falcon_emblem', 'panther_emblem', 'viper_emblem', 'rhino_emblem'
];

// Team level image configuration
const TEAM_LEVEL_IMAGES = {
    1: 'level1.jpg',
    2: 'level2.jpg', 
    3: 'level3.jpg',
    4: 'level4.jpg',
    5: 'level5.jpg',
    6: 'level6.jpg',
    7: 'level7.jpg',
    8: 'level8.jpg',
    9: 'level9.jpg',
    10: 'level10.jpg'
};

// ========== UTILITY FUNCTIONS ==========
function getTeamLevelImage(teamLevel) {
    const level = Math.min(Math.max(1, teamLevel), 10);
    return TEAM_LEVEL_IMAGES[level] || 'level1.jpg';
}

function getTeamEmblemPath(teamData) {
    if (!teamData) return 'images/emblems/default_emblem.png';
    const level = teamData.level || 1;
    const baseEmblem = teamData.emblem || 'default_emblem';
    return `images/emblems/${baseEmblem}.png`;
}

function getTeamLevelBanner(teamLevel) {
    const level = Math.min(Math.max(1, teamLevel), 10);
    const config = TEAM_LEVEL_CONFIG[level];
    return config ? config.bannerImage : 'level_1_banner.jpg';
}

function getTeamLevelColor(teamLevel) {
    const level = Math.min(Math.max(1, teamLevel), 10);
    const config = TEAM_LEVEL_CONFIG[level];
    return config ? config.colorTheme : '#00ffff';
}

function getTeamEmblem(emblemName) {
    const emblem = emblemName || 'default_emblem';
    return `images/emblems/${emblem}.png`;
}

function getTeamBannerURL(teamLevel) {
    const bannerImage = getTeamLevelBanner(teamLevel);
    return `images/team_banners/${bannerImage}`;
}

function getMaxMembersForLevel(teamLevel) {
    const level = Math.min(Math.max(1, teamLevel), 10);
    const config = TEAM_LEVEL_CONFIG[level];
    return config ? config.maxMembers : 5;
}

function getMemberRole(team, userId) {
    if (!team || !userId) return 'member';
    if (team.founderId === userId) return 'founder';
    if (team.officers && team.officers.includes(userId)) return 'officer';
    return 'member';
}

function getActivityIcon(activityType) {
    const icons = {
        'creation': '🏁',
        'join': '👋',
        'leave': '👋',
        'donation': '💰',
        'promotion': '⬆️',
        'demotion': '⬇️',
        'kick': '🚪'
    };
    return icons[activityType] || '📝';
}

function formatTeamTime(timestamp) {
    if (!timestamp) return 'Recently';
    try {
        const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        return 'Recently';
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== TEAM INITIALIZATION ==========
function initializeTeamSystem() {
    console.log('🏁 Initializing team system...');
    
    // Inject basic CSS first
    injectTeamCSS();
    updateModalCSS();
    
    // Wait for auth to be ready
    if (!auth) {
        console.error('Firebase auth not available');
        return;
    }
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('👤 User authenticated:', user.uid);
            loadUserTeam();
            setupTeamEventListeners();
            setupTeamRealTimeListener();
            
            // Set initial tab
            setTimeout(() => {
                if (window.currentTeam) {
                    console.log('User has team, switching to my-team');
                    switchTeamsTab('my-team');
                } else {
                    console.log('User has no team, switching to browse');
                    switchTeamsTab('browse');
                }
            }, 1000);
        } else {
            console.log('👤 No user logged in');
            window.currentTeam = null;
            showNoTeamView();
            switchTeamsTab('browse');
        }
    });
}

// ========== TEAM CREATION ==========
window.createTeam = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to create a team.');
        return;
    }

    console.log('🔧 Starting team creation process...');

    try {
        // SAFELY get form values
        const teamName = document.getElementById('team-name')?.value.trim() || '';
        const teamTag = document.getElementById('team-tag')?.value.trim().toUpperCase() || '';
        const teamDescription = document.getElementById('team-description')?.value.trim() || '';
        const selectedEmblem = document.getElementById('team-emblem')?.value || 'dragon_emblem';
        const joinType = document.getElementById('team-join-type')?.value || 'open';
        const minLevel = parseInt(document.getElementById('team-min-level')?.value) || 1;

        console.log('📋 Form values:', { teamName, teamTag, teamDescription, selectedEmblem, joinType, minLevel });

        // Validation
        if (!teamName || !teamTag) {
            alert('Team name and tag are required!');
            return;
        }

        if (teamName.length < 3 || teamName.length > 20) {
            alert('Team name must be between 3-20 characters.');
            return;
        }

        if (teamTag.length < 2 || teamTag.length > 4) {
            alert('Team tag must be 2-4 characters.');
            return;
        }

        // Check if user already has a team
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            alert('User data not found!');
            return;
        }

        const userData = userDoc.data();
        console.log('👤 User data:', userData);

        if (userData.teamId) {
            alert('You are already in a team! Leave your current team first.');
            return;
        }

        // Check if user has enough tokens
        if ((userData.tokens || 0) < 49) {
            alert('You need 49 Ignition Tokens to create a team!');
            return;
        }

        // Check if team name/tag already exists
        console.log('🔍 Checking for existing teams...');
        const nameQuery = query(collection(db, "teams"), where("name", "==", teamName));
        const tagQuery = query(collection(db, "teams"), where("tag", "==", teamTag));
        
        const [nameSnap, tagSnap] = await Promise.all([
            getDocs(nameQuery),
            getDocs(tagQuery)
        ]);

        if (!nameSnap.empty) {
            alert('Team name already exists!');
            return;
        }

        if (!tagSnap.empty) {
            alert('Team tag already exists!');
            return;
        }

        if (!confirm(`Create team "${teamName}" [${teamTag}] for 50 Ignition Tokens?`)) return;

        console.log('🏗️ Creating team document...');

        // Create team document
        const teamData = {
            name: teamName,
            tag: teamTag,
            description: teamDescription,
            emblem: selectedEmblem,
            level: 1,
            experience: 0,
            fame: userData.fame || 0,
            vault: {
                gold: 0,
                tokens: 0,
                resources: {}
            },
            founderId: user.uid,
            officers: [],
            members: [user.uid],
            maxMembers: 2,
            settings: {
                joinType: joinType,
                minLevel: minLevel,
                public: true
            },
            activityLog: [
                {
                    type: 'creation',
                    userId: user.uid,
                    username: userData.username || user.email.split('@')[0],
                    action: 'created the team',
                    timestamp: new Date()
                }
            ],
            createdAt: serverTimestamp(),
            lastActivity: serverTimestamp(),
            stats: {
                totalDonations: 0,
                memberCount: 1,
                averageLevel: userData.level || 1,
                totalRaces: 0,
                totalWins: 0
            }
        };

        console.log('📦 Team data prepared:', teamData);

        const teamRef = await addDoc(collection(db, "teams"), teamData);
        console.log('✅ Team document created with ID:', teamRef.id);

        // Update user document
        console.log('👤 Updating user document...');
        await updateDoc(doc(db, "users", user.uid), {
            teamId: teamRef.id,
            teamRole: 'founder',
            teamJoinDate: serverTimestamp(),
            tokens: (userData.tokens || 0) - 49,
            totalTeamDonations: 0
        });

        console.log('✅ User document updated');

        alert(`🎉 Team "${teamName}" created successfully!`);
        
        // Clear form
        document.getElementById('team-name').value = '';
        document.getElementById('team-tag').value = '';
        if (document.getElementById('team-description')) {
            document.getElementById('team-description').value = '';
        }
        
        // Switch to my team tab
        switchTeamsTab('my-team');
        loadUserTeam();
        
    } catch (error) {
        console.error('❌ Error creating team:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        alert('Error creating team: ' + error.message);
    }
};

// ========== TEAM SEARCH AND BROWSING ==========
window.searchTeams = async function() {
    const searchQuery = document.getElementById('team-search')?.value.trim().toLowerCase() || '';
    const teamsContainer = document.getElementById('teams-list');
    
    if (!teamsContainer) {
        console.error('teams-list container not found');
        return;
    }

    teamsContainer.innerHTML = '<div class="loading">Searching teams...</div>';

    try {
        let teamsQuery;
        if (searchQuery) {
            console.log('Searching for teams with query:', searchQuery);
            teamsQuery = query(
                collection(db, "teams"),
                where("settings.public", "==", true),
                where("name", ">=", searchQuery),
                where("name", "<=", searchQuery + '\uf8ff'),
                limit(20)
            );
        } else {
            console.log('Loading popular teams');
            teamsQuery = query(
                collection(db, "teams"),
                where("settings.public", "==", true),
                orderBy("fame", "desc"),
                limit(20)
            );
        }

        const snapshot = await getDocs(teamsQuery);
        const teams = [];
        
        snapshot.forEach(doc => {
            teams.push({ id: doc.id, ...doc.data() });
        });

        console.log('Found teams:', teams.length);
        displayTeams(teams);
    } catch (error) {
        console.error('Error searching teams:', error);
        teamsContainer.innerHTML = '<div class="error">Error searching teams: ' + error.message + '</div>';
    }
};

function displayTeams(teams) {
    const teamsContainer = document.getElementById('teams-list');
    if (!teamsContainer) return;

    if (teams.length === 0) {
        teamsContainer.innerHTML = '<div class="no-teams">No teams found</div>';
        return;
    }

    teamsContainer.innerHTML = teams.map(team => `
        <div class="team-card" data-team-id="${team.id}">
            <div class="team-header">
                <div class="team-emblem">
                    <img src="images/emblems/${team.emblem}.png" alt="${team.emblem}" 
                         onerror="this.src='images/emblems/default_emblem.png'">
                </div>
                <div class="team-info">
                    <h3>${escapeHtml(team.name)}</h3>
                    <div class="team-tag">[${team.tag}]</div>
                    <div class="team-level">Level ${team.level}</div>
                </div>
            </div>
            
            <div class="team-description">${escapeHtml(team.description)}</div>
            
            <div class="team-stats">
                <div class="team-stat">
                    <i class="fas fa-users"></i>
                    <span>${team.members?.length || 0}/${team.maxMembers || 2}</span>
                </div>
                <div class="team-stat">
                    <i class="fas fa-star"></i>
                    <span>${Math.round(team.fame || 0)}</span>
                </div>
                <div class="team-stat">
                    <i class="fas fa-signal"></i>
                    <span>${Math.round(team.stats?.averageLevel || 1)}</span>
                </div>
            </div>
            
            <div class="team-join-info">
                <span class="join-type ${team.settings?.joinType || 'open'}">
                    ${(team.settings?.joinType || 'open').toUpperCase()}
                </span>
                <span class="min-level">Level ${team.settings?.minLevel || 1}+</span>
            </div>
            
            <div class="team-actions">
                ${getTeamActionButtons(team)}
            </div>
        </div>
    `).join('');
}

function getTeamActionButtons(team) {
    const user = auth.currentUser;
    if (!user) return '<button disabled class="btn-disabled">Login to Join</button>';
    
    // Check if user is already in this team
    if (window.currentTeam && window.currentTeam.id === team.id) {
        return '<button disabled class="btn-disabled">Already in Team</button>';
    }
    
    // Check if user is in any team
    if (window.currentTeam) {
        return '<button disabled class="btn-disabled">Already in a Team</button>';
    }
    
    const userLevel = window.gameState?.player?.level || 1;
    
    if (userLevel < (team.settings?.minLevel || 1)) {
        return `<button disabled class="btn-disabled">Level ${team.settings?.minLevel || 1} Required</button>`;
    }
    
    switch (team.settings?.joinType || 'open') {
        case 'open':
            return `<button class="btn-primary" onclick="joinTeam('${team.id}')">Join Team</button>`;
        case 'approval':
            return `<button class="btn-secondary" onclick="requestToJoinTeam('${team.id}')">Request to Join</button>`;
        case 'invite':
            return `<button class="btn-disabled" disabled>Invite Only</button>`;
        default:
            return `<button class="btn-disabled" disabled>Closed</button>`;
    }
}

// ========== TEAM JOINING SYSTEM ==========
window.joinTeam = async function(teamId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const teamDoc = await getDoc(doc(db, "teams", teamId));
        
        if (!userDoc.exists() || !teamDoc.exists()) {
            alert('Error joining team.');
            return;
        }

        const userData = userDoc.data();
        const teamData = teamDoc.data();

        // Validations
        if (userData.teamId) {
            alert('You are already in a team!');
            return;
        }

        if (teamData.members.length >= teamData.maxMembers) {
            alert('Team is full!');
            return;
        }

        if ((userData.level || 1) < teamData.settings.minLevel) {
            alert(`You need level ${teamData.settings.minLevel} to join this team.`);
            return;
        }

        if (teamData.settings.joinType !== 'open') {
            alert('This team requires approval or invitation.');
            return;
        }

        if (!confirm(`Join ${teamData.name}?`)) return;

        // Add user to team
        await updateDoc(doc(db, "teams", teamId), {
            members: arrayUnion(user.uid),
            lastActivity: serverTimestamp(),
            activityLog: arrayUnion({
                type: 'join',
                userId: user.uid,
                username: userData.username || user.email.split('@')[0],
                action: 'joined the team',
                timestamp: new Date()
            })
        });

        // Update user document
        await updateDoc(doc(db, "users", user.uid), {
            teamId: teamId,
            teamRole: 'member',
            teamJoinDate: new Date()
        });

        // Update team stats
        await updateTeamStats(teamId);

        alert(`🎉 You joined ${teamData.name}!`);
        loadUserTeam();
        
    } catch (error) {
        console.error('Error joining team:', error);
        alert('Error joining team: ' + error.message);
    }
};

window.requestToJoinTeam = async function(teamId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const teamDoc = await getDoc(doc(db, "teams", teamId));
        
        if (!userDoc.exists() || !teamDoc.exists()) {
            alert('Error sending join request.');
            return;
        }

        const userData = userDoc.data();
        const teamData = teamDoc.data();

        if (userData.teamId) {
            alert('You are already in a team!');
            return;
        }

        // Check if request already exists
        const requestsQuery = query(
            collection(db, "teamJoinRequests"),
            where("teamId", "==", teamId),
            where("userId", "==", user.uid),
            where("status", "==", "pending")
        );
        
        const existingRequest = await getDocs(requestsQuery);
        if (!existingRequest.empty) {
            alert('You already have a pending request for this team.');
            return;
        }

        // Create join request
        await addDoc(collection(db, "teamJoinRequests"), {
            teamId: teamId,
            teamName: teamData.name,
            userId: user.uid,
            username: userData.username || user.email.split('@')[0],
            userLevel: userData.level || 1,
            userFame: userData.fame || 0,
            message: document.getElementById('join-message')?.value || '',
            status: 'pending',
            createdAt: serverTimestamp()
        });

        alert('✅ Join request sent! The team leadership will review your application.');
        
    } catch (error) {
        console.error('Error sending join request:', error);
        alert('Error sending request: ' + error.message);
    }
};

// ========== TEAM MANAGEMENT ==========
async function loadUserTeam() {
    const user = auth.currentUser;
    if (!user) {
        console.log('No user logged in');
        window.currentTeam = null;
        showNoTeamView();
        return;
    }

    try {
        console.log('🔄 Loading user team data...');
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!userDoc.exists()) {
            console.log('❌ User document not found');
            window.currentTeam = null;
            showNoTeamView();
            return;
        }

        const userData = userDoc.data();
        console.log('👤 User team ID:', userData.teamId);
        
        if (!userData.teamId) {
            console.log('❌ No team ID in user data');
            window.currentTeam = null;
            showNoTeamView();
            return;
        }

        console.log('🔍 Loading team document:', userData.teamId);
        const teamDoc = await getDoc(doc(db, "teams", userData.teamId));
        
        if (!teamDoc.exists()) {
            console.log('❌ Team document not found');
            window.currentTeam = null;
            showNoTeamView();
            return;
        }

        window.currentTeam = { 
            id: teamDoc.id, 
            ...teamDoc.data(),
            vault: teamDoc.data().vault || { gold: 0, tokens: 0, resources: {} },
            stats: teamDoc.data().stats || { totalDonations: 0, memberCount: 0, averageLevel: 1, totalRaces: 0, totalWins: 0 },
            activityLog: teamDoc.data().activityLog || [],
            members: teamDoc.data().members || [],
            officers: teamDoc.data().officers || []
        };
        
        console.log('✅ Team loaded successfully:', window.currentTeam.name);
        
        await loadTeamMembers();
        displayTeamView();
        
    } catch (error) {
        console.error('❌ Error loading user team:', error);
        window.currentTeam = null;
        showNoTeamView();
    }
}

async function loadTeamMembers() {
    if (!window.currentTeam) {
        console.log('No current team to load members for');
        window.teamMembers = [];
        return;
    }

    try {
        console.log('👥 Loading team members for:', window.currentTeam.name);
        const memberPromises = window.currentTeam.members.map(memberId => 
            getDoc(doc(db, "users", memberId))
        );
        
        const memberSnapshots = await Promise.all(memberPromises);
        window.teamMembers = [];
        
        memberSnapshots.forEach((doc, index) => {
            if (doc.exists()) {
                const userData = doc.data();
                window.teamMembers.push({
                    id: window.currentTeam.members[index],
                    username: userData.username || userData.email?.split('@')[0] || 'Unknown',
                    level: userData.level || 1,
                    fame: userData.fame || 0,
                    role: getMemberRole(window.currentTeam, window.currentTeam.members[index]),
                    joinDate: userData.teamJoinDate,
                    lastActive: userData.lastLogin
                });
            }
        });

        // Sort members by role importance
        window.teamMembers.sort((a, b) => {
            const roleOrder = { founder: 0, officer: 1, member: 2 };
            return roleOrder[a.role] - roleOrder[b.role];
        });

        console.log(`✅ Loaded ${window.teamMembers.length} team members`);
        
    } catch (error) {
        console.error('Error loading team members:', error);
        window.teamMembers = [];
    }
}

function setupTeamRealTimeListener() {
    const user = auth.currentUser;
    if (!user) return;

    console.log('🔔 Setting up team real-time listener...');

    // Listen for user document changes (team membership)
    const userUnsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
        const userData = doc.data();
        console.log('👤 User data updated:', userData);
        
        if (!userData || !userData.teamId) {
            console.log('❌ User left team or no team ID');
            window.currentTeam = null;
            showNoTeamView();
        } else {
            console.log('🔄 User team changed, reloading team data...');
            loadUserTeam();
        }
    });

    // Check if user is already in a team and set up team listener
    getDoc(doc(db, "users", user.uid)).then((userDoc) => {
        const userData = userDoc.data();
        
        if (userData && userData.teamId) {
            console.log('👥 Setting up team document listener for:', userData.teamId);
            
            // Listen for team document changes
            const teamUnsubscribe = onSnapshot(doc(db, "teams", userData.teamId), (doc) => {
                if (doc.exists()) {
                    console.log('🔄 Team data updated:', doc.data().name);
                    window.currentTeam = { id: doc.id, ...doc.data() };
                    loadTeamMembers();
                    displayTeamView();
                } else {
                    console.log('❌ Team document no longer exists');
                    window.currentTeam = null;
                    showNoTeamView();
                }
            });

            // Store unsubscribe function for cleanup
            window.teamUnsubscribe = teamUnsubscribe;
        }
    }).catch((error) => {
        console.error('Error setting up team listener:', error);
    });

    // Store unsubscribe function for cleanup
    window.userUnsubscribe = userUnsubscribe;
}

// ========== TEAM DISPLAY FUNCTIONS ==========
function getTeamHeaderActionButtons() {
    const user = auth.currentUser;
    if (!user || !window.currentTeam) return '';
    
    const userRole = getMemberRole(window.currentTeam, user.uid);
    const buttons = [];
    
    if (userRole === 'founder' || userRole === 'officer') {
        buttons.push(`
            <button class="btn-secondary" onclick="showTeamSettings()">
                <i class="fas fa-cog"></i> Settings
            </button>
        `);
        
        if (window.currentTeam.settings.joinType !== 'open') {
            buttons.push(`
                <button class="btn-secondary" onclick="showJoinRequests()">
                    <i class="fas fa-user-plus"></i> Requests
                </button>
            `);
        }
    }
    
    buttons.push(`
        <button class="btn-danger" onclick="leaveTeam()">
            <i class="fas fa-sign-out-alt"></i> Leave Team
        </button>
    `);
    
    return buttons.join('');
}

function getTeamMembersSection() {
    if (!window.teamMembers || window.teamMembers.length === 0) return '<div class="no-members">No team members found.</div>';
    
    return `
        <div class="team-members-section">
            <h3>Team Members (${window.teamMembers.length}/${window.currentTeam.maxMembers})</h3>
            <div class="members-grid">
                ${window.teamMembers.map(member => `
                    <div class="member-card ${member.role}">
                        <div class="member-header">
                            <div class="member-avatar">
                                <img src="images/avatars/default_avatar.png" alt="${member.username}">
                            </div>
                            <div class="member-info">
                                <div class="member-name">${escapeHtml(member.username)}</div>
                                <div class="member-role-badge ${member.role}">${member.role.toUpperCase()}</div>
                                <div class="member-level">Level ${member.level}</div>
                            </div>
                        </div>
                        <div class="member-stats">
                            <div class="member-stat">
                                <i class="fas fa-star"></i>
                                <span>${Math.round(member.fame)} Fame</span>
                            </div>
                            <div class="member-stat">
                                <i class="fas fa-clock"></i>
                                <span>${formatTeamTime(member.lastActive)}</span>
                            </div>
                        </div>
                        <div class="member-actions">
                            ${getMemberActionButtons(member)}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function getMemberActionButtons(member) {
    const user = auth.currentUser;
    if (!user || !window.currentTeam) return '';
    
    const userRole = getMemberRole(window.currentTeam, user.uid);
    const buttons = [];
    
    // Don't show actions for yourself
    if (user.uid !== member.id) {
        buttons.push(`
            <button class="btn-small" onclick="viewPlayerProfile('${member.id}', '${member.username}', ${member.level})">
                <i class="fas fa-eye"></i>
            </button>
        `);
        
        // Only founders can manage members
        if (userRole === 'founder') {
            if (member.role === 'member') {
                buttons.push(`
                    <button class="btn-small btn-success" onclick="promoteToOfficer('${member.id}')">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                `);
            } else if (member.role === 'officer') {
                buttons.push(`
                    <button class="btn-small btn-warning" onclick="demoteToMember('${member.id}')">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                `);
            }
            
            // Can't kick yourself or other founders
            if (member.id !== window.currentTeam.founderId) {
                buttons.push(`
                    <button class="btn-small btn-danger" onclick="kickMember('${member.id}', '${member.username}')">
                        <i class="fas fa-user-times"></i>
                    </button>
                `);
            }
        }
    }
    
    return buttons.join('');
}

// ========== FIXED DONATION SYSTEM ==========

// Fixed processDonation function
window.processDonation = async function() {
    const user = auth.currentUser;
    if (!user || !window.currentTeam) return;

    const modal = document.getElementById('donate-modal');
    if (!modal || !modal._userData) return;

    const selectedCurrency = document.querySelector('.donate-option.active')?.dataset.currency || 'gold';
    const amount = parseInt(document.getElementById('donate-amount')?.textContent.replace(/,/g, '') || 0);
    
    if (amount <= 0) return;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        // Double-check we have enough currency
        if ((userData[selectedCurrency] || 0) < amount) {
            alert(`Not enough ${selectedCurrency}! You have ${userData[selectedCurrency] || 0} but tried to donate ${amount}.`);
            return;
        }

        if (!confirm(`Are you sure you want to donate ${amount.toLocaleString()} ${selectedCurrency} to the team vault?`)) return;

        // Update user currency
        await updateDoc(doc(db, "users", user.uid), {
            [selectedCurrency]: (userData[selectedCurrency] || 0) - amount
        });

        // Update team vault
        const teamReceives = Math.floor(amount * 1.05);
        await updateDoc(doc(db, "teams", window.currentTeam.id), {
            [`vault.${selectedCurrency}`]: (window.currentTeam.vault[selectedCurrency] || 0) + teamReceives,
            lastActivity: serverTimestamp(),
            activityLog: arrayUnion({
                type: 'donation',
                userId: user.uid,
                username: userData.username || user.email.split('@')[0],
                action: `donated ${amount} ${selectedCurrency}`,
                amount: amount,
                currency: selectedCurrency,
                teamReceived: teamReceives,
                totalDonated: ((userData.totalTeamDonations || 0) + amount),
                timestamp: serverTimestamp()
            }),
            [`stats.totalDonations`]: (window.currentTeam.stats.totalDonations || 0) + amount
        });

        // Update user donation stats
        await updateDoc(doc(db, "users", user.uid), {
            totalTeamDonations: (userData.totalTeamDonations || 0) + amount
        });

        closeModal('donate-modal');
        alert(`🎉 Successfully donated ${amount.toLocaleString()} ${selectedCurrency}! Team received ${teamReceives.toLocaleString()} with 5% bonus.`);
        
        // Reload team data to show updated vault
        loadUserTeam();
        
        // Refresh player data if the function exists
        if (typeof loadPlayerData === 'function') {
            loadPlayerData(user.uid);
        }
        
    } catch (error) {
        console.error('Error processing donation:', error);
        alert('Error processing donation: ' + error.message);
    }
};

// Also update the CSS to ensure modal backdrop works properly
// Add this to your injectTeamCSS function:
function updateModalCSS() {
    const modalStyle = `
        /* Modal backdrop */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
        }
        
        .modal-content {
            background: rgba(40, 40, 70, 0.95);
            border-radius: 15px;
            padding: 30px;
            border: 2px solid #4a4a8a;
            color: white;
            max-width: 500px;
            margin: 50px auto;
            position: relative;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        
        .close {
            position: absolute;
            right: 15px;
            top: 15px;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            color: #ccc;
            background: none;
            border: none;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .close:hover {
            color: white;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
        }
    `;
    
    // Add to existing CSS
    const style = document.createElement('style');
    style.textContent = modalStyle;
    document.head.appendChild(style);
}

function getActivityLogSection() {
    if (!window.currentTeam) return '';
    
    const activities = window.currentTeam.activityLog || [];
    const recentActivities = activities.slice(-10).reverse();
    
    return `
        <div class="activity-log-section">
            <h3>Recent Activity</h3>
            <div class="activity-list">
                ${recentActivities.length === 0 ? 
                    '<div class="no-activity">No recent activity</div>' :
                    recentActivities.map(activity => `
                        <div class="activity-item">
                            <div class="activity-icon">
                                ${getActivityIcon(activity.type)}
                            </div>
                            <div class="activity-content">
                                <div class="activity-text">
                                    <strong>${escapeHtml(activity.username)}</strong> ${activity.action}
                                    ${activity.amount ? ` (${activity.amount} ${activity.currency})` : ''}
                                </div>
                                <div class="activity-time">
                                    ${formatTeamTime(activity.timestamp)}
                                </div>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
}

// ========== TEAM MANAGEMENT ACTIONS ==========
window.leaveTeam = async function() {
    if (!window.currentTeam) return;
    
    const user = auth.currentUser;
    if (!user) return;

    const userRole = getMemberRole(window.currentTeam, user.uid);
    
    if (userRole === 'founder') {
        alert('As founder, you must transfer leadership or disband the team before leaving.');
        return;
    }

    if (!confirm(`Are you sure you want to leave ${window.currentTeam.name}?`)) return;

    try {
        // Remove from team members
        await updateDoc(doc(db, "teams", window.currentTeam.id), {
            members: arrayRemove(user.uid),
            officers: arrayRemove(user.uid),
            lastActivity: serverTimestamp(),
            activityLog: arrayUnion({
                type: 'leave',
                userId: user.uid,
                username: window.gameState?.player?.username || user.email.split('@')[0],
                action: 'left the team',
                timestamp: serverTimestamp()
            })
        });

        // Update user document
        await updateDoc(doc(db, "users", user.uid), {
            teamId: null,
            teamRole: null,
            teamJoinDate: null
        });

        // Update team stats
        await updateTeamStats(window.currentTeam.id);

        alert(`You left ${window.currentTeam.name}.`);
        window.currentTeam = null;
        loadUserTeam();
        
    } catch (error) {
        console.error('Error leaving team:', error);
        alert('Error leaving team: ' + error.message);
    }
};

window.promoteToOfficer = async function(memberId) {
    if (!window.currentTeam) return;
    
    const member = window.teamMembers.find(m => m.id === memberId);
    if (!member) return;

    if (!confirm(`Promote ${member.username} to officer?`)) return;

    try {
        await updateDoc(doc(db, "teams", window.currentTeam.id), {
            officers: arrayUnion(memberId),
            lastActivity: serverTimestamp(),
            activityLog: arrayUnion({
                type: 'promotion',
                userId: memberId,
                username: member.username,
                action: 'was promoted to officer',
                timestamp: serverTimestamp()
            })
        });

        await loadUserTeam();
        
    } catch (error) {
        console.error('Error promoting member:', error);
        alert('Error promoting member: ' + error.message);
    }
};

window.demoteToMember = async function(memberId) {
    if (!window.currentTeam) return;
    
    const member = window.teamMembers.find(m => m.id === memberId);
    if (!member) return;

    if (!confirm(`Demote ${member.username} to member?`)) return;

    try {
        await updateDoc(doc(db, "teams", window.currentTeam.id), {
            officers: arrayRemove(memberId),
            lastActivity: serverTimestamp(),
            activityLog: arrayUnion({
                type: 'demotion',
                userId: memberId,
                username: member.username,
                action: 'was demoted to member',
                timestamp: serverTimestamp()
            })
        });

        await loadUserTeam();
        
    } catch (error) {
        console.error('Error demoting member:', error);
        alert('Error demoting member: ' + error.message);
    }
};

window.kickMember = async function(memberId, username) {
    if (!window.currentTeam) return;
    
    if (!confirm(`Kick ${username} from the team?`)) return;

    try {
        await updateDoc(doc(db, "teams", window.currentTeam.id), {
            members: arrayRemove(memberId),
            officers: arrayRemove(memberId),
            lastActivity: serverTimestamp(),
            activityLog: arrayUnion({
                type: 'kick',
                userId: memberId,
                username: username,
                action: 'was kicked from the team',
                timestamp: new Date()
            })
        });

        // Update kicked user's document
        await updateDoc(doc(db, "users", memberId), {
            teamId: null,
            teamRole: null,
            teamJoinDate: null
        });

        // Update team stats
        await updateTeamStats(window.currentTeam.id);

        await loadUserTeam();
        
    } catch (error) {
        console.error('Error kicking member:', error);
        alert('Error kicking member: ' + error.message);
    }
};

// ========== FIXED DONATION SYSTEM ==========

// Fixed getTeamVaultSection function - this should be fine as is
function getTeamVaultSection() {
    if (!window.currentTeam) return '';
    
    return `
        <div class="team-vault-section">
            <h3>Team Vault</h3>
            <div class="vault-display">
                <div class="vault-item">
                    <div class="vault-icon">💰</div>
                    <div class="vault-info">
                        <div class="vault-amount">${(window.currentTeam.vault?.gold || 0).toLocaleString()}</div>
                        <div class="vault-label">Gold</div>
                    </div>
                </div>
                <div class="vault-item">
                    <div class="vault-icon">💎</div>
                    <div class="vault-info">
                        <div class="vault-amount">${(window.currentTeam.vault?.tokens || 0).toLocaleString()}</div>
                        <div class="vault-label">Tokens</div>
                    </div>
                </div>
            </div>
            <button class="btn-primary" onclick="showDonateModal()">
                <i class="fas fa-donate"></i> Donate to Vault
            </button>
        </div>
    `;
}

// Fixed showDonateModal function - uses your existing modal pattern
window.showDonateModal = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert('Please log in to donate.');
        return;
    }

    try {
        // Get fresh user data from Firebase
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        const modal = document.getElementById('donate-modal');
        if (!modal) {
            console.error('Donate modal not found');
            return;
        }

        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('donate-modal')">&times;</span>
                <h2>Donate to Team Vault</h2>
                
                <div class="donate-options">
                    <div class="donate-option active" data-currency="gold">
                        <div class="currency-icon">💰</div>
                        <div class="currency-info">
                            <div class="currency-name">Gold</div>
                            <div class="currency-amount">Available: ${(userData.gold || 0).toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <div class="donate-option" data-currency="tokens">
                        <div class="currency-icon">💎</div>
                        <div class="currency-info">
                            <div class="currency-name">Ignition Tokens</div>
                            <div class="currency-amount">Available: ${(userData.tokens || 0).toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div class="amount-selection">
                    <h4>Select Amount</h4>
                    <div class="amount-buttons">
                        <button class="amount-btn" data-amount="100">100</button>
                        <button class="amount-btn" data-amount="500">500</button>
                        <button class="amount-btn" data-amount="1000">1,000</button>
                        <button class="amount-btn" data-amount="5000">5,000</button>
                    </div>
                    
                    <div class="custom-amount">
                        <input type="number" id="custom-amount" placeholder="Custom amount" min="1">
                    </div>
                </div>

                <div class="donate-preview">
                    <div class="preview-item">
                        <span>You donate:</span>
                        <span id="donate-amount">0</span>
                        <span id="donate-currency">gold</span>
                    </div>
                    <div class="preview-item">
                        <span>Team receives:</span>
                        <span id="team-receives">0</span>
                        <span id="receive-currency">gold</span>
                    </div>
                    <div class="preview-bonus">
                        <small>+5% bonus for team donations!</small>
                    </div>
                </div>

                <button class="btn-primary" id="confirm-donate" onclick="processDonation()" disabled>
                    Confirm Donation
                </button>
            </div>
        `;

        // Store user data for the donation process
        window.currentDonationData = {
            userData: userData,
            selectedCurrency: 'gold',
            amount: 0
        };
        
        setupDonateModalEvents();
        
        // Use your existing modal show function
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('Error showing donate modal:', error);
        alert('Error loading donation interface: ' + error.message);
    }
};

// Fixed setupDonateModalEvents function
function setupDonateModalEvents() {
    // Currency selection
    document.querySelectorAll('.donate-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.donate-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Update stored currency
            if (window.currentDonationData) {
                window.currentDonationData.selectedCurrency = this.dataset.currency;
            }
            
            updateDonatePreview();
        });
    });

    // Amount buttons
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('custom-amount').value = '';
            updateDonatePreview(parseInt(this.dataset.amount));
        });
    });

    // Custom amount input
    const customAmount = document.getElementById('custom-amount');
    if (customAmount) {
        customAmount.addEventListener('input', function() {
            updateDonatePreview(parseInt(this.value) || 0);
        });
    }
}

// Fixed updateDonatePreview function
function updateDonatePreview(amount = 0) {
    if (!window.currentDonationData || !window.currentDonationData.userData) return;
    
    const selectedCurrency = window.currentDonationData.selectedCurrency || 'gold';
    const available = window.currentDonationData.userData[selectedCurrency] || 0;
    
    const finalAmount = amount > available ? available : amount;
    const teamReceives = Math.floor(finalAmount * 1.05); // 5% bonus
    
    // Update stored amount
    window.currentDonationData.amount = finalAmount;
    
    const donateAmount = document.getElementById('donate-amount');
    const donateCurrency = document.getElementById('donate-currency');
    const teamReceivesElem = document.getElementById('team-receives');
    const receiveCurrency = document.getElementById('receive-currency');
    
    if (donateAmount) donateAmount.textContent = finalAmount.toLocaleString();
    if (donateCurrency) donateCurrency.textContent = selectedCurrency;
    if (teamReceivesElem) teamReceivesElem.textContent = teamReceives.toLocaleString();
    if (receiveCurrency) receiveCurrency.textContent = selectedCurrency;
    
    const confirmBtn = document.getElementById('confirm-donate');
    if (confirmBtn) {
        confirmBtn.disabled = finalAmount <= 0 || finalAmount > available;
        confirmBtn.textContent = finalAmount > 0 ? 
            `Donate ${finalAmount.toLocaleString()} ${selectedCurrency}` : 
            'Confirm Donation';
    }
}

// Fixed processDonation function
window.processDonation = async function() {
    const user = auth.currentUser;
    if (!user || !window.currentTeam) return;

    if (!window.currentDonationData || window.currentDonationData.amount <= 0) {
        alert('Please select an amount to donate.');
        return;
    }

    const selectedCurrency = window.currentDonationData.selectedCurrency || 'gold';
    const amount = window.currentDonationData.amount;
    
    try {
        // Get fresh user data to ensure we have latest balance
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        // Double-check we have enough currency
        if ((userData[selectedCurrency] || 0) < amount) {
            alert(`Not enough ${selectedCurrency}! You have ${(userData[selectedCurrency] || 0).toLocaleString()} but tried to donate ${amount.toLocaleString()}.`);
            return;
        }

        if (!confirm(`Are you sure you want to donate ${amount.toLocaleString()} ${selectedCurrency} to the team vault?`)) return;

        console.log(`Processing donation: ${amount} ${selectedCurrency}`);

        // Update user currency
        await updateDoc(doc(db, "users", user.uid), {
            [selectedCurrency]: (userData[selectedCurrency] || 0) - amount
        });

        // Update team vault
        const teamReceives = Math.floor(amount * 1.05);
        await updateDoc(doc(db, "teams", window.currentTeam.id), {
            [`vault.${selectedCurrency}`]: (window.currentTeam.vault[selectedCurrency] || 0) + teamReceives,
            lastActivity: serverTimestamp(),
            activityLog: arrayUnion({
                type: 'donation',
                userId: user.uid,
                username: userData.username || user.email.split('@')[0],
                action: `donated ${amount} ${selectedCurrency}`,
                amount: amount,
                currency: selectedCurrency,
                teamReceived: teamReceives,
                totalDonated: ((userData.totalTeamDonations || 0) + amount),
                timestamp: new Date()
            }),
            [`stats.totalDonations`]: (window.currentTeam.stats.totalDonations || 0) + amount
        });

        // Update user donation stats
        await updateDoc(doc(db, "users", user.uid), {
            totalTeamDonations: (userData.totalTeamDonations || 0) + amount
        });

        // Close modal using your existing function
        closeModal('donate-modal');
        
        // Clean up donation data
        window.currentDonationData = null;
        
        alert(`🎉 Successfully donated ${amount.toLocaleString()} ${selectedCurrency}! Team received ${teamReceives.toLocaleString()} with 5% bonus.`);
        
        // Reload team data to show updated vault
        loadUserTeam();
        
        // Refresh player data if the function exists
        if (typeof loadPlayerData === 'function') {
            loadPlayerData(user.uid);
        } else {
            // Force refresh by reloading user team data
            loadUserTeam();
        }
        
    } catch (error) {
        console.error('Error processing donation:', error);
        alert('Error processing donation: ' + error.message);
    }
};

// Make sure closeModal function exists and works
// Add this if you don't have it already
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Clean up donation data when modal closes
        if (modalId === 'donate-modal') {
            window.currentDonationData = null;
        }
    }
}

// Also add click outside to close for all modals (if not already in your system)
document.addEventListener('DOMContentLoaded', function() {
    // Click outside modal to close
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
                // Clean up donation data if it's the donate modal
                if (modal.id === 'donate-modal') {
                    window.currentDonationData = null;
                }
            }
        });
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (modal.style.display === 'block') {
                    modal.style.display = 'none';
                    // Clean up donation data if it's the donate modal
                    if (modal.id === 'donate-modal') {
                        window.currentDonationData = null;
                    }
                }
            });
        }
    });
});

// ========== TEAM LEVEL UPGRADE ==========
// Fixed upgradeTeamLevel function
window.upgradeTeamLevel = async function() {
    if (!window.currentTeam) return;
    
    const user = auth.currentUser;
    if (!user) return;

    // Check if user is founder or officer
    const userRole = getMemberRole(window.currentTeam, user.uid);
    if (userRole !== 'founder' && userRole !== 'officer') {
        alert('Only team founders and officers can upgrade the team level!');
        return;
    }

    const currentLevel = window.currentTeam.level || 1;
    const nextLevel = currentLevel + 1;
    
    // Check if already at max level
    if (!TEAM_LEVEL_CONFIG[nextLevel]) {
        alert('Your team is already at the maximum level!');
        return;
    }

    const upgradeCost = TEAM_LEVEL_CONFIG[currentLevel].upgradeCost;
    const currentVaultGold = window.currentTeam.vault?.gold || 0;

    // Check if team has enough gold in vault
    if (currentVaultGold < upgradeCost) {
        alert(`Not enough gold in team vault! Need ${upgradeCost.toLocaleString()} gold, but only have ${currentVaultGold.toLocaleString()} gold.`);
        return;
    }

    if (!confirm(`Upgrade team to Level ${nextLevel} for ${upgradeCost.toLocaleString()} gold from the team vault?`)) return;

    try {
        // Update team level and deduct gold from vault
        await updateDoc(doc(db, "teams", window.currentTeam.id), {
            level: nextLevel,
            maxMembers: TEAM_LEVEL_CONFIG[nextLevel].maxMembers,
            'vault.gold': currentVaultGold - upgradeCost,
            lastActivity: serverTimestamp(),
            activityLog: arrayUnion({
                type: 'level_up',
                userId: user.uid,
                username: window.gameState?.player?.username || user.email.split('@')[0],
                action: `upgraded the team to Level ${nextLevel}`,
                cost: upgradeCost,
                timestamp: new Date()
            })
        });

        alert(`🎉 Team upgraded to Level ${nextLevel}!`);
        loadUserTeam(); // Reload team data to show changes
        
    } catch (error) {
        console.error('Error upgrading team level:', error);
        alert('Error upgrading team level: ' + error.message);
    }
};

// Fixed getLevelUpgradeSection function - better canUpgrade logic
function getLevelUpgradeSection(team, currentLevel, canUpgrade, themeColor) {
    const nextLevel = currentLevel + 1;
    const nextLevelConfig = TEAM_LEVEL_CONFIG[nextLevel];
    
    if (!nextLevelConfig) {
        return `
            <div class="level-upgrade-section max-level">
                <h3>🏆 Maximum Level Reached!</h3>
                <p>Your team has reached the highest level possible. Great work!</p>
            </div>
        `;
    }

    const upgradeCost = TEAM_LEVEL_CONFIG[currentLevel].upgradeCost;
    const currentVaultGold = team.vault?.gold || 0;
    const progressPercent = Math.min(100, (currentVaultGold / upgradeCost) * 100);

    // Get user role safely
    const user = auth.currentUser;
    const userRole = user ? getMemberRole(team, user.uid) : 'member';
    const isLeader = userRole === 'founder' || userRole === 'officer';

    // FIXED: Better canUpgrade calculation
    const canActuallyUpgrade = currentVaultGold >= upgradeCost && isLeader;

    return `
        <div class="level-upgrade-section ${canActuallyUpgrade ? 'can-upgrade' : ''}">
            <div class="upgrade-header">
                <h3>Level Up to ${nextLevel}</h3>
                ${canActuallyUpgrade ? '<span class="upgrade-ready">Ready to Upgrade!</span>' : ''}
            </div>
            
            <div class="upgrade-info">
                <div class="upgrade-benefits">
                    <h4>Benefits:</h4>
                    <ul>
                        <li>Max Members: ${team.maxMembers} → <strong>${nextLevelConfig.maxMembers}</strong></li>
                        <li>New Banner: <strong>Level ${nextLevel} Banner</strong></li>
                        <li>Prestige: <strong>Enhanced team appearance</strong></li>
                    </ul>
                </div>
                
                <div class="upgrade-cost">
                    <h4>Upgrade Cost:</h4>
                    <div class="cost-display ${currentVaultGold >= upgradeCost ? 'can-afford' : 'cannot-afford'}">
                        <span class="cost-amount">${upgradeCost.toLocaleString()} Gold</span>
                        <span class="vault-amount">Vault: ${currentVaultGold.toLocaleString()} Gold</span>
                    </div>
                </div>
            </div>

            <div class="upgrade-progress">
                <div class="progress-info">
                    <span>Progress to Level ${nextLevel}</span>
                    <span>${Math.floor(progressPercent)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%; background: ${themeColor};"></div>
                </div>
                <div class="progress-text">
                    ${currentVaultGold.toLocaleString()} / ${upgradeCost.toLocaleString()} Gold
                </div>
            </div>

            ${isLeader ? `
                <div class="upgrade-actions">
                    <button class="btn-primary upgrade-btn" onclick="upgradeTeamLevel()" ${!canActuallyUpgrade ? 'disabled' : ''}>
                        <i class="fas fa-arrow-up"></i> 
                        Upgrade to Level ${nextLevel}
                    </button>
                    ${!canActuallyUpgrade ? `
                        <div class="upgrade-help">
                            <i class="fas fa-info-circle"></i>
                            ${currentVaultGold < upgradeCost ? 
                                `Need ${(upgradeCost - currentVaultGold).toLocaleString()} more gold in vault` : 
                                'Only team founders and officers can upgrade'}
                        </div>
                    ` : ''}
                </div>
            ` : `
                <div class="upgrade-help">
                    <i class="fas fa-info-circle"></i>
                    Only team founders and officers can upgrade the team level
                </div>
            `}
        </div>
    `;
}

// Also update the displayTeamView function to pass the correct parameters
function displayTeamView() {
    const teamContainer = document.getElementById('team-container');
    
    if (!teamContainer || !window.currentTeam) {
        showNoTeamView();
        return;
    }

    try {
        const teamLevel = window.currentTeam.level || 1;
        const bannerImage = getTeamBannerURL(teamLevel);
        const themeColor = getTeamLevelColor(teamLevel);
        const nextLevelConfig = TEAM_LEVEL_CONFIG[teamLevel + 1];
        
        // FIXED: Better canUpgrade calculation
        const upgradeCost = TEAM_LEVEL_CONFIG[teamLevel].upgradeCost;
        const currentVaultGold = window.currentTeam.vault?.gold || 0;
        const user = auth.currentUser;
        const userRole = user ? getMemberRole(window.currentTeam, user.uid) : 'member';
        const isLeader = userRole === 'founder' || userRole === 'officer';
        const canUpgrade = currentVaultGold >= upgradeCost && isLeader && nextLevelConfig;

        const teamHTML = `
            <div class="team-dashboard">
                <!-- Team Header -->
                <div class="team-header-card" style="background: linear-gradient(135deg, rgba(26, 26, 46, 0.9), rgba(22, 33, 62, 0.9)), url('${bannerImage}'); background-size: cover; background-position: center;">
                    <div class="team-emblem-large">
                        <img src="${getTeamEmblem(window.currentTeam.emblem)}" alt="${window.currentTeam.emblem}"
                             onerror="this.src='images/emblems/default_emblem.png'">
                    </div>
                    <div class="team-info-main">
                        <h1 style="color: ${themeColor};">${escapeHtml(window.currentTeam.name)}</h1>
                        <div class="team-tag-large">[${window.currentTeam.tag}]</div>
                        <div class="team-level-badge" style="background: ${themeColor};">
                            Level ${teamLevel}
                        </div>
                        <p class="team-description-main">${escapeHtml(window.currentTeam.description || 'No description')}</p>
                    </div>
                    <div class="team-actions-header">
                        ${getTeamHeaderActionButtons()}
                    </div>
                </div>

                <!-- Team Stats Grid -->
                <div class="team-stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${window.teamMembers.length}/${window.currentTeam.maxMembers || 5}</div>
                        <div class="stat-label">Members</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Math.round(window.currentTeam.fame || 0)}</div>
                        <div class="stat-label">Fame</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${(window.currentTeam.vault?.gold || 0).toLocaleString()}</div>
                        <div class="stat-label">Vault Gold</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${window.currentTeam.stats?.totalWins || 0}</div>
                        <div class="stat-label">Team Wins</div>
                    </div>
                </div>

                <!-- Level Upgrade Section -->
                ${getLevelUpgradeSection(window.currentTeam, teamLevel, canUpgrade, themeColor)}

                <!-- Team Members -->
                ${getTeamMembersSection()}

                <!-- Team Vault -->
                ${getTeamVaultSection()}

                <!-- Activity Log -->
                ${getActivityLogSection()}
            </div>
        `;

        teamContainer.innerHTML = teamHTML;
        
    } catch (error) {
        console.error('❌ Error displaying team view:', error);
        teamContainer.innerHTML = '<div class="error">Error displaying team information</div>';
    }
}

// ========== UTILITY AND VIEW FUNCTIONS ==========
function showNoTeamView() {
    const teamContainer = document.getElementById('team-container');
    if (!teamContainer) {
        console.error('Team container not found for no-team view');
        return;
    }

    console.log('Showing no-team view');
    
    teamContainer.innerHTML = `
        <div class="no-team-view">
            <div class="no-team-icon">
                <i class="fas fa-users"></i>
            </div>
            <h2>Join a Team</h2>
            <p>Team up with other racers to earn bonuses, share resources, and climb the leaderboards together!</p>
            
            <div class="no-team-actions">
                <button class="btn-primary" onclick="showCreateTeamModal()">
                    <i class="fas fa-plus"></i> Create Team
                </button>
                <button class="btn-secondary" onclick="switchTeamsTab('browse')">
                    <i class="fas fa-search"></i> Browse Teams
                </button>
            </div>

            <div class="team-benefits">
                <h3>Team Benefits</h3>
                <div class="benefits-grid">
                    <div class="benefit-item">
                        <i class="fas fa-hand-holding-usd"></i>
                        <strong>Shared Vault</strong>
                        <span>Pool resources for team upgrades</span>
                    </div>
                    <div class="benefit-item">
                        <i class="fas fa-trophy"></i>
                        <strong>Fame Bonuses</strong>
                        <span>Earn extra fame in team events</span>
                    </div>
                    <div class="benefit-item">
                        <i class="fas fa-shield-alt"></i>
                        <strong>Team Perks</strong>
                        <span>Unlock exclusive team rewards</span>
                    </div>
                    <div class="benefit-item">
                        <i class="fas fa-users"></i>
                        <strong>Community</strong>
                        <span>Race and train together</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.switchTeamsTab = function(tabName) {
    console.log('Switching to tab:', tabName);
    window.currentTeamsTab = tabName;
    
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.teams-tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Show appropriate content
    const tabContents = document.querySelectorAll('.teams-tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
        if (content.id === `${tabName}-tab`) {
            content.style.display = 'block';
            console.log(`Showing tab: ${content.id}`);
        }
    });
    
    // Load content based on tab
    if (tabName === 'search' || tabName === 'browse') {
        searchTeams();
    } else if (tabName === 'my-team') {
        if (window.currentTeam) {
            console.log('Loading my team view');
            displayTeamView();
        } else {
            console.log('No team, showing no-team view');
            showNoTeamView();
        }
    }
    
    console.log('Current tab after switch:', window.currentTeamsTab);
};

async function updateTeamStats(teamId) {
    try {
        const teamDoc = await getDoc(doc(db, "teams", teamId));
        if (!teamDoc.exists()) return;

        const teamData = teamDoc.data();
        const memberPromises = teamData.members.map(memberId => 
            getDoc(doc(db, "users", memberId))
        );
        
        const memberSnapshots = await Promise.all(memberPromises);
        
        let totalFame = 0;
        let totalLevel = 0;
        let activeMembers = 0;
        
        memberSnapshots.forEach(doc => {
            if (doc.exists()) {
                const userData = doc.data();
                totalFame += userData.fame || 0;
                totalLevel += userData.level || 1;
                activeMembers++;
            }
        });
        
        const averageLevel = activeMembers > 0 ? totalLevel / activeMembers : 0;
        const averageFame = activeMembers > 0 ? totalFame / activeMembers : 0;
        
        await updateDoc(doc(db, "teams", teamId), {
            fame: Math.round(averageFame),
            stats: {
                ...teamData.stats,
                memberCount: activeMembers,
                averageLevel: Math.round(averageLevel * 10) / 10
            }
        });
        
    } catch (error) {
        console.error('Error updating team stats:', error);
    }
}

function setupTeamEventListeners() {
    // Tab switching
    document.querySelectorAll('.teams-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTeamsTab(this.dataset.tab);
        });
    });
    
    // Team search
    const searchInput = document.getElementById('team-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchTeams, 500));
    }
}

// ========== IMAGE ERROR HANDLING ==========
window.handleTeamImageError = function(imgElement, imageType, identifier) {
    console.log(`🖼️ Team image failed: ${imgElement.src}`);
    
    let fallbacks = [];
    
    if (imageType === 'emblem') {
        fallbacks = [
            'images/emblems/default_emblem.png',
            'images/emblems/dragon_emblem.png'
        ];
    } else if (imageType === 'banner') {
        fallbacks = [
            'images/team_banners/team_level_1_banner.jpg',
            'images/team_banners/default_banner.jpg'
        ];
    }
    
    // Try next fallback
    if (fallbacks.length > 0) {
        const currentIndex = fallbacks.indexOf(imgElement.src);
        const nextIndex = currentIndex + 1;
        
        if (nextIndex < fallbacks.length) {
            imgElement.src = fallbacks[nextIndex];
        } else {
            console.log('❌ All image fallbacks failed');
            imgElement.style.display = 'none';
        }
    }
};

// ========== CLEANUP FUNCTIONS ==========
function cleanupTeamListeners() {
    if (window.userUnsubscribe) {
        window.userUnsubscribe();
        console.log('🔕 User listener cleaned up');
    }
    if (window.teamUnsubscribe) {
        window.teamUnsubscribe();
        console.log('🔕 Team listener cleaned up');
    }
}

window.cleanupTeamListeners = cleanupTeamListeners;

// ========== DEBUG FUNCTIONS ==========
window.debugTeamPermissions = async function() {
    const user = auth.currentUser;
    if (!user) {
        console.log('No user logged in');
        return;
    }

    console.log('=== TEAM PERMISSIONS DEBUG ===');
    console.log('User ID:', user.uid);
    
    try {
        // Test team creation permission
        console.log('🔧 Testing team creation...');
        const testTeamRef = doc(collection(db, "teams"));
        await setDoc(testTeamRef, {
            name: "test_team",
            tag: "TEST",
            founderId: user.uid,
            members: [user.uid],
            officers: [],
            settings: { public: true, joinType: "open", minLevel: 1 },
            createdAt: serverTimestamp()
        });
        console.log('✅ Team creation: GRANTED');
        
        // Clean up test team
        await deleteDoc(testTeamRef);
        console.log('✅ Team deletion: GRANTED');
        
    } catch (error) {
        console.error('❌ Team permissions error:', error);
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
    }
};

window.debugTeamLoading = async function() {
    const user = auth.currentUser;
    console.log('=== TEAM LOADING DEBUG ===');
    console.log('User:', user ? user.uid : 'No user');
    
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        console.log('User data:', userData);
        console.log('Team ID:', userData?.teamId);
        
        if (userData?.teamId) {
            const teamDoc = await getDoc(doc(db, "teams", userData.teamId));
            console.log('Team exists:', teamDoc.exists());
            console.log('Team data:', teamDoc.data());
        }
    }
    
    console.log('Current team:', window.currentTeam);
    console.log('Team members:', window.teamMembers);
};

function debugTeamState() {
    console.log('=== TEAM STATE DEBUG ===');
    console.log('Global currentTeam:', window.currentTeam);
    console.log('Global teamMembers:', window.teamMembers);
    console.log('Global currentTeamsTab:', window.currentTeamsTab);
    console.log('User authenticated:', !!auth.currentUser);
    
    if (auth.currentUser) {
        console.log('User ID:', auth.currentUser.uid);
    }
    
    // Check DOM elements
    const teamContainer = document.getElementById('team-container');
    console.log('Team Container exists:', !!teamContainer);
    
    // Check which tab is active
    const activeTab = document.querySelector('.teams-tab-btn.active');
    console.log('Active tab button:', activeTab?.dataset.tab);
    
    // Check if my-team tab content is visible
    const myTeamTab = document.getElementById('my-team-tab');
    console.log('My Team tab visible:', myTeamTab?.style.display !== 'none');
}

// ========== MISSING MODAL FUNCTIONS ==========
window.showCreateTeamModal = function() {
    console.log('Show create team modal');
    switchTeamsTab('create');
};

window.showTeamSettings = function() {
    console.log('Show team settings');
    alert('Team settings functionality to be implemented');
};

window.showJoinRequests = function() {
    console.log('Show join requests');
    alert('Join requests functionality to be implemented');
};

window.viewPlayerProfile = function(playerId, username, level) {
    console.log('View profile:', playerId, username, level);
    alert(`Viewing profile of ${username} (Level ${level}) - functionality to be implemented`);
};

// ========== CSS INJECTION ==========
function injectTeamCSS() {
    if (document.getElementById('team-system-css')) return;
    
    const style = document.createElement('style');
    style.id = 'team-system-css';
    style.textContent = `
        .team-dashboard {
            color: white;
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .team-header-card {
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 25px;
            background: linear-gradient(135deg, rgba(26, 26, 46, 0.9), rgba(22, 33, 62, 0.9));
            border: 2px solid #3a3a5a;
        }
        
        .team-emblem-large img {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 4px solid gold;
            background: #2a2a4a;
        }
        
        .team-info-main h1 {
            margin: 0 0 10px 0;
            font-size: 32px;
            color: #00ffff;
        }
        
        .team-tag-large {
            font-size: 20px;
            opacity: 0.8;
            margin: 5px 0;
            color: #ccc;
        }
        
        .team-level-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
            color: white;
            font-size: 14px;
        }
        
        .team-description-main {
            margin: 15px 0 0 0;
            color: #ccc;
            font-size: 16px;
            line-height: 1.4;
        }
        
        .team-actions-header {
            margin-left: auto;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .team-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card {
            background: rgba(40, 40, 70, 0.8);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid #4a4a8a;
        }
        
        .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #00ffff;
            display: block;
        }
        
        .stat-label {
            font-size: 14px;
            color: #888;
            text-transform: uppercase;
            margin-top: 5px;
        }
        
        .level-upgrade-section {
            background: rgba(30, 30, 60, 0.8);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border-left: 5px solid #00ffff;
        }
        
        .level-upgrade-section.can-upgrade {
            border-left-color: #00ff88;
            background: rgba(0, 255, 136, 0.1);
        }
        
        .upgrade-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .upgrade-header h3 {
            margin: 0;
            color: #00ffff;
        }
        
        .upgrade-ready {
            background: #00ff88;
            color: #000;
            padding: 5px 10px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 12px;
        }
        
        .upgrade-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 20px 0;
        }
        
        .upgrade-benefits h4, .upgrade-cost h4 {
            color: #00ffff;
            margin-bottom: 10px;
        }
        
        .upgrade-benefits ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .upgrade-benefits li {
            padding: 5px 0;
            color: #ccc;
        }
        
        .upgrade-benefits strong {
            color: #00ff88;
        }
        
        .cost-display {
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }
        
        .cost-display.can-afford {
            background: rgba(0, 255, 136, 0.2);
            border: 2px solid #00ff88;
        }
        
        .cost-display.cannot-afford {
            background: rgba(255, 100, 100, 0.2);
            border: 2px solid #ff6b6b;
        }
        
        .cost-amount {
            display: block;
            font-size: 24px;
            font-weight: bold;
            color: #feca57;
        }
        
        .vault-amount {
            display: block;
            font-size: 16px;
            color: #ccc;
            margin-top: 5px;
        }
        
        .upgrade-progress {
            margin: 25px 0;
        }
        
        .progress-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            color: #ccc;
        }
        
        .progress-bar {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            height: 12px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 10px;
        }
        
        .progress-text {
            text-align: center;
            color: #ccc;
            font-size: 14px;
        }
        
        .upgrade-actions {
            text-align: center;
            margin-top: 20px;
        }
        
        .upgrade-help {
            text-align: center;
            color: #888;
            font-style: italic;
            margin-top: 15px;
        }
        
        .btn-primary, .btn-secondary, .btn-danger, .btn-disabled {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin: 5px;
            color: white;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary { 
            background: linear-gradient(135deg, #007bff, #0056b3);
            border: 1px solid #007bff;
        }
        .btn-primary:hover:not(:disabled) { 
            background: linear-gradient(135deg, #0056b3, #004085);
            transform: translateY(-2px);
        }
        
        .btn-secondary { 
            background: linear-gradient(135deg, #6c757d, #545b62);
            border: 1px solid #6c757d;
        }
        .btn-secondary:hover:not(:disabled) { 
            background: linear-gradient(135deg, #545b62, #4e555b);
            transform: translateY(-2px);
        }
        
        .btn-danger { 
            background: linear-gradient(135deg, #dc3545, #c82333);
            border: 1px solid #dc3545;
        }
        .btn-danger:hover:not(:disabled) { 
            background: linear-gradient(135deg, #c82333, #bd2130);
            transform: translateY(-2px);
        }
        
        .btn-disabled { 
            background: #6c757d;
            cursor: not-allowed;
            opacity: 0.6;
        }
        
        .members-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .member-card {
            background: rgba(50, 50, 80, 0.8);
            padding: 20px;
            border-radius: 12px;
            border-left: 5px solid #666;
            transition: transform 0.3s ease;
        }
        
        .member-card:hover {
            transform: translateY(-5px);
        }
        
        .member-card.founder { border-left-color: gold; }
        .member-card.officer { border-left-color: silver; }
        .member-card.member { border-left-color: #00ffff; }
        
        .member-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .member-avatar img {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 2px solid #3a3a5a;
        }
        
        .member-name {
            font-weight: bold;
            font-size: 18px;
            color: white;
        }
        
        .member-role-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            margin-top: 5px;
        }
        
        .member-role-badge.founder { background: gold; color: black; }
        .member-role-badge.officer { background: silver; color: black; }
        .member-role-badge.member { background: #00ffff; color: black; }
        
        .member-level {
            color: #ccc;
            font-size: 14px;
            margin-top: 2px;
        }
        
        .member-stats {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px 0;
            border-top: 1px solid #3a3a5a;
            border-bottom: 1px solid #3a3a5a;
        }
        
        .member-stat {
            display: flex;
            align-items: center;
            gap: 5px;
            color: #ccc;
            font-size: 12px;
        }
        
        .member-actions {
            display: flex;
            gap: 5px;
            justify-content: flex-end;
        }
        
        .btn-small {
            padding: 6px 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            color: white;
            font-size: 12px;
        }
        
        .btn-success { background: #28a745; }
        .btn-warning { background: #ffc107; color: black; }
        
        .team-vault-section, .activity-log-section, .team-members-section {
            background: rgba(40, 40, 70, 0.8);
            border-radius: 15px;
            padding: 25px;
            margin: 25px 0;
            border: 1px solid #4a4a8a;
        }
        
        .team-vault-section h3, .activity-log-section h3, .team-members-section h3 {
            color: #00ffff;
            margin-top: 0;
            margin-bottom: 20px;
            border-bottom: 2px solid #00ffff;
            padding-bottom: 10px;
        }
        
        .vault-display {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .vault-item {
            background: rgba(60, 60, 90, 0.6);
            padding: 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 15px;
            border: 1px solid #5a5a9a;
        }
        
        .vault-icon {
            font-size: 32px;
        }
        
        .vault-amount {
            font-size: 24px;
            font-weight: bold;
            color: #feca57;
        }
        
        .vault-label {
            color: #ccc;
            font-size: 14px;
        }
        
        .activity-list {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .activity-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            border-bottom: 1px solid #3a3a5a;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-icon {
            font-size: 20px;
            width: 30px;
            text-align: center;
        }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-text {
            color: #ccc;
            margin-bottom: 5px;
        }
        
        .activity-text strong {
            color: white;
        }
        
        .activity-time {
            color: #888;
            font-size: 12px;
        }
        
        .no-team-view {
            text-align: center;
            padding: 60px 40px;
            color: #ccc;
            background: rgba(40, 40, 70, 0.8);
            border-radius: 15px;
            margin: 20px;
            border: 2px solid #4a4a8a;
        }
        
        .no-team-icon {
            font-size: 80px;
            color: #00ffff;
            margin-bottom: 20px;
        }
        
        .no-team-view h2 {
            color: #00ffff;
            margin-bottom: 20px;
            font-size: 32px;
        }
        
        .no-team-view p {
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 30px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .no-team-actions {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin: 30px 0;
            flex-wrap: wrap;
        }
        
        .team-benefits {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #4a4a8a;
        }
        
        .team-benefits h3 {
            color: #00ffff;
            margin-bottom: 25px;
            text-align: center;
            font-size: 24px;
        }
        
        .benefits-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            max-width: 1000px;
            margin: 0 auto;
        }
        
        .benefit-item {
            text-align: center;
            padding: 25px 20px;
            background: rgba(60, 60, 90, 0.6);
            border-radius: 12px;
            border: 1px solid #5a5a9a;
            transition: transform 0.3s ease;
        }
        
        .benefit-item:hover {
            transform: translateY(-5px);
        }
        
        .benefit-item i {
            font-size: 36px;
            color: #00ffff;
            margin-bottom: 15px;
            display: block;
        }
        
        .benefit-item strong {
            display: block;
            color: white;
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .benefit-item span {
            color: #ccc;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .loading, .error, .no-teams, .no-members, .no-activity {
            text-align: center;
            padding: 40px 20px;
            color: #888;
            font-size: 18px;
            background: rgba(40, 40, 70, 0.8);
            border-radius: 10px;
            margin: 20px 0;
            border: 1px solid #4a4a8a;
        }
        
        /* Team cards for browsing */
        .team-card {
            background: rgba(40, 40, 70, 0.8);
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
            border: 1px solid #4a4a8a;
            transition: transform 0.3s ease, border-color 0.3s ease;
        }
        
        .team-card:hover {
            transform: translateY(-5px);
            border-color: #00ffff;
        }
        
        .team-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .team-emblem img {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            margin-right: 15px;
            border: 2px solid #3a3a5a;
        }
        
        .team-info h3 {
            margin: 0 0 5px 0;
            color: #00ffff;
            font-size: 20px;
        }
        
        .team-tag {
            color: #ccc;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .team-level {
            color: #feca57;
            font-weight: bold;
            font-size: 12px;
        }
        
        .team-description {
            color: #ccc;
            margin: 15px 0;
            line-height: 1.4;
        }
        
        .team-stats {
            display: flex;
            justify-content: space-around;
            margin: 15px 0;
            padding: 15px 0;
            border-top: 1px solid #3a3a5a;
            border-bottom: 1px solid #3a3a5a;
        }
        
        .team-stat {
            text-align: center;
            color: #ccc;
        }
        
        .team-stat i {
            display: block;
            font-size: 18px;
            margin-bottom: 5px;
            color: #00ffff;
        }
        
        .team-join-info {
            display: flex;
            justify-content: space-between;
            margin: 15px 0;
            font-size: 12px;
        }
        
        .join-type {
            padding: 3px 8px;
            border-radius: 8px;
            font-weight: bold;
        }
        
        .join-type.open { background: rgba(0, 255, 136, 0.2); color: #00ff88; }
        .join-type.approval { background: rgba(255, 193, 7, 0.2); color: #ffc107; }
        .join-type.invite { background: rgba(220, 53, 69, 0.2); color: #dc3545; }
        
        .min-level {
            color: #ccc;
        }
        
        .team-actions {
            text-align: center;
            margin-top: 15px;
        }

        /* Modal styles */
        .modal-content {
            background: rgba(40, 40, 70, 0.95);
            border-radius: 15px;
            padding: 30px;
            border: 2px solid #4a4a8a;
            color: white;
            max-width: 500px;
            margin: 50px auto;
        }

        .close {
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            color: #ccc;
        }

        .close:hover {
            color: white;
        }

        .donate-options {
            display: flex;
            gap: 15px;
            margin: 20px 0;
        }

        .donate-option {
            flex: 1;
            padding: 15px;
            border: 2px solid #4a4a8a;
            border-radius: 10px;
            cursor: pointer;
            text-align: center;
            transition: all 0.3s ease;
        }

        .donate-option.active {
            border-color: #00ffff;
            background: rgba(0, 255, 255, 0.1);
        }

        .currency-icon {
            font-size: 24px;
            margin-bottom: 10px;
        }

        .amount-buttons {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin: 15px 0;
        }

        .amount-btn {
            padding: 10px;
            border: 1px solid #4a4a8a;
            background: rgba(60, 60, 90, 0.6);
            color: white;
            border-radius: 5px;
            cursor: pointer;
        }

        .amount-btn:hover {
            background: rgba(0, 255, 255, 0.1);
            border-color: #00ffff;
        }

        .custom-amount input {
            width: 100%;
            padding: 10px;
            background: rgba(60, 60, 90, 0.6);
            border: 1px solid #4a4a8a;
            border-radius: 5px;
            color: white;
            margin-top: 10px;
        }

        .donate-preview {
            background: rgba(60, 60, 90, 0.6);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }

        .preview-item {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
        }

        .preview-bonus {
            text-align: center;
            color: #00ff88;
            margin-top: 10px;
        }
    `;
    document.head.appendChild(style);
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Team system DOM loaded');
    if (window.location.pathname.includes('teams.html') || document.getElementById('team-container')) {
        console.log('✅ Teams page detected, initializing...');
        initializeTeamSystem();
        
    }
});

// Export functions to global scope
window.initializeTeamSystem = initializeTeamSystem;
window.searchTeams = searchTeams;
window.createTeam = createTeam;
window.joinTeam = joinTeam;
window.requestToJoinTeam = requestToJoinTeam;
window.leaveTeam = leaveTeam;
window.promoteToOfficer = promoteToOfficer;
window.demoteToMember = demoteToMember;
window.kickMember = kickMember;
window.showDonateModal = showDonateModal;
window.processDonation = processDonation;
window.switchTeamsTab = switchTeamsTab;
window.upgradeTeamLevel = upgradeTeamLevel;
window.debugTeamLoading = debugTeamLoading;
window.debugTeamPermissions = debugTeamPermissions;
// ========== ACHIEVEMENTS SYSTEM FUNCTIONS ==========
async function initializeAchievements() {
    console.log('🏆 Initializing achievements system...');
    await loadPlayerAchievements();
    displayAchievements();
    setupAchievementFilters();
    startAchievementTracking();
    
    // Show first achievement details by default if any are completed
    const firstCompleted = ACHIEVEMENTS_DATA.find(achievement => {
        const progress = playerAchievements[achievement.id];
        return progress && progress.completed;
    });
    
    if (firstCompleted) {
        showAchievementDetails(firstCompleted.id);
    } else {
        // Show first available achievement
        const firstAvailable = ACHIEVEMENTS_DATA.find(achievement => !achievement.hidden);
        if (firstAvailable) {
            showAchievementDetails(firstAvailable.id);
        }
    }
}

async function loadPlayerAchievements() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            playerAchievements = userData.achievements || {};
            console.log('📊 Loaded player achievements:', playerAchievements);
            
            await initializeMissingAchievements();
        }
    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

async function initializeMissingAchievements() {
    const user = auth.currentUser;
    if (!user) return;

    let needsUpdate = false;
    
    ACHIEVEMENTS_DATA.forEach(achievement => {
        if (!playerAchievements[achievement.id]) {
            playerAchievements[achievement.id] = {
                progress: 0,
                completed: false,
                completedAt: null,
                claimed: false
            };
            needsUpdate = true;
            console.log(`➕ Initialized new achievement: ${achievement.name}`);
        }
    });
    
    if (needsUpdate) {
        await saveAchievementsProgress();
    }
}

async function saveAchievementsProgress() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await updateDoc(doc(db, "users", user.uid), {
            achievements: playerAchievements
        });
        console.log('💾 Saved achievements progress');
    } catch (error) {
        console.error('Error saving achievements:', error);
    }
}

function displayAchievements() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    
    const filteredAchievements = ACHIEVEMENTS_DATA.filter(achievement => {
        if (currentAchievementFilter === 'all') return true;
        return achievement.category === currentAchievementFilter;
    });
    
    updateAchievementStats();
    
    const achievementsHTML = filteredAchievements.map(achievement => {
        const progress = playerAchievements[achievement.id] || { progress: 0, completed: false };
        const isUnlocked = !achievement.hidden || progress.completed;
        const isCompleted = progress.completed;
        
        if (!isUnlocked) {
            return `
                <div class="achievement-item locked" 
                     data-achievement-id="${achievement.id}">
                    <div class="achievement-badge-image">
                        <div class="locked-overlay">?</div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="achievement-item ${isCompleted ? 'unlocked' : 'in-progress'}" 
                 onclick="showAchievementDetails('${achievement.id}')"
                 data-achievement-id="${achievement.id}">
                <div class="achievement-badge-image">
                    <img src="${achievement.badgeImage}" alt="${achievement.name}" 
                         onerror="this.src='images/badges/default_badge.jpg'">
                    ${!isCompleted ? '<div class="progress-overlay">${Math.floor((progress.progress / achievement.target) * 100)}%</div>' : ''}
                </div>
                ${isCompleted ? `
                    <div class="achievement-rarity rarity-${achievement.rarity}">
                        ${achievement.rarity.charAt(0).toUpperCase()}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    grid.innerHTML = achievementsHTML;
    console.log('✅ Achievements grid updated');
}

function updateAchievementStats() {
    const completedCount = ACHIEVEMENTS_DATA.filter(achievement => {
        const progress = playerAchievements[achievement.id];
        return progress && progress.completed;
    }).length;
    
    const totalCount = ACHIEVEMENTS_DATA.length;
    
    const tokensEarned = ACHIEVEMENTS_DATA.reduce((total, achievement) => {
        const progress = playerAchievements[achievement.id];
        if (progress && progress.completed && progress.claimed) {
            return total + (achievement.reward.tokens || 0);
        }
        return total;
    }, 0);
    
    const completedEl = document.getElementById('completed-count');
    const totalEl = document.getElementById('total-count');
    const tokensEl = document.getElementById('tokens-earned');
    
    if (completedEl) completedEl.textContent = completedCount;
    if (totalEl) totalEl.textContent = totalCount;
    if (tokensEl) tokensEl.textContent = tokensEarned;
}

function getRequirementText(achievement) {
    switch(achievement.type) {
        case 'training_complete':
            return 'Complete training sessions';
        case 'pvp_win':
            return 'Win PVP races';
        case 'stat_threshold':
            return `Reach ${achievement.stat} level`;
        case 'unique_items':
            return 'Collect unique items';
        case 'unique_cars':
            return 'Collect unique cars';
        case 'login_streak':
            return 'Login for consecutive days';
        case 'total_gold':
            return 'Earn total gold';
        default:
            return 'Complete objective';
    }
}

function setupAchievementFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentAchievementFilter = this.dataset.filter;
            
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            displayAchievements();
        });
    });
}

function startAchievementTracking() {
    console.log('🎯 Starting achievement tracking...');
    
    // Override the global tracking functions to also track achievements
    const originalTrackTraining = window.trackTrainingComplete;
    window.trackTrainingComplete = function() {
        console.log('🏋️ Tracking training for achievements');
        if (originalTrackTraining) originalTrackTraining();
        updateAchievementProgress('training_complete', 1);
    };
    
    const originalTrackPVP = window.trackPVPWin;
    window.trackPVPWin = function() {
        console.log('🏁 Tracking PVP win for achievements');
        if (originalTrackPVP) originalTrackPVP();
        updateAchievementProgress('pvp_win', 1);
    };
    
    console.log('✅ Achievement tracking started');
}

async function updateAchievementProgress(type, amount = 1) {
    const user = auth.currentUser;
    if (!user) return;

    let updated = false;
    
    ACHIEVEMENTS_DATA.forEach(achievement => {
        if (achievement.type === type) {
            const currentProgress = playerAchievements[achievement.id] || { progress: 0, completed: false };
            
            if (!currentProgress.completed) {
                const oldProgress = currentProgress.progress;
                currentProgress.progress = Math.min(achievement.target, oldProgress + amount);
                
                console.log(`📈 Achievement progress: ${achievement.name} ${oldProgress} → ${currentProgress.progress}/${achievement.target}`);
                
                if (currentProgress.progress >= achievement.target && !currentProgress.completed) {
                    currentProgress.completed = true;
                    currentProgress.completedAt = new Date().toISOString();
                    console.log(`🏆 Achievement completed: ${achievement.name}`);
                    showAchievementUnlockedNotification(achievement);
                }
                
                playerAchievements[achievement.id] = currentProgress;
                updated = true;
            }
        }
    });
    
    if (updated) {
        await saveAchievementsProgress();
        
        if (window.location.pathname.includes('achievements.html')) {
            displayAchievements();
        }
    }
}

function showAchievementUnlockedNotification(achievement) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #feca57, #ff9ff3);
        color: #1a1a2e;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(254, 202, 87, 0.4);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        cursor: pointer;
        font-family: 'Orbitron', sans-serif;
        font-weight: bold;
        max-width: 300px;
    `;
    
    notification.innerHTML = `
        <div>🏆 Achievement Unlocked!</div>
        <div style="font-size: 0.9rem; margin-top: 0.5rem;">${achievement.name}</div>
        <div style="font-size: 0.8rem; margin-top: 0.3rem;">Click to view</div>
    `;
    
    notification.onclick = () => {
        if (window.location.pathname.includes('achievements.html')) {
            showAchievementDetails(achievement.id);
        } else {
            window.location.href = 'achievements.html';
        }
        notification.remove();
    };
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// ========== DEBUG FUNCTIONS ==========
window.debugAchievements = function() {
    console.log('🔍 Achievement Debug Info:');
    console.log('Player Achievements:', playerAchievements);
    console.log('All Achievements Data:', ACHIEVEMENTS_DATA);
    
    ACHIEVEMENTS_DATA.forEach(achievement => {
        const progress = playerAchievements[achievement.id] || { progress: 0, completed: false };
        console.log(`${achievement.name}: ${progress.progress}/${achievement.target} (Completed: ${progress.completed})`);
    });
};

window.testTrainingAchievement = function() {
    console.log('🧪 Testing training achievement...');
    updateAchievementProgress('training_complete', 1);
};

window.forceCompleteTrainingNovice = function() {
    console.log('🚀 Forcing completion of Training Novice');
    playerAchievements['training_novice'] = {
        progress: 1,
        completed: true,
        completedAt: new Date().toISOString(),
        claimed: false
    };
    saveAchievementsProgress().then(() => {
        displayAchievements();
        showAchievementDetails('training_novice');
    });
};

// ========== PAGE INITIALIZATION ==========
if (window.location.pathname.includes('achievements.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🏆 Achievements page loaded, waiting for auth...');
        
        if (auth.currentUser) {
            console.log('User already logged in, initializing achievements');
            initializeAchievements();
        } else {
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('User authenticated, initializing achievements');
                    initializeAchievements();
                } else {
                    console.log('No user logged in');
                }
            });
        }
    });
}

// Also initialize achievement tracking on other pages
if (!window.location.pathname.includes('achievements.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('🏆 Initializing achievement tracking for other pages');
                loadPlayerAchievements().then(() => {
                    startAchievementTracking();
                });
            }
        });
    });
}

// ========== ONBOARDING TUTORIAL SYSTEM ==========

class OnboardingTutorial {
    constructor() {
        this.currentSlide = 1;
        this.totalSlides = 8;
        this.debugMode = false;
        this.initialized = false;
        this.userChecked = false;
        this.init();
    }

    init() {
        console.log('🚀 OnboardingTutorial initialized');
        this.setupEventListeners();
        
        // Only add tutorial button on index page
        if (this.isOnIndexPage()) {
            this.addTutorialButton();
        }
        
        if (auth.currentUser) {
            this.waitForUserData();
        } else {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user && !this.initialized) {
                    this.initialized = true;
                    this.waitForUserData();
                    unsubscribe();
                }
            });
        }
    }

    // Check if we're on the index page
    isOnIndexPage() {
        return window.location.pathname.includes('index.html') || 
               window.location.pathname.endsWith('/') ||
               document.getElementById('authForm') !== null;
    }

    async waitForUserData() {
        console.log('⏳ Waiting for user data to be ready...');
        
        setTimeout(async () => {
            await this.checkFirstTimeUser();
        }, 3000);
    }

    async checkFirstTimeUser() {
        const user = auth.currentUser;
        if (!user) {
            console.log('❌ No user for tutorial check');
            return;
        }

        console.log('🔍 Checking tutorial status for NEW user:', user.uid, user.email);
        
        if (this.userChecked) {
            console.log('✅ Already checked tutorial for this user');
            return;
        }

        this.userChecked = true;

        if (this.debugMode) {
            console.log('🐛 DEBUG MODE: Tutorial would show now');
            this.showTutorial();
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (!userDoc.exists()) {
                console.log('👶 Brand new user - no Firestore data exists yet');
                console.log('🎬 Showing tutorial for brand new user');
                setTimeout(() => {
                    this.showTutorial();
                }, 1000);
                return;
            }

            const userData = userDoc.data();
            const firebaseCompleted = userData.hasCompletedTutorial === true;
            const localStorageCompleted = localStorage.getItem('ignition_tutorial_completed') === 'true';

            console.log('📋 User tutorial status:', {
                firebase: firebaseCompleted,
                localStorage: localStorageCompleted,
                userExists: true
            });

            if (firebaseCompleted || localStorageCompleted) {
                console.log('🎯 Returning user - tutorial already completed');
                return;
            }

            console.log('👋 Existing user who needs tutorial');
            setTimeout(() => {
                this.showTutorial();
            }, 1000);

        } catch (error) {
            console.error('❌ Error checking user data:', error);
            console.log('🔄 Error checking user, showing tutorial to be safe');
            setTimeout(() => {
                this.showTutorial();
            }, 1000);
        }
    }

    addTutorialButton() {
        // Only add button on index page
        if (!this.isOnIndexPage()) {
            console.log('📄 Not on index page - skipping tutorial button');
            return;
        }

        if (document.getElementById('rewatch-tutorial-btn')) return;

        const tutorialBtn = document.createElement('button');
        tutorialBtn.id = 'rewatch-tutorial-btn';
        tutorialBtn.innerHTML = '📚 Tutorial';
        tutorialBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #00ff88, #00ffff);
            color: #1a1a2e;
            border: none;
            padding: 12px 18px;
            border-radius: 25px;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(0, 255, 255, 0.4);
            transition: all 0.3s ease;
        `;
        
        tutorialBtn.onmouseenter = () => {
            tutorialBtn.style.transform = 'scale(1.05) translateY(-2px)';
            tutorialBtn.style.boxShadow = '0 6px 25px rgba(0, 255, 255, 0.6)';
        };
        
        tutorialBtn.onmouseleave = () => {
            tutorialBtn.style.transform = 'scale(1) translateY(0)';
            tutorialBtn.style.boxShadow = '0 4px 20px rgba(0, 255, 255, 0.4)';
        };

        tutorialBtn.onclick = () => {
            console.log('🎬 User requested to re-watch tutorial');
            this.showTutorial();
        };

        tutorialBtn.title = 'Re-watch Tutorial';
        document.body.appendChild(tutorialBtn);
        console.log('✅ Tutorial button added to bottom right corner');
    }

    showTutorial() {
        console.log('🎬 Showing tutorial...');
        const modal = document.getElementById('onboarding-modal');
        if (!modal) {
            console.error('❌ Modal element not found!');
            return;
        }
        
        this.currentSlide = 1;
        this.updateSlides();
        this.updateProgress();
        
        const dontShowAgain = document.getElementById('dont-show-again');
        if (dontShowAgain) {
            dontShowAgain.checked = false;
        }
        
        modal.style.display = 'block';
        console.log('✅ Tutorial visible - Slide', this.currentSlide);
    }

    hideTutorial() {
        const dontShowAgain = document.getElementById('dont-show-again');
        const shouldSavePreference = dontShowAgain && dontShowAgain.checked;
        
        console.log('🚫 Hiding tutorial, save preference:', shouldSavePreference);
        
        if (shouldSavePreference) {
            this.markTutorialCompleted();
        } else {
            console.log('💡 Tutorial closed - will show on manual request');
        }
        
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
            modal.style.display = 'none';
        }
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
        document.querySelectorAll('.tutorial-slide').forEach(slide => {
            slide.classList.remove('active');
        });

        const currentSlide = document.querySelector(`[data-slide="${this.currentSlide}"]`);
        if (currentSlide) {
            currentSlide.classList.add('active');
        }

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
        const startBtn = document.getElementById('start-racing-btn');

        if (prevBtn) {
            prevBtn.disabled = this.currentSlide === 1;
            prevBtn.style.display = this.currentSlide === 1 ? 'none' : 'block';
        }

        if (nextBtn) {
            if (this.currentSlide === this.totalSlides) {
                nextBtn.style.display = 'none';
            } else {
                nextBtn.style.display = 'block';
            }
        }

        if (skipBtn) {
            skipBtn.style.display = this.currentSlide === this.totalSlides ? 'none' : 'block';
        }

        if (startBtn) {
            startBtn.style.display = this.currentSlide === this.totalSlides ? 'block' : 'none';
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up tutorial event listeners...');
        
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
                this.hideTutorial();
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
                    this.hideTutorial();
                }
            }
        });

        console.log('✅ Event listeners setup complete');
    }

    markTutorialCompleted() {
        const user = auth.currentUser;
        console.log('💾 MARKING TUTORIAL AS COMPLETED for user:', user?.uid);
        
        localStorage.setItem('ignition_tutorial_completed', 'true');
        localStorage.setItem('ignition_tutorial_timestamp', Date.now().toString());
        
        console.log('✅ Saved to localStorage - tutorial will not show automatically');

        this.saveTutorialToFirebase();
    }

    async saveTutorialToFirebase() {
        const user = auth.currentUser;
        if (!user) {
            console.log('👤 No user logged in, skipping Firebase save');
            return;
        }

        try {
            console.log('🔥 Saving tutorial completion to Firebase for user:', user.uid);
            await setDoc(doc(db, "users", user.uid), {
                hasCompletedTutorial: true,
                tutorialCompletedAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            }, { merge: true });
            console.log('✅ Successfully saved to Firebase');
        } catch (error) {
            console.error('❌ Error saving tutorial to Firebase:', error);
        }
    }

    // Debug methods
    resetTutorial() {
        localStorage.removeItem('ignition_tutorial_completed');
        localStorage.removeItem('ignition_tutorial_timestamp');
        console.log('🔄 Tutorial reset - will show automatically on next page load');
    }

    showTutorialManually() {
        console.log('🐛 Manual tutorial trigger');
        this.showTutorial();
    }
}

// Initialize tutorial and expose for debugging
let onboardingTutorial;
document.addEventListener('DOMContentLoaded', () => {
    onboardingTutorial = new OnboardingTutorial();
    
    // Expose to global for easy console access
    window.debugTutorial = onboardingTutorial;
    
    // Add debug commands
    window.tutorialDebug = {
        checkStatus: function() {
            console.log('=== TUTORIAL DEBUG ===');
            const user = auth.currentUser;
            console.log('User:', user?.uid, user?.email);
            console.log('localStorage:', localStorage.getItem('ignition_tutorial_completed'));
            console.log('timestamp:', localStorage.getItem('ignition_tutorial_timestamp'));
            
            if (user) {
                getDoc(doc(db, "users", user.uid)).then(doc => {
                    if (doc.exists()) {
                        const data = doc.data();
                        console.log('Firebase user exists:', true);
                        console.log('Firebase hasCompletedTutorial:', data.hasCompletedTutorial);
                        console.log('Firebase user created:', data.createdAt);
                    } else {
                        console.log('Firebase user exists: FALSE - Brand new user!');
                    }
                });
            }
        },
        
        resetForCurrentUser: function() {
            const user = auth.currentUser;
            if (!user) {
                console.log('❌ No user logged in');
                return;
            }
            
            localStorage.removeItem('ignition_tutorial_completed');
            localStorage.removeItem('ignition_tutorial_timestamp');
            
            setDoc(doc(db, "users", user.uid), {
                hasCompletedTutorial: false,
                tutorialCompletedAt: null
            }, { merge: true }).then(() => {
                console.log('🔄 Tutorial reset for current user:', user.uid);
                console.log('🔁 Refresh the page to see tutorial');
            });
        },
        
        forceShow: function() {
            window.onboardingTutorial.showTutorial();
        }
    };

    // Add debug button to page (remove in production)
    if (onboardingTutorial.debugMode) {
        const debugBtn = document.createElement('button');
        debugBtn.innerHTML = '🔧 Show Tutorial';
        debugBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #00ff88, #00ffff);
            color: #1a1a2e;
            border: none;
            padding: 12px 18px;
            border-radius: 25px;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(0, 255, 255, 0.4);
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
• Click the "📚 Tutorial" button in bottom-right to re-watch tutorial
• tutorialDebug.checkStatus() - Check current user's tutorial status
• tutorialDebug.resetForCurrentUser() - Reset tutorial for current user
• tutorialDebug.forceShow() - Force show tutorial
• debugTutorial.showTutorialManually() - Show tutorial now
• debugTutorial.resetTutorial() - Reset completion status
`);



// ========== APPLICATION INITIALIZATION ==========
function initializePage() {
    const path = window.location.pathname;
    if (path.includes('garage.html')) initializeGarage();
    else if (path.includes('shop.html')) initializeShop();
    else if (path.includes('rankings.html')) {
        initializeRankings();
        initializePlayerProfilesSystem(); 
    }
    else if (path.includes('training.html')) initializeTraining();
    else if (document.getElementById('inventory-grid')) initializeInventory();

     // Initialize daily challenges
    initializeDailyChallenges();

    // Load challenges with error handling
    setTimeout(() => {
        loadDailyChallenges().catch(console.error);
        loadPVPChallenges().catch(console.error);
        safeUserChallengeCleanup().catch(console.error); // Use safe version
        checkPendingChallenges().catch(console.error);
    }, 1000);
    
    // Refresh challenges every 30 seconds
    setInterval(loadPVPChallenges, 30000);
     setInterval(safeUserChallengeCleanup, 60000); // Use safe version
     setInterval(checkPendingChallenges, 10000); 
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing application...");
    loadNavbar();    
     startNotificationChecker();
    
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
console.log('🔧 Initializing team system global variables...');
window.currentTeam = null;
window.teamMembers = [];
window.teamJoinRequests = [];
window.currentTeamsTab = 'my-team'; // Default tab

if (typeof currentTeam === 'undefined') window.currentTeam = null;
if (typeof teamMembers === 'undefined') window.teamMembers = [];
if (typeof teamJoinRequests === 'undefined') window.teamJoinRequests = [];
if (typeof currentTeamsTab === 'undefined') window.currentTeamsTab = 'my-team';

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
    
    /* Stat Bars Styles */
    .stat-bars {
        display: flex;
        width: 100%;
        height: 20px;
        background: rgba(0, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin: 5px 0;
    }
    
    .stat-bar-base {
        height: 100%;
        transition: width 0.5s ease-in-out;
    }
    
    .stat-bar-bonus {
        height: 100%;
        transition: width 0.5s ease-in-out;
    }
    
    .stat-bar-negative {
        height: 100%;
        transition: width 0.5s ease-in-out;
    }
    
    .stat-values {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: #88ffff;
        margin-top: 5px;
    }
    
    .base-value {
        color: #00ffff;
    }
    
    .bonus-value {
        color: #00ff88;
    }
    
    .total-value {
        color: #ffffff;
        font-weight: bold;
    }
`;
document.head.appendChild(style);