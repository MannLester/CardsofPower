// Battlefield.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { storage, database } from './firebaseConfig'; // Import Storage and Database instances
import {
    ref as dbRef,
    set,
    push,
    onValue,
    update,
    get,
    runTransaction // Import runTransaction for Firebase transactions
} from 'firebase/database'; // Realtime Database ref functions
import {
    ref as storageRef,
    getDownloadURL
} from 'firebase/storage'; // Storage ref functions

import './Battlefield.css';

import backCard from '../assets/cards/back-card.png'; // Local fallback
import graveyardCard from '../assets/cards/graveyard.png';
import blankCardImage from '../assets/cards/blank.png'; // Dynamic blank card
import leftBtnImage from '../assets/others/leftBtn.png'; // Dynamic left button
import rightBtnImage from '../assets/others/rightBtn.png'; // Dynamic right button
import heartIcon from '../assets/others/heart.png';
import cardsIcon from '../assets/others/card.png';
import boneIcon from '../assets/others/bone.png';

// Placeholder for blank cards
const placeholderCard = backCard;

/**
 * Timer Component
 * Displays the game timer and current stage.
 */
function Timer({ gameStage, timer, currentRound, totalRounds, activePlayer }) {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    let stageText = '';
    if (gameStage === 'waiting') {
        stageText = 'Waiting for Opponent...';
    } else if (gameStage === 'preparation') {
        stageText = 'Preparation Stage';
    } else if (gameStage === 'battle') {
        stageText = `Turn: ${activePlayer}`;
    } else if (gameStage === 'finished') {
        stageText = 'Battle Finished';
    }

    return (
        <div className="timer">
            <p>{stageText}</p>
            {(gameStage === 'preparation' || gameStage === 'battle') && (
                <p>Time Remaining: {formatTime(timer)}</p>
            )}
            {gameStage === 'battle' && (
                <p>Round {currentRound} of {totalRounds}</p>
            )}
        </div>
    );
}

/**
 * WaitingForPlayer Component
 * Displays a waiting message and room ID for the room creator.
 */
function WaitingForPlayer({ roomId, playerId }) {
    // Determine if the current player is the room creator
    const isRoomCreator = playerId === 'player1';

    // Function to copy roomId to clipboard
    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId).then(() => {
            alert('Room ID copied to clipboard!');
        }).catch((err) => {
            console.error('Failed to copy Room ID: ', err);
        });
    };

    return (
        <div className="waiting-stage">
            <h2>Waiting for Opponent...</h2>
            {isRoomCreator && (
                <div className="room-id-section">
                    <p>Your Room ID:</p>
                    <div className="room-id-display">
                        <input
                            type="text"
                            value={roomId}
                            readOnly
                            className="room-id-input"
                        />
                        <button onClick={copyRoomId} className="copy-button">Copy</button>
                    </div>
                </div>
            )}
            <p>Share the Room ID with your opponent to start the game.</p>
        </div>
    );
}

/**
 * PreparationStage Component
 * Displays the preparation stage message.
 */
function PreparationStage() {
    return (
        <div className="preparation-stage">
            <h2>Preparation Stage</h2>
            <p>Get ready for the battle! You have 1 minute to prepare your strategy.</p>
        </div>
    );
}

/**
 * EndStage Component
 * Displays the end of the battle message.
 */
function EndStage() {
    return (
        <div className="end-stage">
            <h2>Battle Finished</h2>
            <p>Congratulations! The battle has concluded.</p>
            {/* You can add more details like results, scores, etc. */}
        </div>
    );
}

/**
 * CardSlots Component
 * Renders a set of card images.
 */
function CardSlots({ cards }) {
    return (
        <div className="card-slot my-4">
            {cards.map((card, index) => (
                <img key={index} src={card} alt={`Card ${index + 1}`} />
            ))}
        </div>
    );
}

/**
 * UtilitiesComponent
 * Manages graveyard visibility and deck interactions.
 * Defined outside of Battlefield to prevent redefinition on each render.
 */
const UtilitiesComponent = React.memo(({
    isOpponent, // Indicates if this Utilities is for the opponent
    username,
    deck,
    graveyard,
    leftBtn,
    rightBtn,
    roomId,
    playerId,
    isActiveTurn,
    switchTurn,
    gameStage,
    currentRound,
    isGraveyardVisible,
    toggleGraveyard
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const cardsToShow = 6;
    const blankCard = blankCardImage; // Using dynamic blank card

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => Math.min(prev + cardsToShow, deck.length - cardsToShow));
    }, [deck.length]);

    const handlePrevious = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - cardsToShow, 0));
    }, []);

    const graveyardContent = useMemo(() => {
        if (isGraveyardVisible) {
            if (graveyard.length === 0) {
                return <p>Your graveyard is currently empty.</p>;
            } else {
                return (
                    <div className='graveyardCards'>
                        {graveyard.map((card, index) => (
                            <img className='m-1' key={index} src={card} alt={`Graveyard Card ${index + 1}`} />
                        ))}
                    </div>
                );
            }
        }
        return null;
    }, [isGraveyardVisible, graveyard]);

    // For opponent's Utilities, display back cards; for player's Utilities, display actual cards
    const displayedDeck = isOpponent ? deck.map(() => backCard) : deck;

    // Function to handle player actions (e.g., Attack)
    const handleAction = async () => {
        if (!isActiveTurn) {
            alert("It's not your turn!");
            return;
        }

        try {
            // Implement your game logic here
            console.log(`${username} performed an action in round ${currentRound}`);

            // Example: Update lastCard in the database
            const roomRef = dbRef(database, `rooms/${roomId}`);
            const randomCard = deck[Math.floor(Math.random() * deck.length)];
            await update(roomRef, { lastCard: randomCard });

            // Example: Add card to graveyard
            const graveyardPath = `rooms/${roomId}/players/${playerId}/graveyard`;
            const graveyardRef = dbRef(database, graveyardPath);
            push(graveyardRef, randomCard);

            // Switch turn after action by invoking switchTurn
            await switchTurn();

            // Log the action
            console.log(`Action performed by ${username}. Turn switched.`);
        } catch (error) {
            console.error('Error during action:', error);
        }
    };

    // Prevent clicking on opponent's graveyard
    const graveyardClickHandler = isOpponent ? () => {} : toggleGraveyard;

    return (
        <>
            {isGraveyardVisible && (
                <div className="graveyard">
                    <button className='float-end' onClick={toggleGraveyard} aria-label="Close Graveyard">
                        <img className='h-' src={boneIcon} alt="Close Graveyard" />
                    </button>
                    <h2 className='text-center text-5xl mb-6'>{username}'s Graveyard</h2>
                    {graveyardContent}
                </div>
            )}

            <div className="row">
                {/* Graveyard Icon */}
                {/* Only allow graveyard toggle if it's the player's own graveyard */}
                <img
                    onClick={graveyardClickHandler}
                    src={graveyardCard}
                    alt="Graveyard"
                    style={{ cursor: isOpponent ? 'default' : 'pointer', opacity: isOpponent ? 0.5 : 1 }}
                />

                {/* Deck Carousel */}
                <div className="carousel">
                    {/* Only allow deck navigation if it's the player's own deck */}
                    <button
                        onClick={handlePrevious}
                        className="me-2"
                        disabled={currentIndex === 0 || isOpponent}
                        aria-label="Previous Cards"
                        style={{ pointerEvents: isOpponent ? 'none' : 'auto', opacity: isOpponent ? 0.5 : 1 }}
                    >
                        <img src={leftBtn} alt="Previous" />
                    </button>

                    <div className="deck">
                        {displayedDeck.slice(currentIndex, currentIndex + cardsToShow).map((card, index) => (
                            <img
                                key={index}
                                src={card}
                                alt={`Card ${currentIndex + index + 1}`}
                                style={{ cursor: isOpponent ? 'default' : 'pointer' }}
                                onClick={!isOpponent ? () => { /* Implement card click if needed */ } : undefined}
                            />
                        ))}
                        {Array.from({ length: Math.max(0, cardsToShow - displayedDeck.slice(currentIndex, currentIndex + cardsToShow).length) }).map((_, index) => (
                            <img key={`blank-${index}`} src={blankCard} alt="Blank Card" />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="ms-2"
                        disabled={currentIndex + cardsToShow >= deck.length || isOpponent}
                        aria-label="Next Cards"
                        style={{ pointerEvents: isOpponent ? 'none' : 'auto', opacity: isOpponent ? 0.5 : 1 }}
                    >
                        <img src={rightBtn} alt="Next" />
                    </button>
                </div>

                {/* Player Stats */}
                <div className="stats">
                    <p className='text-2xl'>{username}</p>
                    <p className='my-2'>
                        <img className='me-2' src={heartIcon} alt='HP Icon' />HP: 5000
                    </p>
                    <p>
                        <img className='me-2' src={cardsIcon} alt='Cards Icon' />Cards: {deck.length}
                    </p>
                </div>
            </div>

            {/* Battle Actions */}
            {!isOpponent && gameStage === 'battle' && (
                <div className="battle-actions">
                    <button onClick={handleAction} disabled={!isActiveTurn}>
                        Attack
                    </button>
                    {/* Add more actions as needed */}
                </div>
            )}
        </>
    )});

/**
 * Battlefield Component
 * Main component managing the game state and rendering child components.
 */
function Battlefield() {
    // State variables for assets
    const [background, setBackground] = useState('');
    const [leftButton, setLeftButton] = useState('');
    const [rightButton, setRightButton] = useState('');
    const [opponentCards, setOpponentCards] = useState([]);
    const [myCards, setMyCards] = useState([]);
    const [myDeck, setMyDeck] = useState([]);
    const [lastCard, setLastCard] = useState(placeholderCard); // Default last card

    // Multiplayer state variables
    const [roomId, setRoomId] = useState('');
    const [playerId, setPlayerId] = useState('');
    const [username, setUsername] = useState('');
    const [isRoomJoined, setIsRoomJoined] = useState(false);
    const [gameStage, setGameStage] = useState('lobby'); // 'lobby', 'waiting', 'preparation', 'battle', 'finished'
    const [timer, setTimer] = useState(60); // Initial timer value
    const [currentRound, setCurrentRound] = useState(0);
    const totalRounds = 10;

    // Separate state variables for player usernames
    const [player1Username, setPlayer1Username] = useState('');
    const [player2Username, setPlayer2Username] = useState('');

    // State variables for each player's graveyard
    const [player1Graveyard, setPlayer1Graveyard] = useState([]);
    const [player2Graveyard, setPlayer2Graveyard] = useState([]);

    // State variable to track whose turn it is
    const [currentTurn, setCurrentTurn] = useState('player1'); // 'player1' or 'player2'

    // State variables to manage graveyard visibility
    const [isOpponentGraveyardVisible, setIsOpponentGraveyardVisible] = useState(false);
    const [isPlayerGraveyardVisible, setIsPlayerGraveyardVisible] = useState(false);

    // useRef to store the interval ID
    const timerRef = useRef(null);

    /**
     * Function Declarations
     * All useCallback functions are declared before any useEffect Hooks that use them.
     */

    // Function to switch turns using Firebase transaction
    const switchTurn = useCallback(async () => {
        const gameStateRef = dbRef(database, `rooms/${roomId}/gameState`);

        try {
            await runTransaction(gameStateRef, (currentGameState) => {
                if (currentGameState) {
                    const { currentTurn, currentRound, totalRounds } = currentGameState;
                    const nextTurn = currentTurn === 'player1' ? 'player2' : 'player1';
                    let newRound = currentRound;

                    // If switching back to player1, increment the round
                    if (nextTurn === 'player1') {
                        newRound += 1;
                        if (newRound > totalRounds) {
                            currentGameState.gameStage = 'finished';
                            currentGameState.timer = 0;
                            return currentGameState;
                        } else {
                            currentGameState.currentRound = newRound;
                        }
                    }

                    currentGameState.currentTurn = nextTurn;
                    currentGameState.timer = 30; // Reset timer for the next player

                    return currentGameState;
                }
                return; // Abort the transaction if gameState doesn't exist
            });

            // Update local state after transaction
            const gameStateSnapshot = await get(gameStateRef);
            const updatedGameState = gameStateSnapshot.val();
            if (updatedGameState) {
                setGameStage(updatedGameState.gameStage);
                setTimer(updatedGameState.timer);
                setCurrentRound(updatedGameState.currentRound);
                setCurrentTurn(updatedGameState.currentTurn);
                console.log(`Turn switched to ${updatedGameState.currentTurn}.`);
                if (updatedGameState.gameStage === 'finished') {
                    console.log('Game has finished.');
                }
            }
        } catch (error) {
            console.error('Error switching turn:', error);
        }
    }, [roomId]);

    // Function to create a new game room
    const createRoom = useCallback(async () => {
        if (!username) {
            alert('Please enter a username.');
            return;
        }

        const newRoomRef = push(dbRef(database, 'rooms'));
        const newRoomId = newRoomRef.key;

        setRoomId(newRoomId);
        setPlayerId('player1');
        setIsRoomJoined(true);

        // Initialize room data with gameStage as 'waiting' and currentTurn as 'player1'
        await set(newRoomRef, {
            players: {
                player1: {
                    username: username,
                    deck: myDeck,
                    graveyard: []
                }
            },
            gameState: {
                gameStage: 'waiting', // Changed from 'preparation' to 'waiting'
                timer: 60,
                currentRound: 0, // Will be set to 1 when both players join
                totalRounds: totalRounds,
                currentTurn: 'player1' // Initialize currentTurn
            },
            lastCard: lastCard
        });

        alert(`Room created! Share this Room ID with your opponent: ${newRoomId}`);
    }, [username, myDeck, lastCard, totalRounds]);

    // Function to join an existing game room
    const joinRoom = useCallback(async () => {
        if (!username) {
            alert('Please enter a username.');
            return;
        }

        if (!roomId) {
            alert('Please enter a valid Room ID.');
            return;
        }

        const player2Ref = dbRef(database, `rooms/${roomId}/players/player2`);

        // Check if player2 already exists
        onValue(player2Ref, async (snapshot) => {
            if (snapshot.exists()) {
                alert('Room is already full.');
            } else {
                setPlayerId('player2');
                setIsRoomJoined(true);

                // Add player2 to the room without overwriting existing data
                await set(player2Ref, {
                    username: username,
                    deck: myDeck,
                    graveyard: []
                });

                alert('Successfully joined the room!');
            }
        }, {
            onlyOnce: true
        });
    }, [username, roomId, myDeck]);

    // Function to update game state in Realtime Database
    const updateGameState = useCallback((key, value) => {
        if (roomId) {
            const gameStateRef = dbRef(database, `rooms/${roomId}/gameState`);
            update(gameStateRef, { [key]: value });
        }
    }, [roomId]);

    // Function to get active player's username based on currentTurn
    const getActivePlayerUsername = useCallback(() => {
        if (currentTurn === 'player1') {
            return player1Username;
        } else if (currentTurn === 'player2') {
            return player2Username;
        } else {
            return 'Unknown';
        }
    }, [currentTurn, player1Username, player2Username]);

    // Memoized toggle functions using useCallback
    const toggleOpponentGraveyard = useCallback(() => {
        setIsOpponentGraveyardVisible(prev => !prev);
    }, []);

    const togglePlayerGraveyard = useCallback(() => {
        setIsPlayerGraveyardVisible(prev => !prev);
    }, []);

    /**
     * useEffect Hooks
     * All useEffect Hooks that use switchTurn are declared **after** switchTurn is defined.
     */

    // Fetch Firebase assets on component mount
    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const [bgUrl, leftBtnUrl, rightBtnUrl] = await Promise.all([
                    getDownloadURL(storageRef(storage, 'assets/backgrounds/battlefield.jpg')),
                    getDownloadURL(storageRef(storage, 'assets/others/leftBtn.png')),
                    getDownloadURL(storageRef(storage, 'assets/others/rightBtn.png')),
                ]);

                setBackground(bgUrl);
                setLeftButton(leftBtnUrl);
                setRightButton(rightBtnUrl);

                const cardPaths = [
                    'assets/cards/Divine/AethersWrath.png',
                    'assets/cards/Divine/BaneOfExistence.png',
                    'assets/cards/Divine/CelestialOutcast.png',
                    'assets/cards/Divine/CelestialZenith.png',
                    'assets/cards/Divine/ForgemasterOfCreation.png',
                    'assets/cards/Earth/EarthGolem.png',
                    'assets/cards/Earth/HeartOfTheMountain.png',
                    'assets/cards/Earth/IroncladDefender.png',
                    'assets/cards/Earth/SteelGuardian.png',
                    'assets/cards/Earth/StoneSentinel.png',
                    'assets/cards/Light/CrystalGuardian.png',
                    'assets/cards/Light/ElectricSabre.png',
                    'assets/cards/Light/LightbinderPaladin.png',
                    'assets/cards/Light/LunarWolf.png',
                    'assets/cards/Light/SolarGuardian.png',
                ];

                const urls = await Promise.all(
                    cardPaths.map((path) => getDownloadURL(storageRef(storage, path)))
                );

                // Assuming the order corresponds to the card paths
                setOpponentCards([urls[0], placeholderCard, urls[1], placeholderCard, placeholderCard]);
                setMyCards([placeholderCard, urls[2], placeholderCard, urls[3], urls[4]]);
                setMyDeck(urls.slice(5, 15));
                setLastCard(urls[0]); // Set initial last card dynamically
            } catch (error) {
                console.error('Error fetching Firebase assets:', error);
            }
        };

        fetchAssets();
    }, []);

    // Handle multiplayer game state synchronization
    useEffect(() => {
        if (isRoomJoined && roomId && playerId) {
            const roomRef = dbRef(database, `rooms/${roomId}`);

            // References
            const gameStateRef = dbRef(database, `rooms/${roomId}/gameState`);
            const lastCardRef = dbRef(database, `rooms/${roomId}/lastCard`);
            const playersRef = dbRef(database, `rooms/${roomId}/players`);

            // Listen to gameState changes
            const unsubscribeGameState = onValue(gameStateRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    console.log('Game State Updated:', data);
                    setGameStage(data.gameStage);
                    setTimer(data.timer);
                    setCurrentRound(data.currentRound);
                    setCurrentTurn(data.currentTurn); // Update currentTurn from Firebase
                }
            });

            // Listen to lastCard changes
            const unsubscribeLastCard = onValue(lastCardRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setLastCard(data);
                }
            });

            // Listen to players data and set usernames
            const unsubscribePlayers = onValue(playersRef, async (snapshot) => {
                const players = snapshot.val();
                if (players) {
                    const playerCount = Object.keys(players).length;
                    console.log('Player Count:', playerCount);

                    const p1 = players.player1;
                    const p2 = players.player2;

                    if (playerId === 'player1') {
                        setPlayer1Username(p1.username);
                        setPlayer2Username(p2 ? p2.username : 'Opponent');

                        if (playerCount === 2) {
                            // Fetch current gameStage
                            const gameStateSnapshot = await get(gameStateRef);
                            const currentGameStage = gameStateSnapshot.val().gameStage;

                            if (currentGameStage === 'waiting') {
                                // Only set 'preparation' if currently 'waiting'
                                console.log('Both players have joined. Starting preparation stage.');
                                updateGameState('gameStage', 'preparation');
                                updateGameState('timer', 60);
                                updateGameState('currentRound', 1); // Start at Round 1
                                updateGameState('currentTurn', 'player1'); // Initialize currentTurn
                            }
                        }
                    } else if (playerId === 'player2') {
                        setPlayer1Username(p1 ? p1.username : 'Opponent');
                        setPlayer2Username(p2.username);
                    }
                }
            });

            return () => {
                unsubscribeGameState();
                unsubscribeLastCard();
                unsubscribePlayers();
            };
        }
    }, [isRoomJoined, roomId, playerId, updateGameState]);

    // Listen to each player's graveyard
    useEffect(() => {
        if (isRoomJoined && roomId) {
            const player1GraveyardRef = dbRef(database, `rooms/${roomId}/players/player1/graveyard`);
            const player2GraveyardRef = dbRef(database, `rooms/${roomId}/players/player2/graveyard`);

            const unsubscribePlayer1Graveyard = onValue(player1GraveyardRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const graveyardArray = Object.values(data);
                    setPlayer1Graveyard(graveyardArray);
                } else {
                    setPlayer1Graveyard([]);
                }
            });

            const unsubscribePlayer2Graveyard = onValue(player2GraveyardRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const graveyardArray = Object.values(data);
                    setPlayer2Graveyard(graveyardArray);
                } else {
                    setPlayer2Graveyard([]);
                }
            });

            return () => {
                unsubscribePlayer1Graveyard();
                unsubscribePlayer2Graveyard();
            };
        }
    }, [isRoomJoined, roomId]);

    // Handle game timer synchronization
    useEffect(() => {
        // Clear any existing interval
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Function to handle timer countdown
        const startTimer = () => {
            timerRef.current = setInterval(() => {
                setTimer((prevTimer) => {
                    if (prevTimer > 0) {
                        const newTimer = prevTimer - 1;
                        updateGameState('timer', newTimer);
                        return newTimer;
                    } else {
                        // Timer expired, switch turn
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                        switchTurn();
                        return 0;
                    }
                });
            }, 1000);
        };

        if (gameStage === 'preparation') {
            if (playerId === 'player1') { // Only player1 manages the preparation timer
                if (timer > 0) {
                    startTimer();
                } else {
                    // Preparation timer ended, transition to battle stage
                    updateGameState('gameStage', 'battle');
                    setGameStage('battle');
                    setTimer(30); // Start with 30 seconds for the first turn
                    updateGameState('timer', 30);
                }
            }
        } else if (gameStage === 'battle') {
            if (currentTurn === playerId) { // Only the active player manages the battle timer
                if (timer > 0) {
                    startTimer();
                } else {
                    // Timer expired, switch turn
                    switchTurn();
                }
            }
        }

        // Cleanup function to clear interval on unmount or when dependencies change
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [gameStage, timer, currentTurn, playerId, switchTurn, updateGameState]);

    // Function to get active player's username based on currentTurn
    // Already defined earlier using useCallback

    // Determine opponent and player graveyards
    const opponentGraveyard = playerId === 'player1' ? player2Graveyard : player1Graveyard;
    const playerGraveyard = playerId === 'player1' ? player1Graveyard : player2Graveyard;

    // Determine opponent's username based on playerId
    const opponentUsername = playerId === 'player1' ? player2Username : player1Username;
    const ownUsername = playerId === 'player1' ? player1Username : player2Username;

    return (
        <div className='background' style={{ backgroundImage: `url(${background})` }}>
            {!isRoomJoined && (
                <div className="lobby">
                    <h2>Welcome to the Battle</h2>
                    <input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <div className="room-actions">
                        <button onClick={createRoom}>Create Room</button>
                        <input
                            type="text"
                            placeholder="Enter Room ID"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                        />
                        <button onClick={joinRoom}>Join Room</button>
                    </div>
                </div>
            )}

            {isRoomJoined && (
                <>
                    <Timer
                        gameStage={gameStage}
                        timer={timer}
                        currentRound={currentRound}
                        totalRounds={totalRounds}
                        activePlayer={getActivePlayerUsername()}
                    />

                    {gameStage === 'waiting' && (
                        <WaitingForPlayer roomId={roomId} playerId={playerId} />
                    )}

                    {gameStage === 'preparation' && (
                        <PreparationStage />
                    )}

                    {gameStage === 'battle' && (
                        <>
                            {/* Opponent's Utilities at the Top */}
                            <UtilitiesComponent
                                isOpponent={true} // Indicates this Utilities is for the opponent
                                username={opponentUsername || 'Opponent'} // Correct opponent username
                                deck={playerId === 'player1' ? opponentCards : myCards}
                                graveyard={opponentGraveyard}
                                leftBtn={leftButton}
                                rightBtn={rightButton}
                                roomId={roomId}
                                playerId={playerId}
                                isActiveTurn={false} // Opponent's Utilities are not active for the current player
                                switchTurn={switchTurn} // Pass the switchTurn function as a prop
                                gameStage={gameStage} // Pass gameStage for additional logic if needed
                                currentRound={currentRound} // Pass currentRound for potential use
                                isGraveyardVisible={isOpponentGraveyardVisible}
                                toggleGraveyard={toggleOpponentGraveyard}
                            />

                            <div className='mid-row'>
                                <div>
                                    <CardSlots cards={playerId === 'player1' ? opponentCards : myCards} />
                                    <CardSlots cards={playerId === 'player1' ? myCards : opponentCards} />
                                </div>
                                <img className='last-card' src={lastCard} alt="Last Card" />
                            </div>

                            {/* Player's Utilities at the Bottom */}
                            <UtilitiesComponent
                                isOpponent={false} // Indicates this Utilities is for the player
                                username={ownUsername || 'You'} // Correct own username
                                deck={playerId === 'player1' ? myCards : opponentCards}
                                graveyard={playerGraveyard}
                                leftBtn={leftButton}
                                rightBtn={rightButton}
                                roomId={roomId}
                                playerId={playerId}
                                isActiveTurn={currentTurn === playerId} // Pass if it's player's turn
                                switchTurn={switchTurn} // Pass the switchTurn function as a prop
                                gameStage={gameStage} // Pass gameStage for additional logic if needed
                                currentRound={currentRound} // Pass currentRound for potential use
                                isGraveyardVisible={isPlayerGraveyardVisible}
                                toggleGraveyard={togglePlayerGraveyard}
                            />
                        </>
                    )}

                    {gameStage === 'finished' && (
                        <EndStage />
                    )}
                </>
            )}
        </div>
    )}

    export default Battlefield;