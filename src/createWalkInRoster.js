import { createRosterFromData } from './utils/createRosterFromData.js';

// The roster data from the user
const rosterData = [
    {
        "Role": "Main Caller",
        "Weapon": "Clump Tank",
        "Player": "Elijxh",
        "Head": "",
        "Chest": "",
        "Boots": "",
        "Notes": "Don't fucking die"
    },
    {
        "Role": "Tank",
        "Weapon": "Heavy Mace",
        "Player": "",
        "Head": "Hellion/Judi",
        "Chest": "Guardian",
        "Boots": "idc don't die",
        "Notes": "SNARE CHARGE - STOP THEM/PURGE THEM - FLANK THEM"
    },
    {
        "Role": "Tank",
        "Weapon": "1H Hammer",
        "Player": "izanagai",
        "Head": "Judi/Hellion/Soldier",
        "Chest": "Duskweaver",
        "Boots": "idc don't die",
        "Notes": "Leering Cane - Onion Ring - Flank them and HOLD them"
    },
    {
        "Role": "Tank",
        "Weapon": "GA (OFF)",
        "Player": "Liafon",
        "Head": "Judi/Assassin/Hellion",
        "Chest": "Knight",
        "Boots": "Stalker/Cleric",
        "Notes": "CLEANSE - STOP ENGAGE/HOLD THEM"
    },
    {
        "Role": "Tank",
        "Weapon": "Incubus Mace",
        "Player": "WUMPGUT",
        "Head": "idc don't die",
        "Chest": "Demon",
        "Boots": "idc don't die",
        "Notes": "Guard Rune/Snare Charge - HIT ELIJXH'S CLUMP"
    },
    {
        "Role": "Support",
        "Weapon": "Lifecurse",
        "Player": "HarryJonsonn",
        "Head": "Assassin",
        "Chest": "Demon",
        "Boots": "Graveguard",
        "Notes": "Armored Piercer"
    }
];

// Create the roster
const createWalkInRoster = async () => {
    try {
        const result = await createRosterFromData(
            rosterData,
            "Walk In",
            "Elijxh",
            "MID_MDX93408_CB1O8Z0Y_0"
        );
        
        if (result.success) {
            console.log('✅ Roster "Walk In" created successfully!');
            console.log('Roster ID:', result.rosterId);
            console.log('Entries:', result.rosterData.entryCount);
        } else {
            console.error('❌ Failed to create roster:', result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
};

// Export the function so it can be called
export { createWalkInRoster };

// If running directly, execute the function
if (import.meta.main) {
    createWalkInRoster();
}
