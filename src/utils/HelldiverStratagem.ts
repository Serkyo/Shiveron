export class HelldiverStratagem {
    private name: string;
    private description: string;
    private arrowsInputs: string[];
    private wasdInputs: string[];
    private emojiInputs: string[];
    private textInputs: string[];

    private constructor(name: string, description: string, arrowsInputs: string[]) {
        this.name = name;
        this.description = description;
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
        helldiverStratagems.push(new HelldiverStratagem("A/AC-8 Autocannon Sentry", "An automated cannon turret firing anti-tank ammunition over long ranges. Sacrifices agility for range and power.", ["↓", "↑", "→", "↑", "←", "↑"]));
        helldiverStratagems.push(new HelldiverStratagem("A/AC-8 Autocannon Sentry", "An automated cannon turret firing anti-tank ammunition over long ranges. Sacrifices agility for range and power.", ["↓","↑","→","↑","←","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("A/ARC-3 Tesla Tower", "A turret which fires electrical charges at targets in close range. To avoid friendly fire, remain prone.", ["↓","↑","→","↑","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("A/FLAM-40 Flame Sentry", "An automated flamethrower turret. Warning: fuel canister prone to explosion when ruptured.", ["↓","↑","→","↓","↑","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("A/G-16 Gatling Sentry", "An automated turret with an extremely high rate of fire. Caution: does not check if friendly units are in line of fire.", ["↓","↑","→","←"]));
        helldiverStratagems.push(new HelldiverStratagem("A/LAS-98 Laser Sentry", "A turret that fires powerful and precise laser beams. Will self-destruct after prolonged fire/overloading heat sink.", ["↓","↑","→","↓","↑","→"]));
        helldiverStratagems.push(new HelldiverStratagem("A/M-12 Mortar Sentry", "A turret firing powerful shells in a high arc. Effective at long ranges, and able to strike at targets behind cover.", ["↓","↑","→","→","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("A/M-23 EMS Mortar Sentry", "A turret firing static field generators that slow the advance of enemies.", ["↓","↑","→","↓","→"]));
        helldiverStratagems.push(new HelldiverStratagem("A/MG-43 Machine Gun Sentry", "An agile automated machine gun turret. Will fire at targets even if Helldivers will be caught in the crossfire.", ["↓","↑","→","→","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("A/MLS-4X Rocket Sentry", "A powerful automated turret, effective against armored targets. The turret will primarily aim at larger enemies.", ["↓","↑","→","→","←"]));
        helldiverStratagems.push(new HelldiverStratagem("AC-8 Autocannon", "A fully-automatic cannon effective against light vehicle armor. Includes support backpack required for reloading.", ["↓","←","↓","↑","↑","→"]));
        helldiverStratagems.push(new HelldiverStratagem("APW-1 Anti-Materiel Rifle", "A high-caliber sniper rifle effective over long distances against light vehicle armor. This rifle must be aimed downscope.", ["↓","←","→","↑","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("ARC-3 Arc Thrower", "Projects an arc of lightning at close range. Charges up to project bolts, and may discharge through multiple targets.", ["↓","→","↓","↑","←","←"]));
        helldiverStratagems.push(new HelldiverStratagem("AX/AR-23 \"Guard Dog\"", "An autonomous drone equipped with a Liberator Penetrator assault rifle, providing 360° cover. Returns to backpack to rearm.", ["↓","↑","←","↑","→","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("AX/ARC-3 \"Guard Dog\" K-9", "A humane, autonomous drone equipped with a modified Arc Thrower. Capable of projecting arcs of lightning through multiple targets. Does not need to recharge between shots.", ["↓","↑","←","↑","→","←"]));
        helldiverStratagems.push(new HelldiverStratagem("AX/FLAM-75 \"Guard Dog\" Hot Dog", "An autonomous drone equipped with a flamethrower. Returns to pack to refill fuel canisters.", ["↓","↑","←","↑","←","←"]));
        helldiverStratagems.push(new HelldiverStratagem("AX/LAS-5 \"Guard Dog\" Rover", "An autonomous drone equipped with a laser rifle, providing 360° cover. Returns to backpack to cool down.", ["↓","↑","←","↑","→","→"]));
        helldiverStratagems.push(new HelldiverStratagem("AX/TX-13 \"Guard Dog\" Dog Breath", "A drone that defends its user by firing caustic gas at nearby enemies. Returns to backpack to refill.", ["↓","↑","←","↑","→","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("B-1 Supply Pack", "Supply boxes containing ammunition, with a backpack that allows the user to distribute boxes to fellow Helldivers.", ["↓","←","↓","↑","↑","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("B-100 Portable Hellbomb", "A backpack-mounted Hellbomb that can be armed by the wearer or an ally, starting a countdown. Users are recommended to remove the backpack before the countdown reaches zero.", ["↓","→","↑","↑","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("B/MD C4 Pack", "A backpack with six adhesive C4 charges and a wireless detonator set up for either individual or simultaneous detonation.", ["↓","→","↑","↑","→","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("CQC-1 One True Flag", "The eternal colors of Super Earth can never be tainted. Only quenched, by the blood of its enemies.", ["↓","←","→","→","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("CQC-9 Defoliation Tool", "A useful field-clearing tool for removing trees, obstacles, and unlucky foes.", ["↓","←","→","→","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("E/AT-12 Anti-Tank Emplacement", "A powerful manned gun emplacement, capable of taking out armored targets at long ranges.", ["↓","↑","←","→","→","→"]));
        helldiverStratagems.push(new HelldiverStratagem("E/GL-21 Grenadier Battlement", "A stationary ballistic cover with a mounted grenade launcher. Can protect multiple Helldivers from small arms fire.", ["↓","→","↓","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("E/MG-101 HMG Emplacement", "A manned fortification offering superior firepower against lightly armored targets. Slow to turn, so place it wisely.", ["↓","↑","←","→","→","←"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle 110mm Rocket Pods", "A barrage of rocket pods, which the Eagle pilot will release on the largest target near the stratagem beacon.", ["↑","→","↑","←"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle 500kg Bomb", "A large bomb obliterating almost any target close to impact. Make sure to clear the area.", ["↑","→","↓","↓","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle Airstrike", "A barrage of bombs creating a non-targeted carpet of explosions. When called, the strike will be perpendicular from the direction you were facing when thrown.", ["↑","→","↓","→"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle Cluster Bomb", "A targeted air strike unable to destroy buildings, but efficient at clearing smaller targets. When called, the strike will be perpendicular from the direction you were facing when thrown.", ["↑","→","↓","↓","→"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle Napalm Airstrike", "A barrage of napalm bombs, creating a wall of fire which will stop the enemy in their tracks. When called, the strike will be perpendicular from the direction you were facing when thrown.", ["↑","→","↓","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle Smoke Strike", "A barrage of smoke grenades, creating a thick smoke screen to block enemies' line of sight. When called the strike will be Perpendicular from the direction you were facing when thrown.", ["↑","→","↑","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle Strafing Run", "A strafing run of the battlefield to clear small targets, delivered almost instantly. When called, the strike will start from the beacon and go away from the direction you were facing when thrown.", ["↑","→","→"]));
        helldiverStratagems.push(new HelldiverStratagem("EAT-17 Expendable Anti-Tank", "A single-use weapon specialized for damaging vehicle armor. Discarded after every use.", ["↓","↓","←","↑","→"]));
        helldiverStratagems.push(new HelldiverStratagem("EAT-700 Expendable Napalm", "A single-use weapon that fires a missile containing napalm cluster bombs that release upon impact.", ["↓","↓","←","↑","←"]));
        helldiverStratagems.push(new HelldiverStratagem("EXO-45 Patriot Exosuit", "The EXO-45 Patriot Exosuit is a heavily armored walking exosuit, equipped with fourteen rockets and a mini-gun preloaded with 1000 ammo.", ["←","↓","→","↑","←","↓","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("EXO-49 Emancipator Exosuit", "The EXO-49 Emancipator Exosuit is a heavily armored walking exosuit, equipped with dual autocannons preloaded with 100 rounds each.", ["←","↓","→","↑","←","↓","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("FAF-14 Spear", "An anti-tank homing missile which must lock onto its target before launch. Effective against large and armored enemies.", ["↓","↓","↑","↓","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("FLAM-40 Flamethrower", "An incendiary weapon for close range. Will ignite targets, terrain, and any flammable teammates.", ["↓","←","↑","↓","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("FX-12 Shield Generator Relay", "A stationary energy shield which provides cover against projectiles. Has a limited lifetime once deployed.", ["↓","↓","←","→","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("GL-21 Grenade Launcher", "A grenade launcher effective against armored infantry. Not intended for use against vehicle armor or fortified buildings.", ["↓","←","↑","←","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("GL-52 De-Escalator", "A humane grenade launcher firing high-powered arc grenades.", ["↓","→","↑","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("GR-8 Recoilless Rifle", "A recoilless rifle effective against vehicle armor. Includes support backpack required for reloading.", ["↓","←","→","→","←"]));
        helldiverStratagems.push(new HelldiverStratagem("LAS-98 Laser Cannon", "A laser weapon firing a continuous beam. Doesn't require ammunition, but will need heat sink replaced if it overheats.", ["↓","←","↓","↑","←"]));
        helldiverStratagems.push(new HelldiverStratagem("LAS-99 Quasar Cannon", "Charges up to fire a powerful, explosive energy burst. Has a long cooldown period after firing.", ["↓","↓","↑","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("LIFT-182 Warp Pack", "A Dark Fluid-powered backpack that generates a portable micro-wormhole. This safe and well-understood technology allows the wearer to warp short distances. Warning: do not use while pack is overloaded.", ["↓","←","→","↓","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("LIFT-850 Jump Pack", "Enables the user to jump higher than 'gravity' and 'safety' would normally allow. Must be charged before use.", ["↓","↑","↑","↓","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("LIFT-860 Hover Pack", "Offers its user brief fixed-height flight, stable enough for pinpoint marksmanship.", ["↓","↑","↑","↓","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("M-102 Fast Recon Vehicle", "A lightly-armored reconnaissance vehicle mounted with a heavy machinegun.", ["←","↓","→","↓","→","↓","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("M-105 Stalwart", "A compact, low caliber machine gun. Trades power for ease of use, with faster reloading than heavier machine guns.", ["↓","←","↓","↑","↑","←"]));
        helldiverStratagems.push(new HelldiverStratagem("M-1000 Maxigun", "A belt-fed minigun with an exceptional ammo capacity. Cannot be reloaded with standard non-belted munitions.", ["↓","←","→","↓","↑","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("MD-6 Anti-Personnel Minefield", "Deploys a defensive anti-personnel minefield, to halt enemy advance.", ["↓","←","↑","→"]));
        helldiverStratagems.push(new HelldiverStratagem("MD-8 Gas Mines", "Deploys mines that release gas on activation, temporarily blinding and slowing most enemies.", ["↓","←","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("MD-17 Anti-Tank Mines", "Scatters powerful anti-tank mines that deal heavy, armor-penetrating damage. Minefield is less densely packed relative to smaller mines.", ["↓","←","↑","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("MD-I4 Incendiary Mines", "Deploys a defensive incendiary minefield, which will set both terrain and targets alight when triggered.", ["↓","←","←","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("MG-43 Machine Gun", "A machine gun designed for stationary use. Trades higher power for increased recoil and reduced accuracy.", ["↓","←","↓","↑","→"]));
        helldiverStratagems.push(new HelldiverStratagem("MG-206 Heavy Machine Gun", "A very powerful but difficult-to-wield machine gun with intense recoil.", ["↓","←","↑","↓","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("MLS-4X Commando", "An expendable missile launcher equipped with four laser-guided missiles.", ["↓","←","↑","↓","→"]));
        helldiverStratagems.push(new HelldiverStratagem("MS-11 Solo Silo", "A silo containing a single, powerful missile and an expendable handheld targeting remote.", ["↓","↑","→","↓","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital 120mm HE Barrage", "A precision artillery salvo over a small area, perfect for taking out concentrated enemy units.", ["→","→","↓","←","→","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital 380mm HE Barrage", "A prolonged barrage, wreaking extended destruction over a large area. Communication with teammates is advised.", ["→","↓","↑","↑","←","↓","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital Airburst Strike", "A projectile which explodes while airborne, creating a deadly rain of shrapnel. Not effective against heavy armor.", ["→","→","→"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital EMS Strike", "A \"compliance weapon\" to modify enemy behavior. The projectile temporarily stuns all targets within the strike radius.", ["→","→","←","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital Gas Strike", "A projectile which releases a cloud of corrosive gas, harmful to both organic and robotic lifeforms.", ["→","→","↓","→"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital Gatling Barrage", "A barrage of high explosive rounds, fired from the Destroyer's high speed rotary autocannons.", ["→","↓","←","↑","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital Laser", "The Destroyer's laser cannon will sweep over the designated area, vaporizing all targets within the effective radius.", ["→","↓","↑","→","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital Napalm Barrage", "Launches a prolonged barrage of napalm shells over a wide area, setting a swath of land ablaze in mere moments.", ["→","→","↓","←","→","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital Precision Strike", "A single precision shot from the Destroyer's 'ATLAS' cannon.", ["→","→","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital Railcannon Strike", "A high-velocity railcannon round fired at the largest target in close proximity to the beacon. Targeting is automatic.", ["→","↑","↓","↓","→"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital Smoke Strike", "Creates a large, thick smoke screen to block targets' line of sight.", ["→","→","↓","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital Walking Barrage", "A linear artillery barrage which moves at intervals, driving the enemy out from cover while allowing an advance.", ["→","↓","→","↓","→","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("PLAS-45 Epoch", "A powerful plasma weapon that fires one blast at a time, each blast exploding on impact. Must be charged to fire. Warning: do not overcharge.", ["↓","←","↑","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("RL-77 Airburst Rocket Launcher", "Fires a rocket that detonates within proximity of a target, and deploys a cluster of explosive bomblets.", ["↓","↑","↑","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("RS-422 Railgun", "An experimental weapon which prioritizes armor penetration. Must be charged between shots - choose targets carefully.", ["↓","→","↓","↑","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("S-11 Speargun", "A speargun that fires anti-tank projectiles. These projectiles release a cloud of gas on impact, and must be carefully loaded one at a time.", ["↓","→","↓","←","↑","→"]));
        helldiverStratagems.push(new HelldiverStratagem("SH-20 Ballistic Shield Backpack", "A backpack which can be wielded as a one-handed ballistic shield, protecting against small arms fire.", ["↓","←","↓","↓","↑","←"]));
        helldiverStratagems.push(new HelldiverStratagem("SH-32 Shield Generator Pack", "Encloses the wearer in a spherical shield which blocks high-speed projectiles. Has a limited lifetime once deployed.", ["↓","↑","←","→","←","→"]));
        helldiverStratagems.push(new HelldiverStratagem("SH-51 Directional Shield", "A one-handed device that deploys a wide energy barrier in front of the user. The barrier is semipermeable and blocks high-speed projectiles from the outside only, leaving the user free to shoot through it.", ["↓","↑","←","→","↑","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("StA-X3 W.A.S.P. Launcher", "A versatile missile launcher loaded with seven lock-on homing missiles. These can either be fired from the launcher directly or as an airburst. Includes support backpack required for reloading. Produced by Stål Arms.", ["↓","↓","↑","↓","→"]));
        helldiverStratagems.push(new HelldiverStratagem("TD-220 Bastion", "A heavily-armored tank destroyer armored with a 120mm high-velocity cannon and a heavy coaxial machinegun.", ["←","↓","→","↓","←","↓","↑","↓","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("TX-41 Sterilizer", "Atomizes caustic chemicals into a fine mist that liquifies sensitive electronics and tissues. Blinds and slows most enemies.", ["↓","←","↑","↓","←"]));
        helldiverStratagems.push(new HelldiverStratagem("Reinforce", "Used to call in a Helldiver if they have been eliminated.", ["↑","↓","→","←","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("SoS Beacon", "Used to get priority on the mission select screen to increase the chances of Helldivers joining and sets the lobby's visibility to public for the rest of the dive. Only usable by the host if there are 3 or less Helldivers present in the dive.", ["↑","↓","→","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Resupply", "Used to call in a Resupply.", ["↓","↓","↑","→"]));
        helldiverStratagems.push(new HelldiverStratagem("Eagle Rearm", "Used to send Eagle 1 back to the Super Destroyer Ship to resupply. Disabled if Eagle 1 has not expended any payloads or if no eagle stratagems were selected", ["↑","↑","←","↑","→"]));
        helldiverStratagems.push(new HelldiverStratagem("SSSD Delivery", "Used to call in the SSSD Hard Drive.", ["↓","↓","↓","↑","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Prospecting Drill", "Used to start the Main Objective of the Conduct Geological Survey Mission.", ["↓","↓","←","→","↓","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Super Earth Flag", "Used to start the Main Objective: Raise Super Earth Flag Mission.", ["↓","↑","↓","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Hellbomb", "Used to call in a Hellbomb.", ["↓","↑","←","↓","↑","→","↓","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Upload Data", "Used to start the Side Objective: Upload Escape Pod Data.", ["←","→","↑","↑","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Seismic Probe", "Used to start the Side Objective: Conduct Geological Survey.", ["↑","↑","←","→","↓","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Dark Fluid Vessel", "Event-exclusive stratagem for the Deploy Dark Fluid mission. Deploys a backpack full of Dark Fluid that acts as a more powerful Jump Pack when worn. Must be inserted into the Tectonic Drill.", ["↑","←","→","↓","↑","↑"]));
        helldiverStratagems.push(new HelldiverStratagem("Tectonic Drill", "Event-exclusive stratagem for the Deploy Dark Fluid mission. Deploys a drill to the surface which must be loaded with a Dark Fluid Vessel and then defended.", ["↑","↓","↑","↓","↑","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Hive Breaker Drill", "Used to start the Main Objective of the Nuke Nursery Mission.", ["←","↑","↓","→","↓","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Cargo Container", "Used to contain Fusion Batteries and High-Grade Platinum in the Confiscate Assets and Rapid Acquisition Missions.", ["↑","↑","↓","↓","→","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Orbital Illumination Flare", "Only found in the Stratagem Hero Game onboard the Super Destroyer.", ["→","→","←","←"]));
        helldiverStratagems.push(new HelldiverStratagem("SEAF Artillery", "Unlocked after completing the SEAF Artillery Side Objective. Used to call in an Artillery Strike. Damage and Effect of the strike depends on which Shells were loaded during the Side Objective.", ["→","↑","↑","↓"]));
        helldiverStratagems.push(new HelldiverStratagem("Call In Super Destroyer", "Used to call in the Super Destroyer for 1 minute during Commando Missions.", ["↑","↑","↓","↓","←","→","←","→"]));
        helldiverStratagems.sort((a, b) => 
            b.getArrowsInputs().length - a.getArrowsInputs().length
        );
        return helldiverStratagems;
    }

	public getName(): string {
		return this.name;
	}

	public getDescription(): string {
		return this.description;
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
}