// The campaign story (app.js storyScene / playScene): a scene at the START of every chapter (before its first battle)
// and one at its BOSS (when the boss walks onto the field), shown the first time on Easy and readable again from the
// chapter's Story button. Edit the text below freely: a heading "## CHAPTER n — START" or "## CHAPTER n — BOSS"
// starts a scene ("(filled in)" after it is ignored), every line "Speaker: text" is one line of it. "Narrator" is a
// line without a portrait, "Hero" is the player's own hero ({name} becomes the name they chose), any other speaker is a
// hero or boss of the game by its name (their portrait is shown: heroes on the left, bosses on the right).
//
// The central mystery: the Fate Shards are fragments of a prison holding back the Void Titan. The heroes believe they
// are collecting power to save the world, but every shard they gather brings the prison closer to breaking. The
// Fateborn is the one person who can unite the essences without being consumed by them.
var STORY_TEXT = `
## CHAPTER 1 — START (filled in)

Narrator: The Fallen Kingdom burns beneath a sky without stars. Monsters roam its streets, and the royal banners lie buried in ash.

Hero: Something brought me here. This shard reacts to the darkness, as if it knows what waits ahead.

Narrator: A wounded healer steps from the ruins, her green magic barely holding back the creatures closing in.

Draelyn: You're the one carrying the Aether shard, aren't you? Then perhaps our kingdom still has a chance.

Hero: I didn't come to be anyone's savior. But I won't leave these people to die.

Draelyn: Good. Stay alive long enough to regret saying that.

## CHAPTER 1 — BOSS (filled in)

Warlord Grakk: Another little hero come to die in my kingdom? I'll hang your bones beside the old king's crown!

Hero: You burned this kingdom and made its people afraid to leave their homes.

Warlord Grakk: Fear is useful. It makes the weak kneel.

Hero: Then watch closely, Grakk. I don't kneel.

Warlord Grakk: Come, Fateborn! Let me break that precious shard in your chest!

Narrator: Grakk raises his burning axe. The first battle for the fallen kingdom begins.

## CHAPTER 2 — START (filled in)

Narrator: Beyond the ruined capital lies an ancient crypt, where the dead whisper beneath stone ceilings and forgotten kings guard their secrets.

Bromir: I hate places where the dead get more comfortable beds than the living.

Skavren: Keep complaining. If something crawls out of a tomb, I'll let it eat you first.

Karnok: Can we save the arguing for after we find the exit?

Hero: The shard is pulling me deeper. Whatever lies below, it is connected to the darkness spreading across the kingdom.

Draelyn: Then we find the source. And if the dead know something, we'd better learn to listen.

## CHAPTER 2 — BOSS (filled in)

Bone King: The living return to my halls, carrying a shard that should never have left its prison.

Hero: You know what this crystal is?

Bone King: I know the chains it came from. I know the hands that broke them.

Skavren: That's a lot of words for a skeleton who could simply answer the question.

Bone King: Insolent creature. I shall strip the flesh from your bones and make you part of my court.

Hero: You won't silence the past again. Tell us what you know!

Narrator: The Bone King lifts his blackened crown, and the crypt answers with the sound of a thousand waking dead.

## CHAPTER 3 — START (filled in)

Narrator: The forest ahead has forgotten the meaning of life. Trees twist toward the sky, and poisoned roots spread beneath the soil.

Vaessa: The corruption is not natural. Something has turned the forest against itself.

Draelyn: I can feel the life still trapped inside these trees. It is frightened, and it is in pain.

Hero: Then we find what is poisoning it and put an end to this.

Skavren: Lovely. A forest that wants us dead. I was beginning to miss ordinary roads.

Vaessa: Stay close. The shadows here move even when nothing else does.

## CHAPTER 3 — BOSS (filled in)

The Corrupted Treant: LITTLE FLAMES OF LIFE. YOU TRESPASS UPON MY ROOTS.

Hero: You were a guardian once. What happened to you?

The Corrupted Treant: THE LIGHT BENEATH THE WORLD HAS TURNED SOUR. MY ROOTS DRINK ITS POISON.

Draelyn: There's still life in you. Let us cleanse the corruption.

The Corrupted Treant: NO CURE. NO MERCY. ONLY GROWTH THROUGH DECAY.

Vaessa: It cannot hear us anymore. Whatever has infected it has taken control.

Narrator: The Treant tears its roots from the earth and rises to crush the intruders.

## CHAPTER 4 — START (filled in)

Narrator: The road leads into a land torn apart by war. Demonic fires burn across the horizon, and desperate armies fight over the last safe ground.

Brukkar: I've seen raiders, warlords, and things that crawl out of caves. These demons make them look friendly.

Karnok: You calling yourself friendly now?

Brukkar: Don't push your luck, storm boy.

Hero: These forces are moving with purpose. They are not simply destroying everything in their path.

Draelyn: Then someone is directing them. Find that leader, and we may learn why the war began.

Hero: We push through the battlefield and stop their advance.

## CHAPTER 4 — BOSS (filled in)

Infernal Overlord: You have crossed my battlefield and mistaken survival for strength.

Hero: Your armies have burned villages and slaughtered anyone who stood in their way.

Infernal Overlord: The weak were always destined to burn. I merely bring the future closer.

Brukkar: I've had enough of listening to things that smell like a furnace.

Infernal Overlord: Kneel, little heroes, and I may let your souls serve me.

Hero: You will not take another step toward our home.

Narrator: The Overlord's flames surge across the battlefield, and the earth trembles beneath its power.

## CHAPTER 5 — START (filled in)

Narrator: Far to the north, the world lies frozen beneath endless snow. Old roads vanish beneath ice, and ancient structures sleep inside glaciers.

Bromir: Home sweet home. Nothing like a frozen wasteland to make you appreciate a warm bed.

Faedrin: The cold here feels wrong. It is not weather alone. Something is draining the warmth from the land.

Hero: The shard grows colder with every step. Whatever waits ahead is tied to this unnatural frost.

Draelyn: Then we keep moving. If the source is left untouched, the cold will spread south.

Bromir: Fine. But if anyone suggests swimming through an icy lake, I'm leaving them behind.

## CHAPTER 5 — BOSS (filled in)

Frost Colossus: TRESPASSERS. YOUR WARMTH WILL FEED THE ICE.

Hero: Why have you frozen this land? What are you guarding?

Frost Colossus: THE OLD SEAL MUST SLEEP. ALL LIFE MUST BE STILL.

Faedrin: This is not protection. People are dying because of your endless winter.

Frost Colossus: LIFE ENDS. ICE REMAINS.

Hero: Then the ice ends here.

Narrator: The Colossus draws the cold into its enormous fists, and the ground freezes solid beneath the heroes.

## CHAPTER 6 — START (filled in)

Narrator: The Kingdom of Shadows has no dawn. Umbral towers loom over silent streets, and darkness flows through the land like a living tide.

Skavren: At last, a place where nobody can complain about the weather. They can barely see it.

Vorlund: Do not mistake silence for peace. This kingdom has been conquered from within.

Hero: The Umbral essence is stronger here than anywhere we've seen. Something is feeding it.

Draelyn: We must reach the heart of this kingdom before its shadow spreads beyond these borders.

Vorlund: The Nether Queen rules here. Every road leads to her throne, and every road is a trap.

## CHAPTER 6 — BOSS (filled in)

Nether Queen: The Fateborn arrives at last. I wondered when the shard would bring you to my door.

Hero: You know why I carry it. Tell me what you want with the essences.

Nether Queen: Want? I serve a design older than kings. The world must be emptied before it can be remade.

Vorlund: You would condemn every living soul to darkness for the sake of a design?

Nether Queen: The living are merely sparks waiting to fade.

Hero: Then I will be the storm that puts out your darkness.

Narrator: The Nether Queen rises from her throne, and shadows gather around her like a crown.

## CHAPTER 7 — START (filled in)

Narrator: The Stormbound Realm lies beneath a sky that never rests. Lightning tears through ruined towers, and elemental energy scars the earth.

Karnok: Now this is weather I understand. Though the lightning seems a little too eager to meet us.

Valkessa: The storms are following a pattern. They are being drawn toward one place.

Hero: The shard is reacting to every strike. Something here is calling to the Aether inside me.

Draelyn: Then the storm is more than destruction. It may be protecting a secret.

Valkessa: Whatever waits at the center has survived every storm this land could throw at it. We should be careful.

## CHAPTER 7 — BOSS (filled in)

Storm Behemoth: I AM THE LAST WARNING. TURN BACK BEFORE THE SKY BREAKS.

Hero: You guard this land, but the storms are destroying it. Why continue?

Storm Behemoth: THE ESSENCES ARE FALLING OUT OF BALANCE. MY STORMS HOLD THE FRACTURE CLOSED.

Karnok: You call this holding it closed? The whole mountain is coming apart!

Storm Behemoth: BETTER A BROKEN LAND THAN A BROKEN WORLD.

Hero: Then let us find another way. We will not leave this world to die.

Narrator: The Behemoth roars, and lightning converges upon its body until the entire plateau shines white.

## CHAPTER 8 — START (filled in)

Narrator: Beyond the storm lies an abandoned temple, where enormous statues watch over a civilization that vanished long ago.

Aurelion: These halls were built to honor the gods. Their names were erased, but their power remains.

Celesthyr: The essences did not arise by chance. Someone shaped the laws that bind them.

Hero: Then the gods may know why the world is falling apart.

Draelyn: Or they may be the reason it is happening. We must be ready for either answer.

Aurelion: The Celestial Guardian waits beyond these steps. It will not let us approach the truth without a trial.

## CHAPTER 8 — BOSS (filled in)

Celestial Guardian: Mortals, you stand before a sealed truth. Turn away, and your world may yet endure.

Hero: The world is already dying. We have a right to know why.

Celestial Guardian: Knowledge is a blade. In unworthy hands, it cuts deeper than ignorance.

Celesthyr: You speak of worth, yet your silence has allowed corruption to spread across every land.

Celestial Guardian: The seals were made to protect creation, not satisfy the curiosity of mortals.

Hero: Then test us. But you will not keep us blind.

Narrator: The Guardian raises its radiant weapon, and golden light fills the temple steps.

## CHAPTER 9 — START (filled in)

Narrator: Reality fractures beneath your feet. Crystals hang in the air, the sky splits into impossible shapes, and distant places flicker between existence and nothing.

Liora: The shards are not simply sources of power. They are fragments of something much larger.

Hero: You know what they really are?

Liora: Pieces of the prison that holds the Void Titan. Every shard gathered brings the pieces closer together, but also weakens the seal.

Thalnir: Then all our victories may have helped the thing we were trying to stop.

Hero: We were never meant to collect power blindly. We need to learn how to restore the seal.

Liora: The Crystal Titan holds the oldest memory of the shards. Defeat it, and the truth may finally be complete.

## CHAPTER 9 — BOSS (filled in)

Crystal Titan: THE SHARDS REMEMBER. THE SHARDS BLEED. THE SHARDS CALL THEIR MAKER.

Hero: Tell me how to stop the Void Titan. I will not let the world end.

Crystal Titan: EACH FRAGMENT IS A LOCK. EACH LOCK IS A WOUND. YOU HAVE OPENED THEM ALL.

Thalnir: Then we close them. Tell us how.

Crystal Titan: THE FATEBORN IS THE KEY. AETHER CAN UNITE WHAT THE OTHER ESSENCES DIVIDE.

Hero: Then I will use the shard for what it was meant to do.

Narrator: The Crystal Titan's body lights from within, revealing a vision of a vast darkness waiting beyond the broken sky.

## CHAPTER 10 — START (filled in)

Narrator: At the edge of the world, the final gate stands open. Beyond it churns a void that swallows light, sound, and memory.

Hero: This ends here. No more lands lost, no more lives sacrificed to a secret.

Thalnir: The essences are answering your shard. For the first time, they are moving together.

Draelyn: Whatever waits beyond that gate, you will not face it alone.

Liora: Remember what we learned. The shards are locks, not trophies. We must restore their bond, not unleash their power.

Hero: Then stay close. We finish this together.

Narrator: The gate groans open, and the darkness beyond begins to take shape.

## CHAPTER 10 — BOSS (filled in)

Void Titan: FATEBORN. YOU HAVE GATHERED MY CHAINS AND CARRIED THEM TO MY DOOR.

Hero: I gathered them to understand what was happening. I will not let you consume this world.

Void Titan: THIS WORLD WAS BUILT UPON MY PRISON. EVERY KINGDOM, EVERY ESSENCE, EVERY LIFE IS A CRACK IN MY CAGE.

Liora: Do not listen. It wants you to believe the world cannot survive without it.

Void Titan: AETHER IS MINE. THE SHARD IS MINE. YOUR FATE WAS WRITTEN BEFORE YOUR FIRST BREATH.

Hero: Fate is not a chain. I choose what happens next.

Narrator: The Fate Shard blazes with all seven essences. The Void Titan rises, and the final battle begins.
`;
