export class HelldiverStratagem {
    private identifier: string;
    private arrowsInputs: string[];
    private wasdInputs: string[];
    private emojiInputs: string[];
    private textInputs: string[];

    private constructor(identifier: string, arrowsInputs: string[]) {
        this.identifier = identifier;
        this.arrowsInputs = arrowsInputs;
        this.wasdInputs = [];
        this.emojiInputs = [];
        this.textInputs = [];

        for (const arrowInput of arrowsInputs) {
            if (arrowInput == '↑') {
                this.wasdInputs.push("w");
                this.emojiInputs.push("⬆️");
                this.textInputs.push("up");
            }
            else if (arrowInput == '→') {
                this.wasdInputs.push("d");
                this.emojiInputs.push("➡️");
                this.textInputs.push("right");
            }
            else if (arrowInput == '↓') {
                this.wasdInputs.push("s");
                this.emojiInputs.push("⬇️");
                this.textInputs.push("down");
            }
            else {
                this.wasdInputs.push("a");
                this.emojiInputs.push("⬅️");
                this.textInputs.push("left");
            }
        }
    }

    public static createAllStratagems(): HelldiverStratagem[] {
        let helldiverStratagems = [];

        helldiverStratagems.push(new HelldiverStratagem("MG-43_Machine_Gun", ["↓", "←", "↓", "↑", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("APW-1_Anti-Materiel_Rifle", ["↓", "←", "→", "↑", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("M-105_Stalwart", ["↓", "←", "↓", "↑", "↑", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("EAT-17_Expendable_Anti-Tank", ["↓", "↓", "←", "↑", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("GR-8_Recoilless_Rifle", ["↓", "←", "→", "→", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("FLAM-40_Flamethrower", ["↓", "←", "↑", "↓", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("AC-8_Autocannon", ["↓", "←", "↓", "↑", "↑", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("MG-206_Heavy_Machine_Gun", ["↓", "←", "↑", "↓", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("RL-77_Airburst_Rocket_Launcher", ["↓", "↑", "↑", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("MLS-4X_Commando", ["↓", "←", "↑", "↓", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("RS-422_Railgun", ["↓", "→", "↓", "↑", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("FAF-14_Spear", ["↓", "↓", "↑", "↓", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("StA-X3_W.A.S.P._Launcher", ["↓", "↓", "↑", "↓", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_Gatling_Barrage", ["→", "↓", "←", "↑", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_Airburst_Strike", ["→", "→", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_120mm_HE_Barrage", ["→", "→", "↓", "←", "→", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_380mm_HE_Barrage", ["→", "↓", "↑", "↑", "←", "↓", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_Walking_Barrage", ["→", "↓", "→", "↓", "→", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_Laser", ["→", "↓", "↑", "→", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_Napalm_Barrage", ["→", "→", "↓", "←", "→", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_Railcannon_Strike", ["→", "↑", "↓", "↓", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle_Strafing_Run", ["↑", "→", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle_Airstrike", ["↑", "→", "↓", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle_Cluster_Bomb", ["↑", "→", "↓", "↓", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle_Napalm_Airstrike", ["↑", "→", "↓", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("LIFT-850_Jump_Pack", ["↓", "↑", "↑", "↓", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle_Smoke_Strike", ["↑", "→", "↑", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle_110mm_Rocket_Pods", ["↑", "→", "↑", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle_500kg_Bomb", ["↑", "→", "↓", "↓", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("M-102_Fast_Recon_Vehicle", ["←", "↓", "→", "↓", "→", "↓", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("TD-220_Bastion", ["←", "↓", "→", "↓", "←", "↓", "↑", "↓", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_Precision_Strike", ["→", "→", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_Gas_Strike", ["→", "→", "↓", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_EMS_Strike", ["→", "→", "←", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_Smoke_Strike", ["→", "→", "↓", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("E/MG-101_HMG_Emplacement", ["↓", "↑", "←", "→", "→", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("FX-12_Shield_Generator_Relay", ["↓", "↓", "←", "→", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("A/ARC-3_Tesla_Tower", ["↓", "↑", "→", "↑", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("E/GL-21_Grenadier_Battlement", ["↓", "→", "↓", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("MD-6_Anti-Personnel_Minefield", ["↓", "←", "↑", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("B-1_Supply_Pack", ["↓", "←", "↓", "↑", "↑", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("GL-21_Grenade_Launcher", ["↓", "←", "↑", "←", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("LAS-98_Laser_Cannon", ["↓", "←", "↓", "↑", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("MD-I4_Incendiary_Mines", ["↓", "←", "←", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("AX/LAS-5_Guard_Dog_Rover", ["↓", "↑", "←", "↑", "→", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("SH-20_Ballistic_Shield_Backpack", ["↓", "←", "↓", "↓", "↑", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("ARC-3_Arc_Thrower", ["↓", "→", "↓", "↑", "←", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("MD-17_Anti-Tank_Mines", ["↓", "←", "↑", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("LAS-99_Quasar_Cannon", ["↓", "↓", "↑", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("SH-32_Shield_Generator_Pack", ["↓", "↑", "←", "→", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("MD-8_Gas_Mines", ["↓", "←", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("A/MG-43_Machine_Gun_Sentry", ["↓", "↑", "→", "→", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("A/G-16_Gatling_Sentry", ["↓", "↑", "→", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("A/M-12_Mortar_Sentry", ["↓", "↑", "→", "→", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("AX/AR-23_Guard_Dog", ["↓", "↑", "←", "↑", "→", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("A/AC-8_Autocannon_Sentry", ["↓", "↑", "→", "↑", "←", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("A/MLS-4X_Rocket_Sentry", ["↓", "↑", "→", "→", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("A/M-23_EMS_Mortar_Sentry", ["↓", "↑", "→", "↓", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("EXO-45_Patriot_Exosuit", ["←", "↓", "→", "↑", "←", "↓", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("EXO-49_Emancipator_Exosuit", ["←", "↓", "→", "↑", "←", "↓", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("TX-41_Sterilizer", ["↓", "←", "↑", "↓", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("AX/TX-13_Guard_Dog_Dog_Breath", ["↓", "↑", "←", "↑", "→", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("SH-51_Directional_Shield", ["↓", "↑", "←", "→", "↑", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("E/AT-12_Anti-Tank_Emplacement", ["↓", "↑", "←", "→", "→", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("A/FLAM-40_Flame_Sentry", ["↓", "↑", "→", "↓", "↑", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("B-100_Portable_Hellbomb", ["↓", "→", "↑", "↑", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("LIFT-860_Hover_Pack", ["↓", "↑", "↑", "↓", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("CQC-1_One_True_Flag", ["↓", "←", "→", "→", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("GL-52_De-Escalator", ["↓", "→", "↑", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("AX/ARC-3_Guard_Dog_K-9", ["↓", "↑", "←", "↑", "→", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("PLAS-45_Epoch", ["↓", "←", "↑", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("A/LAS-98_Laser_Sentry", ["↓", "↑", "→", "↓", "↑", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("LIFT-182_Warp_Pack", ["↓", "←", "→", "↓", "←", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("S-11_Speargun", ["↓", "→", "↓", "←", "↑", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("EAT-700_Expendable_Napalm", ["↓", "↓", "←", "↑", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("MS-11_Solo_Silo", ["↓", "↑", "→", "↓", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("M-1000_Maxigun", ["↓", "←", "→", "↓", "↑", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("CQC-9_Defoliation_Tool", ["↓", "←", "→", "→", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("AX/FLAM-75_Guard_Dog_Hot_Dog", ["↓", "↑", "←", "↑", "←", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("B/MD_C4_Pack", ["↓", "→", "↑", "↑", "→", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Reinforce", ["↑", "↓", "→", "←", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("SoS_Beacon", ["↑", "↓", "→", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Resupply", ["↓", "↓", "↑", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle_Rearm", ["↑", "↑", "←", "↑", "→"]));
        helldiverStratagems.push(new HelldiverStratagem("SSSD_Delivery", ["↓", "↓", "↓", "↑", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Prospecting_Drill", ["↓", "↓", "←", "→", "↓", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Super_Earth_Flag", ["↓", "↑", "↓", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Hellbomb", ["↓", "↑", "←", "↓", "↑", "→", "↓", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Upload_Data", ["←", "→", "↑", "↑", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Seismic_Probe", ["↑", "↑", "←", "→", "↓", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Dark_Fluid_Vessel", ["↑", "←", "→", "↓", "↑", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Tectonic_Drill", ["↑", "↓", "↑", "↓", "↑", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Hive_Breaker_Drill", ["←", "↑", "↓", "→", "↓", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Cargo_Container", ["↑", "↑", "↓", "↓", "→", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital_Illumination_Flare", ["→", "→", "←", "←"]));
        helldiverStratagems.push(new HelldiverStratagem("SEAF_Artillery", ["→", "↑", "↑", "↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Call_In_Super_Destroyer", ["↑", "↑", "↓", "↓", "←", "→", "←", "→"]));

        helldiverStratagems.sort((a, b) => 
            b.getArrowsInputs().length - a.getArrowsInputs().length
        );
        return helldiverStratagems;
    }

	public getIdentifier(): string {
		return this.identifier;
	}

	public getArrowsInputs(): string[] {
		return this.arrowsInputs;
	}

	public getWasdInputs(): string[] {
		return this.wasdInputs;
	}

	public getEmojiInputs(): string[] {
		return this.emojiInputs;
	}

	public getTextInputs(): string[] {
		return this.textInputs;
	}

    public getWikiURL(): string {
        return `https://helldivers.wiki.gg/wiki/${this.identifier}` 
    }

    public getIconURL(): string {
        return `https://helldivers.wiki.gg/images/${this.identifier}_Stratagem_Icon.png`
    }
}