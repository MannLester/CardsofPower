// Battlefield.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { storage, database } from '../firebaseConfig'; // Adjusted import path
import {
    ref as dbRef,
    set,
    push,
    onValue,
    update,
    get,
    runTransaction
} from 'firebase/database';
import {
    ref as storageRef,
    getDownloadURL
} from 'firebase/storage';

import styles from './Battlefield.module.css'; // CSS Module

import backCard from '../../assets/cards/back-card.png'; // Adjusted import paths
import graveyardCard from '../../assets/cards/graveyard.png';
import blankCardImage from '../../assets/cards/blank.png';
import leftBtnImage from '../../assets/others/leftBtn.png';
import rightBtnImage from '../../assets/others/rightBtn.png';
import heartIcon from '../../assets/others/heart.png';
import cardsIcon from '../../assets/others/card.png';
import boneIcon from '../../assets/others/bone.png';

import Timer from './Timer';
import WaitingForPlayer from './WaitingForPlayer';
import PreparationStage from './PreparationStage';
import EndStage from './EndStage';
import CardSlots from './CardSlots';
import UtilitiesComponent from './UtilitiesComponent';

// Placeholder for blank cards
const placeholderCard = backCard;

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
    const [opponentDeck, setOpponentDeck] = useState([]);
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

    // Selected Card State
    const [selectedCard, setSelectedCard] = useState(null);

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

                // Initialize decks and cards
                setOpponentCards([urls[3], urls[1], urls[2], urls[5], urls[4]]);
                setOpponentDeck([blankCardImage, blankCardImage, blankCardImage, blankCardImage, blankCardImage]);

                setMyCards([urls[0], urls[2], urls[9], urls[2]]);
                setMyDeck([blankCardImage, blankCardImage, blankCardImage, blankCardImage, urls[7]]);

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

    // Determine opponent and player graveyards
    const opponentGraveyard = playerId === 'player1' ? player2Graveyard : player1Graveyard;
    const playerGraveyard = playerId === 'player1' ? player1Graveyard : player2Graveyard;

    // Determine opponent's username based on playerId
    const opponentUsername = playerId === 'player1' ? player2Username : player1Username;
    const ownUsername = playerId === 'player1' ? player1Username : player2Username;

    // Function to handle card selection
    const handleCardClick = (card, index) => {
        setSelectedCard({ card, index }); // Save selected card and index
    };

    // Function to handle slot click for placing card
    const handleSlotClick = (index, deckType) => {
        if (selectedCard) {
            const updatedDeck = deckType === 'myDeck' ? [...myDeck] : [...opponentDeck];
            if (!updatedDeck[index]) {
                updatedDeck[index] = selectedCard.card; // Set the selected card in the slot
                deckType === 'myDeck' ? setMyDeck(updatedDeck) : setOpponentDeck(updatedDeck);
                
                // Optionally, remove the card from selectedCard after placement
                setSelectedCard(null);

                // TODO: Update Firebase accordingly (e.g., move card to slot and remove from deck)
            }
        }
    };

    return (
        <div className={styles.background} style={{ backgroundImage: `url(${background})` }}>
            {!isRoomJoined && (
                <div className={styles.lobby}>
                    <h2>Welcome to the Battle</h2>
                    <input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={styles.usernameInput}
                    />
                    <div className={styles.roomActions}>
                        <button onClick={createRoom} className={styles.createRoomButton}>Create Room</button>
                        <input
                            type="text"
                            placeholder="Enter Room ID"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className={styles.roomIdInput}
                        />
                        <button onClick={joinRoom} className={styles.joinRoomButton}>Join Room</button>
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
                                deck={playerId === 'player1' ? opponentDeck : myDeck}
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
                                handleCardClick={handleCardClick} // Pass handleCardClick to handle card selection
                            />

                            <div className={styles.midRow}>
                                <div>
                                    <CardSlots
                                        cards={opponentDeck.slice(0, 5)}
                                        selectedCard={selectedCard}
                                        onSlotClick={(index) => handleSlotClick(index, 'opponentDeck')}
                                    />
                                    <CardSlots
                                        cards={myDeck.slice(0, 5)}
                                        selectedCard={selectedCard}
                                        onSlotClick={(index) => handleSlotClick(index, 'myDeck')}
                                    />
                                </div>
                                <img className={styles.lastCard} src={lastCard} alt="Last Card" />
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
                                handleCardClick={handleCardClick} // Pass handleCardClick to handle card selection
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
