// Load shared header
async function loadHeader() {
    const response = await fetch('header.html');
    const headerHTML = await response.text();
    document.getElementById('header-container').innerHTML = headerHTML;

    // Update stats after loading header
    updateStatsDisplay();
}

// Load shared sidebar
async function loadSidebar() {
    const response = await fetch('sidebar.html');
    const sidebarHTML = await response.text();
    document.getElementById('sidebar-container').innerHTML = sidebarHTML;
}

async function fetchPlayerData() {
    const userId = auth.currentUser?.uid;
    if (!userId) return {};
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() : {};
}

// Update player data in Firestore
async function updatePlayerData(newData) {
    await db.collection('users').doc(playerId).update(newData);
}

// Update stats display
async function updateStatsDisplay() {
    const playerData = await fetchPlayerData();
    document.getElementById('gold-display').textContent = `Gold: ${playerData.gold}`;
    document.getElementById('xp-display').textContent = `XP: ${playerData.xp}`;
    document.getElementById('level-display').textContent = `Level: ${playerData.level}`;
    document.getElementById('fame-display').textContent = `Fame: ${playerData.fame}`;
    document.getElementById('diamonds-display').textContent = `Fame: ${playerData.diamonds}`;
    document.getElementById('condition-display').textContent = `Fame: ${playerData.condition}`;
    document.getElementById('stats-display').textContent = `Fame: ${playerData.stats}`;
    document.getElementById('cooldown-display').textContent = `Fame: ${playerData.cooldown}`;
}
