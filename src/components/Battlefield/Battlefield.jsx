// Battlefield.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { storage, firestore } from '../firebaseConfig';
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
import backCard from '../../assets/cards/back-card.png';

import Timer from './Timer';
import WaitingForPlayer from './WaitingForPlayer';
import PreparationStage from './PreparationStage';
import EndStage from './EndStage';
import CardSlots from './CardSlots';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ToastStyles.css';
import { useParams } from 'react-router-dom';

import { CardsContext } from './CardsContext';

function Battlefield() {

/**
 * State Variables
 */

// Asset state variables
const [background, setBackground] = useState('');
const [leftButton, setLeftButton] = useState('');
const [rightButton, setRightButton] = useState('');
const [assetsLoaded, setAssetsLoaded] = useState(false);

// Multiplayer state variables
const [roomId, setRoomId] = useState('');
const [playerId, setPlayerId] = useState('');
const [username, setUsername] = useState('');
const [userInventory, setUserInventory] = useState([]);
const [isRoomJoined, setIsRoomJoined] = useState(false);
const [gameStage, setGameStage] = useState('lobby');
const [timer, setTimer] = useState(120);
const [currentRound, setCurrentRound] = useState(0);
const [opponentId, setOpponentId] = useState('');
const [player1Graveyard, setPlayer1Graveyard] = useState([]);
const [player2Graveyard, setPlayer2Graveyard] = useState([]);
const opponentGraveyard = playerId === 'player1' ? player2Graveyard : player1Graveyard;
const playerGraveyard = playerId === 'player1' ? player1Graveyard : player2Graveyard;
const [player1Username, setPlayer1Username] = useState('');
const [player2Username, setPlayer2Username] = useState('');
const opponentUsername = playerId === 'player1' ? player2Username : player1Username;
const ownUsernameDisplay = playerId === 'player1' ? player1Username : player2Username;
const totalRounds = 5;
const { userDocId } = useParams(); // Assuming route is defined to include userDocId

// State to track whose turn it is
const [currentTurn, setCurrentTurn] = useState('player1');

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

// Opponent's hand
const [opponentCards, setOpponentCards] = useState([]);

// Player's and Opponent's Decks
const [myDeck, setMyDeck] = useState([]);
const [opponentDeck, setOpponentDeck] = useState([]);

// Last Card Played
const [lastCard, setLastCard] = useState(null);
const [lastCardOwner, setLastCardOwner] = useState('');

// State to track readiness
const [playerReady, setPlayerReady] = useState(false);
const [opponentReady, setOpponentReady] = useState(false);

// Timer and Phase Management
const [preparationTimer, setPreparationTimer] = useState(120);
const [battleTimer, setBattleTimer] = useState(60);

// Accessing cards data from CardsContext
const { cards, loading: cardsLoading, error: cardsError } = useContext(CardsContext);

// New State for Winner and Player HP
const [winner, setWinner] = useState(null);
const [playerHP, setPlayerHP] = useState(5000);
const [opponentHP, setOpponentHP] = useState(5000);

// New State for Attack Flow
const [attackSourceCard, setAttackSourceCard] = useState(null);

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
 */

/**
     * Fetch user data based on userDocId
     */
useEffect(() => {
    const fetchUserData = async () => {
        if (!userDocId) {
            toast.error('Invalid URL. User not specified.');
            return;
        }

        try {
            const userDocRef = doc(firestore, 'users', userDocId);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                toast.error('User not found.');
                console.error('User document does not exist for:', userDocId);
                return;
            }

            const userData = userDocSnap.data();
            setUsername(userData.username); // Set username from Firestore
            setUserInventory(userData.inventory || []); // Store inventory for later use
        } catch (error) {
            console.error('Error fetching user data:', error);
            toast.error('Failed to fetch user data.');
        }
    };

    fetchUserData();
}, [userDocId, firestore]);

// Function to determine the winner
const determineWinner = useCallback(async () => {
    let determinedWinner = 'Draw';
    if (playerHP <= 0 && opponentHP > 0) {
        determinedWinner = opponentUsername;
    } else if (opponentHP <= 0 && playerHP > 0) {
        determinedWinner = ownUsernameDisplay;
    } else if (playerHP > opponentHP) {
        determinedWinner = ownUsernameDisplay;
    } else if (opponentHP > playerHP) {
        determinedWinner = opponentUsername;
    }

    setWinner(determinedWinner);

    try {
        // Update gameStage to 'finished' in Firestore
        const roomDocRef = doc(firestore, 'rooms', roomId);
        await updateDoc(roomDocRef, {
            'gameState.gameStage': 'finished',
            'gameState.timer': 0,
        });
        toast.info(`Game Finished! Winner: ${determinedWinner}`);
        console.log(`Game Finished! Winner: ${determinedWinner}`);
    } catch (error) {
        console.error('Error updating game stage to finished:', error);
        toast.error('Failed to finalize the game.');
    }

}, [playerHP, opponentHP, opponentUsername, ownUsernameDisplay, roomId, firestore]);

// Function to switch turns using Firestore transaction
const switchTurn = useCallback(async () => {
    const roomDocRef = doc(firestore, 'rooms', roomId);
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
                [`${gameStateField}.timer`]: 60, // Reset timer for the next player
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
                determineWinner(); // Call function to determine the winner
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
}, [roomId, firestore, determineWinner]);

// Function to check if all required Monster/Trap cards have been placed
const hasPlacedAllRequiredCards = useCallback(() => {
    const remainingRequiredCards = myCards.filter(card => card.cardType === 'monster' || card.cardType === 'trap').length;
    console.log(`Remaining Monster/Trap cards in hand: ${remainingRequiredCards}`);
    return remainingRequiredCards === 0;
}, [myCards]);

// Function to handle spell card usage
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
        switch (spellCard.cardName.toLowerCase()) {
            case 'heal':
                // Example: Restore 20 HP to the player
                await runTransaction(firestore, async (transaction) => {
                    const roomDocRef = doc(firestore, 'rooms', roomId);
                    const roomDoc = await transaction.get(roomDocRef);
                    if (!roomDoc.exists()) {
                        throw new Error('Room does not exist!');
                    }

                    const currentHP = roomDoc.data().hp[playerId] || 5000;
                    const newHP = Math.min(currentHP + 20, 5000);
                    transaction.update(roomDocRef, {
                        [`hp.${playerId}`]: newHP
                    });
                });
                toast.success('Heal spell used! Restored 20 HP.');
                console.log('Heal spell used.');
                break;
            // Add more spell cases here
            default:
                toast.warn('Unknown spell effect.');
                console.warn(`Spell effect for ${spellCard.cardName} not defined.`);
        }

        // Remove spell card from hand and add to graveyard
        const handDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'hand', spellCard.id);
        await deleteDoc(handDocRef);

        const graveyardRef = collection(firestore, 'rooms', roomId, 'players', playerId, 'graveyard');
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

// Handle Attack Initiation
const handleAttackInitiation = useCallback(async () => {
    // Debugging: Log the current selectedCard
    console.log('Attempting to initiate attack with selectedCard:', selectedCard);

    // Check if selectedCard and its nested properties are defined
    if (!selectedCard || !selectedCard.card || !selectedCard.card.id) {
        toast.error('No valid card selected for attack.');
        console.error('Selected card is invalid:', selectedCard);
        return;
    }

    if (selectedCard.card.cardType !== 'monster') { // assuming only monster cards can attack
        toast.warn('Please select a Monster card to attack with.');
        return;
    }

    // **Position Check: Only 'attack' position cards can attack**
    if (selectedCard.card.position !== 'attack') {
        toast.warn('Only cards in Attack position can be used to attack.');
        return;
    }

    try {
        const cardId = selectedCard.card.id;
        const cardDocRef = doc(firestore, 'cards', cardId);
        const cardDocSnap = await getDoc(cardDocRef);

        if (!cardDocSnap.exists()) {
            toast.error('Selected card does not exist in the cards collection.');
            console.error('Selected card document does not exist for cardId:', cardId);
            return;
        }

        const cardData = cardDocSnap.data();
        const attackPts = cardData.atkPts;

        if (attackPts === undefined || attackPts === null) {
            toast.error('Selected card does not have attack points defined.');
            console.error('attackPts is undefined or null for the selected card:', cardData);
            return;
        }

        setAttackSourceCard({
            ...selectedCard,
            attackPts
        });

        toast.info(`Selected ${selectedCard.card.cardName} to attack with (Attack Points: ${attackPts}). Choose an opponent's card to attack.`);
        console.log(`Selected ${selectedCard.card.cardName} to attack with (Attack Points: ${attackPts}).`);
    } catch (error) {
        console.error('Error fetching attackPts:', error);
        toast.error('Failed to fetch attack points for the selected card.');
    }
}, [selectedCard, firestore]);

// Handle Target Selection for Attack
const handleTargetSelection = useCallback(async (targetIndex) => {
    if (!attackSourceCard) {
        toast.warn('No attack source selected.');
        return;
    }

    // Ensure it's still the player's turn
    if (!isActiveTurnFlag) {
        toast.warn("It's not your turn!");
        return;
    }

    const targetCard = opponentDeck[targetIndex];
    if (!targetCard || !targetCard.id) {
        // Direct attack
        const damage = attackSourceCard.attackPts; // Use fetched attackPts
        try {
            await runTransaction(firestore, async (transaction) => {
                const roomDocRef = doc(firestore, 'rooms', roomId);
                const roomDoc = await transaction.get(roomDocRef);
                if (!roomDoc.exists()) {
                    throw new Error('Room does not exist!');
                }

                const currentOpponentHP = roomDoc.data().hp[opponentId] || 5000;
                const newOpponentHP = currentOpponentHP - damage;
                transaction.update(roomDocRef, {
                    [`hp.${opponentId}`]: Math.max(newOpponentHP, 0)
                });
            });

            toast.success(`Direct attack! Dealt ${damage} damage to ${opponentUsername}.`);
            console.log(`Direct attack! Dealt ${damage} damage to ${opponentUsername}.`);
        } catch (error) {
            console.error('Error performing direct attack:', error);
            toast.error('Failed to perform attack.');
        }
    } else {
        // **Position Check: Only 'attack' position cards can be targeted**
        if (targetCard.position !== 'attack') {
            toast.warn('You cannot attack a card in Defense position.');
            console.warn(`Attempted to attack a card in Defense position at index ${targetIndex}.`);
            return;
        }

        // Attack the target card
        const damage = attackSourceCard.attackPts; // Use fetched attackPts
        const targetDefense = targetCard.position === 'defense' ? 5 : 0; // Example: defense reduces damage
        const actualDamage = Math.max(damage - targetDefense, 0);

        if (actualDamage > 0) {
            try {
                await runTransaction(firestore, async (transaction) => {
                    // Read roomDocRef and targetDocRef first
                    const roomDocRef = doc(firestore, 'rooms', roomId);
                    const roomDoc = await transaction.get(roomDocRef);
                    if (!roomDoc.exists()) {
                        throw new Error('Room does not exist!');
                    }

                    const targetDocRef = doc(firestore, 'rooms', roomId, 'players', opponentId, 'deck', targetIndex.toString());
                    const targetDoc = await transaction.get(targetDocRef);
                    if (!targetDoc.exists()) {
                        throw new Error('Target card does not exist.');
                    }

                    const targetCardData = targetDoc.data();
                    const currentTargetHP = targetCardData.hp || 20;
                    const newTargetHP = currentTargetHP - actualDamage;

                    if (newTargetHP <= 0) {
                        // Move to graveyard
                        const graveyardRef = collection(firestore, 'rooms', roomId, 'players', opponentId, 'graveyard');
                        await addDoc(graveyardRef, { ...targetCardData });
                        // Remove the card from deck and clear its data including 'id'
                        transaction.update(targetDocRef, {
                            id: null, // Clear the 'id' field
                            imageUrl: blankCardImage,
                            cardType: null,
                            cardName: '',
                            position: 'attack',
                            hp: null
                        });

                        // **Damage to Opponent's HP based on cardLevel**
                        const cardLevel = cards.find(c => c.id === targetCardData.id)?.cardLevel || 0;
                        if (cardLevel > 0) {
                            const damageToOpponent = 200 * cardLevel;
                            const currentOpponentHP = roomDoc.data().hp[opponentId] || 5000;
                            const newOpponentHP = currentOpponentHP - damageToOpponent;
                            transaction.update(roomDocRef, {
                                [`hp.${opponentId}`]: Math.max(newOpponentHP, 0)
                            });
                            // **Note:** Toasts should not be called inside transactions
                            console.log(`Card destroyed. Opponent loses ${damageToOpponent} HP.`);
                        } else {
                            // No damage applied for Spell/Trap cards
                            console.log(`Card destroyed (Spell/Trap). No damage applied to opponent.`);
                        }
                    } else {
                        transaction.update(targetDocRef, { hp: newTargetHP });
                        // Toasts should not be called inside transactions
                    }
                });

                // Update local opponentDeck
                setOpponentDeck(prevDeck => {
                    const updatedDeck = [...prevDeck];
                    if (updatedDeck[targetIndex]) {
                        if ((updatedDeck[targetIndex].hp || 20) - actualDamage <= 0) {
                            updatedDeck[targetIndex] = {
                                id: null, // Clear the 'id'
                                imageUrl: blankCardImage,
                                cardType: null,
                                cardName: '',
                                position: 'attack',
                                hp: null
                            };
                        } else {
                            updatedDeck[targetIndex].hp = (updatedDeck[targetIndex].hp || 20) - actualDamage;
                        }
                    }
                    return updatedDeck;
                });

                // **Fetch cardLevel for toast message**
                const destroyedCardLevel = cards.find(c => c.id === targetCard.id)?.cardLevel || 0;
                if (destroyedCardLevel > 0) {
                    const damageToOpponent = 200 * destroyedCardLevel;
                    toast.success(`${opponentUsername}'s ${opponentDeck[targetIndex].cardName} was destroyed! Opponent loses ${damageToOpponent} HP.`);
                } else {
                    toast.info(`${opponentUsername}'s ${opponentDeck[targetIndex].cardName} was destroyed! No damage dealt.`);
                }
            } catch (error) {
                console.error('Error attacking target card:', error);
                toast.error('Failed to attack target card.');
            }
        } else {
            toast.info('Attack was not strong enough to damage the target.');
        }
    }

    // After attack, switch turn
    await switchTurn();

    // Reset attackSourceCard
    setAttackSourceCard(null);
}, [attackSourceCard, opponentDeck, firestore, roomId, opponentId, opponentUsername, switchTurn, cards, isActiveTurnFlag]);

// Handle Defend Action
const handleDefend = useCallback(async () => {
    if (gameStage !== 'battle') {
        toast.warn('You can only defend during the Battle phase.');
        return;
    }

    if (!isActiveTurnFlag) {
        toast.warn("It's not your turn!");
        return;
    }

    if (!selectedCard || selectedCard.source !== 'deck') {
        toast.warn('Please select a card from your deck to defend with.');
        return;
    }

    const index = selectedCard.index;

    try {
        // Reference to the selected card's slot in Firestore
        const slotDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'deck', index.toString());

        // Update the card's position to 'defense' in Firestore
        await updateDoc(slotDocRef, {
            position: 'defense'
        });

        // Update the local state to reflect the position change
        const updatedDeck = [...myDeck];
        if (updatedDeck[index]) {
            updatedDeck[index].position = 'defense';
        }
        setMyDeck(updatedDeck);
        console.log(`Defended with ${updatedDeck[index].cardName} in slot ${index + 1}.`);

        // Provide user feedback
        toast.success(`Defended with ${updatedDeck[index].cardName} in slot ${index + 1}.`);

        // Reset selected card
        setSelectedCard(null);
    } catch (error) {
        console.error('Error during defend:', error);
        toast.error('Failed to perform defend action.');
    }
}, [gameStage, isActiveTurnFlag, selectedCard, myDeck, roomId, playerId, firestore]);

/**
 * Updated Function: Handle Remove Card from Slot
 * Ensures that removal is only possible during the Preparation phase.
 */
const handleRemoveCard = useCallback(async (index) => {
    if (gameStage !== 'preparation') {
        toast.warn('You can only remove cards during the Preparation phase.');
        return;
    }

    const card = myDeck[index];
    if (!card || !card.id) {
        toast.warn('No card to remove from this slot.');
        return;
    }

    try {
        // Remove the card from the slot in Firestore
        const slotDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'deck', index.toString());
        await updateDoc(slotDocRef, {
            id: null,
            imageUrl: blankCardImage,
            cardType: null,
            cardName: '',
            position: 'attack',
            hp: null
        });

        // Add the card back to the player's hand in Firestore
        const handDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'hand', card.id);
        await setDoc(handDocRef, {
            imageUrl: card.imageUrl,
            cardType: card.cardType,
            cardName: card.cardName,
            hp: card.hp || 20
        });

        // Update local state
        const updatedDeck = [...myDeck];
        updatedDeck[index] = {
            id: null,
            imageUrl: blankCardImage,
            cardType: null,
            cardName: '',
            position: 'attack',
            hp: null
        };
        setMyDeck(updatedDeck);

        setMyCards(prevCards => [...prevCards, card]);

        toast.success(`Removed ${card.cardName} from slot ${index + 1} and returned to your hand.`);
        console.log(`Removed ${card.cardName} from slot ${index + 1} and returned to your hand.`);
    } catch (error) {
        console.error('Error removing card from slot:', error);
        toast.error('Failed to remove card from slot.');
    }
}, [gameStage, myDeck, setMyDeck, setMyCards, firestore, roomId, playerId]);

// Function to handle creating a new room
const handleCreateRoom = useCallback(async () => {
    // Since username is fetched from Firestore, ensure it's available
    if (!userInventory || userInventory.length === 0) {
        toast.warn('No cards found in your inventory.');
        console.warn('Inventory array is empty.');
        return;
    }

    if (!assetsLoaded) {
        toast.warn('Assets are still loading. Please wait.');
        return;
    }

    if (cardsLoading) {
        toast.warn('Cards are still loading. Please wait.');
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
        const userCards = userInventory.map(cardId => {
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
            },
            hp: {
                player1: 5000,
                player2: 5000
            }
        });

        const newRoomId = newRoomRef.id;
        setRoomId(newRoomId);
        setPlayerId('player1');
        setOpponentId('player2');
        setIsRoomJoined(true);
        setGameStage('waiting');

        // Initialize player1's data
        const player1DocRef = doc(firestore, 'rooms', newRoomId, 'players', 'player1');
        await setDoc(player1DocRef, {
            username: username.trim(),
            deck: [],
            graveyard: [],
            hasPlacedCard: false,
            lastCard: null
        });

        // Initialize player1's deck with 5 blank slots, including 'id': null
        const player1DeckRef = collection(firestore, 'rooms', newRoomId, 'players', 'player1', 'deck');
        const deckPromises = [];
        for (let i = 0; i < 5; i++) {
            const slotDocRef = doc(player1DeckRef, i.toString());
            deckPromises.push(setDoc(slotDocRef, {
                id: null, // Initialize 'id' as null
                imageUrl: blankCardImage,
                cardType: null,
                cardName: '',
                position: 'attack',
                hp: null // Set HP to null for empty slots
            }, { merge: true }));
        }
        await Promise.all(deckPromises);

        // Initialize player1's hand in the hand subcollection with card.id as document ID
        const player1HandRef = collection(firestore, 'rooms', newRoomId, 'players', 'player1', 'hand');
        const handPromises = userCards.map(card => setDoc(doc(player1HandRef, card.id), {
            imageUrl: card.imageUrl,
            cardType: card.cardType,
            cardName: card.cardName,
            hp: card.hp || 20 // Ensure HP is set
        }));
        await Promise.all(handPromises);

        console.log(`Room created with ID: ${newRoomId}`);
        toast.success(`Room created! Share Room ID: ${newRoomId} with your opponent.`);
    } catch (error) {
        console.error('Error creating room:', error);
        toast.error('Failed to create room. Please try again.');
    }
}, [username, firestore, totalRounds, cards, cardsLoading, assetsLoaded, userInventory]);

// Function to handle joining an existing room
const handleJoinRoom = useCallback(async () => {
    // Since username is fetched from Firestore, ensure it's available
    if (!userInventory || userInventory.length === 0) {
        toast.warn('No cards found in your inventory.');
        console.warn('Inventory array is empty.');
        return;
    }

    if (!roomId.trim()) {
        toast.warn('Please enter a Room ID to join.');
        return;
    }

    if (!assetsLoaded) {
        toast.warn('Assets are still loading. Please wait.');
        return;
    }

    if (cardsLoading) {
        toast.warn('Cards are still loading. Please wait.');
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
        const userCards = userInventory.map(cardId => {
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
        const playersCollection = collection(firestore, 'rooms', roomId, 'players');
        const playersSnapshot = await getDocs(playersCollection);
        const players = {};
        playersSnapshot.forEach(doc => {
            players[doc.id] = doc.data();
        });

        if (players.player2 && players.player2.username) {
            toast.error('Room is already full.');
            console.error('Room is already full.');
            return;
        }

        // Add player2 to the room
        const player2DocRef = doc(firestore, 'rooms', roomId, 'players', 'player2');
        await setDoc(player2DocRef, {
            username: username.trim(),
            deck: [],
            graveyard: [],
            hasPlacedCard: false,
            lastCard: null
        }, { merge: true });

        setPlayerId('player2');
        setOpponentId('player1');
        setIsRoomJoined(true);
        setGameStage('preparation');

        // Initialize player2's deck with 5 blank slots, including 'id': null
        const player2DeckRef = collection(firestore, 'rooms', roomId, 'players', 'player2', 'deck');
        const deckPromises = [];
        for (let i = 0; i < 5; i++) {
            const slotDocRef = doc(player2DeckRef, i.toString());
            deckPromises.push(setDoc(slotDocRef, {
                id: null, // Initialize 'id' as null
                imageUrl: blankCardImage,
                cardType: null,
                cardName: '',
                position: 'attack',
                hp: null // Set HP to null for empty slots
            }, { merge: true }));
        }
        await Promise.all(deckPromises);

        // Initialize player2's hand in the hand subcollection with card.id as document ID
        const player2HandRef = collection(firestore, 'rooms', roomId, 'players', 'player2', 'hand');
        const handPromises = userCards.map(card => setDoc(doc(player2HandRef, card.id), {
            imageUrl: card.imageUrl,
            cardType: card.cardType,
            cardName: card.cardName,
            hp: card.hp || 20 // Ensure HP is set
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
}, [username, roomId, firestore, cards, cardsLoading, assetsLoaded, userInventory]);

/**
 * Handler for slot clicks during the Preparation phase.
 * Manages card removal and placement.
 */
const handlePreparationSlotClick = useCallback(async (index) => {
    const slot = myDeck[index];
    if (slot && slot.id) {
        // Slot is occupied, remove the card
        handleRemoveCard(index);
    } else {
        // Slot is empty, attempt to place the selected card
        if (!selectedCard) {
            toast.warn('Please select a card to place.');
            return;
        }

        // Validate card type based on game stage
        if (!['monster', 'trap'].includes(selectedCard.card.cardType)) {
            toast.error('Only Monster and Trap cards can be placed in the slots.');
            return;
        }

        // Ensure the slot is empty
        if (myDeck[index].id !== null) {
            toast.warn('This slot is already occupied.');
            return;
        }

        try {
            // Update Firestore: set the card in the slot, including 'id'
            const slotDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'deck', index.toString());
            await setDoc(slotDocRef, {
                id: selectedCard.card.id,
                imageUrl: selectedCard.card.imageUrl,
                cardType: selectedCard.card.cardType,
                cardName: selectedCard.card.cardName,
                position: 'attack',
                slotIndex: index,
                hp: selectedCard.card.hp || 20
            }, { merge: true });

            // Update lastCard in Firestore
            const lastCardRef = doc(firestore, 'rooms', roomId);
            await updateDoc(lastCardRef, {
                lastCard: {
                    card: { ...selectedCard.card, slotIndex: index, hp: selectedCard.card.hp || 20 },
                    owner: playerId
                }
            });

            // Update local state
            setMyDeck(prevDeck => {
                const updatedDeck = [...prevDeck];
                updatedDeck[index] = {
                    ...selectedCard.card,
                    position: 'attack',
                    slotIndex: index,
                    hp: selectedCard.card.hp || 20,
                    id: selectedCard.card.id
                };
                return updatedDeck;
            });

            setMyCards(prevCards => prevCards.filter(card => card.id !== selectedCard.card.id));

            // Remove the card from the hand in Firestore
            const handDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'hand', selectedCard.card.id);
            await deleteDoc(handDocRef);

            // Provide user feedback
            toast.success(`Placed ${selectedCard.card.cardName} in slot ${index + 1}.`);
            console.log(`Placed ${selectedCard.card.cardName} in slot ${index + 1}.`);

            // Reset selected card
            setSelectedCard(null);

            // Switch turn if in battle phase
            if (gameStage === 'preparation') {
                // In preparation phase, do not switch turn
            } else {
                await switchTurn();
            }

        } catch (error) {
            console.error('Error placing card:', error);
            toast.error('Failed to place card.');
        }
    }
}, [selectedCard, myDeck, handleRemoveCard, firestore, roomId, playerId, setMyDeck, setMyCards, gameStage, switchTurn]);

/**
 * Handler for slot clicks during the Battle phase.
 * Manages attack source selection without invoking card removal.
 */
const handleBattleSlotClick = useCallback(async (index) => {
    // **Added Check: Ensure it's the player's turn**
    if (!isActiveTurnFlag) {
        toast.warn("It's not your turn!");
        return;
    }

    const slot = myDeck[index];
    if (slot && slot.id && slot.cardType === 'monster') { // Assuming only Monster cards can attack
        // **Position Check: Only 'attack' position cards can be used to attack**
        if (slot.position !== 'attack') {
            toast.warn('Only cards in Attack position can be used to attack.');
            console.warn(`Attempted to select a card in Defense position at index ${index}.`);
            return;
        }

        try {
            const cardId = slot.id;
            const cardDocRef = doc(firestore, 'cards', cardId);
            const cardDocSnap = await getDoc(cardDocRef);

            if (!cardDocSnap.exists()) {
                toast.error('Selected card does not exist in the cards collection.');
                console.error('Selected card document does not exist for cardId:', cardId);
                return;
            }

            const cardData = cardDocSnap.data();
            const attackPts = cardData.atkPts;

            if (attackPts === undefined || attackPts === null) {
                toast.error('Selected card does not have attack points defined.');
                console.error('attackPts is undefined or null for the selected card:', cardData);
                return;
            }

            setAttackSourceCard({
                ...slot,
                attackPts
            });

            toast.info(`Selected ${slot.cardName} to attack with (Attack Points: ${attackPts}). Choose an opponent's card to attack.`);
            console.log(`Selected ${slot.cardName} to attack with (Attack Points: ${attackPts}).`);
        } catch (error) {
            console.error('Error fetching attackPts:', error);
            toast.error('Failed to fetch attack points for the selected card.');
        }
    } else {
        toast.warn('Please select a valid Monster card in Attack position to attack with.');
    }
}, [myDeck, firestore, roomId, playerId, isActiveTurnFlag]);

// **New Function: Handle Battle Phase Card Placement**
const handleBattleCardPlacement = useCallback(async (index) => {
    // Ensure it's the player's turn
    if (!isActiveTurnFlag) {
        toast.warn("It's not your turn!");
        return;
    }

    // Find if player has at least one monster or trap card
    const availableCards = myCards.filter(card => ['monster', 'trap'].includes(card.cardType));

    if (availableCards.length === 0) {
        toast.warn('No Monster or Trap cards available in hand to place.');
        return;
    }

    // Ensure a card is selected
    if (!selectedCard) {
        toast.warn('Please select a Monster or Trap card from your hand to place.');
        return;
    }

    // Ensure the selected card is a Monster or Trap
    if (!['monster', 'trap'].includes(selectedCard.card.cardType)) {
        toast.error('Only Monster and Trap cards can be placed in slots.');
        return;
    }

    // Ensure the slot is empty
    if (myDeck[index].id !== null) {
        toast.warn('This slot is already occupied.');
        return;
    }

    try {
        // Update Firestore: set the card in the slot, including 'id'
        const slotDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'deck', index.toString());
        await setDoc(slotDocRef, {
            id: selectedCard.card.id,
            imageUrl: selectedCard.card.imageUrl,
            cardType: selectedCard.card.cardType,
            cardName: selectedCard.card.cardName,
            position: 'attack',
            slotIndex: index,
            hp: selectedCard.card.hp || 20
        }, { merge: true });

        // Update lastCard in Firestore
        const lastCardRef = doc(firestore, 'rooms', roomId);
        await updateDoc(lastCardRef, {
            lastCard: {
                card: { ...selectedCard.card, slotIndex: index, hp: selectedCard.card.hp || 20 },
                owner: playerId
            }
        });

        // Update local state
        setMyDeck(prevDeck => {
            const updatedDeck = [...prevDeck];
            updatedDeck[index] = {
                ...selectedCard.card,
                position: 'attack',
                slotIndex: index,
                hp: selectedCard.card.hp || 20,
                id: selectedCard.card.id
            };
            return updatedDeck;
        });

        setMyCards(prevCards => prevCards.filter(card => card.id !== selectedCard.card.id));

        // Remove the card from the hand in Firestore
        const handDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'hand', selectedCard.card.id);
        await deleteDoc(handDocRef);

        // Provide user feedback
        toast.success(`Placed ${selectedCard.card.cardName} in slot ${index + 1}.`);
        console.log(`Placed ${selectedCard.card.cardName} in slot ${index + 1}.`);

        // Reset selected card
        setSelectedCard(null);

        // Switch turn
        await switchTurn();

    } catch (error) {
        console.error('Error placing card during battle:', error);
        toast.error('Failed to place card.');
    }
}, [isActiveTurnFlag, myCards, selectedCard, firestore, roomId, playerId, setMyDeck, setMyCards, switchTurn]);

/**
 * Unified handler for slot clicks.
 * Delegates to phase-specific handlers based on the current game stage.
 */
const handleSlotClick = useCallback(async (index) => {
    if (gameStage === 'preparation') {
        await handlePreparationSlotClick(index);
    } else if (gameStage === 'battle') {
        if (isActiveTurnFlag && myDeck[index].id === null) {
            // Attempt to place a card into the empty slot
            await handleBattleCardPlacement(index);
        } else if (isActiveTurnFlag && myDeck[index].id !== null) {
            // Attempt to attack with the card in the slot
            handleBattleSlotClick(index);
        } else {
            toast.warn("It's not your turn!");
        }
    } else {
        toast.warn('Cannot place or remove cards at this stage.');
    }
}, [gameStage, handlePreparationSlotClick, handleBattleSlotClick, isActiveTurnFlag, myDeck, handleBattleCardPlacement]);

// Helper to determine if a slot belongs to the opponent
const isOpponentSlot = (index) => {
    // Assuming opponent's slots are rendered separately
    // Modify this function based on your actual slot indexing
    return true; // Since handleTargetSelection is only passed to opponent's slots
};

// Function to handle card selection from hand or deck
const handleCardSelection = useCallback((card, index, source) => {
    if (card && card.id) { // Ensure card and card.id are defined
        setSelectedCard({ card, index, source });
        toast.info(`Selected ${card.cardName} for action.`);
        console.log(`Selected card: ${card.cardName} at index ${index} from ${source}`);
    } else {
        toast.error('Selected card is invalid or missing an ID.');
        console.error('Invalid card selected:', card);
    }
}, []);

// Function to handle toggling card position
const handlePositionToggle = useCallback(async (slotIndex, currentPosition) => {
    if (gameStage !== 'preparation') return;

    // **Fetch the card details to verify its type**
    const slot = myDeck[slotIndex];
    if (!slot || slot.cardType !== 'monster') {
        toast.error('Only Monster cards can change positions.');
        console.error('Attempted to toggle position of a non-Monster card:', slot);
        return;
    }

    const newPosition = currentPosition === 'attack' ? 'defense' : 'attack';

    try {
        // Update Firestore with the new position
        const slotDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'deck', slotIndex.toString());
        await updateDoc(slotDocRef, {
            position: newPosition
        });

        // Update local state
        const updatedDeck = [...myDeck];
        if (updatedDeck[slotIndex]) {
            updatedDeck[slotIndex].position = newPosition;
        }
        setMyDeck(updatedDeck);
        console.log(`Toggled position for slot ${slotIndex + 1} to ${newPosition}. Updated myDeck:`, updatedDeck);

        toast.success(`Card in slot ${slotIndex + 1} switched to ${newPosition.charAt(0).toUpperCase() + newPosition.slice(1)} position.`);
    } catch (error) {
        console.error('Error toggling card position:', error);
        toast.error('Failed to toggle card position.');
    }
}, [gameStage, myDeck, roomId, playerId, firestore]);

// Function to handle the player marking themselves as ready
const handleReady = useCallback(async () => {
    if (!isRoomJoined || !roomId || !playerId) {
        toast.warn('You must join a room first.');
        return;
    }

    if (!hasPlacedAllRequiredCards()) {
        toast.warn('Please place all your Monster and Trap cards before readying up.');
        return;
    }

    try {
        const playerDocRef = doc(firestore, 'rooms', roomId, 'players', playerId);
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

// Handle multiplayer game state synchronization
useEffect(() => {
    if (isRoomJoined && roomId && playerId) {
        const roomRef = doc(firestore, 'rooms', roomId);

        // References
        const gameStateRef = roomRef;
        const lastCardRef = roomRef;
        const playersRef = collection(firestore, 'rooms', roomId, 'players');
        const playerDeckRef = collection(firestore, 'rooms', roomId, 'players', playerId, 'deck');
        const playerHandRef = collection(firestore, 'rooms', roomId, 'players', playerId, 'hand');
        const opponentIdLocal = playerId === 'player1' ? 'player2' : 'player1';
        setOpponentId(opponentIdLocal); // Set opponentId in state
        const opponentDeckRef = collection(firestore, 'rooms', roomId, 'players', opponentIdLocal, 'deck');
        const opponentHandRef = collection(firestore, 'rooms', roomId, 'players', opponentIdLocal, 'hand');
        const playerHasPlacedCardRef = doc(firestore, 'rooms', roomId, 'players', playerId);

        // Listen to gameState and hp changes
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

                // Listen to hp changes
                if (data.hp) {
                    const currentPlayerHP = data.hp[playerId] || 5000;
                    const currentOpponentHP = data.hp[opponentId] || 5000;
                    setPlayerHP(currentPlayerHP);
                    setOpponentHP(currentOpponentHP);
                    console.log(`Updated HP - Player: ${currentPlayerHP}, Opponent: ${currentOpponentHP}`);

                    // Check for game over conditions
                    if (currentPlayerHP <= 0 || currentOpponentHP <= 0 || data.gameState.currentRound > data.gameState.totalRounds) {
                        determineWinner();
                    }
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
                    id: cardData.id || null, // **Ensure 'id' is present**
                    ...cardData,
                    imageUrl
                };
            });

            const deckArray = await Promise.all(deckPromises);
            // Ensure the deck has exactly 5 slots
            const filledDeck = Array.from({ length: 5 }).map((_, index) => {
                return deckArray[index] || {
                    id: null, // **Initialize 'id' as null for empty slots**
                    imageUrl: blankCardImage,
                    cardType: null,
                    cardName: '',
                    position: 'attack',
                    hp: null
                };
            });
            setOpponentDeck(filledDeck);
            console.log('Updated opponentDeck:', filledDeck);
        }, (error) => {
            console.error('Error listening to opponent deck:', error);
            toast.error('Failed to listen to opponent deck updates.');
        });

        // Listen to opponent's hand changes
        const unsubscribeOpponentHand = onSnapshot(opponentHandRef, async (querySnapshot) => {
            const handPromises = querySnapshot.docs.map(async (doc) => {
                const cardData = doc.data();
                let imageUrl = cardData.imageUrl;
                if (imageUrl && imageUrl !== blankCardImage) {
                    try {
                        imageUrl = await getDownloadURL(storageRef(storage, imageUrl));
                    } catch (error) {
                        console.error('Error fetching hand card image:', error);
                        imageUrl = blankCardImage;
                    }
                }
                return {
                    id: doc.id, // **Use document ID as card ID**
                    ...cardData,
                    imageUrl
                };
            });

            const handArray = await Promise.all(handPromises);
            setOpponentCards(handArray);
            console.log('Updated opponentCards:', handArray); // Debugging
        }, (error) => {
            console.error('Error listening to opponent hand:', error);
            toast.error('Failed to listen to opponent hand updates.');
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
                        console.error('Error fetching hand card image:', error);
                        imageUrl = blankCardImage;
                    }
                }
                return {
                    id: cardData.id || null, // **Ensure 'id' is present**
                    ...cardData,
                    imageUrl
                };
            });

            const deckArray = await Promise.all(deckPromises);
            // Ensure the deck has exactly 5 slots
            const filledDeck = Array.from({ length: 5 }).map((_, index) => {
                return deckArray[index] || {
                    id: null, // **Initialize 'id' as null for empty slots**
                    imageUrl: blankCardImage,
                    cardType: null,
                    cardName: '',
                    position: 'attack',
                    hp: null
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
                        console.error('Error fetching hand card image:', error);
                        imageUrl = blankCardImage;
                    }
                }
                return {
                    id: doc.id, // **Use document ID as card ID**
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

        // Listen to players data and set usernames
        const unsubscribePlayers = onSnapshot(playersRef, async (querySnapshot) => {
            const players = {};
            querySnapshot.forEach(doc => {
                players[doc.id] = doc.data();
            });

            console.log('Players data:', players);

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
                    toast.success('Both players are ready. Starting Preparation Phase.');
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
            unsubscribeOpponentHand();
            unsubscribePlayerDeck();
            unsubscribePlayerHand();
            unsubscribeHasPlacedCard();
            unsubscribePlayers();
        };
    }
}, [isRoomJoined, roomId, playerId, gameStage, firestore, cards, determineWinner, isActiveTurnFlag]);

// Listen to each player's graveyard
useEffect(() => {
    if (isRoomJoined && roomId) {
        const player1GraveyardRef = collection(firestore, 'rooms', roomId, 'players', 'player1', 'graveyard');
        const player2GraveyardRef = collection(firestore, 'rooms', roomId, 'players', 'player2', 'graveyard');

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
                    if (isActiveTurnFlag || gameStage === 'preparation') {
                        updateDoc(doc(firestore, 'rooms', roomId), {
                            'gameState.timer': newTimer
                        });
                    }
                    return newTimer;
                } else {
                    // Timer expired, switch turn
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    if (gameStage === 'battle' && isActiveTurnFlag) {
                        switchTurn();
                    }
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
                'gameState.timer': 60, // 1 minute battle timer
                'gameState.currentTurn': 'player1' // Starting player
            });
            setGameStage('battle');
            setTimer(60);
            toast.success('Preparation Phase ended. Proceeding to Battle.');
            console.log('Preparation Phase ended. Proceeding to Battle.');
        }
    } else if (gameStage === 'battle') {
        if (isActiveTurnFlag && !attackSourceCard) { // Only the active player manages the battle timer
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
}, [gameStage, timer, isActiveTurnFlag, roomId, switchTurn, firestore, attackSourceCard]);

/**
 * Enable Ready Button Upon Both Players Placing Cards
 */
useEffect(() => {
    if (isRoomJoined && roomId && playerId) {
        const playersRef = collection(firestore, 'rooms', roomId, 'players');

        const unsubscribePlayers = onSnapshot(playersRef, async (querySnapshot) => {
            const players = {};
            querySnapshot.forEach(doc => {
                players[doc.id] = doc.data();
            });

            const currentPlayer = players[playerId];
            const opponentIdLocal = playerId === 'player1' ? 'player2' : 'player1';
            const opponent = players[opponentIdLocal];

            setPlayerReady(currentPlayer?.hasPlacedCard || false); // Assuming hasPlacedCard indicates readiness
            setOpponentReady(opponent?.hasPlacedCard || false);
            console.log(`Player Ready: ${currentPlayer?.hasPlacedCard}, Opponent Ready: ${opponent?.hasPlacedCard}`);

            if (gameStage === 'preparation' && currentPlayer?.hasPlacedCard && opponent?.hasPlacedCard) {
                // Both players are ready, transition to battle
                await updateDoc(doc(firestore, 'rooms', roomId), {
                    'gameState.gameStage': 'battle',
                    'gameState.timer': 60, // 1 minute battle timer
                    'gameState.currentTurn': 'player1' // Starting player
                });
                setGameStage('battle');
                setTimer(60);
                toast.success('Both players are ready! Proceeding to Battle.');
                console.log('Both players are ready! Proceeding to Battle.');
            }
        }, (error) => {
            console.error('Error listening to players:', error);
            toast.error('Failed to listen to player data.');
        });

        return () => unsubscribePlayers();
    }
}, [isRoomJoined, roomId, playerId, firestore, gameStage]);

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

/**
 * UI Rendering
 */
return (
    <div className={styles.background} style={{ backgroundImage: `url(${background})` }}>
        {!isRoomJoined && (
            <div className={styles.lobby}>
                <h2>Welcome to the Battle</h2>
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
            <div className={styles.gameContainer}>
                {/* Conditional Rendering Based on gameStage */}
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
                        handlePositionToggle={handlePositionToggle} // **Pass the updated function**
                        handleRemoveCard={handleRemoveCard} // **Pass the remove function**
                    />                    
                )}

                {gameStage === 'battle' && (
                    <>
                        {/* Top Section: Timer */}
                        <Timer
                            gameStage={gameStage}
                            timer={timer}
                            currentRound={currentRound}
                            totalRounds={totalRounds}
                            activePlayer={getActivePlayerUsername()}
                        />

                        {/* Opponent's Section */}
                        <div className={styles.opponentSection}>
                            {/* Opponent's Graveyard */}
                            <div className={styles.opponentGraveyard}>
                                <h3>{opponentUsername}'s Graveyard</h3>
                                {/* Hide opponent's graveyard cards and show only the count */}
                                <p>Number of Cards: {opponentGraveyard.length}</p>
                            </div>

                            {/* Opponent's Hand */}
                            <div className={styles.opponentHand}>
                                <h3>{opponentUsername}'s Hand</h3>
                                <div className={styles.hand}>
                                    {opponentCards.length === 0 ? (
                                        <p className={styles.emptyMessage}>No cards.</p>
                                    ) : (
                                        opponentCards.map((card, index) => (
                                            <img
                                                key={`opponent-hand-card-${index}`}
                                                src={backCard} // Always show back card
                                                alt={`Opponent's Card ${index + 1}`}
                                                className={styles.handCard}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Opponent's Stats */}
                            <div className={styles.opponentStats}>
                                <h3>{opponentUsername}'s Stats</h3>
                                <p>HP: {opponentHP}</p>
                                <p>Cards in Hand: {opponentCards.length}</p>
                            </div>
                        </div>

                        {/* Middle Section: Decks */}
                        <div className={styles.decksSection}>
                            {/* Opponent's Deck */}
                            <CardSlots
                                title={`${opponentUsername}'s Deck`}
                                cards={opponentDeck}
                                selectedCard={attackSourceCard ? attackSourceCard : null}
                                onSlotClick={attackSourceCard ? handleTargetSelection : () => {}}
                                isOpponent={true}
                                isPlayer={false}
                                gameStage={gameStage}
                                backCardImage={backCard}
                            />

                            {/* Player's Deck */}
                            <CardSlots
                                title="Your Deck"
                                cards={myDeck}
                                selectedCard={selectedCard}
                                onSlotClick={handleSlotClick} // Updated to use unified handler
                                isOpponent={false}
                                isPlayer={true}
                                gameStage={gameStage}
                                backCardImage={backCard}
                            />
                        </div>

                        {/* Last Card Played */}
                        <div className={styles.lastCardContainer}>
                            <h3>Last Card Played</h3>
                            {lastCard ? (
                                <>
                                    {lastCard.position === 'defense' ? (
                                        <img className={styles.lastCard} src={backCard} alt="Last Card (Defense Position)" />
                                    ) : (
                                        <img className={styles.lastCard} src={lastCard.imageUrl} alt="Last Card" />
                                    )}
                                    {lastCardOwner && <p>{lastCardOwner} played this card.</p>}
                                </>
                            ) : (
                                <>
                                    <img className={styles.lastCard} src={blankCardImage} alt="No Last Card" />
                                    <p>No cards have been played yet.</p>
                                </>
                            )}
                        </div>

                        {/* Player's Section */}
                        <div className={styles.playerSection}>
                            {/* Player's Graveyard */}
                            <div className={styles.playerGraveyard}>
                                <h3>Your Graveyard</h3>
                                <div className={styles.graveyardCards}>
                                    {playerGraveyard.length === 0 ? (
                                        <p className={styles.emptyMessage}>Empty</p>
                                    ) : (
                                        playerGraveyard.map((card, index) => (
                                            <img
                                                key={`player-graveyard-card-${index}`}
                                                src={card.imageUrl || blankCardImage}
                                                alt={`Graveyard Card ${index + 1}`}
                                                className={styles.graveyardCard}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Player's Hand */}
                            <div className={styles.playerHand}>
                                <h3>Your Hand</h3>
                                <div className={styles.hand}>
                                    {myCards.length === 0 ? (
                                        <p className={styles.emptyMessage}>No cards in hand.</p>
                                    ) : (
                                        myCards.map((card, index) => (
                                            <img
                                                key={`player-hand-card-${index}`}
                                                src={card.imageUrl}
                                                alt={`Hand Card ${index + 1}`}
                                                className={`${styles.handCard} ${selectedCard && selectedCard.card.id === card.id ? styles.selected : ''}`}
                                                onClick={() => {
                                                    if (gameStage === 'preparation') {
                                                        handleCardSelection(card, index, 'hand');
                                                    } else if (isActiveTurnFlag && gameStage === 'battle' && card.cardType === 'spell') {
                                                        handleSpellUsage(card);
                                                    }
                                                }}
                                                role={isActiveTurnFlag && gameStage === 'battle' && card.cardType === 'spell' ? 'button' : 'img'}
                                                tabIndex={isActiveTurnFlag && gameStage === 'battle' && card.cardType === 'spell' ? 0 : -1}
                                                onKeyPress={
                                                    isActiveTurnFlag && gameStage === 'battle' && card.cardType === 'spell'
                                                        ? (e) => {
                                                              if (e.key === 'Enter') handleSpellUsage(card);
                                                          }
                                                        : undefined
                                                }
                                                style={{
                                                    cursor:
                                                        gameStage === 'preparation' || (isActiveTurnFlag && gameStage === 'battle' && card.cardType === 'spell')
                                                            ? 'pointer'
                                                            : 'default',
                                                }}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Player's Stats */}
                            <div className={styles.playerStats}>
                                <h3>Your Stats</h3>
                                <p>HP: {playerHP}</p>
                                <p>Cards in Hand: {myCards.length}</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={styles.actionButtons}>
                            <button
                                className={isActiveTurnFlag ? styles.actionButton : styles.actionButtonDisabled}
                                onClick={isActiveTurnFlag && !attackSourceCard ? handleAttackInitiation : undefined}
                                disabled={!isActiveTurnFlag || attackSourceCard !== null}
                                aria-label="Attack"
                            >
                                Attack
                            </button>
                            <button
                                className={isActiveTurnFlag ? styles.actionButton : styles.actionButtonDisabled}
                                onClick={isActiveTurnFlag ? switchTurn : undefined}
                                disabled={!isActiveTurnFlag}
                                aria-label="End Turn"
                            >
                                End Turn
                            </button>
                            <button
                                className={isActiveTurnFlag ? styles.actionButton : styles.actionButtonDisabled}
                                onClick={isActiveTurnFlag ? handleDefend : undefined}
                                disabled={!isActiveTurnFlag}
                                aria-label="Defend"
                            >
                                Defend
                            </button>
                            {attackSourceCard && (
                                <button
                                    className={styles.cancelAttackButton}
                                    onClick={() => {
                                        setAttackSourceCard(null);
                                        toast.info('Attack cancelled.');
                                    }}
                                    aria-label="Cancel Attack"
                                >
                                    Cancel Attack
                                </button>
                            )}
                        </div>
                    </>
                )}

                {gameStage === 'finished' && (
                    <EndStage
                        winner={winner}
                        roomId={roomId}
                    />
                )}
            </div>
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
            theme="dark"
        />
    </div>
);

}

export default Battlefield;
