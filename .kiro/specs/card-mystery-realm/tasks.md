# Implementation Plan: Card Mystery Realm

## Overview

This implementation plan breaks down the Card Mystery Realm system into discrete coding tasks. The system includes card drawing with gacha mechanics, card synthesis with risk levels, random events, social features, trading market, achievements, seasons, and client-side 3D animations. All tasks build incrementally with property-based tests to validate the 49 correctness properties defined in the design.

The implementation uses TypeScript for backend services and client-side logic, with Three.js, GSAP, and Ammo.js for 3D animations and physics.

## Tasks

- [x] 1. Set up project structure and core infrastructure
  - Create TypeScript project with backend and client directories
  - Set up database schema and connection utilities
  - Configure Redis cache connection
  - Set up API gateway with REST and WebSocket support
  - Create shared type definitions for Card, Player, and core entities
  - Set up testing framework (Jest) with fast-check for property-based testing
  - _Requirements: 12.1, 12.2, 12.6, 12.7_

- [ ] 2. Implement deterministic random number generation
  - [x] 2.1 Create SeededRandom class with linear congruential generator
    - Implement next(), nextInRange() methods
    - _Requirements: 1.10_
  
  - [x] 2.2 Write property test for deterministic reproduction
    - **Property 7: Deterministic draw reproduction**
    - **Validates: Requirements 1.10**

- [ ] 3. Implement Card Drawing Service core logic
  - [x] 3.1 Create PackConfiguration data model and validation
    - Implement probability validation (sum to 100%)
    - Implement rarity enumeration validation
    - _Requirements: 1.1, 1.2, 1.4, 13.5, 13.6_
  
  - [x] 3.2 Implement LuckValueCalculator class
    - Implement calculateBonusProbability() method
    - Implement updateLuckValue() method
    - _Requirements: 1.6, 1.7, 1.8_
  
  - [x] 3.3 Write property tests for luck value system
    - **Property 4: Luck value accumulation**
    - **Property 5: Luck value probability boost**
    - **Property 6: Luck value reset on legendary**
    - **Validates: Requirements 1.6, 1.7, 1.8**

  - [x] 3.4 Implement card draw generation algorithm
    - Implement generateCardDraw() with probability distribution
    - Apply luck value bonuses to legendary probability
    - Integrate with SeededRandom for deterministic results
    - _Requirements: 1.1, 1.2, 1.4, 1.7_
  
  - [x] 3.5 Write property tests for pack probability distribution
    - **Property 1: Pack probability distribution adherence**
    - **Validates: Requirements 1.1, 1.2, 1.4**
  
  - [x] 3.6 Implement pity system for guaranteed drops
    - Track draws since last epic/legendary
    - Force guaranteed drop at threshold
    - _Requirements: 1.3_
  
  - [x] 3.7 Write property test for pity system
    - **Property 2: Pity system guarantee**
    - **Validates: Requirements 1.3**
  
  - [x] 3.8 Implement NearMissGenerator class
    - Implement shouldShowNearMiss() method
    - Implement generateNearMissCard() method
    - _Requirements: 1.9_
  
  - [x] 3.9 Write property test for near-miss display probability
    - **Property 8: Near-miss display probability**
    - **Validates: Requirements 1.9**

- [ ] 4. Implement Card Drawing Service API endpoints
  - [x] 4.1 Create POST /api/v1/cards/draw endpoint
    - Validate pack type and currency
    - Check purchase limits for legendary packs
    - Execute draw with server-side seed generation
    - Update player inventory and luck value
    - Return cards, near-miss data, and transaction ID
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 12.1_
  
  - [x] 4.2 Write property test for purchase limit enforcement
    - **Property 3: Purchase limit enforcement**
    - **Validates: Requirements 1.5**
  
  - [x] 4.3 Create GET /api/v1/cards/packs endpoint
    - Return all available pack configurations
    - Filter by availability dates and season exclusivity
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [x] 4.4 Create GET /api/v1/cards/luck endpoint
    - Return player's current luck value and draw count
    - _Requirements: 1.6, 1.7_
  
  - [x] 4.5 Implement network error recovery for card draws
    - Add retry logic with exponential backoff
    - Implement automatic refund on failure
    - _Requirements: 12.4_
  
  - [x] 4.6 Write property test for network error recovery
    - **Property 40: Network error recovery**
    - **Validates: Requirements 12.4**

- [x] 5. Checkpoint - Ensure card drawing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Card Synthesis Service core logic
  - [x] 6.1 Create SynthesisRecipe data model
    - Define recipe types: normal, advanced, gambler, legendary
    - Define input requirements and success rates
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 6.2 Implement SynthesisCalculator class
    - Implement calculateSuccessRate() with event modifiers
    - Implement performSynthesis() with random determination
    - Apply failure protection bonus after 3 failures
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.8, 8.8_
  
  - [x] 6.3 Write property tests for synthesis success rates
    - **Property 9: Synthesis success rate adherence**
    - **Property 11: Lucky Moment synthesis bonus**
    - **Property 12: Failure protection activation**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.8, 8.8**

  - [x] 6.4 Implement synthesis card consumption logic
    - Validate input cards exist in player inventory
    - Atomically remove cards on synthesis attempt
    - Generate output card only on success
    - _Requirements: 2.5, 12.2_
  
  - [x] 6.5 Write property test for failed synthesis card consumption
    - **Property 10: Failed synthesis card consumption**
    - **Validates: Requirements 2.5**

- [ ] 7. Implement Card Synthesis Service API endpoints
  - [x] 7.1 Create POST /api/v1/synthesis/combine endpoint
    - Validate synthesis type and input cards
    - Check for active Lucky Moment events
    - Execute synthesis with server-side validation
    - Update player inventory and failure count
    - Return success status, output card, and protection status
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 12.2_
  
  - [x] 7.2 Write property test for synthesis error card preservation
    - **Property 41: Synthesis error card preservation**
    - **Validates: Requirements 12.5**
  
  - [x] 7.3 Create GET /api/v1/synthesis/rates endpoint
    - Calculate current success rates with active modifiers
    - Return rates for all synthesis types
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.8_

- [x] 8. Checkpoint - Ensure synthesis tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Random Event Service core logic
  - [x] 9.1 Create EventConfiguration data model and validation
    - Validate probability values (0-100%)
    - Validate duration values (positive integers)
    - _Requirements: 14.5, 14.6_
  
  - [x] 9.2 Create ActiveEvent data model
    - Define event types: merchant, storm, lucky, copy
    - Define event-specific data structures
    - _Requirements: 3.1, 3.3, 3.5, 3.7_
  
  - [x] 9.3 Implement EventTriggerSystem class
    - Implement checkForEvent() with probability rolls
    - Implement createEvent() for each event type
    - Generate merchant offers, storm draws, lucky bonuses, copied cards
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  
  - [x] 9.4 Write property tests for event trigger probabilities
    - **Property 13: Event trigger probability adherence**
    - **Property 14: Card Storm reward distribution**
    - **Property 15: Lucky Moment duration and effect**
    - **Property 16: Copy Miracle card duplication**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

- [x] 10. Implement Random Event Service API endpoints
  - [x] 10.1 Create POST /api/v1/events/trigger endpoint
    - Check for event triggers based on action type
    - Create and persist active events
    - Return event details if triggered
    - _Requirements: 3.1, 3.3, 3.5, 3.7_
  
  - [x] 10.2 Create GET /api/v1/events/active endpoint
    - Return all active events for player
    - Filter expired events
    - _Requirements: 3.6_
  
  - [x] 10.3 Create POST /api/v1/events/accept endpoint
    - Process merchant offer acceptance
    - Distribute event rewards
    - Mark event as claimed
    - _Requirements: 3.2, 3.4, 3.8_
  
  - [x] 10.4 Implement event expiration cleanup
    - Create background job to expire Lucky Moment events after 10 minutes
    - Clean up expired events from database
    - _Requirements: 3.6_

- [ ] 11. Implement Social Service core logic
  - [x] 11.1 Create Gallery data model
    - Define gallery with up to 50 card IDs
    - Calculate total score, rarity score, creativity score
    - _Requirements: 4.1, 4.8, 4.9, 4.10_
  
  - [x] 11.2 Implement gallery score calculation
    - Calculate totalScore as sum of card scores
    - Calculate rarityScore with rarity weights
    - Calculate creativityScore from likes and comments
    - _Requirements: 4.8, 4.9, 4.10_
  
  - [x] 11.3 Write property test for gallery size constraint
    - **Property 17: Gallery size constraint**
    - **Validates: Requirements 4.1**

  - [x] 11.4 Implement leaderboard ranking system
    - Create ranking queries for total score, rarity score, creativity score
    - Implement real-time leaderboard updates using database subscriptions
    - _Requirements: 4.8, 4.9, 4.10, 4.11_
  
  - [x] 11.5 Write property test for leaderboard ranking correctness
    - **Property 20: Leaderboard ranking correctness**
    - **Validates: Requirements 4.8, 4.9, 4.10**
  
  - [x] 11.6 Implement like rate limiting
    - Track likes per gallery per player per day
    - Enforce one like per gallery per 24 hours
    - _Requirements: 4.3_
  
  - [x] 11.7 Write property test for gallery like rate limit
    - **Property 18: Gallery like rate limit**
    - **Validates: Requirements 4.3**
  
  - [x] 11.8 Implement social interaction rewards
    - Grant 10 soft currency for likes
    - Grant 5 soft currency for comments
    - _Requirements: 4.5, 4.6_
  
  - [x] 11.9 Write property test for social interaction rewards
    - **Property 19: Social interaction rewards**
    - **Validates: Requirements 4.5, 4.6**

- [ ] 12. Implement Social Service API endpoints
  - [x] 12.1 Create PUT /api/v1/social/gallery endpoint
    - Validate card IDs (max 50)
    - Update gallery and recalculate scores
    - _Requirements: 4.1_
  
  - [x] 12.2 Create GET /api/v1/social/gallery/:playerId endpoint
    - Return gallery with cards
    - Check if viewer can like (hasn't liked in 24h)
    - _Requirements: 4.2, 4.3_
  
  - [x] 12.3 Create POST /api/v1/social/gallery/:playerId/like endpoint
    - Validate rate limit
    - Create like interaction
    - Grant reward to gallery owner
    - _Requirements: 4.3, 4.5_
  
  - [x] 12.4 Create POST /api/v1/social/gallery/:playerId/comment endpoint
    - Create comment interaction
    - Grant reward to gallery owner
    - _Requirements: 4.4, 4.6_
  
  - [x] 12.5 Create GET /api/v1/social/leaderboards endpoint
    - Return rankings by type (total_score, rarity_score, creativity)
    - Support pagination with limit and offset
    - _Requirements: 4.8, 4.9, 4.10_
  
  - [x] 12.6 Implement WebSocket real-time leaderboard updates
    - Create ws://api/v1/ws/leaderboards endpoint
    - Broadcast leaderboard changes to connected clients
    - _Requirements: 4.11, 12.6_
  
  - [x] 12.7 Implement WebSocket real-time gallery updates
    - Create ws://api/v1/ws/gallery/:playerId endpoint
    - Broadcast gallery updates, likes, comments
    - _Requirements: 4.11, 12.6_

- [x] 13. Checkpoint - Ensure social system tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement Trading Market Service core logic
  - [x] 14.1 Create MarketListing data model
    - Define listing with card, price, seller info
    - Track views, timestamps
    - _Requirements: 5.1_
  
  - [x] 14.2 Implement transaction atomicity with database transactions
    - Use two-phase commit for card and currency transfers
    - Ensure both transfers succeed or both fail
    - _Requirements: 5.3, 12.3_
  
  - [x] 14.3 Write property test for trade transaction atomicity
    - **Property 21: Trade transaction atomicity**
    - **Validates: Requirements 5.3, 12.3**
  
  - [x] 14.4 Implement transaction fee calculation
    - Calculate 5% fee on all sales
    - Transfer 95% to seller, 5% to system
    - _Requirements: 5.8_
  
  - [x] 14.5 Write property test for transaction fee calculation
    - **Property 22: Transaction fee calculation**
    - **Validates: Requirements 5.8**

  - [x] 14.6 Implement limited edition card metadata preservation
    - Preserve edition number and original owner through trades
    - Track ownership history
    - _Requirements: 5.6, 5.7_
  
  - [x] 14.7 Write property test for limited edition metadata preservation
    - **Property 23: Limited edition metadata preservation**
    - **Validates: Requirements 5.7**
  
  - [x] 14.8 Implement price trend calculation
    - Track recent transactions per card template
    - Calculate average, median, min, max prices
    - Calculate 24h price change percentage
    - _Requirements: 5.4_
  
  - [x] 14.9 Implement dynamic pricing suggestions
    - Calculate suggested price based on supply and demand
    - Use recent transaction history
    - _Requirements: 5.5_

- [ ] 15. Implement Trading Market Service API endpoints
  - [x] 15.1 Create POST /api/v1/market/list endpoint
    - Validate card ownership
    - Create market listing
    - _Requirements: 5.1_
  
  - [x] 15.2 Create POST /api/v1/market/purchase endpoint
    - Validate buyer has sufficient currency
    - Execute atomic transaction
    - Transfer card and currency
    - _Requirements: 5.2, 5.3, 12.3_
  
  - [x] 15.3 Create GET /api/v1/market/listings endpoint
    - Return listings with filters (rarity, sort)
    - Support pagination
    - Include price statistics
    - _Requirements: 5.1, 5.4_
  
  - [x] 15.4 Create GET /api/v1/market/trends/:cardId endpoint
    - Return price history and statistics
    - Return suggested price
    - Return supply and demand metrics
    - _Requirements: 5.4, 5.5_

- [ ] 16. Implement Achievement Service core logic
  - [x] 16.1 Create Achievement data model
    - Define achievement categories and requirements
    - Define rewards structure
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 16.2 Implement achievement monitoring system
    - Monitor card draws for collection achievements
    - Monitor card ownership for rarity achievements
    - Monitor gallery interactions for social achievements
    - Monitor event triggers for random achievements
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 16.3 Write property test for achievement unlock conditions
    - **Property 24: Achievement unlock conditions**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  
  - [x] 16.4 Implement achievement progress calculation
    - Calculate progress percentage for trackable achievements
    - _Requirements: 6.5_
  
  - [x] 16.5 Write property test for achievement progress calculation
    - **Property 25: Achievement progress calculation**
    - **Validates: Requirements 6.5**
  
  - [x] 16.6 Implement secret achievement condition hiding
    - Hide unlock conditions for secret achievements
    - Reveal conditions after unlock
    - _Requirements: 6.6_
  
  - [x] 16.7 Write property test for secret achievement condition hiding
    - **Property 26: Secret achievement condition hiding**
    - **Validates: Requirements 6.6**
  
  - [x] 16.8 Implement achievement reward distribution
    - Grant soft currency, hard currency, or exclusive cards
    - _Requirements: 6.8, 11.8_
  
  - [x] 16.9 Implement server-side achievement validation
    - Validate unlock conditions on server before granting
    - Prevent client-side manipulation
    - _Requirements: 12.8_
  
  - [x] 16.10 Write property test for server-side achievement validation
    - **Property 43: Server-side achievement validation**
    - **Validates: Requirements 12.8**

- [ ] 17. Implement Achievement Service API endpoints
  - [x] 17.1 Create GET /api/v1/achievements endpoint
    - Return all achievements with player progress
    - Include unlocked count and total count
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 17.2 Create GET /api/v1/achievements/:achievementId endpoint
    - Return specific achievement with progress
    - _Requirements: 6.5_

- [x] 18. Checkpoint - Ensure market and achievement tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Implement Season Service core logic
  - [x] 19.1 Create Season data model
    - Define season with timing, exclusive content, battle pass
    - Define BattlePassTier with free and paid rewards
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 19.2 Create Mission data model
    - Define daily and weekly mission types
    - Define objectives and rewards
    - _Requirements: 8.3, 8.4_
  
  - [x] 19.3 Implement mission generation system
    - Generate 3 daily missions at midnight UTC
    - Generate 3 weekly missions at week start
    - _Requirements: 8.3, 8.4_
  
  - [x] 19.4 Write property test for mission generation count
    - **Property 27: Mission generation count**
    - **Validates: Requirements 8.3, 8.4**
  
  - [x] 19.5 Implement battle pass progression
    - Track battle pass XP and level
    - Unlock rewards on level increase
    - Differentiate free and paid tracks
    - _Requirements: 7.3, 7.4, 7.5, 7.6_
  
  - [x] 19.6 Write property tests for battle pass and missions
    - **Property 28: Mission completion rewards**
    - **Property 29: Battle pass reward unlocking**
    - **Validates: Requirements 7.4, 7.5, 7.6, 8.5, 8.6**
  
  - [x] 19.7 Implement login streak tracking
    - Track consecutive daily logins
    - Reset streak on missed day
    - Grant increasing rewards for streaks
    - _Requirements: 8.1, 8.2_
  
  - [x] 19.8 Write property test for login streak tracking
    - **Property 30: Login streak tracking**
    - **Validates: Requirements 8.1, 8.2**
  
  - [x] 19.9 Implement return reward system
    - Detect players inactive for 7+ days
    - Grant return rewards including free packs
    - _Requirements: 8.7_
  
  - [x] 19.10 Write property test for return reward eligibility
    - **Property 31: Return reward eligibility**
    - **Validates: Requirements 8.7**
  
  - [x] 19.11 Implement season content availability
    - Make season-exclusive cards available only during season
    - Archive season content after season ends
    - _Requirements: 7.7, 7.8_
  
  - [x] 19.12 Write property test for season content availability
    - **Property 32: Season content availability**
    - **Validates: Requirements 7.7**

- [x] 20. Implement Season Service API endpoints
  - [x] 20.1 Create GET /api/v1/season/current endpoint
    - Return current season info
    - Return player's battle pass progress
    - Calculate days remaining
    - _Requirements: 7.1, 7.3_
  
  - [x] 20.2 Create GET /api/v1/season/missions endpoint
    - Return daily and weekly missions
    - Include reset times
    - _Requirements: 8.3, 8.4_
  
  - [x] 20.3 Create POST /api/v1/season/missions/:missionId/claim endpoint
    - Validate mission completion
    - Grant rewards and battle pass XP
    - _Requirements: 8.5, 8.6_
  
  - [x] 20.4 Create GET /api/v1/season/login-rewards endpoint
    - Return consecutive login days
    - Return today's claim status
    - Return next reward
    - _Requirements: 8.1_
  
  - [x] 20.5 Create POST /api/v1/season/login-rewards/claim endpoint
    - Grant daily login reward
    - Update streak counter
    - _Requirements: 8.1, 8.2_

- [ ] 21. Implement Personalization System
  - [x] 21.1 Implement collection preference tracking
    - Track card themes and types collected by player
    - Update preferences based on draw and collection history
    - _Requirements: 9.1_
  
  - [x] 21.2 Write property test for collection preference tracking
    - **Property 33: Collection preference tracking**
    - **Validates: Requirements 9.1**
  
  - [x] 21.3 Implement personalized pack recommendations
    - Prioritize packs matching player's preferred themes
    - _Requirements: 9.2_
  
  - [x] 21.4 Write property test for personalized pack recommendations
    - **Property 34: Personalized pack recommendations**
    - **Validates: Requirements 9.2**
  
  - [x] 21.5 Implement emotional feedback messages
    - Display encouraging messages after unsuccessful draws
    - Display congratulatory messages for rare cards
    - _Requirements: 9.3, 9.4_
  
  - [x] 21.6 Implement friend recommendations
    - Recommend friends with similar collection themes
    - _Requirements: 9.5_

- [ ] 22. Implement Monetization System
  - [x] 22.1 Implement currency type support in market
    - Support both soft and hard currency for transactions
    - _Requirements: 11.1_
  
  - [x] 22.2 Write property test for currency type support
    - **Property 35: Currency type support**
    - **Validates: Requirements 11.1**
  
  - [x] 22.3 Implement Monthly Card system
    - Grant daily hard currency for 30 days after purchase
    - Track Monthly Card expiration
    - _Requirements: 11.2_
  
  - [x] 22.4 Write property test for Monthly Card daily rewards
    - **Property 36: Monthly card daily rewards**
    - **Validates: Requirements 11.2**
  
  - [x] 22.5 Implement limited-time hard currency packs
    - Create packs purchasable only with hard currency
    - Enforce availability windows
    - _Requirements: 11.3_
  
  - [x] 22.6 Implement cosmetic items
    - Create gallery skins purchasable with hard currency
    - Create card backs and visual effects
    - _Requirements: 11.4, 11.5_
  
  - [x] 22.7 Implement paid battle pass
    - Allow battle pass purchase with hard currency
    - Unlock paid reward track
    - _Requirements: 11.6_
  
  - [x] 22.8 Ensure gameplay card obtainability
    - Verify all gameplay-affecting cards obtainable via soft currency or gameplay
    - _Requirements: 11.7_
  
  - [x] 22.9 Write property test for gameplay card obtainability
    - **Property 37: Gameplay card obtainability**
    - **Validates: Requirements 11.7**

- [ ] 23. Implement Configuration Parsers
  - [x] 23.1 Implement pack configuration parser
    - Parse pack configuration files into PackConfiguration objects
    - Validate probability sums and rarity references
    - Return descriptive error messages for invalid configs
    - _Requirements: 13.1, 13.2, 13.5, 13.6_
  
  - [x] 23.2 Write property test for pack configuration error reporting
    - **Property 46: Pack configuration error reporting**
    - **Validates: Requirements 13.2**
  
  - [x] 23.3 Implement pack configuration formatter
    - Serialize PackConfiguration objects to configuration files
    - _Requirements: 13.3_
  
  - [x] 23.4 Write property test for pack configuration round-trip
    - **Property 44: Pack configuration round-trip**
    - **Validates: Requirements 13.4**
  
  - [x] 23.5 Write property test for pack configuration validation
    - **Property 45: Pack configuration validation**
    - **Validates: Requirements 13.5, 13.6**

  - [x] 23.6 Implement event configuration parser
    - Parse event configuration files into EventConfiguration objects
    - Validate probability ranges (0-100%) and duration values
    - Return descriptive error messages for invalid configs
    - _Requirements: 14.1, 14.2, 14.5, 14.6_
  
  - [x] 23.7 Write property test for event configuration error reporting
    - **Property 49: Event configuration error reporting**
    - **Validates: Requirements 14.2**
  
  - [x] 23.8 Implement event configuration formatter
    - Serialize EventConfiguration objects to configuration files
    - _Requirements: 14.3_
  
  - [x] 23.9 Write property test for event configuration round-trip
    - **Property 47: Event configuration round-trip**
    - **Validates: Requirements 14.4**
  
  - [x] 23.10 Write property test for event configuration validation
    - **Property 48: Event configuration validation**
    - **Validates: Requirements 14.5, 14.6**

- [x] 24. Checkpoint - Ensure personalization, monetization, and parser tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 25. Implement Data Synchronization and Integrity
  - [x] 25.1 Implement server-first draw synchronization
    - Ensure server confirms draw before client displays results
    - _Requirements: 12.1_
  
  - [x] 25.2 Write property test for server-first draw synchronization
    - **Property 38: Server-first draw synchronization**
    - **Validates: Requirements 12.1**
  
  - [x] 25.3 Implement server-side synthesis validation
    - Validate input cards and calculate results server-side
    - _Requirements: 12.2_
  
  - [x] 25.4 Write property test for server-side synthesis validation
    - **Property 39: Server-side synthesis validation**
    - **Validates: Requirements 12.2**
  
  - [x] 25.5 Implement data persistence for all player state
    - Persist progress, missions, battle pass state
    - Ensure retrievability in subsequent sessions
    - _Requirements: 12.7_
  
  - [x] 25.6 Write property test for data persistence completeness
    - **Property 42: Data persistence completeness**
    - **Validates: Requirements 12.7**

- [ ] 26. Implement Client-Side 3D Animations
  - [x] 26.1 Set up Three.js scene and renderer
    - Create 3D scene with camera and lighting
    - Set up WebGL renderer
    - _Requirements: 10.1_
  
  - [x] 26.2 Implement card flip animation using Three.js
    - Create 3D card model with front and back textures
    - Implement rotation animation for card reveal
    - _Requirements: 10.1_
  
  - [x] 26.3 Implement legendary card particle effects
    - Create gold particle system using Three.js
    - Trigger particles on legendary card reveal
    - _Requirements: 10.2_
  
  - [x] 26.4 Implement near-miss flash animation
    - Display rare card briefly with flash effect
    - Transition to actual card
    - _Requirements: 10.3_
  
  - [x] 26.5 Set up GSAP for timeline-based animation sequencing
    - Create animation timelines for card reveal sequences
    - Coordinate multiple animations
    - _Requirements: 10.7_
  
  - [x] 26.6 Implement synthesis success animations
    - Create fire and lightning particle effects using Three.js
    - Play success sound effects with randomized pitch
    - _Requirements: 2.6, 10.4_
  
  - [x] 26.7 Set up Ammo.js for physics simulation
    - Initialize Ammo.js physics engine
    - Create physics world
    - _Requirements: 10.5_
  
  - [x] 26.8 Implement synthesis failure physics effects
    - Create card breaking animation with physics
    - Simulate particle dispersion with Ammo.js
    - Play failure sound effects
    - _Requirements: 2.7, 10.5_
  
  - [x] 26.9 Implement random event animations
    - Create full-screen event animations
    - Play distinctive event music
    - _Requirements: 3.9, 10.6_

- [ ] 27. Implement Error Handling and Recovery
  - [x] 27.1 Implement network error handling with exponential backoff
    - Add retry logic for API calls (3 attempts: 1s, 2s, 4s)
    - Implement WebSocket reconnection with exponential backoff
    - _Requirements: 12.4, 12.5_
  
  - [x] 27.2 Implement client-side operation queue for offline scenarios
    - Queue operations when offline
    - Replay operations when connection restored
    - _Requirements: 12.4, 12.5_
  
  - [x] 27.3 Implement timeout handling
    - Set 30-second timeout for API requests
    - Trigger retry or user notification on timeout
    - _Requirements: 12.4_
  
  - [x] 27.4 Implement client-side input validation
    - Validate inputs before API calls
    - Display user-friendly error messages
    - _Requirements: 12.1, 12.2_
  
  - [x] 27.5 Implement server-side input validation
    - Validate all inputs on server
    - Return 400 Bad Request with detailed errors
    - _Requirements: 12.1, 12.2_
  
  - [x] 27.6 Implement optimistic locking for concurrent modifications
    - Prevent lost updates on player state
    - Retry with fresh data on version conflicts
    - _Requirements: 12.3_
  
  - [x] 27.7 Implement pessimistic locking for market purchases
    - Lock listings during purchase to prevent double-sale
    - _Requirements: 12.3_
  
  - [x] 27.8 Implement error logging and monitoring
    - Log all errors with full context
    - Set up error rate monitoring with alerts
    - Create error dashboards
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 28. Integration and Wiring
  - [x] 28.1 Wire Card Drawing Service to Achievement Service
    - Trigger achievement checks on card draws
    - _Requirements: 6.1, 6.2_
  
  - [x] 28.2 Wire Card Synthesis Service to Achievement Service
    - Trigger achievement checks on synthesis
    - _Requirements: 6.1, 6.2_
  
  - [x] 28.3 Wire Social Service to Achievement Service
    - Trigger achievement checks on gallery interactions
    - _Requirements: 6.3_
  
  - [x] 28.4 Wire Random Event Service to Card Drawing Service
    - Apply Card Storm free draws
    - _Requirements: 3.4_
  
  - [x] 28.5 Wire Random Event Service to Card Synthesis Service
    - Apply Lucky Moment synthesis bonuses
    - _Requirements: 3.6_
  
  - [x] 28.6 Wire Random Event Service to Achievement Service
    - Trigger achievement checks on event triggers
    - _Requirements: 6.4_
  
  - [x] 28.7 Wire Season Service to all services
    - Enforce season-exclusive content availability
    - Track mission progress across all player actions
    - _Requirements: 7.7, 8.3, 8.4_
  
  - [x] 28.8 Wire Personalization System to Card Drawing Service
    - Display personalized pack recommendations
    - Display emotional feedback messages
    - _Requirements: 9.2, 9.3, 9.4_
  
  - [x] 28.9 Wire client animations to backend events
    - Trigger 3D animations on card draws
    - Trigger particle effects on synthesis
    - Trigger event animations on event triggers
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [x] 28.10 Connect all WebSocket endpoints
    - Ensure real-time updates for leaderboards
    - Ensure real-time updates for galleries
    - Ensure real-time event notifications
    - _Requirements: 4.11, 12.6_

- [x] 29. Final Checkpoint - Comprehensive Testing
  - [x] 29.1 Run all unit tests
    - Verify all unit tests pass
  
  - [x] 29.2 Run all property-based tests
    - Verify all 49 correctness properties pass
    - Ensure minimum 100 iterations per property test
  
  - [x] 29.3 Run integration tests
    - Test full request/response cycles through API gateway
    - Test database persistence and retrieval
    - Test WebSocket connections and real-time updates
  
  - [x] 29.4 Perform manual testing of critical flows
    - Test card drawing with various pack types
    - Test card synthesis with all risk levels
    - Test random event triggers and rewards
    - Test social interactions and leaderboards
    - Test trading market transactions
    - Test achievement unlocks
    - Test season progression and missions
  
  - [x] 29.5 Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate the 49 universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- All code examples use TypeScript as specified in the design document
- Client-side animations use Three.js for 3D rendering, GSAP for animation sequencing, and Ammo.js for physics simulation
- Backend services use TypeScript with REST APIs and WebSocket connections
- Database uses document-based storage (Firebase Firestore or MongoDB) with real-time subscriptions
- Redis cache is used for performance optimization
