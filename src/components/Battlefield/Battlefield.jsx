// Battlefield.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { storage, database } from '../firebaseConfig';
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

import styles from './Battlefield.module.css';

import backCard from '../../assets/cards/back-card.png';
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
    const [opponentDeck, setOpponentDeck] = useState([]);
    const [myDeck, setMyDeck] = useState([]);
    const [lastCard, setLastCard] = useState(null); // Single lastCard state
    const [lastCardOwner, setLastCardOwner] = useState(''); // Optional: To track who played the last card
    const [cardUrls, setCardUrls] = useState([]); // Store card URLs
    const [assetsLoaded, setAssetsLoaded] = useState(false); // Track if assets are loaded

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

    // State to track if the player has placed a card this turn
    const [hasPlacedCard, setHasPlacedCard] = useState(false);

    // State to track opponent's attacks
    const [opponentAttacks, setOpponentAttacks] = useState(Array(5).fill(null));

    // Player's hand
    const [myCards, setMyCards] = useState([]);

    /**
     * Function Declarations
     * All useCallback functions are declared before any useEffect Hooks that use them.
     */

    // Define isActiveTurn based on currentTurn and playerId
    const isActiveTurnFlag = currentTurn === playerId;

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
                console.log(`Turn switched to ${updatedGameState.currentTurn}. Current Round: ${updatedGameState.currentRound}`);
                if (updatedGameState.gameStage === 'finished') {
                    console.log('Game has finished.');
                }

                // Reset hasPlacedCard for the new active player
                const activePlayerPath = `rooms/${roomId}/players/${updatedGameState.currentTurn}/hasPlacedCard`;
                await set(dbRef(database, activePlayerPath), false);
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

        if (!assetsLoaded) {
            alert('Assets are still loading. Please wait.');
            return;
        }

        const newRoomRef = push(dbRef(database, 'rooms'));
        const newRoomId = newRoomRef.key;

        setRoomId(newRoomId);
        setPlayerId('player1');
        setIsRoomJoined(true);

        // Initialize room data with gameStage as 'waiting' and currentTurn as 'player1'
        // Initialize the deck with indices 0 to 4 set to blankCardImage
        const initialDeck = Array(5).fill(blankCardImage);
        const initialAttacks = Array(5).fill(null);

        // Initialize the player's hand
        const initialHand = [
            cardUrls[0],
            cardUrls[1], 
            cardUrls[2], 
            cardUrls[3], 
            cardUrls[4], 
        ];

        // Set initial hand to state
        setMyCards(initialHand);

        await set(newRoomRef, {
            players: {
                player1: {
                    username: username,
                    deck: initialDeck, // Use array-based deck
                    graveyard: [],
                    hasPlacedCard: false, // Initialize hasPlacedCard
                    hand: initialHand,
                    lastCard: null // Initialize lastCard
                }
            },
            gameState: {
                gameStage: 'waiting', // Changed from 'preparation' to 'waiting'
                timer: 60,
                currentRound: 0, // Will be set to 1 when both players join
                totalRounds: totalRounds,
                currentTurn: 'player1' // Initialize currentTurn
            },
            lastCard: null, // Initialize lastCard as null
            attacks: {
                player1: initialAttacks
            }
        });

        alert(`Room created! Share this Room ID with your opponent: ${newRoomId}`);
    }, [username, totalRounds, assetsLoaded, cardUrls]);

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

        if (!assetsLoaded) {
            alert('Assets are still loading. Please wait.');
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

                // Initialize the deck with indices 0 to 4 set to blankCardImage
                const initialDeck = Array(5).fill(blankCardImage);
                const initialAttacks = Array(5).fill(null);

                // Initialize the player's hand
                const initialHand = [
                    cardUrls[5], // EarthGolem.png
                    cardUrls[1], // BaneOfExistence.png
                    cardUrls[2], // CelestialOutcast.png
                    cardUrls[3], // CelestialZenith.png
                    cardUrls[4], // ForgemasterOfCreation.png
                ];

                // Set initial hand to state
                setMyCards(initialHand);

                // Add player2 to the room without overwriting existing data
                await set(player2Ref, {
                    username: username,
                    deck: initialDeck, // Use array-based deck
                    graveyard: [],
                    hasPlacedCard: false, // Initialize hasPlacedCard
                    hand: initialHand,
                    lastCard: null // Initialize lastCard
                });

                // Initialize attacks for player2
                const attacksPlayer2Ref = dbRef(database, `rooms/${roomId}/attacks/player2`);
                await set(attacksPlayer2Ref, initialAttacks);

                // Check if both players have joined to start the preparation stage
                const gameStateRef = dbRef(database, `rooms/${roomId}/gameState`);
                const gameStateSnapshot = await get(gameStateRef);
                const currentGameState = gameStateSnapshot.val();

                if (currentGameState && currentGameState.gameStage === 'waiting') {
                    console.log('Both players have joined. Starting preparation stage.');
                    await update(gameStateRef, {
                        gameStage: 'preparation',
                        timer: 30, // Set timer to 30 seconds
                        currentRound: 1, // Start at Round 1
                        currentTurn: 'player1' // Initialize currentTurn
                    });
                }

                alert('Successfully joined the room!');
            }
        }, {
            onlyOnce: true
        });
    }, [username, roomId, assetsLoaded, cardUrls]);

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

                setCardUrls(urls);

                // Set assetsLoaded to true
                setAssetsLoaded(true);

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
            const playerDeckRef = dbRef(database, `rooms/${roomId}/players/${playerId}/deck`);
            const playerHandRef = dbRef(database, `rooms/${roomId}/players/${playerId}/hand`);
            const opponentId = playerId === 'player1' ? 'player2' : 'player1';
            const opponentDeckRef = dbRef(database, `rooms/${roomId}/players/${opponentId}/deck`);
            const playerHasPlacedCardRef = dbRef(database, `rooms/${roomId}/players/${playerId}/hasPlacedCard`);
            const opponentAttacksRef = dbRef(database, `rooms/${roomId}/attacks/${playerId}`); // Player listens to their own attacks

            // Listen to gameState changes
            const unsubscribeGameState = onValue(gameStateRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    console.log('Game State Updated:', data);
                    setGameStage(data.gameStage);
                    setTimer(data.timer);
                    setCurrentRound(data.currentRound);
                    setCurrentTurn(data.currentTurn);
                }
            });

            // Listen to lastCard changes
            const unsubscribeLastCard = onValue(lastCardRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setLastCard(data.card); // Assuming lastCard is an object { card: <url>, owner: <playerId> }
                    setLastCardOwner(data.owner); // Optional: Track who played the last card
                } else {
                    setLastCard(null);
                    setLastCardOwner('');
                }
            });

            // Listen to opponent's deck changes
            const unsubscribeOpponentDeck = onValue(opponentDeckRef, (snapshot) => {
                const data = snapshot.val();
                if (data && Array.isArray(data)) {
                    // Ensure the deck has exactly 5 slots
                    const deckArray = data.slice(0, 5).map(card => card || blankCardImage);
                    setOpponentDeck(deckArray);
                } else {
                    setOpponentDeck(Array(5).fill(blankCardImage));
                }
            });

            // Listen to player's deck changes
            const unsubscribePlayerDeck = onValue(playerDeckRef, (snapshot) => {
                const data = snapshot.val();
                if (data && Array.isArray(data)) {
                    const deckArray = data.slice(0, 5).map(card => card || blankCardImage);
                    setMyDeck(deckArray);
                } else {
                    setMyDeck(Array(5).fill(blankCardImage));
                }
            });

            // Listen to player's hand changes
            const unsubscribePlayerHand = onValue(playerHandRef, (snapshot) => {
                const data = snapshot.val();
                if (data && Array.isArray(data)) {
                    setMyCards(data);
                } else {
                    setMyCards([]);
                }
            });

            // Listen to player's hasPlacedCard
            const unsubscribeHasPlacedCard = onValue(playerHasPlacedCardRef, (snapshot) => {
                const data = snapshot.val();
                setHasPlacedCard(data || false);
            });

            // Listen to opponent's attacks
            const unsubscribeOpponentAttacks = onValue(opponentAttacksRef, (snapshot) => {
                const data = snapshot.val();
                if (data && Array.isArray(data)) {
                    setOpponentAttacks(data.slice(0, 5).map(card => card || null));
                } else {
                    setOpponentAttacks(Array(5).fill(null));
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
                                await update(gameStateRef, {
                                    gameStage: 'preparation',
                                    timer: 30, // Set timer to 30 seconds
                                    currentRound: 1, // Start at Round 1
                                    currentTurn: 'player1' // Initialize currentTurn
                                });
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
                unsubscribeOpponentDeck();
                unsubscribePlayerDeck();
                unsubscribePlayerHand();
                unsubscribeHasPlacedCard();
                unsubscribeOpponentAttacks();
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
                if (data && Array.isArray(data)) {
                    setPlayer1Graveyard(data);
                } else {
                    setPlayer1Graveyard([]);
                }
            });

            const unsubscribePlayer2Graveyard = onValue(player2GraveyardRef, (snapshot) => {
                const data = snapshot.val();
                if (data && Array.isArray(data)) {
                    setPlayer2Graveyard(data);
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
        if (card) {
            setSelectedCard({ card, index }); // Save selected card and index
        }
    };

    /**
     * handleSlotClick Function
     * Handles placing a card into a specific slot.
     */
    const handleSlotClick = useCallback(async (index) => {
        // Ensure it's the player's turn
        if (!isActiveTurnFlag) {
            alert("It's not your turn!");
            return;
        }

        // Ensure the player hasn't placed a card this turn
        if (hasPlacedCard) {
            alert('You have already placed a card this turn.');
            return;
        }

        // Ensure a card is selected
        if (!selectedCard) {
            alert('Please select a card from your hand to place.');
            return;
        }

        // Ensure the slot is empty
        if (myDeck[index] !== blankCardImage) {
            alert('This slot is already occupied.');
            return;
        }

        try {
            // Update local state: place the card in the slot
            const updatedDeck = [...myDeck];
            updatedDeck[index] = selectedCard.card;
            setMyDeck(updatedDeck);

            // Update Firebase: set the card in the slot
            const slotPath = `rooms/${roomId}/players/${playerId}/deck/${index}`;
            await set(dbRef(database, slotPath), selectedCard.card);

            // Update lastCard both locally and in Firebase
            await update(dbRef(database, `rooms/${roomId}`), { 
                lastCard: {
                    card: selectedCard.card,
                    owner: playerId // Optional: To track who played the card
                }
            });

            // Update local state
            setLastCard(selectedCard.card);
            setLastCardOwner(username);

            // Remove the card from the hand
            const updatedMyCards = [...myCards];
            updatedMyCards.splice(selectedCard.index, 1);
            setMyCards(updatedMyCards);

            // Update Firebase: update the hand
            const handPath = `rooms/${roomId}/players/${playerId}/hand`;
            await set(dbRef(database, handPath), updatedMyCards);

            // Set hasPlacedCard to true in Firebase
            const hasPlacedCardPath = `rooms/${roomId}/players/${playerId}/hasPlacedCard`;
            await set(dbRef(database, hasPlacedCardPath), true);

            // Reset selected card
            setSelectedCard(null);

            console.log(`Card placed in slot ${index}. Last card set to ${selectedCard.card}.`);
        } catch (error) {
            console.error('Error placing card:', error);
            alert('There was an error placing your card. Please try again.');
        }
    }, [isActiveTurnFlag, hasPlacedCard, selectedCard, myDeck, myCards, roomId, playerId, username]);

    /**
     * handleAttack Function
     * Handles the attack action using the last placed card.
     */
    const handleAttack = useCallback(async () => {
        if (!isActiveTurnFlag) {
            alert("It's not your turn!");
            return;
        }

        if (!lastCard) {
            alert('No card selected for attack.');
            return;
        }

        try {
            console.log(`${username} is attacking with ${lastCard}`);

            const roomRef = dbRef(database, `rooms/${roomId}`);

            // Add lastCard to graveyard
            const graveyardPath = `rooms/${roomId}/players/${playerId}/graveyard`;
            const graveyardRef = dbRef(database, graveyardPath);
            await push(graveyardRef, lastCard);

            // Remove the card from the deck
            const deck = myDeck;
            const cardIndex = deck.indexOf(lastCard);
            if (cardIndex !== -1) {
                const deckPath = `rooms/${roomId}/players/${playerId}/deck/${cardIndex}`;
                await set(dbRef(database, deckPath), blankCardImage);

                // Update local deck state
                const updatedDeck = [...deck];
                updatedDeck[cardIndex] = blankCardImage;
                setMyDeck(updatedDeck);

                // **Do not reset lastCard**
                // If you wish to clear the lastCard after attack, uncomment the following lines:
                // setLastCard(null);
                // setLastCardOwner('');
                // await update(dbRef(database, `rooms/${roomId}`), { lastCard: null });
            }

            // Switch turn after attack
            await switchTurn();

            // Set hasPlacedCard to false for the next player
            const hasPlacedCardPath = `rooms/${roomId}/players/${playerId}/hasPlacedCard`;
            await set(dbRef(database, hasPlacedCardPath), false);

            console.log(`Attack performed with ${lastCard}. Turn switched to opponent.`);
        } catch (error) {
            console.error('Error performing attack:', error);
            alert('There was an error performing the attack. Please try again.');
        }
    }, [isActiveTurnFlag, lastCard, roomId, playerId, myDeck, username, switchTurn]);

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
                                deck={opponentDeck}
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
                                handleCardClick={() => {}} // No action for opponent's cards
                            />

                            <div className={styles.midRow}>
                                <div className={styles.decksContainer}>
                                    {/* Opponent's Deck Slots */}
                                    <CardSlots
                                        title={`${opponentUsername}'s Deck`}
                                        cards={opponentDeck}
                                        selectedCard={null} // Opponent's deck doesn't require selection
                                        onSlotClick={() => {}} // No action for opponent's slots
                                        isOpponent={true} // Indicate it's the opponent's deck
                                    />
                                    {/* Player's Deck Slots */}
                                    <CardSlots
                                        title="Your Deck"
                                        cards={myDeck}
                                        selectedCard={selectedCard}
                                        onSlotClick={(index) => handleSlotClick(index)}
                                        isOpponent={false} // Indicate it's the player's deck
                                    />
                                </div>
                                {/* Display lastCard centrally */}
                                <div className={styles.lastCardContainer}>
                                    <h3>Last Card Played</h3>
                                    {lastCard ? (
                                        <>
                                            <img className={styles.lastCard} src={lastCard} alt="Last Card" />
                                            {/* Optional: Display who played the last card */}
                                            {lastCardOwner && <p>{lastCardOwner} played this card.</p>}
                                        </>
                                    ) : (
                                        <>
                                            <img className={styles.lastCard} src={blankCardImage} alt="No Last Card" />
                                            <p>No cards have been played yet.</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Player's Utilities at the Bottom */}
                            <div className={styles.utilitiesContainer}>
                                <UtilitiesComponent
                                    isOpponent={false} // Indicates this Utilities is for the player
                                    username={ownUsername || 'You'} // Correct own username
                                    deck={myCards}
                                    graveyard={playerGraveyard}
                                    leftBtn={leftButton}
                                    rightBtn={rightButton}
                                    roomId={roomId}
                                    playerId={playerId}
                                    isActiveTurn={isActiveTurnFlag} // Pass if it's player's turn
                                    switchTurn={switchTurn} // Pass the switchTurn function as a prop
                                    gameStage={gameStage} // Pass gameStage for additional logic if needed
                                    currentRound={currentRound} // Pass currentRound for potential use
                                    isGraveyardVisible={isPlayerGraveyardVisible}
                                    toggleGraveyard={togglePlayerGraveyard}
                                    handleCardClick={handleCardClick} // Pass handleCardClick to handle card selection
                                    onAttack={handleAttack} // Pass handleAttack to handle attack action
                                />
                            </div>
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
