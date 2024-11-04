// Battlefield.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { storage, firestore } from '../firebaseConfig'; // Ensure firestore and storage are correctly initialized
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    runTransaction,
    onSnapshot,
    setDoc,
    deleteDoc
} from 'firebase/firestore';
import {
    ref as storageRef,
    getDownloadURL
} from 'firebase/storage';

import styles from './Battlefield.module.css';

import blankCardImage from '../../assets/cards/blank.png';

import Timer from './Timer';
import WaitingForPlayer from './WaitingForPlayer';
import PreparationStage from './PreparationStage';
import EndStage from './EndStage';
import CardSlots from './CardSlots';
import UtilitiesComponent from './UtilitiesComponent';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ToastStyles.css'; // Import custom toast styles

import { CardsContext } from './CardsContext'; // Ensure correct path

function Battlefield() {

    /**
     * State Variables
     */

    // State variables for assets
    const [background, setBackground] = useState('');
    const [leftButton, setLeftButton] = useState('');
    const [rightButton, setRightButton] = useState('');
    const [assetsLoaded, setAssetsLoaded] = useState(false); // Track if assets are loaded

    // Multiplayer state variables
    const [roomId, setRoomId] = useState('');
    const [playerId, setPlayerId] = useState(''); // 'player1' or 'player2'
    const [username, setUsername] = useState('');
    const [isRoomJoined, setIsRoomJoined] = useState(false);
    const [gameStage, setGameStage] = useState('lobby'); // 'lobby', 'waiting', 'preparation', 'battle', 'finished'
    const [timer, setTimer] = useState(120); // Updated to 2 minutes preparation
    const [currentRound, setCurrentRound] = useState(0);
    const totalRounds = 5;

    // Separate state variables for player usernames
    const [player1Username, setPlayer1Username] = useState('');
    const [player2Username, setPlayer2Username] = useState('');

    // State variables for each player's graveyard
    const [player1Graveyard, setPlayer1Graveyard] = useState([]);
    const [player2Graveyard, setPlayer2Graveyard] = useState([]);

    // State to track whose turn it is
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

    // Player's and Opponent's Decks
    const [myDeck, setMyDeck] = useState([]);
    const [opponentDeck, setOpponentDeck] = useState([]);

    // Last Card Played
    const [lastCard, setLastCard] = useState(null); // Single lastCard state
    const [lastCardOwner, setLastCardOwner] = useState(''); // Optional: To track who played the last card

    // State to track readiness
    const [playerReady, setPlayerReady] = useState(false);
    const [opponentReady, setOpponentReady] = useState(false);

    // Timer and Phase Management
    const [preparationTimer, setPreparationTimer] = useState(120); // 2 minutes preparation
    const [battleTimer, setBattleTimer] = useState(60); // 1 minute battle turn

    // Accessing cards data from CardsContext
    const { cards, loading: cardsLoading, error: cardsError } = useContext(CardsContext);

    /**
     * Helper Functions
     */

    // Function to get the active player's username
    const getActivePlayerUsername = useCallback(() => {
        return currentTurn === 'player1' ? player1Username : player2Username;
    }, [currentTurn, player1Username, player2Username]);

    // Define isActiveTurnFlag based on currentTurn and playerId
    const isActiveTurnFlag = useMemo(() => currentTurn === playerId, [currentTurn, playerId]);

    /**
     * Function Declarations
     * All useCallback functions are declared after helper functions.
     */

    // **Updated Function: Check if all required Monster/Trap cards have been placed**
    const hasPlacedAllRequiredCards = useCallback(() => {
        // Count remaining Monster/Trap cards in the player's hand
        const remainingRequiredCards = myCards.filter(card => card.cardType === 'monster' || card.cardType === 'trap').length;
        console.log(`Remaining Monster/Trap cards in hand: ${remainingRequiredCards}`);
        return remainingRequiredCards === 0;
    }, [myCards]);

    // **New Function: Check if player has any Spell cards in hand**
    const hasSpellCardsInHand = useCallback(() => {
        return myCards.some(card => card.cardType === 'spell');
    }, [myCards]);

    // **New Function: Handle Spell Card Usage**
    const handleSpellUsage = useCallback(async (spellCard) => {
        if (gameStage !== 'battle') {
            toast.warn('You can only use Spell cards during the Battle phase.');
            return;
        }

        if (!isActiveTurnFlag) {
            toast.warn("It's not your turn!");
            return;
        }

        try {
            // Implement spell effect based on spellCard.cardName or other properties
            // For demonstration, let's assume we have a "Heal" spell that restores HP
            switch (spellCard.cardName.toLowerCase()) {
                case 'heal':
                    // Example: Restore HP to the player
                    // This requires additional state variables for HP, which are not currently defined
                    // Implement the logic as per your game's rules
                    toast.success('Heal spell used! (Effect not implemented)');
                    console.log('Heal spell used.');
                    break;
                // Add more spell cases here
                default:
                    toast.warn('Unknown spell effect.');
                    console.warn(`Spell effect for ${spellCard.cardName} not defined.`);
            }

            // After using the spell, remove it from hand and move to graveyard
            // Remove from Firestore hand
            const handDocRef = doc(firestore, `rooms/${roomId}/players/${playerId}/hand`, spellCard.id);
            await deleteDoc(handDocRef);

            // Add to graveyard
            const graveyardRef = collection(firestore, `rooms/${roomId}/players/${playerId}/graveyard`);
            await addDoc(graveyardRef, spellCard);

            // Update local state
            setMyCards(prevCards => prevCards.filter(card => card.id !== spellCard.id));
            toast.success(`Used spell card: ${spellCard.cardName}`);
            console.log(`Used spell card: ${spellCard.cardName}`);

        } catch (error) {
            console.error('Error using spell card:', error);
            toast.error('Failed to use spell card.');
        }
    }, [gameStage, isActiveTurnFlag, roomId, playerId, firestore]);

    // Function to switch turns using Firestore transaction
    const switchTurn = useCallback(async () => {
        const roomDocRef = doc(firestore, 'rooms', roomId); // Correct reference
        const gameStateField = 'gameState';

        try {
            await runTransaction(firestore, async (transaction) => {
                const roomDoc = await transaction.get(roomDocRef);
                if (!roomDoc.exists()) {
                    throw new Error('Room does not exist!');
                }

                const roomData = roomDoc.data();
                const { gameState } = roomData;

                if (!gameState) {
                    throw new Error('Game state does not exist!');
                }

                const { currentTurn, currentRound, totalRounds } = gameState;
                const nextTurn = currentTurn === 'player1' ? 'player2' : 'player1';
                let newRound = currentRound;

                // If switching back to player1, increment the round
                if (nextTurn === 'player1') {
                    newRound += 1;
                    if (newRound > totalRounds) {
                        transaction.update(roomDocRef, {
                            [`${gameStateField}.gameStage`]: 'finished',
                            [`${gameStateField}.timer`]: 0,
                        });
                        return;
                    } else {
                        transaction.update(roomDocRef, {
                            [`${gameStateField}.currentRound`]: newRound
                        });
                    }
                }

                transaction.update(roomDocRef, {
                    [`${gameStateField}.currentTurn`]: nextTurn,
                    [`${gameStateField}.timer`]: 30, // Reset timer for the next player
                });
            });

            // Update local state after transaction
            const updatedRoomDoc = await getDoc(doc(firestore, 'rooms', roomId));
            if (updatedRoomDoc.exists()) {
                const updatedGameState = updatedRoomDoc.data().gameState;
                setGameStage(updatedGameState.gameStage);
                setTimer(updatedGameState.timer);
                setCurrentRound(updatedGameState.currentRound);
                setCurrentTurn(updatedGameState.currentTurn);
                console.log(`Turn switched to ${updatedGameState.currentTurn}. Current Round: ${updatedGameState.currentRound}`);

                if (updatedGameState.gameStage === 'finished') {
                    console.log('Game has finished.');
                    toast.info('Game has finished.');
                }

                // Reset hasPlacedCard for the new active player
                const activePlayerRef = doc(firestore, 'rooms', roomId, 'players', updatedGameState.currentTurn);
                await updateDoc(activePlayerRef, {
                    hasPlacedCard: false
                });
            }
        } catch (error) {
            console.error('Error switching turn:', error);
            toast.error('Failed to switch turn.');
        }
    }, [roomId, firestore]);

    /**
     * Function to handle the player marking themselves as ready
     */
    const handleReady = useCallback(async () => {
        if (!isRoomJoined || !roomId || !playerId) {
            toast.warn('You must join a room first.');
            return;
        }

        // **Updated Check: Ensure all required Monster/Trap cards have been placed**
        if (!hasPlacedAllRequiredCards()) {
            toast.warn('Please place all your Monster and Trap cards before readying up.');
            return;
        }

        try {
            const playerDocRef = doc(firestore, `rooms/${roomId}/players/${playerId}`);
            await setDoc(playerDocRef, {
                hasPlacedCard: true
            }, { merge: true });

            setPlayerReady(true);

            toast.success('You are ready.');
        } catch (error) {
            console.error('Error setting ready:', error);
            toast.error('Failed to mark as ready.');
        }
    }, [isRoomJoined, roomId, playerId, firestore, hasPlacedAllRequiredCards]);

    /**
     * Function Declarations for Creating and Joining Rooms
     */

    // Function to handle creating a new room
    const handleCreateRoom = useCallback(async () => {
        if (!username.trim()) {
            toast.warn('Please enter a username.');
            return;
        }

        try {
            // Query Firestore for the user
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('username', '==', username.trim()));
            console.log(`Searching for user with username: ${username.trim()}`);
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast.error('Username not found. Please check and try again.');
                console.error('No user found with the provided username.');
                return;
            }

            // Assuming usernames are unique, take the first match
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            console.log('User data retrieved:', userData);

            // Fetch user's cards based on inventory
            const inventory = userData.inventory || [];
            console.log('User inventory:', inventory);

            if (inventory.length === 0) {
                toast.warn('No cards found in your inventory.');
                console.warn('Inventory array is empty.');
                return;
            }

            // Map inventory card IDs to card objects from CardsContext
            const userCards = inventory.map(cardId => {
                const card = cards.find(c => c.id === cardId);
                if (card) {
                    return card;
                } else {
                    console.warn(`Card with ID ${cardId} not found in CardsContext.`);
                    return null;
                }
            }).filter(card => card !== null);

            console.log('Mapped user cards:', userCards);

            if (userCards.length === 0) {
                toast.warn('No valid cards found in your inventory.');
                console.warn('All cards mapped from inventory are null.');
                return;
            }

            // Create a new room with a unique ID
            const newRoomRef = await addDoc(collection(firestore, 'rooms'), {
                gameState: {
                    gameStage: 'waiting',
                    timer: 60,
                    currentRound: 0,
                    totalRounds: totalRounds,
                    currentTurn: 'player1',
                },
                lastCard: null,
                attacks: {
                    player1: Array(5).fill(null),
                    player2: Array(5).fill(null)
                }
            });

            const newRoomId = newRoomRef.id;
            setRoomId(newRoomId);
            setPlayerId('player1');
            setIsRoomJoined(true);

            // Initialize player1's data
            const player1DocRef = doc(firestore, `rooms/${newRoomId}/players`, 'player1');
            await setDoc(player1DocRef, {
                username: username.trim(),
                deck: [], // Will be initialized below
                graveyard: [],
                hasPlacedCard: false,
                lastCard: null
            });

            // Initialize player1's deck with 5 blank slots
            const player1DeckRef = collection(firestore, `rooms/${newRoomId}/players/player1/deck`);
            const deckPromises = [];
            for (let i = 0; i < 5; i++) {
                const slotDocRef = doc(player1DeckRef, i.toString());
                deckPromises.push(setDoc(slotDocRef, {
                    imageUrl: blankCardImage,
                    cardType: null,
                    cardName: '',
                }, { merge: true }));
            }
            await Promise.all(deckPromises);

            // Initialize player1's hand in the hand subcollection
            const player1HandRef = collection(firestore, `rooms/${newRoomId}/players/player1/hand`);
            const handPromises = userCards.map(card => addDoc(player1HandRef, {
                id: card.id, // Store card ID for reference
                imageUrl: card.imageUrl,
                cardType: card.cardType,
                cardName: card.cardName,
            }));
            await Promise.all(handPromises);

            console.log(`Room created with ID: ${newRoomId}`);
            toast.success(`Room created! Share Room ID: ${newRoomId} with your opponent.`);
        } catch (error) {
            console.error('Error creating room:', error);
            toast.error('Failed to create room. Please try again.');
        }
    }, [username, firestore, totalRounds, cards]);

    // Function to handle joining an existing room
    const handleJoinRoom = useCallback(async () => {
        if (!username.trim()) {
            toast.warn('Please enter a username.');
            return;
        }

        if (!roomId.trim()) {
            toast.warn('Please enter a Room ID to join.');
            return;
        }

        try {
            // Query Firestore for the user
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('username', '==', username.trim()));
            console.log(`Searching for user with username: ${username.trim()}`);
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast.error('Username not found. Please check and try again.');
                console.error('No user found with the provided username.');
                return;
            }

            // Assuming usernames are unique, take the first match
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            console.log('User data retrieved:', userData);

            // Fetch user's cards based on inventory
            const inventory = userData.inventory || [];
            console.log('User inventory:', inventory);

            if (inventory.length === 0) {
                toast.warn('No cards found in your inventory.');
                console.warn('Inventory array is empty.');
                return;
            }

            // Map inventory card IDs to card objects from CardsContext
            const userCards = inventory.map(cardId => {
                const card = cards.find(c => c.id === cardId);
                if (card) {
                    return card;
                } else {
                    console.warn(`Card with ID ${cardId} not found in CardsContext.`);
                    return null;
                }
            }).filter(card => card !== null);

            console.log('Mapped user cards:', userCards);

            if (userCards.length === 0) {
                toast.warn('No valid cards found in your inventory.');
                console.warn('All cards mapped from inventory are null.');
                return;
            }

            // Reference to the room document
            const roomDocRef = doc(firestore, 'rooms', roomId.trim());

            const roomSnap = await getDoc(roomDocRef);

            if (!roomSnap.exists()) {
                toast.error('Room ID not found. Please check and try again.');
                console.error('Room does not exist.');
                return;
            }

            const roomData = roomSnap.data();

            // Check if player2 is already present
            if (roomData.players && roomData.players.player2 && roomData.players.player2.username) {
                toast.error('Room is already full.');
                console.error('Room is already full.');
                return;
            }

            // Add player2 to the room as a separate document
            const player2DocRef = doc(firestore, `rooms/${roomId}/players`, 'player2');
            await setDoc(player2DocRef, {
                username: username.trim(),
                deck: [],
                graveyard: [],
                hasPlacedCard: false,
                lastCard: null
            }, { merge: true });

            setPlayerId('player2');
            setIsRoomJoined(true);

            // Initialize player2's deck with 5 blank slots
            const player2DeckRef = collection(firestore, `rooms/${roomId}/players/player2/deck`);
            const deckPromises = [];
            for (let i = 0; i < 5; i++) {
                const slotDocRef = doc(player2DeckRef, i.toString());
                deckPromises.push(setDoc(slotDocRef, {
                    imageUrl: blankCardImage,
                    cardType: null,
                    cardName: '',
                }, { merge: true }));
            }
            await Promise.all(deckPromises);

            // Initialize player2's hand in the hand subcollection
            const player2HandRef = collection(firestore, `rooms/${roomId}/players/player2/hand`);
            const handPromises = userCards.map(card => addDoc(player2HandRef, {
                id: card.id, // Store card ID for reference
                imageUrl: card.imageUrl,
                cardType: card.cardType,
                cardName: card.cardName,
            }));
            await Promise.all(handPromises);

            // Update gameState to 'preparation' since both players have joined
            await updateDoc(roomDocRef, {
                'gameState.gameStage': 'preparation',
                'gameState.timer': 120, // 2 minutes preparation
                'gameState.currentRound': 1,
                'gameState.currentTurn': 'player1'
            });

            toast.success('Joined the room successfully. Starting Preparation Phase.');
            console.log('Joined the room successfully. Starting Preparation Phase.');
        } catch (error) {
            console.error('Error joining room:', error);
            toast.error('Failed to join room. Please check Room ID and try again.');
        }
    }, [username, roomId, firestore, cards]);

    /**
     * Function to handle slot clicks
     */
    const handleSlotClick = useCallback(async (index) => {
        if (gameStage !== 'preparation') return; // Only allow actions during preparation

        // Ensure a card is selected
        if (!selectedCard) {
            toast.warn('Please select a card from your hand to place.');
            return;
        }

        // Validate card type
        if (selectedCard.card.cardType !== 'monster' && selectedCard.card.cardType !== 'trap') {
            toast.error('Only Monster and Trap cards can be placed in the slots.');
            return;
        }

        // Ensure the slot is empty
        if (myDeck[index].imageUrl !== blankCardImage) {
            toast.warn('This slot is already occupied.');
            return;
        }

        try {
            // Update Firestore: set the card in the slot
            const slotDocRef = doc(firestore, `rooms/${roomId}/players/${playerId}/deck`, index.toString());
            await setDoc(slotDocRef, {
                imageUrl: selectedCard.card.imageUrl, // This should be the Storage path
                cardType: selectedCard.card.cardType,
                cardName: selectedCard.card.cardName,
                // Add other necessary card properties
            }, { merge: true });

            // Remove the card from Firestore's hand subcollection
            const handDocRef = doc(firestore, `rooms/${roomId}/players/${playerId}/hand`, selectedCard.card.id);
            await deleteDoc(handDocRef); // Ensure deleteDoc is imported from 'firebase/firestore'

            // Update local state
            const updatedDeck = [...myDeck];
            updatedDeck[index] = selectedCard.card;
            setMyDeck(updatedDeck);
            console.log(`Placed ${selectedCard.card.cardName} in slot ${index + 1}. Updated myDeck:`, updatedDeck);

            // Remove the card from the hand
            const updatedMyCards = myCards.filter(card => card.id !== selectedCard.card.id);
            setMyCards(updatedMyCards);
            console.log('Updated myCards after placement:', updatedMyCards);

            // **Removed Premature Readiness State Updates**
            /*
            // Set hasPlacedCard to true in Firestore
            const playerDocRef = doc(firestore, `rooms/${roomId}/players/${playerId}`);
            await setDoc(playerDocRef, {
                hasPlacedCard: true
            }, { merge: true });

            // Update local readiness state
            setPlayerReady(true);
            */

            // **Only reset selected card**
            setSelectedCard(null);

            toast.success(`Placed ${selectedCard.card.cardName} in slot ${index + 1}.`);
        } catch (error) {
            console.error('Error placing card:', error);
            toast.error('Failed to place card.');
        }
    }, [gameStage, selectedCard, myDeck, myCards, roomId, playerId, firestore]);

    /**
     * Function to handle card selection from hand
     */
    const handleCardSelection = (card, index) => {
        if (card) {
            setSelectedCard({ card, index }); // Save selected card and index
            toast.info(`Selected ${card.cardName} for placement.`);
            console.log(`Selected card: ${card.cardName} at index ${index}`);
        }
    };

    /**
     * Function to handle attack action
     */
    const handleAttack = useCallback(async () => {
        if (!isActiveTurnFlag) {
            toast.warn("It's not your turn!");
            return;
        }

        if (!lastCard) {
            toast.warn('No card selected for attack.');
            return;
        }

        try {
            console.log(`${username} is attacking with ${lastCard.cardName}`);

            // Reference to the room document
            const roomRef = doc(firestore, 'rooms', roomId);

            // Add lastCard to graveyard
            const graveyardRef = collection(firestore, `rooms/${roomId}/players/${playerId}/graveyard`);
            await addDoc(graveyardRef, lastCard);

            // Remove the card from the deck
            const deckIndex = myDeck.findIndex(card => card.imageUrl === lastCard.imageUrl);
            if (deckIndex !== -1) {
                const deckDocRef = doc(firestore, `rooms/${roomId}/players/${playerId}/deck`, deckIndex.toString());
                await setDoc(deckDocRef, {
                    imageUrl: blankCardImage,
                    cardType: null,
                    cardName: '',
                }, { merge: true });

                // Update local deck state
                const updatedDeck = [...myDeck];
                updatedDeck[deckIndex] = {
                    imageUrl: blankCardImage,
                    cardType: null,
                    cardName: '',
                };
                setMyDeck(updatedDeck);
                console.log(`Removed ${lastCard.cardName} from deck slot ${deckIndex + 1}. Updated deck:`, updatedDeck);
            }

            // Add the attack to the 'attacks' collection with the owner field
            const attacksRef = collection(firestore, 'rooms', roomId, 'attacks');
            await addDoc(attacksRef, {
                card: lastCard,
                owner: playerId, // 'player1' or 'player2'
                timestamp: new Date(), // Or use Firestore serverTimestamp if needed
            });

            // Update lastCard both locally and in Firestore
            await updateDoc(roomRef, {
                lastCard: {
                    card: lastCard,
                    owner: playerId // Track who played the card
                }
            });

            // Update local state
            setLastCard(lastCard);
            setLastCardOwner(username);
            console.log(`Attack performed with ${lastCard.cardName}. Last card updated.`);

            // Switch turn after attack
            await switchTurn();

            // Set hasPlacedCard to false for the next player
            const playerDocRef = doc(firestore, `rooms/${roomId}/players/${playerId}`);
            await setDoc(playerDocRef, {
                hasPlacedCard: false
            }, { merge: true });

            setPlayerReady(false); // Reset readiness for next turn

            toast.success(`Attack performed with ${lastCard.cardName}. Turn switched to opponent.`);
        } catch (error) {
            console.error('Error performing attack:', error);
            toast.error('There was an error performing the attack. Please try again.');
        }
    }, [isActiveTurnFlag, lastCard, roomId, playerId, myDeck, username, switchTurn, firestore]);

    /**
     * Function to handle spell card usage
     */
    // **New Function: Handle Spell Card Usage**
    // Already defined above as handleSpellUsage

    /**
     * useEffect Hooks
     * All useEffect Hooks are declared after all function declarations.
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

                // Set assetsLoaded to true
                setAssetsLoaded(true);

            } catch (error) {
                console.error('Error fetching Firebase assets:', error);
                toast.error('Error fetching game assets.');
            }
        };
        fetchAssets();
    }, [storage]);

    // Handle multiplayer game state synchronization
    useEffect(() => {
        if (isRoomJoined && roomId && playerId) {
            const roomRef = doc(firestore, 'rooms', roomId);

            // References
            const gameStateRef = roomRef; // Correct reference
            const lastCardRef = roomRef;
            const playersRef = collection(firestore, 'rooms', roomId, 'players');
            const playerDeckRef = collection(firestore, 'rooms', roomId, 'players', playerId, 'deck');
            const playerHandRef = collection(firestore, 'rooms', roomId, 'players', playerId, 'hand');
            const opponentId = playerId === 'player1' ? 'player2' : 'player1';
            const opponentDeckRef = collection(firestore, 'rooms', roomId, 'players', opponentId, 'deck');
            const playerHasPlacedCardRef = doc(firestore, 'rooms', roomId, 'players', playerId);
            const attacksCollectionRef = collection(firestore, 'rooms', roomId, 'attacks');
            const opponentAttacksQuery = query(attacksCollectionRef, where('owner', '==', opponentId));

            // Listen to gameState changes
            const unsubscribeGameState = onSnapshot(roomRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.gameState) {
                        setGameStage(data.gameState.gameStage);
                        setTimer(data.gameState.timer);
                        setCurrentRound(data.gameState.currentRound);
                        setCurrentTurn(data.gameState.currentTurn);
                        console.log('Updated gameState:', data.gameState);
                    }
                }
            }, (error) => {
                console.error('Error listening to gameState:', error);
                toast.error('Failed to listen to game state updates.');
            });

            // Listen to lastCard changes
            const unsubscribeLastCard = onSnapshot(roomRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.lastCard) {
                        setLastCard(data.lastCard.card);
                        setLastCardOwner(data.lastCard.owner);
                        console.log('Updated lastCard:', data.lastCard);
                    } else {
                        setLastCard(null);
                        setLastCardOwner('');
                        console.log('No lastCard found.');
                    }
                }
            }, (error) => {
                console.error('Error listening to lastCard:', error);
                toast.error('Failed to listen to last card updates.');
            });

            // Listen to opponent's deck changes
            const unsubscribeOpponentDeck = onSnapshot(opponentDeckRef, async (querySnapshot) => {
                const deckPromises = querySnapshot.docs.map(async (doc) => {
                    const cardData = doc.data();
                    let imageUrl = cardData.imageUrl;
                    if (imageUrl && imageUrl !== blankCardImage) {
                        try {
                            imageUrl = await getDownloadURL(storageRef(storage, imageUrl));
                        } catch (error) {
                            console.error('Error fetching image URL:', error);
                            imageUrl = blankCardImage;
                        }
                    }
                    return {
                        ...cardData,
                        imageUrl
                    };
                });

                const deckArray = await Promise.all(deckPromises);
                // Ensure the deck has exactly 5 slots
                const filledDeck = Array.from({ length: 5 }).map((_, index) => {
                    return deckArray[index] || {
                        imageUrl: blankCardImage,
                        cardType: null,
                        cardName: '',
                    };
                });
                setOpponentDeck(filledDeck);
                console.log('Updated opponentDeck:', filledDeck);
            }, (error) => {
                console.error('Error listening to opponent deck:', error);
                toast.error('Failed to listen to opponent deck updates.');
            });

            // Listen to player's deck changes
            const unsubscribePlayerDeck = onSnapshot(playerDeckRef, async (querySnapshot) => {
                const deckPromises = querySnapshot.docs.map(async (doc) => {
                    const cardData = doc.data();
                    let imageUrl = cardData.imageUrl;
                    if (imageUrl && imageUrl !== blankCardImage) {
                        try {
                            imageUrl = await getDownloadURL(storageRef(storage, imageUrl));
                        } catch (error) {
                            console.error('Error fetching image URL:', error);
                            imageUrl = blankCardImage;
                        }
                    }
                    return {
                        ...cardData,
                        imageUrl
                    };
                });

                const deckArray = await Promise.all(deckPromises);
                // Ensure the deck has exactly 5 slots
                const filledDeck = Array.from({ length: 5 }).map((_, index) => {
                    return deckArray[index] || {
                        imageUrl: blankCardImage,
                        cardType: null,
                        cardName: '',
                    };
                });
                setMyDeck(filledDeck);
                console.log('Updated myDeck:', filledDeck);
            }, (error) => {
                console.error('Error listening to player deck:', error);
                toast.error('Failed to listen to your deck updates.');
            });

            // Listen to player's hand changes
            const unsubscribePlayerHand = onSnapshot(playerHandRef, async (querySnapshot) => {
                const handPromises = querySnapshot.docs.map(async (doc) => {
                    const cardData = doc.data();
                    let imageUrl = cardData.imageUrl;
                    if (imageUrl && imageUrl !== blankCardImage) {
                        try {
                            imageUrl = await getDownloadURL(storageRef(storage, imageUrl));
                        } catch (error) {
                            console.error('Error fetching image URL:', error);
                            imageUrl = blankCardImage;
                        }
                    }
                    return {
                        id: doc.id, // Include the Firestore document ID
                        ...cardData,
                        imageUrl
                    };
                });

                const handArray = await Promise.all(handPromises);
                setMyCards(handArray);
                console.log('Updated myCards:', handArray); // Debugging
            }, (error) => {
                console.error('Error listening to player hand:', error);
                toast.error('Failed to listen to your hand updates.');
            });

            // Listen to player's hasPlacedCard
            const unsubscribeHasPlacedCard = onSnapshot(playerHasPlacedCardRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setHasPlacedCard(data.hasPlacedCard || false);
                    console.log('Updated hasPlacedCard:', data.hasPlacedCard);
                }
            }, (error) => {
                console.error('Error listening to hasPlacedCard:', error);
                toast.error('Failed to listen to your placement status.');
            });

            // Listen to opponent's attacks
            const unsubscribeOpponentAttacks = onSnapshot(opponentAttacksQuery, (querySnapshot) => {
                const attacksArray = [];
                querySnapshot.forEach(doc => {
                    attacksArray.push(doc.data());
                });
                setOpponentAttacks(attacksArray.slice(0, 5).map(card => card || null));
                console.log('Updated opponentAttacks:', attacksArray);
            }, (error) => {
                console.error('Error listening to opponent attacks:', error);
                toast.error('Failed to listen to opponent attacks.');
            });

            // Listen to players data and set usernames
            const unsubscribePlayers = onSnapshot(playersRef, async (querySnapshot) => {
                const players = {};
                querySnapshot.forEach(doc => {
                    players[doc.id] = doc.data();
                });

                const p1 = players.player1;
                const p2 = players.player2;

                if (playerId === 'player1') {
                    setPlayer1Username(p1?.username || '');
                    setPlayer2Username(p2?.username || 'Opponent');

                    if (p1 && p2 && gameStage === 'waiting') {
                        // Both players have joined, start preparation phase
                        console.log('Both players have joined. Starting preparation stage.');
                        await updateDoc(doc(firestore, 'rooms', roomId), {
                            'gameState.gameStage': 'preparation',
                            'gameState.timer': 120, // 2 minutes preparation
                            'gameState.currentRound': 1,
                            'gameState.currentTurn': 'player1'
                        });
                        toast.success('Both players have joined. Starting Preparation Phase.');
                    }
                } else if (playerId === 'player2') {
                    setPlayer1Username(p1?.username || 'Opponent');
                    setPlayer2Username(p2?.username || '');
                }
            }, (error) => {
                console.error('Error listening to players:', error);
                toast.error('Failed to listen to player data.');
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
    }, [isRoomJoined, roomId, playerId, gameStage, firestore, cards]);

    // Listen to each player's graveyard
    useEffect(() => {
        if (isRoomJoined && roomId) {
            const player1GraveyardRef = collection(firestore, `rooms/${roomId}/players/player1/graveyard`);
            const player2GraveyardRef = collection(firestore, `rooms/${roomId}/players/player2/graveyard`);

            const unsubscribePlayer1Graveyard = onSnapshot(player1GraveyardRef, (querySnapshot) => {
                const graveyardArray = [];
                querySnapshot.forEach(doc => {
                    graveyardArray.push(doc.data());
                });
                setPlayer1Graveyard(graveyardArray);
                console.log('Updated player1Graveyard:', graveyardArray);
            }, (error) => {
                console.error('Error listening to player1 graveyard:', error);
                toast.error('Failed to listen to player1 graveyard.');
            });

            const unsubscribePlayer2Graveyard = onSnapshot(player2GraveyardRef, (querySnapshot) => {
                const graveyardArray = [];
                querySnapshot.forEach(doc => {
                    graveyardArray.push(doc.data());
                });
                setPlayer2Graveyard(graveyardArray);
                console.log('Updated player2Graveyard:', graveyardArray);
            }, (error) => {
                console.error('Error listening to player2 graveyard:', error);
                toast.error('Failed to listen to player2 graveyard.');
            });

            return () => {
                unsubscribePlayer1Graveyard();
                unsubscribePlayer2Graveyard();
            };
        }
    }, [isRoomJoined, roomId, firestore]);

    // Handle game timer synchronization
    useEffect(() => {
        // Clear any existing interval
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Function to handle timer countdown
        const startTimer = () => {
            timerRef.current = setInterval(async () => {
                setTimer((prevTimer) => {
                    if (prevTimer > 0) {
                        const newTimer = prevTimer - 1;
                        updateDoc(doc(firestore, 'rooms', roomId), {
                            'gameState.timer': newTimer
                        });
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
            // During preparation phase, start preparation timer
            if (timer > 0) {
                startTimer();
            } else {
                // Preparation timer ended, transition to battle stage
                updateDoc(doc(firestore, 'rooms', roomId), {
                    'gameState.gameStage': 'battle',
                    'gameState.timer': 60, // Start with 1 minute for battle
                    'gameState.currentTurn': 'player1' // Starting player
                });
                setGameStage('battle');
                setTimer(60);
                toast.success('Preparation Phase ended. Proceeding to Battle.');
                console.log('Preparation Phase ended. Proceeding to Battle.');
            }
        } else if (gameStage === 'battle') {
            if (isActiveTurnFlag) { // Only the active player manages the battle timer
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
    }, [gameStage, timer, isActiveTurnFlag, roomId, switchTurn, firestore]);

    // Determine opponent and player graveyards
    const opponentGraveyard = playerId === 'player1' ? player2Graveyard : player1Graveyard;
    const playerGraveyard = playerId === 'player1' ? player1Graveyard : player2Graveyard;

    // Determine opponent's username based on playerId
    const opponentUsername = playerId === 'player1' ? player2Username : player1Username;
    const ownUsernameDisplay = playerId === 'player1' ? player1Username : player2Username;

    /**
     * Enable Ready Button Upon Both Players Placing Cards
     */
    useEffect(() => {
        if (gameStage === 'preparation') {
            if (playerReady && opponentReady) {
                // Both players are ready, transition to battle
                updateDoc(doc(firestore, 'rooms', roomId), {
                    'gameState.gameStage': 'battle',
                    'gameState.timer': 60, // 1 minute battle timer
                    'gameState.currentTurn': 'player1' // Starting player
                });
                toast.success('Both players are ready! Proceeding to Battle.');
                console.log('Both players are ready! Proceeding to Battle.');
            }
        }
    }, [gameStage, playerReady, opponentReady, roomId, firestore]);

    // Function to toggle opponent's graveyard visibility
    const toggleOpponentGraveyard = useCallback(() => {
        setIsOpponentGraveyardVisible(prev => !prev);
    }, []);

    // Function to toggle player's graveyard visibility
    const togglePlayerGraveyard = useCallback(() => {
        setIsPlayerGraveyardVisible(prev => !prev);
    }, []);

    /**
     * useEffect to handle readiness state updates
     */
    useEffect(() => {
        if (isRoomJoined && roomId && playerId) {
            const playersRef = collection(firestore, `rooms/${roomId}/players`);

            const unsubscribePlayers = onSnapshot(playersRef, (querySnapshot) => {
                const players = {};
                querySnapshot.forEach(doc => {
                    players[doc.id] = doc.data();
                });

                const currentPlayer = players[playerId];
                const opponentId = playerId === 'player1' ? 'player2' : 'player1';
                const opponent = players[opponentId];

                setPlayerReady(currentPlayer?.hasPlacedCard || false); // Assuming hasPlacedCard indicates readiness
                setOpponentReady(opponent?.hasPlacedCard || false);
                console.log(`Player Ready: ${currentPlayer?.hasPlacedCard}, Opponent Ready: ${opponent?.hasPlacedCard}`);
            }, (error) => {
                console.error('Error listening to players:', error);
                toast.error('Failed to listen to player data.');
            });

            return () => unsubscribePlayers();
        }
    }, [isRoomJoined, roomId, playerId, firestore]);

    /**
     * UI Rendering
     */
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
                        aria-label="Username Input"
                    />
                    <div className={styles.roomActions}>
                        <button onClick={handleCreateRoom} className={styles.createRoomButton} aria-label="Create Room">Create Room</button>
                        <input
                            type="text"
                            placeholder="Enter Room ID"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className={styles.roomIdInput}
                            aria-label="Room ID Input"
                        />
                        <button onClick={handleJoinRoom} className={styles.joinRoomButton} aria-label="Join Room">Join Room</button>
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
                        <PreparationStage
                            handleReady={handleReady}
                            areAllSlotsFilled={hasPlacedAllRequiredCards()} // **Updated prop**
                            playerReady={playerReady}
                            opponentReady={opponentReady}
                            opponentUsername={opponentUsername}
                            preparationTimer={timer}
                            myDeck={myDeck}
                            handleSlotClick={handleSlotClick}
                            handleCardSelection={handleCardSelection}
                            myCards={myCards}
                            selectedCard={selectedCard}
                        />
                    )}

                    {gameStage === 'battle' && (
                        <div className={styles.midRow}>
                            <div className={styles.decksContainer}>
                                {/* Opponent's Deck Slots */}
                                <CardSlots
                                    title={`${opponentUsername}'s Deck`}
                                    cards={opponentDeck}
                                    selectedCard={null}
                                    onSlotClick={() => {}} // No-op since opponent's deck isn't interactive
                                    isOpponent={true}
                                    gameStage={gameStage}
                                />
                                {/* Player's Deck Slots */}
                                <CardSlots
                                    title="Your Deck"
                                    cards={myDeck}
                                    selectedCard={selectedCard}
                                    onSlotClick={(index) => handleSlotClick(index)}
                                    isOpponent={false}
                                    gameStage={gameStage}
                                />
                            </div>
                            {/* Central Area: Last Card Played */}
                            <div className={styles.lastCardContainer}>
                                <h3>Last Card Played</h3>
                                {lastCard ? (
                                    <>
                                        <img className={styles.lastCard} src={lastCard.imageUrl} alt="Last Card" />
                                        {lastCardOwner && <p>{lastCardOwner} played this card.</p>}
                                    </>
                                ) : (
                                    <>
                                        <img className={styles.lastCard} src={blankCardImage} alt="No Last Card" />
                                        <p>No cards have been played yet.</p>
                                    </>
                                )}
                            </div>

                            {/* Player's Utilities at the Bottom */}
                            <UtilitiesComponent
                                isOpponent={false}
                                username={ownUsernameDisplay || 'You'}
                                deck={myDeck}
                                graveyard={playerGraveyard}
                                roomId={roomId}
                                playerId={playerId}
                                isActiveTurn={isActiveTurnFlag}
                                switchTurn={switchTurn}
                                gameStage={gameStage}
                                currentRound={currentRound}
                                isGraveyardVisible={isPlayerGraveyardVisible}
                                toggleGraveyard={togglePlayerGraveyard}
                                handleCardClick={handleCardSelection}
                                onAttack={handleAttack}
                                cardsData={cards} // Use cards from CardsContext
                                selectedCard={selectedCard} // Pass selectedCard if UtilitiesComponent needs it
                                onSlotClick={handleSlotClick} // **Ensure this prop is passed**
                                handleSpellUsage={handleSpellUsage} // **Pass the new function**
                            />
                        </div>
                    )}

                    {gameStage === 'finished' && (
                        <EndStage
                            playerStats={[
                                `${player1Username}: ${player1Graveyard.length} cards in graveyard`,
                                `${player2Username}: ${player2Graveyard.length} cards in graveyard`,
                                // Add more stats as needed
                            ]}
                            onRestart={() => {
                                // Implement handleRestart
                                window.location.reload();
                            }}
                            onExit={() => {
                                // Implement handleExit
                                setIsRoomJoined(false);
                                setRoomId('');
                                setPlayerId('');
                                setUsername('');
                            }}
                        />
                    )}
                </>
            )}

            {/* Toast Notifications */}
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark" // Ensure toasts are readable
            />
        </div>
    )
}
export default Battlefield;
