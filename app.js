
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    deleteDoc
} from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);



let medicines = [];

const today = () => new Date().toLocaleDateString("en-CA");

function loadData() {
    try {
        let savedData = localStorage.getItem("my_medicines");

        if (savedData !== null) {
            medicines = JSON.parse(savedData);

            medicines = medicines.map(medicine => ({
                ...medicine,
                takenToday: medicine.takenDate === today()
            }));
        }
    } catch (error) {
        console.error("Could not load saved medicines:", error);
        medicines = [];
    }

    showMedicines();
}
function saveData() {
    localStorage.setItem(
        "my_medicines",
        JSON.stringify(medicines)
    );
}
function showMedicines() {

    const list = document.getElementById("medicineList");

    list.innerHTML = "";

    if (medicines.length === 0) {
        const message = document.createElement("li");
        message.className = "empty-message";
        message.textContent = "No medicines added yet 💊";

        list.appendChild(message);
        return;
    }

    for (let i = 0; i < medicines.length; i++) {

        const medicine = medicines[i];

        const li = document.createElement("li");

        if (medicine.takenToday) {
            li.classList.add("taken");
        }

        const nameDiv = document.createElement("div");
        nameDiv.className = "med-name";
        nameDiv.textContent = medicine.name;

        const detailsDiv = document.createElement("div");
        detailsDiv.className = "med-details";

        detailsDiv.textContent =
            "Dosage: " + medicine.dosage +
            " | Time: " + medicine.time;

        const buttonsDiv = document.createElement("div");
        buttonsDiv.className = "buttons-container";

        const takenButton = document.createElement("button");
        takenButton.className = "taken-btn";

        takenButton.textContent = medicine.takenToday
            ? "✓ Taken Today"
            : "Mark as Taken";

        takenButton.disabled = medicine.takenToday;

        takenButton.addEventListener("click", () => {
            markAsTaken(medicine.id);
        });

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteMedicine(medicine.id);
        });

        buttonsDiv.appendChild(takenButton);
        buttonsDiv.appendChild(deleteButton);

        li.appendChild(nameDiv);
        li.appendChild(detailsDiv);
        li.appendChild(buttonsDiv);

        list.appendChild(li);
    }
}

async function addMedicine() {

    const nameInput = document.getElementById("medName");
    const dosageInput = document.getElementById("dosage");
    const timeInput = document.getElementById("time");

    const name = nameInput.value.trim();
    const dosage = dosageInput.value.trim();
    const time = timeInput.value.trim();

    if (!name || !dosage || !time) {
        alert("Please fill in all fields!");
        return;
    }

    const newMedicine = {
        id: String(Date.now()),
        name: name,
        dosage: dosage,
        time: time,
        takenToday: false,
        takenDate: null
    };

    medicines.push(newMedicine);

    saveData();
    showMedicines();

    nameInput.value = "";
    dosageInput.value = "";
    timeInput.value = "";

    document.getElementById("status").textContent =
        "Status: Medicine added";

    await saveToFirebase(newMedicine);
}

window.addMedicine = addMedicine;

async function markAsTaken(id) {

    const medicine = medicines.find(item => item.id === id);

    if (!medicine) return;

    medicine.takenToday = true;
    medicine.takenDate = today();

    saveData();
    showMedicines();

    document.getElementById("status").textContent =
        "Status: Marked as Taken";

    await saveToFirebase(medicine);
}


async function deleteMedicine(id) {

    const confirmed = confirm(
        "Are you sure you want to delete this medicine?"
    );

    if (!confirmed) return;

    medicines = medicines.filter(
        medicine => medicine.id !== id
    );

    saveData();
    showMedicines();

    document.getElementById("status").textContent =
        "Status: Medicine deleted";

    await deleteFromFirebase(id);
}


async function saveToFirebase(medicine) {

    try {
        const medicineRef = doc(
            db,
            "medicines",
            medicine.id
        );

        await setDoc(medicineRef, medicine);

        console.log("Medicine saved to Firebase!");

    } catch (error) {

        console.error("Firebase save failed:", error);

        document.getElementById("status").textContent =
            "Status: Cloud save failed (local copy kept)";
    }
}


async function deleteFromFirebase(id) {

    try {
        const medicineRef = doc(
            db,
            "medicines",
            id
        );

        await deleteDoc(medicineRef);

        console.log("Medicine deleted from Firebase!");

    } catch (error) {

        console.error("Firebase delete failed:", error);

        document.getElementById("status").textContent =
            "Status: Cloud delete failed";
    }
}


async function syncWithFirebase() {

    const status = document.getElementById("status");

    status.textContent = "Status: Syncing...";

    try {
        for (const medicine of medicines) {
            const medicineRef = doc(
                db,
                "medicines",
                medicine.id
            );

            await setDoc(medicineRef, medicine);
        }

        const querySnapshot = await getDocs(
            collection(db, "medicines")
        );

        medicines = [];

        querySnapshot.forEach((document) => {

            const medicine = document.data();

            medicines.push({
                ...medicine,
                id: document.id,
                takenToday: medicine.takenDate === today()
            });
        });

        saveData();
        showMedicines();

        status.textContent = "Status: Sync successful ✓";

        console.log("Firebase sync completed!");

    } catch (error) {

        console.error("Sync failed:", error);

        status.textContent = "Status: Sync failed";
    }
}

window.syncWithFirebase = syncWithFirebase;

loadData();
