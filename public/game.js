// game.js - UPDATED TOP SECTION
let player = null; // Will be loaded from Firebase
let isLoggedIn = false;
let currentSection = 'home';

// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in (you'll implement auth later)
  const userId = await checkAuthStatus(); // You'll need to implement this
  
  if (userId) {
    player = await getPlayerData(userId);
    isLoggedIn = true;
    updatePlayerGold();
  }
    navigateTo('home');
  
});
  

function navigateTo(section) {
  // Hide the content initially
  document.getElementById('content').style.display = 'none';
  document.body.classList.remove('overview-background');
  document.getElementById('market').style.display = 'none';
  document.getElementById('messages').style.display = 'none';
  document.getElementById('content').innerHTML = '';

  // Clear item container to reset previous content
  document.getElementById('itemContainer').innerHTML = '';

  if (section === 'shop') {
      // Display the shop options (sub-sections)
      document.getElementById('content').innerHTML = `
          <h2>Shop</h2>
          <button onclick="navigateTo('cars')">Cars</button>
          <button onclick="navigateTo('engines')">Engines</button>
          <button onclick="navigateTo('tires')">Tires</button>
          <button onclick="navigateTo('suspensions')">Suspensions</button>
          <button onclick="navigateTo('turbo')">Turbo</button>
          <button onclick="navigateTo('paintwork')">Paintwork</button>
          <button onclick="navigateTo('seats')">Seats</button>
          <button onclick="navigateTo('vipStore')">VIP Store</button>

      `;
      displayShopkeeperDialogue(); // Display shopkeeper dialogue here
  } 
  else if (section === 'vipStore') {
    // Show the VIP Store (Diamonds Purchase)
    document.getElementById('content').innerHTML = `
    
    `;}
  else {
      // Display the content for other sections directly
      if (section === 'cars') {
          document.getElementById('content').innerHTML = '<h2>Cars</h2>';
          displayCarItems();  // Show the car items
      } else if (section === 'engines') {
        document.getElementById('content').innerHTML = '<h2>Engines</h2>';
        displayEngineItems();  // This will show the engine items in the general container
      } else if (section === 'tires') {
          document.getElementById('content').innerHTML = '<h2>Tires</h2>';
          displayTireItems();  // Show the tire items
      } else if (section === 'suspensions') {
          document.getElementById('content').innerHTML = '<h2>Suspensions</h2>';
          displaySuspensionItems();  // Show the suspension items
      } else if (section === 'turbo') {
          document.getElementById('content').innerHTML = '<h2>Turbo</h2>';
          displayTurboItems();  // Show the turbo items
      } else if (section === 'paintwork') {
          document.getElementById('content').innerHTML = '<h2>Paintwork</h2>';
          displayPaintworkItems();  // Show the paintwork items
      } else if (section === 'seats') {
          document.getElementById('content').innerHTML = '<h2>Seats</h2>';
          displaySeatItems();  // Show the seat items
      } else if (section === 'market') {
          document.getElementById('market').style.display = 'block';
      } else if (section === 'training') {
          displayTraining();  // Display training section
      } else if (section === 'rest') {
          document.getElementById('rest').style.display = 'block';
      } else if (section === 'garage') {
          updateGarageStats();  // Update garage stats
      } else if (section === 'home') {
          if (isLoggedIn) {
              document.getElementById('content').innerHTML = `
                  <h1>Welcome back!</h1>
                  <p>You are logged in. Choose a section from the navbar.</p>
                  <button onclick="signOut()">Sign Out</button>
              `;
          } else {
              document.getElementById('content').innerHTML = `
                  <h1>Welcome to Ignition Shift</h1>
                  <p>Your adventure begins here! Choose a section from the navbar.</p>
                  <div style="text-align: right;">
                      <button onclick="showLogin()">Login</button>
                      <button onclick="showSignup()">Sign Up</button>
                  </div>
              `;
          }
      } else if (section === 'overview') {
          displayOverview();  // Show the overview section
          document.body.classList.add('overview-background');
      } else if (section === 'messages') {
          document.getElementById('messages').style.display = 'block';
          displayMessages();  // Show messages
      }
  }

  // Display the content
  document.getElementById('content').style.display = 'block';

  // Purchase VIP Status
  function purchaseVIP() {
    if (player.diamonds >= vipCost) {
      player.diamonds -= vipCost;
      player.vipStatus = true;
      player.vipExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days from now
      updatePlayerData(player); // Save to database or localStorage
      alert("VIP Status activated!");
    } else {
      alert("Not enough diamonds!");
    }
  }

  
  function hideAds() {
    document.getElementById('ads').style.display = 'none';
  }
  
  function showAds() {
    document.getElementById('ads').style.display = 'block';
  }

  function getCooldownTime(action) {
    let cooldownTime = getBaseCooldownTime(action); // Base time for the action
    if (player.vipStatus && Date.now() < player.vipExpiry) {
      return cooldownTime / 1.5; // 1.5x faster for VIP players
    }
    return cooldownTime;
  }

    function generateVIPQuest() {
    if (player.vipStatus && Date.now() < player.vipExpiry) {
      // Check if it's a new day for a new quest
      const lastQuestDate = new Date(player.lastQuestDate);
      const today = new Date();
      if (lastQuestDate.toDateString() !== today.toDateString()) {
        // Generate a new quest for the day
        player.lastQuestDate = today.toISOString();
        player.vipQuest = generateRandomVIPQuest();
        alert("New VIP Quest available!");
      }
    }
  }

  
  function generateRandomVIPQuest() {
    // Create random quests, e.g., 'Train for 1 hour', 'Win 5 races', etc.
    return 'Complete training session for 1 hour';
  }

  // Reset the rest timer if needed
  if (section !== 'rest') {
      clearTimeout(restTimer);
      restTimer = null;
      document.getElementById('restHours').disabled = false;
  }

  // Remove login and signup buttons when not needed
  if (section !== 'home') {
      const loginButtons = document.querySelectorAll('button[onclick="showLogin()"], button[onclick="showSignup()"]');
      loginButtons.forEach(button => button.parentElement.remove());
  }

  // Hide messages if we're not in the messages section
  if (section !== 'messages') {
      document.getElementById('messages').style.display = 'none';
  }

  // Update the current section tracker
  currentSection = section;
}

// Fetch player data from database
function getPlayerData(playerId, callback) {
  const query = 'SELECT * FROM Players WHERE id = ?';
  database.query(query, [playerId], (err, result) => {
      if (err) throw err;
      callback(result[0]);  // Returning the first result (single player)
  });
}



//garage
function showGarage() {
  document.getElementById('garage').style.display = 'block';
  document.getElementById('market').style.display = 'none';
  // Populate inventory
  const inventoryList = document.getElementById('inventory-list');
  inventoryList.innerHTML = ''; // Clear existing inventory

  // Add items dynamically (example)
  playerInventory.forEach(item => {
      const listItem = document.createElement('li');
      listItem.textContent = item.name; // Assuming item has a name property
      inventoryList.appendChild(listItem);
  });
}
                  

// Function to show the custom alert at the bottom
function showCustomAlert(message) {
  const alertContainer = document.getElementById('custom-alert');
  const alertMessage = document.getElementById('alert-message');
  
  if (alertContainer && alertMessage) {
      alertMessage.innerText = message; // Set the message text
      alertContainer.style.display = 'block'; // Show the alert

      // Hide the alert after 4 seconds
      setTimeout(() => {
          alertContainer.style.display = 'none'; // Hide the alert after 4 seconds
      }, 4000);
  } else {
      console.error("Custom alert elements not found!");
  }
}

class Player {
  constructor(id, name) {
      this.id = id;    // Unique player ID (from database)
      this.name = name; // Player name
  }

  // Fetch player's base stats from the database
  async getBaseStats() {
      const query = `
          SELECT power, speed, handling, dexterity, accelaration, structure, luck 
          FROM in_game_stats 
          WHERE player_id = ?`;
      return this.queryDatabase(query, [this.id]);
  }

  // Fetch player's current inventory
async getInventory() {
  const query = `
      SELECT Items.*, player_inventory.quantity, player_inventory.equipped
      FROM player_inventory
      JOIN Items ON player_inventory.item_id = Items.id
      WHERE player_inventory.player_id = ?`;
  return this.queryDatabase(query, [this.id]);
}

async addItemToInventory(itemId, quantity = 1) {
  const queryCheck = `
      SELECT quantity 
      FROM player_inventory 
      WHERE player_id = ? AND item_id = ?`;
  const result = await this.queryDatabase(queryCheck, [this.id, itemId]);

  if (result.length > 0) {
      // Update quantity if item already exists
      const queryUpdate = `
          UPDATE player_inventory 
          SET quantity = quantity + ? 
          WHERE player_id = ? AND item_id = ?`;
      return this.queryDatabase(queryUpdate, [quantity, this.id, itemId]);
  } else {
      // Insert new item if it doesn't exist
      const queryInsert = `
          INSERT INTO player_inventory (player_id, item_id, quantity) 
          VALUES (?, ?, ?)`;
      return this.queryDatabase(queryInsert, [this.id, itemId, quantity]);
  }
}
async removeItemFromInventory(itemId, quantity = 1) {
  const queryCheck = `
      SELECT quantity 
      FROM player_inventory 
      WHERE player_id = ? AND item_id = ?`;
  const result = await this.queryDatabase(queryCheck, [this.id, itemId]);

  if (result.length > 0) {
      const currentQuantity = result[0].quantity;

      if (currentQuantity > quantity) {
          // Reduce quantity
          const queryUpdate = `
              UPDATE player_inventory 
              SET quantity = quantity - ? 
              WHERE player_id = ? AND item_id = ?`;
          return this.queryDatabase(queryUpdate, [quantity, this.id, itemId]);
      } else {
          // Delete item if quantity becomes 0 or less
          const queryDelete = `
              DELETE FROM player_inventory 
              WHERE player_id = ? AND item_id = ?`;
          return this.queryDatabase(queryDelete, [this.id, itemId]);
      }
  } else {
      throw new Error('Item not found in inventory.');
  }
}

async equipItem(itemId) {
  const queryEquip = `
      UPDATE player_inventory 
      SET equipped = TRUE 
      WHERE player_id = ? AND item_id = ?`;
  const queryUnequipOthers = `
      UPDATE player_inventory 
      SET equipped = FALSE 
      WHERE player_id = ? AND item_id != ?`;
  await this.queryDatabase(queryUnequipOthers, [this.id, itemId]); // Unequip others
  return this.queryDatabase(queryEquip, [this.id, itemId]); // Equip the selected item
}

async unequipItem(itemId) {
  const query = `
      UPDATE player_inventory 
      SET equipped = FALSE 
      WHERE player_id = ? AND item_id = ?`;
  return this.queryDatabase(query, [this.id, itemId]);
}

      // Update player's skill points
      async updateSkillPoints(newSkillPoints) {
        const query = `
            UPDATE Players 
            SET skill_points = ? 
            WHERE id = ?`;
        return this.queryDatabase(query, [newSkillPoints, this.id]);
    }

    // Add experience and handle level-up logic
    async addExperience(amount) {
        const queryGet = `
            SELECT experience, level 
            FROM Players 
            WHERE id = ?`;
        const result = await this.queryDatabase(queryGet, [this.id]);
        let { experience, level } = result[0];

        // Add new experience
        experience += amount;

        // Level-up logic: assume level-up threshold increases with each level
        let levelUpThreshold = level * 100; // Example threshold formula
        let levelsGained = 0;

        while (experience >= levelUpThreshold) {
            experience -= levelUpThreshold;
            level++;
            levelsGained++;
            levelUpThreshold = level * 100; // Recalculate for the new level
        }

        // Update database with new values
        const queryUpdate = `
            UPDATE Players 
            SET experience = ?, level = ? 
            WHERE id = ?`;
        await this.queryDatabase(queryUpdate, [experience, level, this.id]);

        return levelsGained; // Return levels gained for feedback
    }

    // Update fame (can be gained or lost)
    async updateFame(amount) {
        const query = `
            UPDATE Players 
            SET fame = fame + ? 
            WHERE id = ?`;
        return this.queryDatabase(query, [amount, this.id]);
    }

    // Fetch current fame
    async getFame() {
        const query = `
            SELECT fame 
            FROM Players 
            WHERE id = ?`;
        return this.queryDatabase(query, [this.id]);
    }  

  // Fetch gold and diamonds balance
    async getCurrency() {
      const query = `
          SELECT gold, diamonds 
          FROM Players 
          WHERE id = ?`;
      return this.queryDatabase(query, [this.id]);
  }

  // Update player's currency
  async updateCurrency(gold, diamonds) {
      const query = `
          UPDATE Players 
          SET gold = ?, diamonds = ? 
          WHERE id = ?`;
      return this.queryDatabase(query, [gold, diamonds, this.id]);
  }

  // Utility to execute database queries
  queryDatabase(query, params) {
      return new Promise((resolve, reject) => {
          database.query(query, params, (err, results) => {
              if (err) reject(err);
              else resolve(results);
          });
      });
  }
}

player.getBaseStats().then(stats => {
  console.log('Player Stats:', stats);
});

player.getInventory().then(inventory => {
  console.log('Player Inventory:', inventory);
});

player.updateCurrency(2000, 10).then(() => {
  console.log('Currency updated successfully!');
});

player.addExperience(250).then(levelsGained => {
  if (levelsGained > 0) {
      console.log(`Player leveled up ${levelsGained} time(s)!`);
  } else {
      console.log('Experience added, no level-up.');
  }
});

player.updateFame(15).then(() => {
  console.log('Fame updated successfully!');
});

player.getFame().then(fame => {
  console.log('Current Fame:', fame);
});

player.getInventory().then(inventory => {
  console.log('Player Inventory:', inventory);
});

player.addItemToInventory(3, 5).then(() => {
  console.log('Added item to inventory.');
});

player.removeItemFromInventory(3, 2).then(() => {
  console.log('Removed item from inventory.');
}).catch(err => {
  console.error(err.message);
});

player.equipItem(3).then(() => {
  console.log('Item equipped.');
});







// Update the selectShopSubOption function to display items based on the selected option
function selectShopSubOption(option) {
  currentShopSubOption = option; // Track selected option
  const itemContainer = document.getElementById('itemContainer'); // Correct target

  // Clear existing content
  itemContainer.innerHTML = ''; 
  itemContainer.style.display = 'none'; // Hide initially

  // Check if the selected option exists in the shopItems object
  if (shopItems[option]) {
    console.log('Items for selected option:', shopItems[option]);  // Debugging

    itemContainer.style.display = 'block'; // Make it visible

    const items = shopItems[option];

    if (items && items.length > 0) {
      const categoryHTML = `
        <h2>${option.charAt(0).toUpperCase() + option.slice(1)} Items</h2>
        <ul>
          ${items.map(item => `
            <li>
              <img src="${item.image}" alt="${item.name}" style="width: 150px; height: auto;"/>
              <h3>${item.name}</h3>
              <p>Price: ${item.price} ${item.currency === 'diamonds' ? '💎 Diamonds' : 'Gold'}</p>
              <p>${item.description}</p>
              <strong>Effects:</strong>
              <ul>
                ${Object.entries(item.stats || {})
                  .map(([stat, value]) => `
                    <li style="color: ${value >= 0 ? 'green' : 'red'};">
                      ${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${value}
                    </li>
                  `)
                  .join('')}
              </ul>
              <button onclick="purchaseItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">Buy</button>
            </li>
          `).join('')}
        </ul>
        <button onclick="displayShopItems()">Back to Shop Categories</button>
        <button onclick="navigateTo('garage')">Go back to Garage</button>
      `;
      itemContainer.innerHTML = categoryHTML;
    } else {
      console.error(`No items found for ${option}`);
    }
  } else {
    console.error(`No items found for ${option}`);
  }
}

function displayPlayerInventory() {
  const inventoryList = document.getElementById('inventory-list');
  inventoryList.innerHTML = ''; // Clear the inventory list first
  
  // Check if the player has any items in their inventory
  if (playerInventory.length === 0) {
    inventoryList.innerHTML = '<li>No items to sell</li>';
    return;
  }
  
  // Loop through the player's inventory and display each item
  playerInventory.forEach(item => {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <span>${item.name} (Price: ${item.price} Gold)</span>
      <button onclick="sellToMarket(${JSON.stringify(item).replace(/"/g, '&quot;')})">Sell</button>
    `;
    inventoryList.appendChild(listItem);
  });
}


// Function to display all shop categories
function displayShopItems() {
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = '';  // Clear any existing content

  // Add the shop header
  contentDiv.innerHTML = `
    <h1>Shop Categories</h1>
    <p>Select a category to view items:</p>
  `;

  // Iterate over each category in the shopItems object
  for (const category in shopItems) {
    if (shopItems.hasOwnProperty(category)) {
      const categorySection = document.createElement('div');
      categorySection.classList.add('category-section');

      // Category Header
      const categoryHeader = document.createElement('h3');
      categoryHeader.textContent = category.charAt(0).toUpperCase() + category.slice(1);  // Capitalize category name
      categorySection.appendChild(categoryHeader);

      // Display category image (if it exists in the category object)
      if (shopItems[category][0] && shopItems[category][0].image) {
        const categoryImage = document.createElement('img');
        categoryImage.src = shopItems[category][0].image; // Use the first item’s image as the category image
        categoryImage.alt = `${category} image`;
        categoryImage.style.width = '150px';  // Adjust image size as needed
        categorySection.appendChild(categoryImage);
      }

      // Add a button to view the items in the category
      const viewItemsButton = document.createElement('button');
      viewItemsButton.textContent = `View ${category.charAt(0).toUpperCase() + category.slice(1)} Items`;
      viewItemsButton.onclick = function () {
        displayCategory(category);  // Show the items in this category
      };

      categorySection.appendChild(viewItemsButton);  // Add button to the category section
      contentDiv.appendChild(categorySection);  // Add the category section to the content div
    }
  }
}


// Function to display items based on the selected category
function displayCategory(category) {
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = ''; // Clear existing content

  // Get items for the selected category
  const items = shopItems[category];  // Get items for the selected category (e.g., shopItems.cars)

  // Ensure items exist for the category
  if (!items) {
    contentDiv.innerHTML = `<p>No items found in this category.</p>`;
    return;
  }

  // Create the HTML content for the selected category
  const categoryHTML = `
    <h2>${category.charAt(0).toUpperCase() + category.slice(1)} Items</h2>
    <ul>
      ${items.map(item => `
        <li>
          <img src="${item.image}" alt="${item.name}" style="width: 150px; height: auto;"/>
          <h3>${item.name}</h3>
          <p>Price: ${item.price} ${item.currency === 'diamonds' ? '💎 Diamonds' : 'Gold'}</p>
          <p>${item.description}</p>
          <strong>Effects:</strong>
          <ul>
            ${Object.entries(item.stats)
              .map(([stat, value]) => `
                <li style="color: ${value >= 0 ? 'green' : 'red'};">
                  ${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${value}
                </li>
              `)
              .join('')}
          </ul>
          <button onclick="purchaseItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">Buy</button>
        </li>
      `).join('')}
    </ul>
    <button onclick="displayShopItems()">Back to Shop Categories</button>
    <button onclick="navigateTo('garage')">Go back to Garage</button>
  `;

  contentDiv.innerHTML = categoryHTML;  // Display the selected category items
}

// Function to display the selected category's items
function displayItems(category) {
  const items = shopItems[category];
  const itemContainer = document.getElementById('itemContainer');
  itemContainer.innerHTML = ''; // Clear any existing items

  items.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.classList.add('shopItem');
    itemElement.innerHTML = `
      <h3>${item.name}</h3>
      <img src="${item.image}" alt="${item.name}">
      <p>${item.description}</p>
      <p><strong>Price: ${item.currency ? item.currency : 'Gold'} ${item.price}</strong></p>
      <p>Stats: Speed: ${item.stats.speed}, Power: ${item.stats.power}, Dexterity: ${item.stats.dexterity}, Luck: ${item.stats.luck}, Endurance: ${item.stats.endurance}</p>
      <button onclick="purchaseItem('${category}', '${item.name}')">Buy</button>
    `;
    itemContainer.appendChild(itemElement);
  });
}


// Function to handle purchasing an item (simplified for now)
function purchaseItem(item) {
  console.log("Purchasing item:", item);
  alert(`Purchased ${item.name} for ${item.price} ${item.currency === 'diamonds' ? '💎 Diamonds' : 'Gold'}!`);
}




// Call displayShopItems when the page loads to show the shop categories
window.onload = function() {
  displayShopItems();
};


// Function to purchase an item
let isCarSectionVisible = false; // Global state for the car section visibility

// UPDATED purchaseItem function for Firebase
async function purchaseItem(item) {
  if (!player) {
    alert('Please log in to make purchases');
    return;
  }

  try {
    let canPurchase = false;
    let cost = { gold: 0, diamonds: 0 };

    // Check dual currency requirement
    if (item.dualCurrencyRequirement) {
      const { goldCost, diamondCost } = item.dualCurrencyRequirement;
      cost = { gold: goldCost, diamonds: diamondCost };
      canPurchase = player.gold >= goldCost && player.diamonds >= diamondCost;
    } else {
      const currency = item.currency || 'gold';
      const price = item.price || 0;
      cost[currency] = price;
      canPurchase = player[currency] >= price;
    }

    if (canPurchase) {
      // Update player currency
      const updates = {
        gold: player.gold - cost.gold,
        diamonds: player.diamonds - cost.diamonds,
        ownedItems: arrayUnion({
          id: item.id,
          name: item.name,
          type: item.item_type || 'car',
          purchasedAt: new Date().toISOString()
        })
      };

      await updatePlayerData(player.id, updates);
      
      // Update local player object
      player.gold = updates.gold;
      player.diamonds = updates.diamonds;
      player.ownedItems.push({
        id: item.id,
        name: item.name,
        type: item.item_type || 'car'
      });

      alert(`You purchased ${item.name}!`);
      updatePlayerGold();
      updateInventoryDisplay();
      
    } else {
      alert('Not enough currency!');
    }
  } catch (error) {
    console.error('Purchase failed:', error);
    alert('Purchase failed. Please try again.');
  }
}

// Helper function to hide the car section
function hideCarSection() {
    const carSection = document.getElementById("car-section");
    if (carSection) {
        carSection.style.display = "none";
    }

    // Mark car section as hidden in the global state
    isCarSectionVisible = false;

    // Explicitly hide the car section in the garage as well
    const garageCarSection = document.getElementById("garage-car-section");
    if (garageCarSection) {
        garageCarSection.style.display = "none";
    }
}

// Helper function to reset the shop view and hide unnecessary sections
function resetShopView() {
    const shopSections = document.querySelectorAll(".shop-section");
    shopSections.forEach(section => {
        section.style.display = "none"; // Hide all shop sections
    });
}

// Function to show the car section in the shop page
function showCarSection() {
    const carSection = document.getElementById("car-section");
    if (carSection && !isCarSectionVisible) {
        carSection.style.display = "block";
        isCarSectionVisible = true;
    }
}

// Function to switch between pages, ensuring the car section is hidden
function switchPage(page) {
    // Hide car section globally before page change
    hideCarSection();

    // Handle page-specific logic
    if (page === 'garage') {
        // Show garage-related elements
        const garageContainer = document.getElementById('garage-container');
        if (garageContainer) {
            garageContainer.style.display = "block";
        }
        // Make sure car section is hidden in the garage
        const garageCarSection = document.getElementById('garage-car-section');
        if (garageCarSection) {
            garageCarSection.style.display = "none"; // Hide car section in garage
        }
    } else if (page === 'shop') {
        // Show shop-related elements
        const shopContainer = document.getElementById('shop-container');
        if (shopContainer) {
            shopContainer.style.display = "block";
        }
    }
    // Add similar logic for other pages...
}



// Function to check the page and display the inventory
function displayInventoryIfMarketPage() {
  // Only show inventory on the market page or relevant pages
  if (window.location.pathname.includes('market.html')) {
      updateInventoryDisplay(); // Call the function that shows the inventory
  }
}

// Call this function on page load
window.onload = function() {
  displayInventoryIfMarketPage(); // Check if we're on the market page
};

// Function to display the player's inventory on the market page
function updateInventoryDisplay() {
  const inventoryList = document.getElementById('inventory-list');
  inventoryList.innerHTML = '';  // Clear the existing list

  if (player.ownedItems.length === 0) {
    inventoryList.innerHTML = '<li>No items in your inventory.</li>';
  } else {
    player.ownedItems.forEach(item => {
      const listItem = document.createElement('li');
      listItem.innerHTML = `
        <span>${item.name} (Price: ${item.price} ${item.currency})</span>
        <button onclick="sellToMarket(${JSON.stringify(item).replace(/"/g, '&quot;')})">Sell</button>
      `;
      inventoryList.appendChild(listItem);
    });
  }
}

// Function to populate the Overview page with player data
function populateOverview() {
  // Set Car Info
  const carImage = document.getElementById('carImage');
  const carDetails = document.getElementById('carDetails');
  carImage.src = player.car.image;
  carDetails.textContent = `Car: ${player.car.name} - Speed: ${player.car.speed}, Power: ${player.car.power}`;

  // Set Stats Info
  const statsList = document.getElementById('statsList');
  statsList.innerHTML = ''; // Clear any previous stats
  for (const stat in player.stats) {
      const statItem = document.createElement('li');
      statItem.textContent = `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${player.stats[stat]}`;
      statsList.appendChild(statItem);
  }

  // Set Inventory Info
  const inventoryItems = document.getElementById('inventoryItems');
  inventoryItems.innerHTML = ''; // Clear previous inventory items
  player.inventory.forEach(item => {
      const inventoryItem = document.createElement('div');
      inventoryItem.classList.add('inventory-item');
      inventoryItem.innerHTML = `
          <img src="${item.image}" alt="${item.name}" class="inventory-img">
          <p>${item.name}</p>
      `;
      inventoryItems.appendChild(inventoryItem);
  });
}

// Call the function when the page is loaded
window.onload = populateOverview;


// Function to update the player's gold display
function updatePlayerGold() {
  const goldDisplay = document.getElementById('playerGold');
  const diamondDisplay = document.getElementById('playerDiamonds');
  
  goldDisplay.textContent = `Gold: ${player.gold}`;
  diamondDisplay.textContent = `Diamonds: ${player.diamonds}`;
}
// Function to display the shopkeeper's dialogue
function displayShopkeeperDialogue() {
  const dialogueText = document.getElementById('dialogue-text');
  const shopkeeperDialogue = document.getElementById('shopkeeper-dialogue');
  dialogueText.textContent = "Welcome to my shop! What would you like to buy today?";
  shopkeeperDialogue.style.display = 'block'; // Show the dialogue box

  // Hide the dialogue after 4 seconds
  setTimeout(() => {
      shopkeeperDialogue.style.display = 'none';
  }, 4000);
}



// Function to start resting
function startRest() {
  const hours = parseInt(document.getElementById('restHours').value);
  if (isNaN(hours) || hours < 1 || hours > 8) {
      alert("Please choose a valid number of hours (1 to 8).");
      return;
  }

  // Check if a rest timer is already active
  if (restTimer) {
      alert("You cannot rest again until the current rest period ends.");
      return;
  }

  // Start the rest timer
  restTimer = setTimeout(() => {
    const xpGained = hours * 10 * player.level; // XP gain calculation
    const goldGained = hours * 5 * player.level; // Gold gain calculation
    player.gainXP(xpGained);
    player.gainGold(goldGained);
    alert(`Rest complete! Gained ${xpGained} XP and ${goldGained} gold.`);
    updateGarageStats();
    updatePlayerGold();
 }, hours * 1000 * 60 * 60); // Correcting for hours to milliseconds
}

// Calculate XP gained from resting
function calculateRestXPGain(hours) {
  const xpBase = 15; // Base XP per hour of rest
  return xpBase * hours + (player.level * 5);
}

// Calculate gold gained from resting
function calculateRestGoldGain(hours) {
  const goldBase = 10; // Base gold per hour of rest
  return goldBase * hours + (player.level * 2);
}

// State variable to track the current shop sub-option
let currentShopSubOption = null;
// Function to start resting
let restTimer = null; // Variable to track the rest timer




function showLogin() {
  document.getElementById('content').innerHTML = `
      <h2>Login</h2>
      <form onsubmit="handleLogin(event)">
          <input type="text" placeholder="Username" required>
          <input type="password" placeholder="Password" required>
          <button type="submit">Login</button>
      </form>
  `;
}

function showSignup() {
  document.getElementById('content').innerHTML = `
      <h2>Sign Up</h2>
      <form onsubmit="handleSignup(event)">
          <input type="text" placeholder="Username" required>
          <input type="password" placeholder="Password" required>
          <button type="submit">Sign Up</button>
      </form>
  `;
}

function handleLogin(event) {
  event.preventDefault();
  // Perform login logic here (validation, setting isLoggedIn, etc.)
  isLoggedIn = true; // Set the logged-in state
  alert('You have successfully logged in.');
  navigateTo('home'); // Redirect to the home page
}

function handleSignup(event) {
  event.preventDefault();
  // Perform signup logic here (validation, saving user, etc.)
  isLoggedIn = true; // Set the logged-in state
  alert('Your account has been created successfully. You are now logged in.');
  navigateTo('home'); // Redirect to the home page
}


function displayOverview() {
  const contentDiv = document.getElementById('content');
  
  // Clear the content area
  contentDiv.innerHTML = ''; 

  // Add the overview background class
  contentDiv.className = 'overview-background'; 

  // Add simple overview content
  contentDiv.innerHTML = `
    <h1>Overview Section</h1>
    <p>Welcome to the overview of your racing game. Here you can get a quick summary of your progress and stats!</p>
    <button onclick="navigateTo('home')">Back to Home</button>
  `;
}

const carContainer = document.getElementById('carContainer');


// UPDATED shop display functions
async function displayCarItems() {
  const itemContainer = document.getElementById('itemContainer'); 
  if (!itemContainer) {
    console.error("Container 'itemContainer' not found!");
    return;
  }

  itemContainer.innerHTML = '<p>Loading cars...</p>';
  itemContainer.style.display = 'block';

  try {
    const cars = await loadShopItems('cars');
    
    if (cars.length === 0) {
      itemContainer.innerHTML = '<p>No cars available</p>';
      return;
    }

    const carHTML = cars.map(item => `
      <div class="car-item">
        <img src="${item.image_url || '/assets/cars/default.jpg'}" alt="${item.name}" style="width: 150px; height: auto;" />
        <h3>${item.name}</h3>
        <p>Price: ${item.price_gold || item.price} Gold ${item.price_diamonds ? `+ ${item.price_diamonds} 💎` : ''}</p>
        <p>Speed: ${item.speed || 0} | Power: ${item.power || 0}</p>
        <p>Level Required: ${item.minimumRequiredLevel || 1}</p>
        <button onclick="purchaseItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">Buy</button>
      </div>
    `).join('');

    itemContainer.innerHTML = carHTML;
  } catch (error) {
    console.error('Error loading cars:', error);
    itemContainer.innerHTML = '<p>Error loading cars</p>';
  }
}

// Add an event listener for the "cars" button to call displayCarItems
document.getElementById('carsButton').addEventListener('click', displayCarItems);

// Function to display the market feature (currently under development)
// Function to display the market
function displayMarket() {
  // Hide other pages (Garage, Shop, etc.) before showing the market
  document.getElementById('garagePage').style.display = 'none';
  document.getElementById('shopPage').style.display = 'none';

  // Show the market page
  document.getElementById('marketPage').style.display = 'block';

  // Now, load the items into the market
  displayMarketItems();
}

function displayMarketItems() {
  const marketList = document.getElementById('market-items');
  marketList.innerHTML = ''; // Clear the market list first
  
  if (marketItems.length === 0) {
    marketList.innerHTML = '<li>No items available in the market</li>';
    return;
  }
  
  marketItems.forEach(item => {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <span>${item.name} (Price: ${item.price} Gold)</span>
    `;
    marketList.appendChild(listItem);
  });
}
window.onload = function() {
  displayPlayerInventory();  // Display player's inventory
  displayMarketItems();  // Display market items
};


// Function to display the player's inventory
function updateInventoryDisplay() {
  const inventoryContainer = document.getElementById('inventory-list');
  inventoryContainer.innerHTML = '';  // Clear any previous content

  if (player.ownedItems.length === 0) {
    inventoryContainer.innerHTML = '<li>No items in your inventory.</li>';
  } else {
    player.ownedItems.forEach(item => {
      const listItem = document.createElement('li');
      listItem.innerHTML = `
        <span>${item.name} (Price: ${item.price} ${item.currency})</span>
        <button onclick="sellToMarket(${JSON.stringify(item).replace(/"/g, '&quot;')})">Sell</button>
      `;
      inventoryContainer.appendChild(listItem);
    });
  }
}

// Call this function when the page loads
window.onload = function() {
  displayInventoryIfOnRelevantPage();
};


// Call the function when the page is loaded to decide whether to show inventory
window.onload = function() {
  displayInventoryIfOnRelevantPage(); // Check if we are on garage or market pages
};

document.getElementById('marketButton').addEventListener('click', displayMarket);

// Function to upgrade a specific stat
function upgradeStat(stat) {
  if (player.skillPoints > 0) {
      player.spendSkillPoint(stat);
      alert(`${stat.charAt(0).toUpperCase() + stat.slice(1)} upgraded to ${player.baseStats[stat]}.`);
      updateGarageStats(); // Refresh stats display after upgrade
  } else {
      alert("Not enough skill points to upgrade.");
  }
}

function displayCars() {
  const carContainer = document.getElementById('carContainer');
  carContainer.innerHTML = ''; // Clear previous content

  // Loop through the car items and display them
  if (Array.isArray(shopItems.cars)) {
      shopItems.cars.forEach(car => {
          const carDiv = document.createElement('div');
          carDiv.className = 'car-item';

          const name = document.createElement('h3');
          name.textContent = car.name;

          const stats = document.createElement('p');
          stats.textContent = `Stats: Speed: ${car.stats.speed}, Power: ${car.stats.power}, Handling: ${car.stats.handling}`;

          const price = document.createElement('p');
          price.textContent = `Price: $${car.price}`;

          carDiv.appendChild(name);
          carDiv.appendChild(stats);
          carDiv.appendChild(price);
          carContainer.appendChild(carDiv);
      });
  } else {
      console.error("shopItems.cars is not an array or is undefined.");
  }
}


function displayEngineItems() {
  const itemContainer = document.getElementById('itemContainer'); // The container for the items

  if (!itemContainer) {
    console.error("Item container not found!");
    return;  // Exit the function if the item container doesn't exist
  }

  // Clear the container and ensure it’s visible
  itemContainer.innerHTML = '';
  itemContainer.style.display = 'block'; 

  // Check if engineItems is populated
  console.log("Engine Items:", engineItems);

  if (engineItems && engineItems.length > 0) {
    const engineHTML = engineItems.map(item => `
      <div class="engine-item">
        <img src="${item.image}" alt="${item.name}" style="width: 150px; height: auto;" />
        <h3>${item.name}</h3>
        <p>Price: ${item.price} Gold</p>
        <p>Speed: ${item.stats.speed}</p>
        <p>Handling: ${item.stats.handling}</p>
        <button onclick="purchaseItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">Buy</button>
      </div>
    `).join('');

    // Inject generated HTML into the container
    itemContainer.innerHTML = engineHTML;
  } else {
    console.log("No engine items available!");
  }
}


// Function to update player's gold display
function updatePlayerGold() {
  const goldDisplay = document.getElementById('goldDisplay');
  if (goldDisplay) {
      goldDisplay.textContent = `Gold: ${player.gold}`;
  }
}


function selectShopSubOption(option) {
  currentShopSubOption = option; // Track selected option
  const carContainer = document.getElementById('carContainer');

  // Clear and reset the car container display
  carContainer.innerHTML = ''; // Clear existing content
  carContainer.style.display = 'none'; // Hide the container initially

  if (option === 'cars') {
      carContainer.style.display = 'block'; // Show the car container
      displayCars(); // Load cars
  }
}

// EventTypes.js
const EventTypes = {
  RACE: 'race',
  TRAINING: 'training',
  REST: 'rest'
};

module.exports = EventTypes;


 // Store for player messages
 let messageList = [];  // Renamed from 'message' to 'messageList'
 let messageId = 1;

 // Function to send a system-generated message (for training/rest results)
 function sendSystemMessage(content) {
     const systemMessage = new Message('System', content, messageId++);
     messageList.push(systemMessage); // Add to the messageList array
     displayMessages(); // Update the inbox view
 }

 // Manual message send for player input
 function sendMessage() {
     const messageInput = document.getElementById('messageInput');
     const messageContent = messageInput.value.trim(); // Get the message content

     if (messageContent) {
         const newMessage = new Message('Player', messageContent, messageId++); // Create a new message
         messageList.push(newMessage); // Store the message
         messageInput.value = ''; // Clear the input field
         displayMessages(); // Refresh the message display
     } else {
         alert('Please enter a message before sending!'); // Alert if message is empty
     }
 }

 // Message constructor
 class Message {
     constructor(sender, content, id) {
         this.sender = sender;
         this.content = content;
         this.id = id;
     }

     getFormattedMessage() {
         return `${this.sender}: ${this.content}`;
     }
 }

 // Function to display messages
 function displayMessages() {
     const messageContainer = document.getElementById('messageContainer');
     messageContainer.innerHTML = ''; // Clear previous messages

     messageList.forEach(message => {  // Use 'messageList' instead of 'message'
         const messageElement = document.createElement('div');
         messageElement.classList.add('message');

         const messageContent = document.createElement('span');
         messageContent.textContent = message.getFormattedMessage();

         messageElement.appendChild(messageContent);

         messageContainer.appendChild(messageElement); // Add message to container
     });
 }

 function getMessages(playerId) {
  const query = `
      SELECT * FROM Messages 
      WHERE player_id = ? 
      ORDER BY timestamp DESC
  `;
  
  // Execute query to retrieve messages for the player
  database.query(query, [playerId], (err, messages) => {
      if (err) throw err;
      
      // Display messages with event types as part of the UI
      messages.forEach(msg => {
          console.log(`Subject: ${msg.subject}, Event Type: ${msg.event_type}`);
      });
      displayMessages(messages);
  });
}


function deleteMessage(messageId) {
  const query = `DELETE FROM Messages WHERE id = ?`;
  
  // Execute query to delete the message by its ID
  database.query(query, [messageId], (err, result) => {
      if (err) throw err;
      console.log("Message deleted with ID:", messageId);
  });
}


 // Save inventory to localStorage (or sessionStorage)
function saveInventory() {
  localStorage.setItem('playerInventory', JSON.stringify(playerInventory));
}

// Load inventory from localStorage (or sessionStorage)
function loadInventory() {
  const savedInventory = localStorage.getItem('playerInventory');
  if (savedInventory) {
    playerInventory = JSON.parse(savedInventory);
    updateInventoryDisplay();  // Refresh the display
  }
}

// Call this function on page load
window.onload = function() {
  loadInventory();  // Load saved inventory
};


// Example function to render cars
function renderCarItems() {
  const carSection = document.getElementById('car-section');
  carSection.innerHTML = ''; // Clear previous content

  cars.forEach(car => {
      const carItem = document.createElement('div');
      carItem.classList.add('car-item');

      // Car image
      const carImage = document.createElement('div');
      carImage.classList.add('car-image');
      const img = document.createElement('img');
      img.src = car.imageUrl;
      img.alt = car.name;
      carImage.appendChild(img);

      // Car info (name, description, stats)
      const carInfo = document.createElement('div');
      carInfo.classList.add('car-info');
      const name = document.createElement('h2');
      name.textContent = car.name;
      const description = document.createElement('p');
      description.textContent = car.description;

      const stats = document.createElement('div');
      stats.classList.add('car-stats');
      stats.innerHTML = `
          <p>Speed: ${car.speed}</p>
          <p>Power: ${car.power}</p>
          <p>Handling: ${car.handling}</p>
      `;
      carInfo.appendChild(name);
      carInfo.appendChild(description);
      carInfo.appendChild(stats);

      // Purchase button
      const carPurchase = document.createElement('div');
      carPurchase.classList.add('car-purchase');
      const purchaseButton = document.createElement('button');
      purchaseButton.textContent = 'Buy';
      purchaseButton.onclick = () => purchaseItem(car);
      carPurchase.appendChild(purchaseButton);

      // Append everything to the car item container
      carItem.appendChild(carImage);
      carItem.appendChild(carInfo);
      carItem.appendChild(carPurchase);

      // Append car item to the car section
      carSection.appendChild(carItem);
  });
}


function determineDifficulty(track) {
  const playerModifierSum = sumValues(track.stat_modifiers);
  const opponentModifierSum = sumValues(track.opponent_modifiers);

  if (playerModifierSum === 1 && opponentModifierSum === 1) {
      return "Neutral";
  } else if (opponentModifierSum > playerModifierSum) {
      return "Hard";
  } else if (playerModifierSum > opponentModifierSum) {
      return "Easy";
  }
}

function sumValues(modifiers) {
  return Object.values(modifiers).reduce((sum, value) => sum + value, 0);
}

function displayTrackInfo(track) {
  const difficulty = determineDifficulty(track);
  console.log(`Track Name: ${track.name}`);
  console.log(`Difficulty: ${difficulty}`);
  console.log(`Potential Rewards: ${track.reward_modifiers}`);
}


function calculateGold(player, opponent, track, outcome) {
  let baseGold = 100; // Base gold for a race
  const trackModifier = track.reward_modifiers.gold || 1;
  const playerLevelDifference = player.level - opponent.level;
  
  // Apply different caps based on level difference
  let levelCap = player.level < 10 ? 500 : 1000;
  let goldCap = Math.min(player.vault_balance, levelCap);

  let reward = baseGold * trackModifier;
  if (outcome === 'win') {
      reward *= 1.5;
  } else if (outcome === 'lose') {
      reward *= 0.8;
  }

  // Ensure the reward does not exceed the player's vault balance
  reward = Math.min(reward, goldCap);

  return Math.round(reward);
}



function calculateFame(player, opponent, track, outcome) {
  let baseFame = 10;
  const trackModifier = track.reward_modifiers.fame || 1;
  const playerLevelDifference = player.level - opponent.level;
  let levelModifier = 1 + (player.level * 0.02); // 2% more fame per level for the player

  if (playerLevelDifference > 10) {
      // Lower the fame reward for higher-level players against much lower-level players
      levelModifier *= 0.7;
  }

  let reward = baseFame * trackModifier * levelModifier;

  if (outcome === 'win') {
      reward *= 1.2; // 20% more fame for winning
  }

  // Cap fame reward if level difference is too large
  if (reward > 50) { // Max fame for a race
      reward = 50;
  }

  return Math.round(reward);
}

function calculateXP(player, opponent, track, outcome) {
  let baseXP = 100; // Example base XP for a race
  const trackModifier = track.reward_modifiers.xp || 1;
  const playerLevelDifference = player.level - opponent.level;
  let levelModifier = 1 + (player.level * 0.1); // 10% more XP per level for the player

  if (playerLevelDifference > 10) {
      // If there's a big level gap, cap the XP for the lower-level player
      levelModifier *= 0.6;
  }

  let reward = baseXP * trackModifier * levelModifier;

  if (outcome === 'win') {
      reward *= 1.5; // 50% more XP for winning
  } else if (outcome === 'lose') {
      reward *= 0.7; // 30% less for losing
  }

  // Cap the XP to keep things balanced
  if (reward > 1000) { // Max XP cap
      reward = 1000;
  }

  return Math.round(reward);
}

function calculateExperience(player, opponent, track, outcome) {
  let baseExperience = 100; // Example base experience for a race
  const trackModifier = track.reward_modifiers.experience || 1;
  const playerLevelDifference = player.level - opponent.level;
  let levelModifier = 1 + (player.level * 0.1); // 10% more experience per level for the player

  if (playerLevelDifference > 10) {
      // If there's a big level gap, cap the experience for the lower-level player
      levelModifier *= 0.6;
  }

  let reward = baseExperience * trackModifier * levelModifier;

  if (outcome === 'win') {
      reward *= 1.5; // 50% more experience for winning
  } else if (outcome === 'lose') {
      reward *= 0.7; // 30% less for losing
  }

  // Cap the experience to keep things balanced
  if (reward > 1000) { // Max experience cap
      reward = 1000;
  }

  return Math.round(reward);
}

function finishRace(player, opponent, track, outcome) {
  // Calculate rewards dynamically
  const playerGold = calculateGold(player, opponent, track, outcome);
  const playerFame = calculateFame(player, opponent, track, outcome);
  const playerExperience = calculateExperience(player, opponent, track, outcome);
  const opponentGold = calculateGold(opponent, player, track, 'lose');
  const opponentFame = calculateFame(opponent, player, track, 'lose');
  const opponentXP = calculateXP(opponent, player, track, 'lose');

  // Prepare race result data
  const playerRewards = {
      gold: playerGold,
      fame: playerFame,
      experience: playerExperience,
      items: [] // No items as rewards
  };

  const opponentRewards = {
      gold: opponentGold,
      fame: opponentFame,
      experience: opponentExperience,
      items: [] // No items as rewards
  };

  // Store the race results in the database (example query)
  const query = `INSERT INTO Races (player_id, opponent_id, experience) VALUES (?, ?, ?)`;
  // Execute the SQL query to store the race data
}

function postRaceMessage(player, opponent, raceOutcome, playerStats, opponentStats, track) {
  // Prepare the content and flavor text for the message
  const playerName = player.name;
  const opponentName = opponent.name;
  const playerItems = playerStats.items.join(', ') || 'None';
  const opponentItems = opponentStats.items.join(', ') || 'None';
  
  const raceDetails = {
      track: track.name,
      playerLevel: player.level,
      opponentLevel: opponent.level,
      playerItems: playerItems,
      opponentItems: opponentItems,
      playerStats: playerStats,
      opponentStats: opponentStats,
      raceOutcome: raceOutcome
  };

  const flavorText = generateFlavorText(raceDetails);

  // Construct the message content
  const messageContent = `
      Race on track: ${track.name}
      ----------------------------------------
      Player: ${playerName} (Level ${player.level}) 
      Stats: Speed: ${playerStats.speed}, Power: ${playerStats.power}, Luck: ${playerStats.luck}
      Items: ${playerItems}
      
      Opponent: ${opponentName} (Level ${opponent.level})
      Stats: Speed: ${opponentStats.speed}, Power: ${opponentStats.power}, Luck: ${opponentStats.luck}
      Items: ${opponentItems}
      
      Outcome: ${raceOutcome === 'win' ? `${playerName} wins!` : `${opponentName} wins!`}
      ${flavorText}
      ----------------------------------------
      Rewards:
      - Gold: ${raceDetails.rewardGold}
      - Fame: ${raceDetails.rewardFame}
      - Experience: ${raceDetails.rewardExperience}
  `;

  // Insert message into database (event_type: 'race')
  const query = `
      INSERT INTO Messages (player_id, event_type, sender, subject, content, timestamp, read_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
      player.id,          // player_id
      EventTypes.RACE,       // event_type (rest result)
      'System',           // sender
      `Race Result: ${playerName} vs ${opponentName}`, // subject
      messageContent,     // content
      new Date(),         // timestamp (current date and time)
      false               // read_status (default to false)
  ];

  // Execute the database query to save the message
  database.query(query, values, (err, result) => {
      if (err) throw err;
      console.log("Race result message saved to inbox for player", player.id);
  });
}


function generateFlavorText(raceDetails) {
  const raceOutcome = raceDetails.raceOutcome;
  const playerName = raceDetails.playerStats.name;
  const opponentName = raceDetails.opponentStats.name;

  // Randomized flavor text based on stats or items
  const textOptions = [
      `${playerName} had a speed advantage and surged ahead, leaving ${opponentName} in the dust!`,
      `${opponentName} pulled ahead with a last-minute burst, securing victory.`,
      `Despite a strong start, ${playerName}'s luck ran out, allowing ${opponentName} to win.`,
      `${playerName} narrowly avoided a crash thanks to their superior handling, but it wasn’t enough to beat ${opponentName}.`,
      `${opponentName} took an early lead with a turbo boost, making it hard for ${playerName} to catch up.`,
      `It was a neck-and-neck race, but ${playerName} managed to clinch victory with a well-timed boost.`
  ];

  return textOptions[Math.floor(Math.random() * textOptions.length)];
}

function saveMessageToInbox(playerId, message) {
  // Example of inserting the message into the database
  const query = `INSERT INTO Messages (player_id, sender, subject, content, timestamp, read_status)
                 VALUES (?, ?, ?, ?, ?, ?)`;
  const values = [playerId, message.sender, message.subject, message.content, message.timestamp, message.readStatus];
  
  // Execute the database query to save the message
  database.query(query, values, (err, result) => {
      if (err) throw err;
      console.log("Message saved to inbox");
  });
}

function getMessages(playerId) {
  const query = `SELECT * FROM Messages WHERE player_id = ? ORDER BY timestamp DESC`;
  
  // Assuming you're using some method to interact with the database
  database.query(query, [playerId], (err, messages) => {
      if (err) throw err;
      
      // Display messages in the inbox UI
      displayMessages(messages);
  });
}

function postTrainingMessage(player, trainingResult, rewards) {
  const messageContent = `
      Training Summary:
      ----------------------------------------
      Player: ${player.name} (Level ${player.level})
      Training Result: ${trainingResult}
      Rewards: 
      - Gold: ${rewards.gold}
      - Fame: ${rewards.fame}
      - Experience: ${rewards.experience}
  `;

  // Insert message into database (event_type: 'training')
  const query = `
      INSERT INTO Messages (player_id, event_type, sender, subject, content, timestamp, read_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
      player.id,          // player_id
      EventTypes.REST,       // event_type (rest result)
      'System',           // sender
      `Training Result: ${player.name}`, // subject
      messageContent,     // content
      new Date(),         // timestamp
      false               // read_status
  ];

  // Execute the database query to save the message
  database.query(query, values, (err, result) => {
      if (err) throw err;
      console.log("Training result message saved to inbox for player", player.id);
  });
}

function postRestMessage(player, restDuration, restRewards) {
  const messageContent = `
      Rest Summary:
      ----------------------------------------
      Player: ${player.name} (Level ${player.level})
      Rest Duration: ${restDuration} hours
      Rewards: 
      - Gold: ${restRewards.gold}
      - Fame: ${restRewards.fame}
      - Experience: ${restRewards.experience}
  `;

  // Insert message into database (event_type: 'rest')
  const query = `
      INSERT INTO Messages (player_id, event_type, sender, subject, content, timestamp, read_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
      player.id,          // player_id
      'rest',             // event_type (this is a rest result)
      'System',           // sender
      `Rest Result: ${player.name}`, // subject
      messageContent,     // content
      new Date(),         // timestamp
      false               // read_status
  ];

  // Execute the database query to save the message
  database.query(query, values, (err, result) => {
      if (err) throw err;
      console.log("Rest result message saved to inbox for player", player.id);
  });
}



// Function to replace currency text with icons
function replaceCurrencyWithIcons() {
  // Replace all instances of 'gold' with gold icon
  document.body.innerHTML = document.body.innerHTML.replace(/\b(gold)\b/g, '<span class="gold-icon"></span>');
  
  // Replace all instances of 'diamonds' with diamond icon
  document.body.innerHTML = document.body.innerHTML.replace(/\b(diamonds)\b/g, '<span class="diamond-icon"></span>');
}

// Call the function after the page content is loaded
window.onload = replaceCurrencyWithIcons;

