# Requirements Document

## Introduction

Card Mystery Realm (卡片秘境) is a card collection game that leverages psychological principles including variable reinforcement, near-miss effects, social comparison, and sunk cost to create an engaging and addictive gameplay experience. The game combines gacha mechanics, card synthesis with risk/reward dynamics, random events, social features, and a trading market to maximize player engagement and retention.

## Glossary

- **Card_Drawing_System**: The subsystem responsible for generating random card drops based on pack type and probability distributions
- **Card_Synthesis_System**: The subsystem that combines multiple cards to create higher-tier cards with success probabilities
- **Random_Event_System**: The subsystem that triggers time-limited special events with configurable probability rates
- **Social_System**: The subsystem managing friend galleries, likes, comments, and social leaderboards
- **Trading_Market**: The subsystem enabling player-to-player card exchanges with dynamic pricing
- **Achievement_System**: The subsystem tracking and rewarding player milestones and accomplishments
- **Season_System**: The subsystem managing time-limited content cycles and battle pass progression
- **Luck_Value**: A hidden numerical value that increases drop rates after unsuccessful legendary pulls
- **Soft_Currency**: In-game currency earned through gameplay (coins)
- **Hard_Currency**: Premium currency obtained through purchases or special rewards
- **Near_Miss_Effect**: Visual animation showing rare cards that do not actually drop
- **Guaranteed_Drop**: A pity system ensuring specific rarity after a fixed number of pulls
- **Card_Rarity**: Classification system with tiers: Common, Rare, Epic, Legendary
- **Gallery**: A player's personal card display space visible to friends
- **Battle_Pass**: A progression system with free and paid reward tracks
- **Limited_Edition_Card**: Numbered cards with unique identifiers and owner attribution

## Requirements

### Requirement 1: Card Drawing System

**User Story:** As a player, I want to draw cards from different pack types with varying probabilities, so that I can collect rare cards and experience the excitement of random rewards.

#### Acceptance Criteria

1. WHEN a player purchases a Basic Pack for 100 coins, THE Card_Drawing_System SHALL generate one card with 0.5% legendary probability, 5% epic probability, and remaining probability distributed to lower rarities
2. WHEN a player purchases a Premium Pack for 500 coins, THE Card_Drawing_System SHALL generate one card with 2% legendary probability and 15% epic probability
3. WHEN a player completes 10 Premium Pack draws without receiving an epic card, THE Card_Drawing_System SHALL guarantee an epic card on the 10th draw
4. WHEN a player purchases a Legendary Pack for 2000 coins, THE Card_Drawing_System SHALL generate one card with 10% legendary probability and 40% epic probability
5. THE Card_Drawing_System SHALL limit Legendary Pack purchases to 3 per week per player
6. WHEN a player draws a card without receiving a legendary, THE Card_Drawing_System SHALL increment the player's Luck_Value by a configured amount
7. WHEN a player's Luck_Value exceeds a configured threshold, THE Card_Drawing_System SHALL increase legendary drop probability proportionally
8. WHEN a player receives a legendary card, THE Card_Drawing_System SHALL reset the player's Luck_Value to zero
9. WHEN a card draw is processed, THE Card_Drawing_System SHALL display a near-miss animation for rare cards with a configured probability
10. FOR ALL card draws, THE Card_Drawing_System SHALL use deterministic random algorithms synchronized between client and server

### Requirement 2: Card Synthesis System

**User Story:** As a player, I want to combine cards with different success rates and risk levels, so that I can upgrade my collection and experience strategic gambling mechanics.

#### Acceptance Criteria

1. WHEN a player selects 3 identical cards for Normal Synthesis, THE Card_Synthesis_System SHALL produce a higher-tier card with 100% success rate
2. WHEN a player selects 2 identical cards and 1 different card for Advanced Synthesis, THE Card_Synthesis_System SHALL produce a higher-tier card with 70% success rate
3. WHEN a player selects 1 card and 1 rare material for Gambler Synthesis, THE Card_Synthesis_System SHALL produce a higher-tier card with 50% success rate
4. WHEN a player selects 5 epic cards for Legendary Synthesis, THE Card_Synthesis_System SHALL produce a legendary card with 30% success rate
5. WHEN a synthesis attempt fails, THE Card_Synthesis_System SHALL consume the input cards and return no output card
6. WHEN a synthesis attempt succeeds, THE Card_Synthesis_System SHALL display visual feedback with fire or lightning particle effects
7. WHEN a synthesis attempt fails, THE Card_Synthesis_System SHALL display card breaking particle effects
8. WHILE a Lucky Moment event is active, THE Card_Synthesis_System SHALL increase all synthesis success rates by 20 percentage points

### Requirement 3: Random Event System

**User Story:** As a player, I want to encounter random special events during gameplay, so that I experience surprise elements and time-limited opportunities.

#### Acceptance Criteria

1. WHEN a player performs any game action, THE Random_Event_System SHALL trigger a Mysterious Merchant event with 10% probability
2. WHEN a Mysterious Merchant event triggers, THE Random_Event_System SHALL offer special card packs or materials for purchase
3. WHEN a player performs any game action, THE Random_Event_System SHALL trigger a Card Storm event with 5% probability
4. WHEN a Card Storm event triggers, THE Random_Event_System SHALL grant the player 3 free card draws
5. WHEN a player performs any game action, THE Random_Event_System SHALL trigger a Lucky Moment event with 15% probability
6. WHEN a Lucky Moment event triggers, THE Random_Event_System SHALL apply a 20% synthesis success rate bonus for 10 minutes
7. WHEN a player performs any game action, THE Random_Event_System SHALL trigger a Copy Miracle event with 10% probability
8. WHEN a Copy Miracle event triggers, THE Random_Event_System SHALL duplicate one random card from the player's collection
9. THE Random_Event_System SHALL display event notifications with distinctive visual and audio feedback

### Requirement 4: Social System

**User Story:** As a player, I want to view and interact with my friends' card collections, so that I can compare progress and feel motivated by social competition.

#### Acceptance Criteria

1. THE Social_System SHALL allow players to create a Gallery displaying up to 50 selected cards
2. WHEN a player visits a friend's Gallery, THE Social_System SHALL display all cards in the friend's Gallery
3. THE Social_System SHALL allow players to like a friend's Gallery once per day
4. THE Social_System SHALL allow players to comment on a friend's Gallery with text messages
5. WHEN a player's Gallery receives a like, THE Social_System SHALL grant the player 10 Soft_Currency
6. WHEN a player's Gallery receives a comment, THE Social_System SHALL grant the player 5 Soft_Currency
7. THE Social_System SHALL provide an "Envy" feature that allows players to mark specific cards they admire
8. THE Social_System SHALL maintain a Gallery Leaderboard ranking players by total card score
9. THE Social_System SHALL maintain a Gallery Leaderboard ranking players by rarity score
10. THE Social_System SHALL maintain a Gallery Leaderboard ranking players by creativity score based on likes and comments
11. THE Social_System SHALL update all leaderboards in real-time using the database's real-time capabilities

### Requirement 5: Trading Market

**User Story:** As a player, I want to trade cards with other players in a dynamic market, so that I can acquire specific cards and experience economic gameplay.

#### Acceptance Criteria

1. THE Trading_Market SHALL allow players to list cards for sale with a specified price in Soft_Currency
2. THE Trading_Market SHALL allow players to purchase listed cards from other players
3. WHEN a card is sold, THE Trading_Market SHALL transfer the card to the buyer and the payment to the seller
4. THE Trading_Market SHALL calculate and display market price trends based on recent transaction history
5. THE Trading_Market SHALL adjust suggested prices based on card supply and demand
6. WHERE a card is a Limited_Edition_Card, THE Trading_Market SHALL display the card's unique number and original owner name
7. THE Trading_Market SHALL preserve Limited_Edition_Card numbering and owner attribution through all trades
8. THE Trading_Market SHALL charge a 5% transaction fee on all sales

### Requirement 6: Achievement System

**User Story:** As a player, I want to unlock achievements for various accomplishments, so that I feel rewarded for my progress and discover hidden goals.

#### Acceptance Criteria

1. WHEN a player completes a full card series, THE Achievement_System SHALL unlock a Collection Achievement and grant rewards
2. WHEN a player owns 10 or more legendary cards, THE Achievement_System SHALL unlock a Rarity Achievement and grant rewards
3. WHEN a player's Gallery receives 1000 or more total likes, THE Achievement_System SHALL unlock a Social Achievement and grant rewards
4. WHEN a player triggers the Mysterious Merchant event on 3 consecutive days, THE Achievement_System SHALL unlock a Random Achievement and grant rewards
5. THE Achievement_System SHALL display achievement progress as a percentage for trackable achievements
6. THE Achievement_System SHALL hide specific unlock conditions for secret achievements
7. WHEN an achievement is unlocked, THE Achievement_System SHALL display a celebration animation and audio effect
8. THE Achievement_System SHALL grant Soft_Currency, Hard_Currency, or exclusive cards as achievement rewards

### Requirement 7: Season System

**User Story:** As a player, I want to participate in seasonal content cycles with exclusive rewards, so that I have ongoing goals and reasons to return regularly.

#### Acceptance Criteria

1. THE Season_System SHALL create a new season every 3 months with a unique card series
2. WHEN a new season begins, THE Season_System SHALL introduce season-exclusive card packs
3. THE Season_System SHALL provide a Battle_Pass with a free reward track and a paid reward track
4. WHEN a player completes daily missions, THE Season_System SHALL grant Battle_Pass experience points
5. WHEN a player completes weekly missions, THE Season_System SHALL grant Battle_Pass experience points
6. WHEN a player's Battle_Pass level increases, THE Season_System SHALL unlock rewards on the appropriate track
7. THE Season_System SHALL make season-exclusive cards unavailable after the season ends
8. WHEN a season ends, THE Season_System SHALL archive player progress and reset seasonal leaderboards
9. THE Season_System SHALL host time-limited events such as double probability weekends
10. THE Season_System SHALL host time-limited events such as synthesis success rate festivals

### Requirement 8: Retention and Daily Engagement

**User Story:** As a player, I want to receive daily rewards and missions, so that I am motivated to log in regularly and maintain engagement.

#### Acceptance Criteria

1. WHEN a player logs in each day, THE Season_System SHALL grant daily login rewards with increasing value for consecutive days
2. THE Season_System SHALL reset consecutive login streaks if a player misses a day
3. THE Season_System SHALL generate 3 daily missions for each player at midnight UTC
4. THE Season_System SHALL generate 3 weekly missions for each player at the start of each week
5. WHEN a player completes a daily mission, THE Season_System SHALL grant Soft_Currency and Battle_Pass experience
6. WHEN a player completes a weekly mission, THE Season_System SHALL grant larger Soft_Currency rewards and Battle_Pass experience
7. WHEN a player returns after 7 or more days of inactivity, THE Season_System SHALL grant return rewards including free card packs
8. WHEN a player experiences 3 consecutive synthesis failures, THE Season_System SHALL activate failure protection increasing the next synthesis success rate by 10 percentage points

### Requirement 9: Personalization System

**User Story:** As a player, I want to receive personalized recommendations and emotional feedback, so that the game feels tailored to my preferences and play style.

#### Acceptance Criteria

1. THE Card_Drawing_System SHALL track which card types and themes each player collects most frequently
2. WHEN displaying pack recommendations, THE Card_Drawing_System SHALL prioritize packs containing cards matching the player's collection preferences
3. WHEN a player experiences multiple unsuccessful draws, THE Card_Drawing_System SHALL display encouraging messages
4. WHEN a player achieves a rare card, THE Card_Drawing_System SHALL display congratulatory messages with personalized references to the player's collection
5. THE Social_System SHALL recommend friends with similar collection themes or play styles
6. THE Achievement_System SHALL highlight achievements that align with the player's demonstrated play patterns

### Requirement 10: Audio and Visual Feedback

**User Story:** As a player, I want to experience rich audio and visual feedback during gameplay, so that I feel immersed and emotionally engaged with game events.

#### Acceptance Criteria

1. WHEN a card is drawn, THE Card_Drawing_System SHALL display a 3D card flip animation using the 3D rendering library
2. WHEN a legendary card is drawn, THE Card_Drawing_System SHALL display enhanced particle effects with gold coloring
3. WHEN a near-miss occurs, THE Card_Drawing_System SHALL briefly display the rare card with a flash animation before revealing the actual card
4. WHEN a synthesis succeeds, THE Card_Synthesis_System SHALL play success sound effects with randomized pitch variation
5. WHEN a synthesis fails, THE Card_Synthesis_System SHALL play failure sound effects and display card breaking physics effects
6. WHEN a random event triggers, THE Random_Event_System SHALL play distinctive event music and display full-screen event animations
7. THE Card_Drawing_System SHALL use timeline-based animation sequencing for smooth card reveal sequences
8. THE Card_Synthesis_System SHALL use physics simulation for realistic card breaking and particle dispersion effects

### Requirement 11: Monetization System

**User Story:** As a player, I want optional ways to support the game and accelerate progress, so that I can choose my level of investment while maintaining fair gameplay.

#### Acceptance Criteria

1. THE Trading_Market SHALL support both Soft_Currency and Hard_Currency for transactions
2. WHERE a player purchases a Monthly Card, THE Season_System SHALL grant daily Hard_Currency for 30 consecutive days
3. THE Card_Drawing_System SHALL offer limited-time card packs purchasable only with Hard_Currency
4. THE Social_System SHALL offer cosmetic gallery skins purchasable with Hard_Currency
5. THE Card_Drawing_System SHALL offer cosmetic card backs and visual effects purchasable with Hard_Currency
6. THE Season_System SHALL offer the paid Battle_Pass track for Hard_Currency
7. THE Trading_Market SHALL allow all gameplay-affecting cards to be obtainable through Soft_Currency or gameplay
8. THE Achievement_System SHALL grant small amounts of Hard_Currency as rewards for major achievements

### Requirement 12: Data Synchronization and Integrity

**User Story:** As a player, I want my game progress to be accurately saved and synchronized, so that I never lose progress and experience consistent gameplay across sessions.

#### Acceptance Criteria

1. THE Card_Drawing_System SHALL synchronize all card draws with the server before displaying results to the player
2. THE Card_Synthesis_System SHALL validate synthesis attempts on the server before processing results
3. THE Trading_Market SHALL use database transactions to ensure atomic card and currency transfers
4. WHEN a network error occurs during a card draw, THE Card_Drawing_System SHALL retry the operation or refund the cost
5. WHEN a network error occurs during synthesis, THE Card_Synthesis_System SHALL not consume input cards until server confirmation
6. THE Social_System SHALL use real-time database subscriptions to update leaderboards and galleries without page refresh
7. THE Season_System SHALL persist all player progress, missions, and Battle_Pass state to the database
8. THE Achievement_System SHALL validate achievement unlocks on the server to prevent client-side manipulation

### Requirement 13: Card Drawing Parser and Serialization

**User Story:** As a developer, I want to parse and serialize card draw configurations, so that I can define probability distributions and pack types in a maintainable format.

#### Acceptance Criteria

1. WHEN a valid card pack configuration file is provided, THE Card_Drawing_System SHALL parse it into a Pack_Configuration object
2. WHEN an invalid card pack configuration file is provided, THE Card_Drawing_System SHALL return a descriptive error message
3. THE Card_Drawing_System SHALL provide a configuration formatter that outputs Pack_Configuration objects as valid configuration files
4. FOR ALL valid Pack_Configuration objects, parsing then formatting then parsing SHALL produce an equivalent Pack_Configuration object (round-trip property)
5. THE Card_Drawing_System SHALL validate that all probability values sum to 100% for each pack type
6. THE Card_Drawing_System SHALL validate that all referenced card rarities exist in the Card_Rarity enumeration

### Requirement 14: Random Event Configuration Parser

**User Story:** As a developer, I want to parse and serialize random event configurations, so that I can adjust event probabilities and rewards without code changes.

#### Acceptance Criteria

1. WHEN a valid event configuration file is provided, THE Random_Event_System SHALL parse it into an Event_Configuration object
2. WHEN an invalid event configuration file is provided, THE Random_Event_System SHALL return a descriptive error message
3. THE Random_Event_System SHALL provide a configuration formatter that outputs Event_Configuration objects as valid configuration files
4. FOR ALL valid Event_Configuration objects, parsing then formatting then parsing SHALL produce an equivalent Event_Configuration object (round-trip property)
5. THE Random_Event_System SHALL validate that all event probability values are between 0% and 100%
6. THE Random_Event_System SHALL validate that all event duration values are positive integers

