# Requirements Document

## Introduction

"One Battle After Another" is a mobile-optimized web game where players pick from a variety of battleground arenas and vote on head-to-head matchups. The main page presents all available arenas as a flat grid for direct selection. Battlegrounds are top-level categories (e.g., Music, Movie) that group related arenas (e.g., Bands, Singers, Actors). After selecting an arena, the Player enters a matchup screen where two entries are presented side-by-side with cropped images. The Player selects a favorite by tapping or swiping to reveal the full image. The winner stays on screen as a new contender appears, creating a continuous "king of the hill" style gameplay loop. An advertisement banner is displayed at the bottom of each screen.

## Glossary

- **Game**: The "One Battle After Another" application
- **Battleground**: A top-level category that groups related arenas (e.g., Music, Movie)
- **Arena**: A specific competition topic within a battleground (e.g., Bands, Albums, Singers, Films, Actors, Actresses)
- **Arena_Grid**: The two-column grid layout on the main page that displays all available arenas as selectable buttons
- **Main_Page**: The landing screen of the game showing the title, arena grid, and advertisement banner
- **Matchup_Screen**: The gameplay screen displayed after selecting an arena, showing two entries side-by-side for the Player to choose between
- **Entry**: A single item within an arena's database (e.g., "Tom Hanks" in the Actors arena), consisting of a name and an image
- **Entry_Database**: The collection of all entries for a given arena, sourced from web data with Wikipedia images as placeholders
- **Option_A**: The left-side entry displayed on the Matchup_Screen with 25% of its left edge cropped off-screen
- **Option_B**: The right-side entry displayed on the Matchup_Screen with 25% of its right edge cropped off-screen
- **Reveal_Threshold**: The 90% image visibility level at which an option is automatically selected
- **Swipe_Gesture**: A horizontal finger drag that progressively reveals the cropped portion of an option's image
- **Winner**: The entry selected by the Player in a matchup, which remains on screen for the next round
- **Contender**: A new entry that fades in to challenge the Winner in the next round
- **Ad_Banner**: The advertisement banner displayed at the bottom of each screen
- **Player**: A user interacting with the game
- **Sound_Effect**: An audio cue played during game events such as selections, transitions, and swipes
- **Battle_Result**: A record of a single matchup outcome, containing the arena identifier, the two Entry names that competed, the Winner Entry name, and a timestamp
- **Battle_History**: The persistent collection of all Battle_Results stored in the browser's localStorage
- **Matchup_Pair**: An unordered pair of two Entry names within the same arena, used to identify a unique matchup regardless of display order (e.g., "Tom Hanks vs Brad Pitt" is the same Matchup_Pair as "Brad Pitt vs Tom Hanks")
- **Compressed_Format**: A string encoding produced by compressing the JSON representation of the Battle_History using the browser's CompressionStream API with gzip, then Base64-encoding the result

## Requirements

### Requirement 1: Display Main Page

**User Story:** As a Player, I want to see the main page when I open the game, so that I can choose an arena to play.

#### Acceptance Criteria

1. WHEN the Player opens the Game, THE Main_Page SHALL display a header with the title "One Battle After Another"
2. WHEN the Player opens the Game, THE Main_Page SHALL display a sub-header with the text "Pick a Battleground"
3. WHEN the Player opens the Game, THE Main_Page SHALL display the Arena_Grid containing all available arenas
4. WHEN the Player opens the Game, THE Main_Page SHALL display the Ad_Banner at the bottom of the page

### Requirement 2: Arena Grid Layout

**User Story:** As a Player, I want to see all arenas in a clear grid layout, so that I can quickly find and select the arena I want to play.

#### Acceptance Criteria

1. THE Arena_Grid SHALL display arenas as selectable buttons arranged in a two-column layout
2. THE Arena_Grid SHALL display each arena button with the arena name as its label
3. THE Arena_Grid SHALL render all arenas from all battlegrounds as a flat list without showing battleground category headers

### Requirement 3: Predefined Battlegrounds and Arenas

**User Story:** As a Player, I want a variety of arenas to choose from, so that I can play matchups in topics that interest me.

#### Acceptance Criteria

1. THE Game SHALL include a Music battleground with arenas for Albums, Bands, and Singers
2. THE Game SHALL include a Movie battleground with arenas for Films, Actors, and Actresses
3. THE Game SHALL support additional battlegrounds and arenas beyond Music and Movie (e.g., Books, Fighters)
4. WHEN a new battleground or arena is added to the predefined list, THE Arena_Grid SHALL display the new arena without requiring changes to the grid layout logic

### Requirement 4: Arena Selection

**User Story:** As a Player, I want to select an arena from the grid, so that I can start playing matchups in that arena.

#### Acceptance Criteria

1. WHEN the Player taps an arena button in the Arena_Grid, THE Game SHALL navigate the Player to the selected arena
2. WHEN the Player taps an arena button, THE Game SHALL provide visual feedback indicating the button was tapped

### Requirement 5: Mobile-Optimized Layout

**User Story:** As a Player, I want the game to be optimized for my mobile device, so that I can play comfortably on a small screen.

#### Acceptance Criteria

1. THE Main_Page SHALL use a responsive layout that adapts to mobile screen widths (320px to 480px)
2. THE Arena_Grid SHALL size arena buttons to be easily tappable with a minimum touch target of 44x44 CSS pixels
3. THE Main_Page SHALL be fully usable in portrait orientation on mobile devices
4. THE Main_Page SHALL render without requiring horizontal scrolling on mobile devices

### Requirement 6: Advertisement Banner

**User Story:** As a product owner, I want an advertisement banner on every screen, so that the game can generate revenue.

#### Acceptance Criteria

1. THE Ad_Banner SHALL be displayed at the bottom of the Main_Page below the Arena_Grid
2. THE Ad_Banner SHALL be displayed at the bottom of the Matchup_Screen
3. THE Ad_Banner SHALL remain visible and fixed at the bottom of the screen at all times
4. THE Ad_Banner SHALL display the placeholder text "Advertisement" as its content
5. THE Ad_Banner SHALL not overlap or obscure the game content above the Ad_Banner

### Requirement 7: Matchup Screen Layout

**User Story:** As a Player, I want to see a matchup screen after selecting an arena, so that I can compare two entries and pick my favorite.

#### Acceptance Criteria

1. WHEN the Player selects an arena, THE Matchup_Screen SHALL display a header in the format "Battleground Name > Arena Name" (e.g., "Movies > Actors")
2. WHEN the Player selects an arena, THE Matchup_Screen SHALL randomly pick 2 entries from the selected arena's Entry_Database
3. THE Matchup_Screen SHALL display Option_A on the left side and Option_B on the right side
4. THE Matchup_Screen SHALL display the Entry name as a label below each option's image
5. THE Matchup_Screen SHALL display the Ad_Banner at the bottom of the screen

### Requirement 8: Image Display with Cropping

**User Story:** As a Player, I want to see partially cropped images for each option, so that the reveal mechanic creates anticipation and engagement.

#### Acceptance Criteria

1. THE Matchup_Screen SHALL display Option_A's image with 25% of the left edge cropped off-screen
2. THE Matchup_Screen SHALL display Option_B's image with 25% of the right edge cropped off-screen
3. THE Matchup_Screen SHALL display the visible 75% of each option's image within the option's designated screen area
4. THE Matchup_Screen SHALL display the Entry name label centered below each option's image

### Requirement 9: Tap Selection

**User Story:** As a Player, I want to tap on an option's image to select it, so that I can quickly choose my favorite.

#### Acceptance Criteria

1. WHEN the Player taps on Option_A's image, THE Game SHALL select Option_A as the Winner
2. WHEN the Player taps on Option_B's image, THE Game SHALL select Option_B as the Winner
3. WHEN the Player taps on an option, THE Game SHALL play a selection Sound_Effect
4. WHEN the Player taps on an option, THE Game SHALL provide a visual animation indicating the selection

### Requirement 10: Swipe Reveal Mechanic

**User Story:** As a Player, I want to swipe to gradually reveal an option's full image, so that I can interact with the matchup in an engaging way.

#### Acceptance Criteria

1. WHEN the Player swipes left on the Matchup_Screen, THE Game SHALL progressively reveal the cropped left portion of Option_A's image proportional to the swipe distance
2. WHEN the Player swipes right on the Matchup_Screen, THE Game SHALL progressively reveal the cropped right portion of Option_B's image proportional to the swipe distance
3. WHILE the Player is swiping, THE Game SHALL update the visible portion of the image in real time to follow the Player's finger position
4. WHEN the revealed portion of an option's image exceeds the Reveal_Threshold (90% visible), THE Game SHALL automatically select that option as the Winner
5. WHEN the Player lifts their finger before the revealed portion reaches the Reveal_Threshold, THE Game SHALL animate the image back to its original 75% visible (25% cropped) position
6. THE Game SHALL play a swipe Sound_Effect while the Player is swiping

### Requirement 11: Post-Selection Transition

**User Story:** As a Player, I want the winner to stay on screen and a new contender to appear, so that the gameplay feels continuous and exciting.

#### Acceptance Criteria

1. WHEN an option is selected as the Winner, THE Game SHALL animate the losing option off-screen
2. WHEN an option is selected as the Winner, THE Game SHALL slide the Winner to the opposite side of the Matchup_Screen (the position vacated by the losing option)
3. WHEN the Winner has moved to the opposite position, THE Game SHALL fade in a new Contender on the side vacated by the Winner
4. THE Game SHALL randomly pick the new Contender from the arena's Entry_Database, excluding the current Winner
5. WHEN the transition completes, THE Matchup_Screen SHALL reset both images to the 25% cropped state (Option_A cropped on the left, Option_B cropped on the right)
6. THE Game SHALL play a transition Sound_Effect during the post-selection animation

### Requirement 12: Entry Database

**User Story:** As a product owner, I want a database of entries for each arena populated with real-world data, so that the game has interesting and recognizable content.

#### Acceptance Criteria

1. THE Entry_Database SHALL contain entries for each arena, where each entry has a name and an image URL
2. THE Entry_Database SHALL contain a minimum of 10 entries per arena
3. THE Entry_Database SHALL use Wikipedia images as placeholder images for each entry
4. THE Entry_Database SHALL include entries representing well-known, famous options in each arena category (e.g., famous actors for the Actors arena)
5. WHEN the Matchup_Screen picks entries from the Entry_Database, THE Game SHALL ensure the selected Matchup_Pair has not already occurred in the Battle_History for the current arena (see Requirement 16)

### Requirement 13: Sound Effects

**User Story:** As a Player, I want sound effects during gameplay, so that the game feels more fun and responsive.

#### Acceptance Criteria

1. THE Game SHALL play a Sound_Effect when the Player taps to select an option
2. THE Game SHALL play a Sound_Effect during the swipe reveal interaction
3. THE Game SHALL play a Sound_Effect during the post-selection transition animation
4. THE Game SHALL play a Sound_Effect when a new Contender fades in on the Matchup_Screen

### Requirement 14: Gameplay Animations

**User Story:** As a Player, I want smooth animations during gameplay, so that the experience feels polished and engaging.

#### Acceptance Criteria

1. WHEN the Player selects an option by tapping, THE Game SHALL play a visual highlight animation on the selected option
2. WHEN the Player lifts their finger before reaching the Reveal_Threshold, THE Game SHALL animate the image back to its cropped position over a smooth easing duration
3. WHEN the post-selection transition occurs, THE Game SHALL animate the Winner sliding to the opposite side
4. WHEN a new Contender appears, THE Game SHALL animate the Contender fading in from transparent to fully visible
5. THE Game SHALL maintain a minimum animation frame rate of 30 frames per second during all gameplay animations

### Requirement 15: Battle Result Persistence

**User Story:** As a Player, I want my battle results to be saved between sessions, so that the game can remember my matchup history.

#### Acceptance Criteria

1. WHEN the Player selects a Winner in a matchup, THE Game SHALL create a Battle_Result containing the arena identifier, the two competing Entry names, the Winner Entry name, and a timestamp
2. WHEN a Battle_Result is created, THE Game SHALL append the Battle_Result to the Battle_History
3. THE Game SHALL persist the Battle_History to the browser's localStorage after each update
4. THE Game SHALL store the Battle_History in Compressed_Format to reduce localStorage usage
5. WHEN the Game loads, THE Game SHALL read the Battle_History from localStorage and decompress the Compressed_Format back into a usable data structure
6. IF localStorage is unavailable or the stored data is corrupted, THEN THE Game SHALL initialize an empty Battle_History and continue operation

### Requirement 16: Unique Battles Only

**User Story:** As a Player, I want each matchup to be unique within an arena, so that I never see the same two entries matched against each other more than once.

#### Acceptance Criteria

1. WHEN the Matchup_Screen picks entries from the Entry_Database, THE Game SHALL check the Battle_History for any existing Battle_Result containing the same Matchup_Pair in the same arena
2. THE Game SHALL exclude any Entry pairing that already exists as a Matchup_Pair in the Battle_History for the current arena
3. WHEN the Player selects a Winner, THE Game SHALL record the Matchup_Pair in the Battle_History before picking the next Contender
4. WHEN picking a new Contender after a selection, THE Game SHALL exclude entries that would form a Matchup_Pair with the current Winner that already exists in the Battle_History
5. IF all possible Matchup_Pairs for the current Winner have been exhausted in the Battle_History, THEN THE Game SHALL display a message indicating no new matchups are available for the current Winner and return the Player to the Arena_Grid
6. IF all possible Matchup_Pairs in the current arena have been exhausted in the Battle_History, THEN THE Game SHALL display a message indicating all matchups in the arena are complete and return the Player to the Arena_Grid
