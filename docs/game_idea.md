This sounds like a fantastic foundation for a stylized, addictive Action RPG. The name **"Vibeland"** suggests a game that relies heavily on "game feel"—satisfying impacts, smooth animations, and perhaps a colorful, distinct art style (colored cube models).

Here is the completed Game Design Document (GDD), expanding on your structure with creative enemies, props, points of interest (POIs), and bosses.

---

# ⚔️ Vibeland: Game Design Document

**Genre:** Isometric 3D Hack 'n Slash
**Core Loop:** Explore  Fight  Loot  Unlock Biome
**Visual Style:** Vibrant, distinct color palettes per biome, chunky readable silhouettes.

---

## 🌲 Biome 1: The Whispering Woods

*A lush, overgrown forest where sunlight dapples through the leaves, but ancient machinery rusts in the shadows.*

### Props (Environmental Assets)

* **Destructible:** Hollow rotting logs, clusters of glowing mushrooms, stacked crate supplies.
* **Static:** Ancient rune stones (cover), giant fern leaves (hiding spots), rusted gears half-buried in dirt.

### Enemies

* **Slime:** Basic melee enemy. Splits into two smaller slimes on death.
* **Undead Squire:** Slow moving, shielded skeleton. Requires a heavy attack to break guard.
* **Shore Crab:** Found near water edges. High armor, scuttles sideways, snaps quickly.
* **Spore Puffer:** Stationary plant. Explodes into poison gas if the player gets too close.

### Points of Interest (POIs)

* **The Hero’s Grave:** An overgrown tombstone in a clearing.
* *Reward:* **Lost Stone Sword** (High knockback, low speed).


* **The Smuggler’s Cove:** A hidden cave behind a waterfall near the beach area.
* *Reward:* **Rusty Key** (Opens chests in Biome 1).


* **The Elder Stump:** A massive tree cut down centuries ago, now a platform.
* *Reward:* **Health Injector Upgrade.**



### Mini-Bosses

1. **Moss-Clad Sentinel:** A large stone golem covered in vines. Uses slow, telegraphing slam attacks.
2. **Bandit Kingpin:** A fast, dual-wielding human enemy who uses smoke bombs to teleport short distances.

### 💀 Biome Boss: King Jelly

**The Giant Slime.**

* **Phase 1:** Jumps around the arena trying to crush the player.
* **Phase 2:** Absorbs the "Spore Puffer" enemies, turning green and leaving acid trails.
* **On Defeat:** Drops the **Emerald Key**  Unlocks the Desert Gate.

---

## 🏜️ Biome 2: The Scorch-Winds

*A harsh, orange-hued wasteland dotted with the white bones of giants and crumbling sandstone ruins.*

### Props (Environmental Assets)

* **Destructible:** Dried clay pots, tumbleweeds (physics objects), brittle bone piles.
* **Static:** Sun-bleached rib cages (arches), tall cacti, sandstone pillars.

### Enemies

* **Sand Scuttler:** Small, fast scorpion-like creatures that attack in swarms.
* **Dust Devil:** An elemental of spinning wind. Immune to ranged attacks (deflects projectiles).
* **Cactus Mimic:** Looks like a prop until the player strikes it, then attacks with spikes.
* **Sun Cultist:** Ranged enemy casting fireballs from atop ruins.

### Points of Interest (POIs)

* **The Mirage Oasis:** A beautiful pool of water that vanishes if you approach, revealing a trap.
* *Reward:* **Mirage Cloak** (Grants a dodge-roll invulnerability frame).


* **The Sunken Library:** A temple half-buried in sand.
* *Reward:* **Scroll of Meteor** (Unlocks a special area-of-effect ability).


* **The Merchant’s Wreck:** A crashed sand-barge.
* *Reward:* **Gold Hoard** (Currency boost).



### Mini-Bosses

1. **Dune Shark:** Swims *under* the sand. The player must wait for it to breach to attack.
2. **High Priest Solis:** Floats in the air, summoning laser beams from the sky.

### 💀 Biome Boss: The Obsidian Sphinx

**A construct of black stone and gold.**

* **Phase 1:** Asks a "riddle" (a pattern of floor tiles lighting up) that the player must dodge.
* **Phase 2:** The wings animate. It flies up and rains fire down on the arena.
* **On Defeat:** Drops the **Ruby Key**  Unlocks the Ice Gate.

---

## ❄️ Biome 3: The Glacial Spire

*A vertical progression biome. Slippery blue ice, purple auroras in the sky, and sharp crystalline structures.*

### Props (Environmental Assets)

* **Destructible:** Ice stalagmites, frozen supply crates, crystallized bushes.
* **Static:** Giant frozen waterfalls, mirrors of ice (reflect player), dark pine trees heavy with snow.

### Enemies

* **Frost Wolf:** Fast pack hunters. Their bites apply a "Slow" debuff.
* **Crystal Golem:** Heavily armored. When hit, shards fly off dealing damage to the player if too close.
* **Wraith:** Flying ghost enemies that can pass through obstacles.
* **Yeti:** Massive health pool. Throws giant snowballs that stun the player.

### Points of Interest (POIs)

* **The Frozen Throne:** A seat carved into the peak of a mountain.
* *Reward:* **Crown of Winter** (Attacks have a chance to freeze enemies).


* **The Thermal Vent:** A rare warm spot with steam.
* *Reward:* **Stamina Elixir** (Permanently increases max stamina).


* **The Mirror Cave:** A room full of reflective surfaces.
* *Reward:* **Diamond Daggers** (Highest attack speed weapon).



### Mini-Bosses

1. **Alpha Winter-Fang:** A massive wolf with ice armor. It howls to summon regular wolves.
2. **The Frozen Knight:** A warrior frozen in a block of ice who breaks free. Uses a massive greatsword.

### 💀 Biome Boss: Permafrost Wyvern

**The Guardian of the Peak.**

* **Phase 1:** Grounded fight. Bites and tail swipes. The floor is slippery (ice physics).
* **Phase 2:** Takes flight. The player must use ballistae (turrets) found in the arena to ground it.
* **On Defeat:** Drops the **Vibeland Core** (The Game Completion Item).