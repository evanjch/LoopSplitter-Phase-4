// Storage
const STORAGE_KEY = "lootSplitterState";

// Application State
let lootArray = [];
let partySize = 1;

// Unique ID
const STUDENT_ID = "evanC";

// Event Listeners
document.getElementById("addLootBtn").addEventListener("click", addLoot);
document.getElementById("splitLootBtn").addEventListener("click", updateUI);
document.getElementById("resetBtn").addEventListener("click", resetAll);

document.getElementById("syncBtn").addEventListener("click", syncToServer);
document.getElementById("loadBtn").addEventListener("click", loadFromServer);

document.getElementById("partySize").addEventListener("input", function () {

    const value = parseInt(this.value);

    if (!isNaN(value) && value >= 1) {
        partySize = value;
        saveState();
    }

    updateUI();
});

// Save State
function saveState() {

    const state = {
        loot: lootArray,
        partySize: partySize
    };

    const stateString = JSON.stringify(state);

    localStorage.setItem(STORAGE_KEY, stateString);
}

// Restore State
function restoreState() {

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {

        const parsed = JSON.parse(saved);

        if (typeof parsed !== "object") return;

        if (Array.isArray(parsed.loot)) {

            for (let i = 0; i < parsed.loot.length; i++) {

                const item = parsed.loot[i];

                if (
                    item.name &&
                    typeof item.name === "string" &&
                    item.name.trim() !== "" &&
                    typeof item.value === "number" &&
                    item.value >= 0 &&
                    typeof item.quantity === "number" &&
                    item.quantity >= 1
                ) {
                    lootArray.push(item);
                }
            }
        }

        if (typeof parsed.partySize === "number" && parsed.partySize >= 1) {
            partySize = parsed.partySize;
            document.getElementById("partySize").value = partySize;
        }

    } catch (error) {

        lootArray = [];
        partySize = 1;

    }
}

// Reset All
function resetAll() {

    lootArray = [];
    partySize = 1;

    document.getElementById("partySize").value = 1;

    localStorage.removeItem(STORAGE_KEY);

    updateUI();
}


// Add Loot
function addLoot() {

    const nameInput = document.getElementById("lootName");
    const valueInput = document.getElementById("lootValue");
    const quantityInput = document.getElementById("lootQuantity");
    const errorDisplay = document.getElementById("lootError");

    const name = nameInput.value.trim();
    const value = parseFloat(valueInput.value);
    const quantity = parseInt(quantityInput.value);

    errorDisplay.textContent = "";

    if (name === "") {
        errorDisplay.textContent = "Loot name cannot be empty.";
        return;
    }

    if (isNaN(value) || value < 0) {
        errorDisplay.textContent = "Loot value must be a valid non-negative number.";
        return;
    }

    if (isNaN(quantity) || quantity < 1) {
        errorDisplay.textContent = "Quantity must be at least 1.";
        return;
    }

    // Add to state
    lootArray.push({
        name: name,
        value: value,
        quantity: quantity
    });

    saveState();

    nameInput.value = "";
    valueInput.value = "";
    quantityInput.value = "";

    updateUI();
}


// Remove Loot
function removeLoot(index) {
    lootArray.splice(index, 1);
    saveState();
    updateUI();
}

// Sync Server
function syncToServer() {

    const message = document.getElementById("serverMessage");

    const payload = {
        studentId: STUDENT_ID,
        state: {
            loot: lootArray,
            partySize: partySize
        }
    };

    fetch(`http://goldtop.hopto.org/save/${STUDENT_ID}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) throw new Error("Server error");
        return response.json();
    })
    .then(data => {
        if (data.status === "saved") {
            message.textContent = "Successfully synced to server.";
        } else {
            message.textContent = "Unexpected server response.";
        }
    })
    .catch(() => {
        message.textContent = "Sync failed.";
    });
}

// Load Server
function loadFromServer() {

    const message = document.getElementById("serverMessage");

    fetch(`http://goldtop.hopto.org/load/${STUDENT_ID}`)
    .then(response => {
        if (!response.ok) throw new Error("Server error");
        return response.json();
    })
    .then(data => {

        if (data.status === "empty") {
            message.textContent = "No saved data on server.";
            return;
        }

        if (data.status === "loaded") {

            if (data.studentId !== STUDENT_ID) {
                message.textContent = "Invalid student ID.";
                return;
            }

            if (!data.state || typeof data.state !== "object") {
                message.textContent = "Invalid state.";
                return;
            }

            const serverLoot = data.state.loot;
            const serverParty = data.state.partySize;

            const newLoot = [];

            if (!Array.isArray(serverLoot)) {
                message.textContent = "Invalid loot data.";
                return;
            }

            for (let i = 0; i < serverLoot.length; i++) {

                const item = serverLoot[i];

                if (
                    item.name &&
                    typeof item.name === "string" &&
                    item.name.trim() !== "" &&
                    typeof item.value === "number" &&
                    item.value >= 0 &&
                    typeof item.quantity === "number" &&
                    item.quantity >= 1
                ) {
                    newLoot.push(item);
                }
            }

            if (typeof serverParty !== "number" || serverParty < 1) {
                message.textContent = "Invalid party size.";
                return;
            }

            lootArray = newLoot;
            partySize = serverParty;

            document.getElementById("partySize").value = partySize;

            saveState();
            updateUI();

            message.textContent = "Loaded data from server.";
        }
    })
    .catch(() => {
        message.textContent = "Load failed.";
    });
}

// UI Update
function updateUI() {

    const partySizeInput = document.getElementById("partySize");
    const partyError = document.getElementById("partyError");
    const splitError = document.getElementById("splitError");
    const splitButton = document.getElementById("splitLootBtn");

    const lootRows = document.getElementById("lootRows");
    const noLootMessage = document.getElementById("noLootMessage");
    const totalSection = document.getElementById("totalSection");
    const results = document.getElementById("results");

    const runningTotal = document.getElementById("runningTotal");
    const finalTotal = document.getElementById("finalTotal");
    const perMember = document.getElementById("perMember");

    partyError.textContent = "";
    splitError.textContent = "";

    const partyValue = parseInt(partySizeInput.value);

    if(!isNaN(partyValue) && partyValue >= 1) {
        partySize = partyValue;
    }

    // Calculate total
    let total = 0;

    for (let i = 0; i < lootArray.length; i++) {
        total += lootArray[i].value * lootArray[i].quantity;
    }

    runningTotal.textContent = total.toFixed(2);
    finalTotal.textContent = total.toFixed(2);


    // Render Loot List
    lootRows.innerHTML = "";

    for (let i = 0; i < lootArray.length; i++) {

        let row = document.createElement("div");
        row.className = "loot-row";

        let nameCell = document.createElement("div");
        nameCell.className = "loot-cell";
        nameCell.innerText = lootArray[i].name;

        let valueCell = document.createElement("div");
        valueCell.className = "loot-cell";
        valueCell.innerText = lootArray[i].value.toFixed(2);

        let quantityCell = document.createElement("div");
        quantityCell.className = "loot-cell";
        quantityCell.innerText = lootArray[i].quantity;

        let actionCell = document.createElement("div");
        actionCell.className = "loot-cell";

        let removeBtn = document.createElement("button");
        removeBtn.innerText = "Remove";
        removeBtn.addEventListener("click", function () {
            removeLoot(i);
        });

        actionCell.appendChild(removeBtn);

        row.appendChild(nameCell);
        row.appendChild(valueCell);
        row.appendChild(quantityCell);
        row.appendChild(actionCell);

        lootRows.appendChild(row);
    }


    // Empty State Control
    if (lootArray.length === 0) {
        noLootMessage.classList.remove("hidden");
        totalSection.classList.add("hidden");
        results.classList.add("hidden");
    } else {
        noLootMessage.classList.add("hidden");
        totalSection.classList.remove("hidden");
    }

    // Validating the Party
    let validParty = true;

    if (isNaN(partySize) || partySize < 1) {
        partyError.textContent = "Party size must be at least 1.";
        validParty = false;
    }
    
    // Calculating Split
    if (validParty && lootArray.length > 0) {
        let splitAmount = total / partySize;
        perMember.textContent = splitAmount.toFixed(2);
        results.classList.remove("hidden");
        splitButton.disabled = false;
    } else {
        results.classList.add("hidden");
        splitButton.disabled = true;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    restoreState();
    updateUI();
}); 