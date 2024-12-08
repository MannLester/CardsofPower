// Battlefield.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import { storage, firestore } from '../firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc, addDoc, updateDoc, runTransaction, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
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
import GameOverlay from './GameOverlay';

function Battlefield() {

    /**
     * 
     * UX - Lobby
     * UX - Create a new room
     * UX - Join an existing room
     * UX - Preparation Stage
     * UX - Battle Stage
     * UX - If a player still has cards and health > 0, the game loops into the Preparation Stage again after 10 rounds
     * UX - If a player has health <= 0, the game ends
     * UX - End Stage
     * 
     */





    /**
     * Room Management and Game Initialization
     * 
     * This section handles the creation and joining of game rooms, and
     * initializes game states and assets.
     * 
     * Key components:
     * 1. User Data Fetching: Retrieves username and inventory from Firestore.
     * 2. Asset Loading: Loads game visuals (background, buttons) from Firebase Storage.
     * 3. Room Creation: Establishes a new game room with a unique ID.
     * 4. Room Joining: Allows players to enter an existing room using its ID.
     * 5. Game State Setup: Initializes the game's starting conditions and rules.
     * 
     * These processes are essential for preparing the game environment and ensuring
     * a smooth start to the player's experience.
     */

    // States for asset loading
    const { userDocId } = useParams();
    const [background, setBackground] = useState('');
    const [leftButton, setLeftButton] = useState('');
    const [rightButton, setRightButton] = useState('');
    const [assetsLoaded, setAssetsLoaded] = useState(false);

    const divineCards = [
        "Ra's Herald",
        "Forgemaster of Creation",
        "Ixchel",
        "Celestial Outcast",
        "Aethers Wrath",
        "Aethers Wrath",
        "Celestial Zenith"
    ];

    const darkCards = [    
        "Venomous Viper",
        "Necro Warrior",
        "Chaos Magus",
        "Darksteel Scorpion",
        "Venom Dragon",
        "Dread of Shadows",
        "Shadow Rogue"
    ];

    const earthCards = [
    "Stone Sentinel",
    "Vine Guardian",
    "Ironclad Defender",
    "Heart of the Mountain",
    "Steel Guardian",
    "Earth Golem",
    ];

    const fireCards = [
        "Ashen Sovereign",
        "Lavapulse Phoenix",
        "Blaze Knight",
        "Inferno Giant",
        "Phoenix Hatchling",
        "Crimson Blade Mage",
        "Blazing Minotaur"
    ];

    const lightCards = [
        "Thunder Colossus",
        "Solar Guardian",
        "Thunder Scout",
        "Electric Sabre",
        "Lunar Wolf",
        "Moonlight Archer",
        "Crystal Guardian",
        "Starlight Seraph",
        "Lightbinder Paladin"
    ];

    const waterCards = [
        "Abyss Serpent",
        "Aqua Serpent",
        "Deep Sea Leviathan",
        "Frostborne Champion",
        "Abyss Kraken",
        "Tidecaller Overlord"
    ];

    const windCards = [
        "Storm Wielder",
        "Cyclone Serpent",   
        "Gale Striker",
        "Sky Reaver",
        "Wind Fairy",
        "Tempest Wind Beast",
        "Wind Scout",
        "Storm Dragon"
    ];


    // Fetch user data
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
                setUsername(userData.username); 
                setUserInventory(userData.inventory || []);
            } catch (error) {
                console.error('Error fetching user data:', error);
                toast.error('Failed to fetch user data.');
            }
        };

        fetchUserData();
    }, [userDocId, firestore]);

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
     * Room Management and Game Initialization
     * 
     * This section manages game room creation, joining, and initialization of game states and assets.
     * 
     * States:
     * - username: Current user's username (string)
     * - totalRounds: Total number of game rounds (constant number)
     * - cards, cardsLoading, cardsError: Card data from CardsContext
     * - assetsLoaded: Indicates if game assets are loaded (boolean)
     * - userInventory: User's card inventory (array)
     * - roomId: Current game room ID (string)
     * - gameStage: Current stage of the game (string)
     * - playerId: Current player's ID (string)
     * - opponentId: Opponent's ID (string)
     * - player1Username, player2Username: Usernames of both players (string)
     * - isRoomCreator: Indicates if the current user created the room (boolean)
     * 
     * Key Functions:
     * - handleCreateRoom: Asynchronously creates a new game room
     * - handleJoinRoom: Asynchronously joins an existing game room
     * - fetchUserData: Retrieves user data from Firestore
     * - fetchAssets: Loads game assets from Firebase storage
     * - initializeGameState: Sets up initial game state after room creation/joining
     * 
     * This module ensures all necessary data and assets are loaded before
     * allowing room creation or joining, enhancing game stability and user experience.
     * It also handles error cases and provides appropriate feedback to the user.
     */

    // States for room creation and joining
    const [username, setUsername] = useState('');
    const [gameStage, setGameStage] = useState('lobby');
    const totalRounds = 10;
    const { cards, loading: cardsLoading, error: cardsError } = useContext(CardsContext);
    const [userInventory, setUserInventory] = useState([]);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [errorLoadingRooms, setErrorLoadingRooms] = useState(null);
    const [showAvailableRooms, setShowAvailableRooms] = useState(false);
    const [roomId, setRoomId] = useState('');
    const [isRoomJoined, setIsRoomJoined] = useState(false);
    const [currentRound, setCurrentRound] = useState(0);
    const [playerId, setPlayerId] = useState('');
    const [opponentId, setOpponentId] = useState('');
    const [player1Username, setPlayer1Username] = useState('');
    const [player2Username, setPlayer2Username] = useState('');
    const ownUsernameDisplay = playerId === 'player1' ? player1Username : player2Username;
    const opponentUsername = playerId === 'player1' ? player2Username : player1Username;
    const [lastCard, setLastCard] = useState(null);
    const [lastCardOwner, setLastCardOwner] = useState('');
    const [currentTurn, setCurrentTurn] = useState('player1');
    const [winner, setWinner] = useState('');

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
                    currentTurn: 'player1'
                },
                lastCard: null,
                attacks: {
                    player1: Array(5).fill(null),
                    player2: Array(5).fill(null)
                },
                hp: {
                    player1: 5000,
                    player2: 5000
                },
                // **Add host field to store the creator's username**
                host: username.trim()
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
                lastCard: null,
                userDocId: userDoc.id
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
                    inGameDefPts: null,
                    inGameAtkPts: null
                }, { merge: true }));
            }
            await Promise.all(deckPromises);

            // Initialize player1's hand in the hand subcollection with card.id as document ID
            const player1HandRef = collection(firestore, 'rooms', newRoomId, 'players', 'player1', 'hand');
            const handPromises = userCards.map(card => setDoc(doc(player1HandRef, card.id), {
                imageUrl: card.imageUrl,
                cardType: card.cardType,
                cardName: card.cardName,
                inGameDefPts: card.inGameDefPts || 0,
                inGameAtkPts: card.inGameAtkPts || 0
            }));
            await Promise.all(handPromises);

            console.log(`Room created with ID: ${newRoomId}`);
            toast.success(`Room created! Share Room ID: ${newRoomId} with your opponent.`);
        } catch (error) {
            console.error('Error creating room:', error);
            toast.error('Failed to create room. Please try again.');
        }
    }, [username, firestore, totalRounds, cards, cardsLoading, assetsLoaded, userInventory]);

    // Function to fetch available rooms
    useEffect(() => {
        if (showAvailableRooms && !isRoomJoined) {
            setLoadingRooms(true);
            setErrorLoadingRooms(null);
            const roomsRef = collection(firestore, 'rooms');
            const q = query(roomsRef, where('gameState.gameStage', '==', 'waiting')); // Only rooms waiting for players

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const rooms = [];
                querySnapshot.forEach(doc => {
                    rooms.push({ id: doc.id, ...doc.data() });
                });
                setAvailableRooms(rooms);
                setLoadingRooms(false);
                console.log('Available rooms fetched:', rooms);
            }, (error) => {
                console.error('Error fetching available rooms:', error);
                setErrorLoadingRooms('Failed to load rooms. Please try again.');
                setLoadingRooms(false);
            });

            return () => unsubscribe();
        }
    }, [showAvailableRooms, isRoomJoined, firestore]);


     // Function to handle joining an existing room
     const handleJoinRoom = useCallback(async (selectedRoomId) => {
        // Since username is fetched from Firestore, ensure it's available
        if (!userInventory || userInventory.length === 0) {
            toast.warn('No cards found in your inventory.');
            console.warn('Inventory array is empty.');
            return;
        }

        if (!selectedRoomId.trim()) {
            toast.warn('Please select a Room to join.');
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
            const roomDocRef = doc(firestore, 'rooms', selectedRoomId.trim());

            const roomSnap = await getDoc(roomDocRef);

            if (!roomSnap.exists()) {
                toast.error('Room not found. Please select a valid room.');
                console.error('Room does not exist.');
                return;
            }

            const roomData = roomSnap.data();

            // **Retrieve host's username from the 'host' field**
            const roomHostUsername = roomData.host || 'Unknown';

            // Check if player2 is already present
            const playersCollection = collection(firestore, 'rooms', selectedRoomId, 'players');
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
            const player2DocRef = doc(firestore, 'rooms', selectedRoomId, 'players', 'player2');
            await setDoc(player2DocRef, {
                username: username.trim(),
                deck: [],
                graveyard: [],
                hasPlacedCard: false,
                lastCard: null,
                userDocId: userDoc.id
            }, { merge: true });

            setRoomId(selectedRoomId.trim());
            setPlayerId('player2');
            setOpponentId('player1');
            setIsRoomJoined(true);
            setGameStage('preparation');
            setShowAvailableRooms(false); // Hide available rooms list after joining

            // Initialize player2's deck with 5 blank slots, including 'id': null
            const player2DeckRef = collection(firestore, 'rooms', selectedRoomId, 'players', 'player2', 'deck');
            const deckPromises = [];
            for (let i = 0; i < 5; i++) {
                const slotDocRef = doc(player2DeckRef, i.toString());
                deckPromises.push(setDoc(slotDocRef, {
                    id: null, // Initialize 'id' as null
                    imageUrl: blankCardImage,
                    cardType: null,
                    cardName: '',
                    position: 'attack',
                    inGameDefPts: null,
                    inGameAtkPts: null
                }, { merge: true }));
            }
            await Promise.all(deckPromises);

            // Initialize player2's hand in the hand subcollection with card.id as document ID
            const player2HandRef = collection(firestore, 'rooms', selectedRoomId, 'players', 'player2', 'hand');
            const handPromises = userCards.map(card => setDoc(doc(player2HandRef, card.id), {
                imageUrl: card.imageUrl,
                cardType: card.cardType,
                cardName: card.cardName,
                inGameDefPts: card.inGameDefPts || 0,
                inGameAtkPts: card.inGameAtkPts || 0
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
            toast.error('Failed to join room. Please check the selected room and try again.');
        }
    }, [username, roomId, firestore, cards, cardsLoading, assetsLoaded, userInventory]);





    /**
     * Admin Mode: Toggle Delete Buttons via Console
     * Adds hidden functions to the window object that, when called with the correct code,
     * toggle admin mode, showing or hiding Delete buttons in the room list.
     */

    // State to track admin mode
    const [isAdmin, setIsAdmin] = useState(false);

    // Function to enable admin mode
    useEffect(() => {
        // **Hidden Feature: Enable Admin Mode**
        window.enableAdminMode = (code) => {
            if (code === "CM27") {
                setIsAdmin(true);
                toast.success('Admin mode activated. You can now delete rooms.');
                console.log('Admin mode activated.');
            } else {
                toast.warn('Invalid admin code.');
                console.warn('Attempted to activate admin mode with invalid code:', code);
            }
        };

        // Cleanup: Remove the function when the component unmounts
        return () => {
            delete window.enableAdminMode;
        };
    }, []);
    
    // Function to disable admin mode
    useEffect(() => {
        // **Hidden Feature: Enable Admin Mode**
        window.disableAdminMode = (code) => {
            if (code === "CM27") {
                setIsAdmin(false);
                toast.success('Admin mode deactivated.');
                console.log('Admin mode deactivated.');
            } else {
                toast.warn('Invalid admin code.');
                console.warn('Attempted to deactivate admin mode with invalid code:', code);
            }
        };

        // Cleanup: Remove the function when the component unmounts
        return () => {
            delete window.disableAdminMode;
        };
    }, []);

    // Function to delete a room
    const handleDeleteRoom = useCallback(async (roomIdToDelete) => {
        if (!isAdmin) {
            toast.warn('You do not have permission to delete rooms.');
            return;
        }

        // Confirmation before deletion
        if (!window.confirm(`Are you sure you want to delete Room ID: ${roomIdToDelete}? This action cannot be undone.`)) {
            toast.info('Room deletion cancelled.');
            return;
        }

        try {
            const roomDocRef = doc(firestore, 'rooms', roomIdToDelete);
            const roomSnap = await getDoc(roomDocRef);

            if (!roomSnap.exists()) {
                toast.error('Room does not exist.');
                console.error('Attempted to delete a non-existent room:', roomIdToDelete);
                return;
            }

            await deleteDoc(roomDocRef);
            toast.success(`Room ID: ${roomIdToDelete} has been deleted.`);
            console.log(`Room ID: ${roomIdToDelete} has been deleted.`);
        } catch (error) {
            console.error('Error deleting room:', error);
            toast.error('Failed to delete room.');
        }
    }, [isAdmin]);





    /**
     * Preparation Phase
     * 
     * This section handles the preparation phase of the game, where players set up their decks,
     * place cards, and get ready for battle. It includes state management for players' decks,
     * graveyards, and readiness status, as well as functions to handle card placement, position
     * toggling, and turn management.
     * 
     * Key components:
     * - State management for decks, graveyards, and player readiness
     * - Functions for card placement and removal
     * - Position toggling for monster cards
     * - Player readiness handling
     * - Timer management for preparation and battle phases
     * - Turn switching and game stage transitions
     * 
     * The preparation phase transitions to the battle phase when both players are ready
     * or when the preparation timer expires.
     */
    const [selectedCard, setSelectedCard] = useState(null);
    const [myDeck, setMyDeck] = useState([]);
    const [player1Graveyard, setPlayer1Graveyard] = useState([]);
    const [player2Graveyard, setPlayer2Graveyard] = useState([]);
    const opponentGraveyard = playerId === 'player1' ? player2Graveyard : player1Graveyard;
    const playerGraveyard = playerId === 'player1' ? player1Graveyard : player2Graveyard;
    const [playerReady, setPlayerReady] = useState(false);
    const [myCards, setMyCards] = useState([]);
    const [opponentCards, setOpponentCards] = useState([]);
    const [opponentReady, setOpponentReady] = useState(false);
    const [hasPlacedCard, setHasPlacedCard] = useState(false);
    const [battlefieldEffectsChecked, setBattlefieldEffectsChecked] = useState(false);

    useEffect(() => {
        if (gameStage === 'battle' && !battlefieldEffectsChecked) {
            checkPassiveAfterPreparation();
            setBattlefieldEffectsChecked(true);
            console.log("Battlefield effects checked for this battle phase");
        }

        // Reset the check when leaving battle phase
        if (gameStage !== 'battle') {
            setBattlefieldEffectsChecked(false);
        }
    }, [gameStage, myDeck, playerGraveyard, battlefieldEffectsChecked]);

    

    // Function to toggle a card's position
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

    // Function to remove a card from a slot
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
                inGameDefPts: null,
                inGameAtkPts: null
            });

            // Add the card back to the player's hand in Firestore
            const handDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'hand', card.id);
            await setDoc(handDocRef, {
                imageUrl: card.imageUrl,
                cardType: card.cardType,
                cardName: card.cardName,
                inGameDefPts: card.inGameDefPts || 0,
                inGameAtkPts: card.inGameAtkPts || 0
            });

            // Update local state
            const updatedDeck = [...myDeck];
            updatedDeck[index] = {
                id: null,
                imageUrl: blankCardImage,
                cardType: null,
                cardName: '',
                position: 'attack',
                inGameDefPts: null,
                inGameAtkPts: null
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

    // Function to handle a click on a preparation slot
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
                    inGameDefPts: selectedCard.card.inGameDefPts || 0,
                    inGameAtkPts: selectedCard.card.inGameAtkPts || 0
                }, { merge: true });

                // Update lastCard in Firestore
                const lastCardRef = doc(firestore, 'rooms', roomId);
                await updateDoc(lastCardRef, {
                    lastCard: {
                        card: { ...selectedCard.card, slotIndex: index, inGameDefPts: selectedCard.card.inGameDefPts, owner: username, inGameAtkPts: selectedCard.card.inGameAtkPts || 0 },
                        timestamp: serverTimestamp()
                    }
                });

                // Update local state
                setMyDeck(prevDeck => {
                    const updatedDeck = [...prevDeck];
                    updatedDeck[index] = {
                        ...selectedCard.card,
                        position: 'attack',
                        slotIndex: index,
                        inGameDefPts: selectedCard.card.inGameDefPts || 0,
                        inGameAtkPts: selectedCard.card.inGameAtkPts || 0,
                        id: selectedCard.card.id,
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

            } catch (error) {
                console.error('Error placing card:', error);
                toast.error('Failed to place card.');
            }
        }
    }, [selectedCard, myDeck, handleRemoveCard, firestore, roomId, playerId, setMyDeck, setMyCards, gameStage]);

    // Function to mark a player as ready
    const handleReady = useCallback(async () => {
        if (!isRoomJoined || !roomId || !playerId) {
            toast.warn('You must join a room first.');
            return;
        }
    
        try {
            const playerDocRef = doc(firestore, 'rooms', roomId, 'players', playerId);
            await setDoc(playerDocRef, {
                hasPlacedCard: true
            }, { merge: true });
    
            setHasPlacedCard(true);
    
            toast.success('You are ready.');

            updateDoc(doc(firestore, 'rooms', roomId), {
                'lastCard.card.cardName': null,
                'lastCard.card.cardType': null,
                'lastCard.card.id': null,
                'lastCard.card.imageUrl': null,
                'lastCard.card.inGameAtkPts': null,
                'lastCard.card.inGameDefPts': null,
                'lastCard.card.owner': null,
                'lastCard.card.slotIndex': null,
            });
        } catch (error) {
            console.error('Error setting ready:', error);
            toast.error('Failed to mark as ready.');
        }
    }, [isRoomJoined, roomId, playerId, firestore]);

    // Function to check if both players are ready
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

                setHasPlacedCard(currentPlayer?.hasPlacedCard || false); // Assuming hasPlacedCard indicates readiness
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
    

    let [timer, setTimer] = useState(120);
    let [playerHP, setPlayerHP] = useState(5000);
    let [opponentHP, setOpponentHP] = useState(5000);
    const timerRef = useRef(null);
    const isActiveTurnFlag = useMemo(() => currentTurn === playerId, [currentTurn, playerId]);
    const [attackSourceCard, setAttackSourceCard] = useState(null);
    const [isWinner, setIsWinner] = useState(false);
    const [winnerUserDocId, setWinnerUserDocId] = useState(null);
    const [loserUserDocId, setLoserUserDocId] = useState(null);

    const loadTransferableCards = useCallback(async () => {
        if (!userDocId) return;

        try {
            const userDoc = await getDoc(doc(firestore, 'users', userDocId));
            if (!userDoc.exists()) {
                console.error('User document not found');
                return;
            }

            const inventory = userDoc.data().inventory || [];
            const cardPromises = inventory.map(async (cardId) => {
                const cardDocRef = doc(firestore, 'cards', cardId);
                const cardDocSnap = await getDoc(cardDocRef);
                
                if (!cardDocSnap.exists()) {
                    console.warn(`Card document does not exist for cardId: ${cardId}`);
                    return null;
                }

                const cardData = cardDocSnap.data();
                let finalImageUrl = cardData.imageUrl;

                // If imageUrl is a path in storage (e.g., "assets/cards/cardX.png"), 
                // we need to get the actual download URL.
                if (finalImageUrl && !finalImageUrl.startsWith('http')) {
                    try {
                        finalImageUrl = await getDownloadURL(storageRef(storage, finalImageUrl));
                    } catch (error) {
                        console.error('Error fetching card image URL:', error);
                        finalImageUrl = ''; // fallback to empty string if failed
                    }
                }

                return {
                    id: cardDocSnap.id,
                    ...cardData,
                    imageUrl: finalImageUrl
                };
            });

            const cards = (await Promise.all(cardPromises)).filter(card => card !== null);

            setTransferableCards(cards);
        } catch (error) {
            console.error('Error loading transferable cards:', error);
            toast.error('Failed to load cards for transfer.');
        }
    }, [userDocId, firestore, storage]);

    const determineWinner = useCallback(async () => {
        let determinedWinner;
        const player1HP = playerId === 'player1' ? playerHP : opponentHP;
        const player2HP = playerId === 'player1' ? opponentHP : playerHP;
    
        // Fetch userDocIds for both players
        const player1DocRef = doc(firestore, 'rooms', roomId, 'players', 'player1');
        const player1Snap = await getDoc(player1DocRef);
        const player1UserDocId = player1Snap.exists() ? player1Snap.data().userDocId : null;
    
        const player2DocRef = doc(firestore, 'rooms', roomId, 'players', 'player2');
        const player2Snap = await getDoc(player2DocRef);
        const player2UserDocId = player2Snap.exists() ? player2Snap.data().userDocId : null;
    
        // Determine the winner based on HP and cards
        if (player1HP <= 0) {
            determinedWinner = 'player2';
        } else if (player2HP <= 0) {
            determinedWinner = 'player1';
        } else if (gameStage === 'finished') {
            // If finishing after normal conditions (like rounds ended), determine by HP comparison
            determinedWinner = player1HP > player2HP ? 'player1' : 'player2';
        } else {
            // If no immediate winner by HP, check if a player is out of cards:
            const playerHasCards = await checkCardsRemaining();
            if (!playerHasCards) {
                // If the current player has no cards, they lose
                determinedWinner = (playerId === 'player1') ? 'player2' : 'player1';
            } else {
                // If the opponent has no cards, they lose
                determinedWinner = (opponentId === 'player1') ? 'player2' : 'player1';
            }
        }
    
        if (!determinedWinner) return;
    
        // Now derive the winner and loser userDocIds
        const winnerUserDocIdLocal = determinedWinner === 'player1' ? player1UserDocId : player2UserDocId;
        const loserUserDocIdLocal = determinedWinner === 'player1' ? player2UserDocId : player1UserDocId;
    
        // Store these in state for use in handleCardTransfer
        setWinnerUserDocId(winnerUserDocIdLocal);
        setLoserUserDocId(loserUserDocIdLocal);
    
        setWinner(determinedWinner);
        setIsWinner(determinedWinner === playerId);
        setShowGameOverlay(true);
    
        // Update Firestore with the winner
        try {
            const roomDocRef = doc(firestore, 'rooms', roomId);
            const docSnap = await getDoc(roomDocRef);
    
            if (docSnap.exists()) {
                await updateDoc(roomDocRef, {
                    'gameState.winner': determinedWinner,
                    'gameState.finalHP': {
                        player1: playerId === 'player1' ? playerHP : opponentHP,
                        player2: playerId === 'player1' ? opponentHP : playerHP
                    }
                });
    
                setTimeout(async () => {
                    setShowGameOverlay(false);
                    // Move to the end stage
                    const currentDocSnap = await getDoc(roomDocRef);
                    if (currentDocSnap.exists()) {
                        await updateDoc(roomDocRef, {
                            'gameState.gameStage': 'finished',
                            'gameState.timer': 0
                        });
                    }
                }, 10000);
            } else {
                console.log('Room document no longer exists');
            }
        } catch (error) {
            console.error('Error updating game state:', error);
            toast.error('Error updating game state. The game may have ended.');
        }
    
        // If current player is the loser, load their cards for transfer
        if (determinedWinner !== playerId) {
            await loadTransferableCards();
            setShowCardTransferModal(true);
        }
    }, [playerHP, opponentHP, playerId, opponentId, gameStage, firestore, roomId, loadTransferableCards, setWinnerUserDocId, setLoserUserDocId]);        

    // 3. Handle Card Transfer
    const handleCardTransfer = useCallback(async (cardToTransfer) => {
        if (!cardToTransfer) {
            toast.error('Please select a card to transfer.');
            return;
        }
    
        // Ensure you have winnerUserDocId and loserUserDocId set in state or accessible variables
        // These should be determined in determineWinner and stored for use here.
        if (!winnerUserDocId || !loserUserDocId) {
            console.error('Winner or loser userDocId is missing.');
            toast.error('Unable to transfer card due to missing user data.');
            return;
        }
    
        try {
            const winnerDocRef = doc(firestore, 'users', winnerUserDocId);
            const loserDocRef = doc(firestore, 'users', loserUserDocId);
    
            await runTransaction(firestore, async (transaction) => {
                const winnerDoc = await transaction.get(winnerDocRef);
                const loserDoc = await transaction.get(loserDocRef);
    
                if (!winnerDoc.exists() || !loserDoc.exists()) {
                    throw new Error('User documents not found');
                }
    
                // Get current inventories
                const winnerInventory = winnerDoc.data().inventory || [];
                const loserInventory = loserDoc.data().inventory || [];
    
                // Remove card from loser's inventory
                const updatedLoserInventory = loserInventory.filter(cardId => cardId !== cardToTransfer.id);
    
                // Add card to winner's inventory
                const updatedWinnerInventory = [...winnerInventory, cardToTransfer.id];
                
                //Update 'cards' collection with a +1 pass count
                //Also in 'cards' collection, update the currentOwnerId and currentOwnerUsername

                const cardDocRef = doc(firestore, 'cards', cardToTransfer.id);
                transaction.update(cardDocRef, {
                    passCount: increment(1),
                    currentOwnerId: winnerDocRef.id,
                    currentOwnerUsername: winnerDoc.data().username
                });
                
                // Update both documents
                transaction.update(winnerDocRef, { inventory: updatedWinnerInventory });
                transaction.update(loserDocRef, { inventory: updatedLoserInventory });
            });
    
            toast.success(`Card ${cardToTransfer.cardName} has been transferred to the winner!`);
            setShowCardTransferModal(false);
            setSelectedTransferCard(null);
    
        } catch (error) {
            console.error('Error transferring card:', error);
            toast.error('Failed to transfer card. Please try again.');
        }
    }, [winnerUserDocId, loserUserDocId, firestore]);

    // 4. Displaying the Transfer Modal at the End Stage
    const CardTransferModal = () => {
        if (!showCardTransferModal) return null;

        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                    <h2>Select a Card to Give to the Winner</h2>
                    <div className={styles.cardGrid}>
                        {transferableCards.map(card => (
                            <div 
                                key={card.id}
                                className={`${styles.cardItem} ${selectedTransferCard?.id === card.id ? styles.selected : ''}`}
                                onClick={() => setSelectedTransferCard(card)}
                            >
                                <img src={card.imageUrl} alt={card.cardName} />
                                <p>{card.cardName}</p>
                            </div>
                        ))}
                    </div>
                    <div className={styles.modalButtons}>
                        <button 
                            onClick={() => handleCardTransfer(selectedTransferCard)}
                            disabled={!selectedTransferCard}
                        >
                            Transfer Card
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Function to switch turns
    const switchTurn = useCallback(async () => {
        const roomDocRef = doc(firestore, 'rooms', roomId);
        const gameStateField = 'gameState';

        try {
            await runTransaction(firestore, async (transaction) => {
                // Read roomDocRef first
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
                        // Check if players have cards remaining
                        const cardsRemaining = await checkCardsRemaining();
                        
                        if (cardsRemaining) {
                            // Reset round counter and transition back to preparation stage
                            transaction.update(roomDocRef, {
                                [`${gameStateField}.currentRound`]: 1,
                                [`${gameStateField}.gameStage`]: 'preparation',
                                [`${gameStateField}.timer`]: 120, // Reset preparation timer
                                [`${gameStateField}.currentTurn`]: 'player1'
                            });
                            toast.info('Starting new battle phase! Players have cards remaining.');
                        } else {
                            // End the game if no cards remaining
                            transaction.update(roomDocRef, {
                                [`${gameStateField}.gameStage`]: 'finished',
                                [`${gameStateField}.timer`]: 0,
                            });
                        }
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
                } else if (updatedGameState.gameStage === 'preparation') {
                    console.log('Starting new preparation phase.');
                    toast.success('Starting new preparation phase! Place your cards.');
                    
                    // Reset player readiness states
                    const player1Ref = doc(firestore, 'rooms', roomId, 'players', 'player1');
                    const player2Ref = doc(firestore, 'rooms', roomId, 'players', 'player2');
                    await updateDoc(player1Ref, { hasPlacedCard: false });
                    await updateDoc(player2Ref, { hasPlacedCard: false });
                    setHasPlacedCard(false);
                    setOpponentReady(false);
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

    // Function to check if players have cards remaining
    const checkCardsRemaining = useCallback(async () => {
        try {
            // Check player's hand
            const playerHandRef = collection(firestore, 'rooms', roomId, 'players', playerId, 'hand');
            const playerHandSnap = await getDocs(playerHandRef);
            const playerHasCards = !playerHandSnap.empty;

            // Check opponent's hand
            const opponentHandRef = collection(firestore, 'rooms', roomId, 'players', opponentId, 'hand');
            const opponentHandSnap = await getDocs(opponentHandRef);
            const opponentHasCards = !opponentHandSnap.empty;

            return playerHasCards || opponentHasCards;
        } catch (error) {
            console.error('Error checking remaining cards:', error);
            return false;
        }
    }, [firestore, roomId, playerId, opponentId]);

    // Function to start the timer
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
                    'lastCard.card.cardName': null,
                    'lastCard.card.cardType': null,
                    'lastCard.card.id': null,
                    'lastCard.card.imageUrl': null,
                    'lastCard.card.inGameAtkPts': null,
                    'lastCard.card.inGameDefPts': null,
                    'lastCard.card.owner': null,
                    'lastCard.card.slotIndex': null,
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
    }, [gameStage, timer, isActiveTurnFlag, roomId, switchTurn, attackSourceCard]); 
    
    



    /**
     * Battle Stage
     * 
     * This section manages the core gameplay mechanics during the battle phase,
     * handling card interactions, attacks, and game state updates in real-time.
     * 
     * Key Components:
     * 1. Attack System
     *    - Card selection and target validation
     *    - Attack resolution and damage calculation
     *    - Position-based combat mechanics (Attack/Defense)
     * 
     * 2. Turn Management
     *    - Turn switching between players
     *    - Timer-based turn progression
     *    - Action validation based on turn state
     * 
     * 3. Card State Tracking
     *    - Opponent's deck monitoring
     *    - Card position and status updates
     *    - Graveyard management
     * 
     * 4. Game Flow Control
     *    - Victory/defeat conditions
     *    - Game overlay management
     *    - Stage transitions
     * 
     * States:
     * - opponentDeck: Tracks opponent's cards in play
     * - showGameOverlay: Controls victory/defeat overlay visibility
     * - attackSourceCard: Selected card for attack
     * - isWinner: Tracks game outcome
     * 
     * Key Functions:
     * - handleAttackInitiation: Manages attack execution
     * - handleCardSelection: Processes card selection events
     * - updateGameState: Syncs game state with Firestore
     * - checkGameEnd: Evaluates victory conditions
     * 
     * This stage represents the main gameplay phase where players engage in
     * strategic card battles, managing their resources and executing moves
     * to achieve victory.
     */
    const [opponentDeck, setOpponentDeck] = useState([]);
    const opponentIdLocal = playerId === 'player1' ? 'player2' : 'player1';
    const [showGameOverlay, setShowGameOverlay] = useState(false);

    // Function to check if the game has ended
    useEffect(() => {
        if (showGameOverlay) {
            // Hide overlay after 10 seconds
            const timer = setTimeout(() => {
                setShowGameOverlay(false);
            }, 10000);

            return () => clearTimeout(timer);
        }
    }, [showGameOverlay]);

    // Function to check if the game has ended due to HP
    useEffect(() => {
        if (gameStage === 'battle') {
            const player1HP = playerId === 'player1' ? playerHP : opponentHP;
            const player2HP = playerId === 'player1' ? opponentHP : playerHP;

            if (player1HP <= 0 || player2HP <= 0) {
                // Set winner based on HP and update game state
                determineWinner();
                setShowGameOverlay(true);
            }
        }
    }, [gameStage, playerHP, opponentHP, playerId, determineWinner]);

    const handleCardUseEffect = useCallback(async () => {
        // Debugging: Log the current selectedCard
        console.log('Checking card effect for selectedCard:', selectedCard);
    
        // Check if selectedCard and its nested properties are defined
        if (!selectedCard?.card?.cardType) {
            toast.error('No valid card selected.');
            console.error('Selected card is invalid:', selectedCard);
            return;
        }
    
        // Destructure to get cardType, cardName, and cardCharacter
        const { cardType, cardName, cardCharacter } = selectedCard.card;
    
        // Determine effect based on card type
        switch (cardType) {
            case 'monster':
                if (cardCharacter === 'ritual') {
                    toast.warn('Ritual effects are not implemented yet.');
                    console.warn(`Ritual monster ${cardName} has no effects implemented.`);
                } else if (cardCharacter === 'normal') {
                    toast.info(`${cardName} has no effects.`);
                    console.log(`Normal monster ${cardName} has no effects.`);
                
                } else if (cardName === 'Heart of the Mountain') {
                    myDeck.forEach((card) => {
                        if (earthCards.includes(card.cardName)) {
                            card.inGameAtkPts += 500;
                            console.log(`${card.cardName} is an Earth card. Attack points increased by 500.`);
                            toast.success(`${card.cardName}'s attack increased by 500.`);

                        } else if (card.cardType === 'monster' && card.cardName !== 'Heart of the Mountain') {
                            card.inGameAtkPts += 200;
                            console.log(`${card.cardName} is a monster card. Attack points increased by 200.`);
                            toast.info(`${card.cardName}'s attack increased by 200.`);
                        } else {

                            console.error(`Error updating attack points for ${card.cardName}.`);
                            toast.error(`Error updating attack points for ${card.cardName}.`);
                        }
                    });
                }
                break;
    
            case 'spell':
                // Handle spell card effect (e.g., boost attack, heal, etc.)
                toast.info(`Activating Spell Card: ${cardName}!`);
                console.log(`Spell card ${cardName} effect activated.`);
                // Add specific spell effect logic here
                break;
    
            case 'trap':
                // Handle trap card effect (e.g., defensive counter)
                toast.info(`Trap Card ${cardName} Ready!`);
                console.log(`Trap card ${cardName} effect set.`);
                // Add specific trap effect logic here
                break;
    
            default:
                // Handle unknown or unsupported card types
                toast.warn(`Unknown card type: ${cardType}.`);
                console.error(`Unsupported card type: ${cardType}`);
                break;
        }
        // Call switchTurn to change the turn after using a card
    }, [selectedCard, firestore, cards, playerHP, opponentHP]);


    // Function to initiate an attack
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
            console.warn(`Attempted to attack a card in Defense position at index ${selectedCard.index}.`);
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

    // Function to handle target selection
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
            toast.warn('No valid target card selected.');
        } else {
            if (attackSourceCard.cardName === "Moonlight Archer") {
                const damage = 500;
                try {
                    await runTransaction(firestore, async (transaction) => {
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
            
                        // Retrieve current inGameAtkPts of the target card
                        const currentDefPts = targetDoc.data().inGameDefPts || 0;
                        const newDefPts = Math.max(currentDefPts - damage, 0);
            
                        // Update inGameAtkPts in the database
                        transaction.update(targetDocRef, {
                            inGameDefPts: newDefPts
                        });
                    });
            
                    toast.success(`Moonlight Archer reduced ${targetCard.cardName}'s attack by 500.`);
                    console.log(`Moonlight Archer reduced ${targetCard.cardName}'s attack by 500.`);
                } catch (error) {
                    console.error('Error performing Moonlight Archer attack:', error);
                    toast.error('Failed to perform Moonlight Archer attack.');
                }
                return;
            }

            
            if (attackSourceCard.cardName === "Lunar Wolf" && targetCard.position === 'defense') {

                const cardId = "SVPSxf2mVaiGMT6UOkHg"; 
                const cardDocRef = doc(firestore, 'cards', cardId);

                getDoc(cardDocRef)
                                .then((docSnap) => {
                                    if (docSnap.exists()) {
                                        const currentAtkPts = docSnap.data().inGameAtkPts || 0;
                                        const inGameAtkPts = docSnap.data().inGameAtkPts || 0; 
                                        const incrementValue = 500;
                                        if (typeof incrementValue !== 'number') {
                                            console.error("Invalid inGameAtkPts value:", inGameAtkPts);
                                            return;
                                        }
                                        let newAtkPts = currentAtkPts + incrementValue;
                            
                                        updateDoc(cardDocRef, {
                                            inGameAtkPts: newAtkPts
                                        }).then(() => {
                                            toast.info("Lunar Wolf's attack increased by 500 due to attacking a card in defense position!");
                                            console.log("Lunar Wolf's attack increased by 500 due to attacking a card in defense position!");
                                        }).catch((error) => {
                                            toast.info("Error updating Lunar Wolf's attack.");
                                            console.error("Error updating Lunar Wolf's attack:", error);
                                        });
                                    } else {
                                        toast.info("Lunar Wolf's  document not found.");
                                        console.log("Lunar Wolf's document not found.");
                                    }
                                })
                                .catch((error) => {
                                    console.error("Error retrieving Lunar Wolf's document:", error);
                                });

                toast.info("Lunar Wolf's attack increased by 500 due to attacking a card in defense position!");
                console.log("Lunar Wolf's attack increased by 500 due to attacking a card in defense position!");
                return;
            }
        }
        if (targetCard.position !== 'attack') {
            toast.warn('You cannot attack a card in Defense position.');
            console.warn(`Attempted to attack a card in Defense position at index ${targetIndex}.`);
            return;
        }


        // **Position Check: Only 'attack' position cards can be targeted**

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

                const attackSourceName = attackSourceCard.cardName;
                const targetCardData = targetDoc.data();
                const currentDefPts = targetCardData.inGameDefPts || 0;
                const attackingPts = attackSourceCard.attackPts || 0;
                const newDefPts = Math.max(currentDefPts - attackingPts, 0);
                const targetCardName = targetCardData.cardName;

                console.log('Attack calculation:', {
                    currentDefPts,
                    attackingPts,
                    newDefPts,
                    targetCardData
                });

                // Update the card's defense points in the cards collection
                const cardDocRef = doc(firestore, 'cards', targetCardData.id);
                transaction.update(cardDocRef, {
                    inGameDefPts: newDefPts
                });

                if (newDefPts <= 0) {

                    // Move to graveyard if defense points are depleted
                    const graveyardRef = collection(firestore, 'rooms', roomId, 'players', opponentId, 'graveyard');
                    await addDoc(graveyardRef, { ...targetCardData });
                    // Remove the card from deck and clear its data including 'id'
                    transaction.update(targetDocRef, {
                        id: null,
                        imageUrl: blankCardImage,
                        cardType: null,
                        cardName: '',
                        position: 'attack',
                        inGameDefPts: null,
                        inGameAtkPts: null
                    });

                    // Reset the card's defense points in the cards collection when destroyed
                    transaction.update(cardDocRef, {
                        inGameDefPts: targetCardData.defPts || 0 // Reset to original defense points
                    });

                    if (targetCardName === "Lavapulse Phoenix" && !targetCardData.hasActivatedPassive) {
                        console.log("Lavapulse Phoenix's passive effect activated: Both players lose 200 HP.");
                        targetCardData.hasActivatedPassive = true; 
                        await updateDoc(doc(firestore, 'rooms', roomId), {
                            'hp.player1': playerHP - 200,
                            'hp.player2': opponentHP - 200
                        });
                    }

                    console.log(`Card destroyed. Opponent's card moved to graveyard.`);

                    if (attackSourceName === "Ra's Herald") {
                        const cardId = "4PlalkUkDSwPIxMHh7gd";
                        const cardDocRef = doc(firestore, 'cards', cardId);
                        // Get the current document to retrieve currentDefPts
                        getDoc(cardDocRef)
                            .then((docSnap) => {
                                if (docSnap.exists()) {
                                    const currentDefPts = docSnap.data().inGameDefPts || 0;
                    
                                    // Ensure inGameAtkPts is defined
                                    const incrementValue = inGameAtkPts || 0;
                                    if (typeof incrementValue !== 'number') {
                                        console.error("Invalid inGameAtkPts value:", inGameAtkPts);
                                        return;
                                    }
                                    let newDefPts = currentDefPts + incrementValue;
                                    if (newDefPts > 1500) {
                                        newDefPts = 1500;
                                    }
                                    // Update the inGameDefPts by adding the enemy's inGameAtkPts
                                    updateDoc(cardDocRef, {
                                        inGameDefPts: newDefPts
                                    }).then(() => {
                                        toast.info("Ra's Herald Heals");
                                        console.log("Ra's Herald Heals");
                                    }).catch((error) => {
                                        toast.info("Error updating Ra's Herald.");
                                        console.error("Error updating Ra's Herald:", error);
                                    });
                                } else {
                                    toast.info("Ra's Herald document not found.");
                                    console.log("Ra's Herald document not found.");
                                }
                            })
                            .catch((error) => {
                                console.error("Error retrieving Ra's Herald document:", error);
                            });
                    }

                    if (attackSourceName === "Cyclone Serpent") {
                        myDeck.forEach(card => {
                            if (card.cardType === 'monster') {
                                // Set maxHP based on defPts if not already set
                                card.maxHP = card.maxHP || card.defPts;

                                // Heal the card by increasing inGameDefPts by 100, ensuring it doesn't exceed maxHP
                                card.inGameDefPts = Math.min(card.inGameDefPts + 100, card.maxHP);

                                // Update Firestore document for each monster card
                                const cardRef = doc(firestore, 'cards', card.id);
                                updateDoc(cardRef, {
                                    inGameDefPts: card.inGameDefPts
                                }).then(() => {
                                    console.log(`Updated ${card.cardName}'s inGameDefPts in Firestore.`);
                                }).catch((error) => {
                                    console.error(`Error updating ${card.cardName}'s inGameDefPts in Firestore:`, error);
                                });
                                console.log(`Healed ${card.cardName} by 100 points due to Cyclone Serpent's effect.`);
                                toast.info(`Healed ${card.cardName} by 100 points due to Cyclone Serpent's effect.`);
                            }
                        });
                    }

                    if (attackSourceName === "Electric Sabre") {
                        const damageToOpponent = 300;
                        const currentOpponentHP = roomDoc.data().hp[opponentId] || 5000;
                        const newOpponentHP = currentOpponentHP - damageToOpponent;
                    
                        // Update the opponent's HP in the database
                        transaction.update(roomDocRef, {    
                            [`hp.${opponentId}`]: Math.max(newOpponentHP, 0)
                        });
                    
                        // Update the local state of the opponent's HP 
                        setOpponentHP(Math.max(newOpponentHP, 0));
                    
                        console.log("Electric Sabre attacked: Opponent loses 300 HP.");
                    }


                    // **Damage to Opponent's HP based on cardLevel**
                    const cardLevel = cards.find(c => c.id === targetCardData.id)?.cardLevel || 0;
                    if (cardLevel > 0) {
                        const damageToOpponent = 200 * cardLevel;
                        const currentOpponentHP = roomDoc.data().hp[opponentId] || 5000;
                        const newOpponentHP = currentOpponentHP - damageToOpponent;
                        transaction.update(roomDocRef, {
                            [`hp.${opponentId}`]: Math.max(newOpponentHP, 0)
                        });
                        setOpponentHP(Math.max(newOpponentHP, 0));
                    }
                } else {
                    // Update the defense points of the target card in the cards collection
                    transaction.update(cardDocRef, {
                        inGameDefPts: newDefPts
                    });
                }

                // Update lastCard in Firestore
                transaction.update(roomDocRef, {
                    lastCard: {
                        card: {
                            ...attackSourceCard.card,
                            attackPts: attackSourceCard.attackPts,
                            action: 'attack',
                            targetCard: {
                                cardName: targetCardData.cardName,
                                previousDefPts: currentDefPts,
                                newDefPts: newDefPts,
                                wasDestroyed: newDefPts <= 0
                            }
                        },
                        owner: username, // Use username instead of playerId
                        timestamp: serverTimestamp()
                    }
                });

                // Update local opponentDeck
                setOpponentDeck(prevDeck => {
                    const updatedDeck = [...prevDeck];
                    if (updatedDeck[targetIndex]) {
                        if (newDefPts <= 0) {
                            updatedDeck[targetIndex] = {
                                id: null,
                                imageUrl: blankCardImage,
                                cardType: null,
                                cardName: '',
                                position: 'attack',
                                inGameDefPts: null,
                                inGameAtkPts: null
                            };
                        } else {
                            updatedDeck[targetIndex] = {
                                ...updatedDeck[targetIndex],
                                inGameDefPts: newDefPts
                            };
                        }
                    }
                    return updatedDeck;
                });
            });

            // Show appropriate toast messages after transaction
            const targetName = targetCard.cardName;
            const attackPts = attackSourceCard.attackPts || 0;
            const currentDefPts = targetCard.inGameDefPts || 0;
            const newDefPts = Math.max(currentDefPts - attackPts, 0);

            if (newDefPts <= 0) {
                const cardLevel = cards.find(c => c.id === targetCard.id)?.cardLevel || 0;
                if (cardLevel > 0) {
                    const damageToOpponent = 200 * cardLevel;
                    toast.success(`${targetName}'s defenses were broken! ${opponentUsername} loses ${damageToOpponent} HP.`);
                } else {
                    toast.info(`${targetName}'s defenses were broken!`);
                }
            } else {
                const defenseReduction = currentDefPts - newDefPts;
                toast.info(`${targetName}'s defense reduced by ${defenseReduction} (${currentDefPts} → ${newDefPts}).`);
            }

            // After attack, switch turn
            await switchTurn();
            setAttackSourceCard(null);

        } catch (error) {
            console.error('Error attacking target card:', error);
            toast.error('Failed to attack target card.');
        }
    }, [attackSourceCard, opponentDeck, firestore, roomId, opponentId, switchTurn, cards, isActiveTurnFlag, opponentUsername]);

    const checkPassiveAfterPreparation = useCallback(() => { 

        myDeck.forEach(card => {
            if (card.cardName === "Wind Fairy" && card.position === 'defense') {
                setPlayerHP(prevHP => {
                    const healedHP = prevHP + 500;
                    const newHP = Math.min(healedHP, 5000); // Ensure max HP is 5000
                    
                    // Update Firestore
                    const playerDocRef = doc(firestore, 'rooms', roomId, 'players', playerId);
                    updateDoc(playerDocRef, {
                        hp: newHP
                    }).then(() => {
                        console.log("Firestore updated: Player HP increased to " + newHP);
                        toast.success("Firestore updated: Player HP increased to " + newHP);
                    }).catch(error => {
                        console.error("Error updating Firestore: ", error);
                        toast.error("Failed to update Firestore.");
                    });

                    return newHP;
                });
                console.log("Wind Fairy's effect activated: Player HP increased.");
            }
        });

        const infernoGiantInDeck = myDeck.some(card => card.cardName === "Inferno Giant");
        if (infernoGiantInDeck) {
            const fireCardsInGraveyard = playerGraveyard.filter(card => card.cardAttribute === "fire");
            const fireCardCount = fireCardsInGraveyard.length;
            if (fireCardCount > 0) {
                const cardId = "dmJl4pNltNoOcKE2n4kL"; 
                const cardDocRef = doc(firestore, 'cards', cardId);

                getDoc(cardDocRef)
                                .then((docSnap) => {
                                    if (docSnap.exists()) {
                                        const currentAtkPts = docSnap.data().inGameAtkPts || 0;
                                        const newAtkPts = currentAtkPts + (500 * fireCardCount);
                                        if (typeof newAtkPts !== 'number') {
                                            console.error("Invalid newAtkPts value:", newAtkPts);
                                            return;
                                        }
                                        updateDoc(cardDocRef, {
                                            inGameAtkPts: newAtkPts
                                        }).then(() => {
                                            toast.info(`Inferno Giant's Attack increased by ${500 * fireCardCount} due to ${fireCardCount} fire cards in the graveyard.`);
                                            console.log(`Inferno Giant's Attack increased by ${500 * fireCardCount} due to ${fireCardCount} fire cards in the graveyard.`);
                                        });
                                    } else {
                                        console.error("Inferno Giant document does not exist.");
                                    }
                                })
                                .catch((error) => {
                                    toast.info("Error fetching Inferno Giant.");
                                    console.error("Error fetching Inferno Giant:", error);

                                });
            }
        }

        const venomDragonInDeck = myDeck.some(card => card.cardName === "Venom Dragon");

        if (venomDragonInDeck) {
            let darkCardCount = 0;
            const checkedCards = [];
            opponentDeck.forEach(card => {
                if (darkCards.includes(card.cardName) && card.cardName !== "Venom Dragon" && !checkedCards.includes(card.cardName)){
                    darkCardCount += 1;
                    checkedCards.push(card.cardName); 
                }
            });
            if (darkCardCount > 0) {
                setOpponentHP(prevHP => {
                    const newHP = prevHP - (500 * darkCardCount);
                    
                    // Update Firestore
                    const roomDocRef = doc(firestore, 'rooms', roomId);
                    updateDoc(roomDocRef, {
                        'hp.player2': newHP
                    }).then(() => {
                        console.log(`Firestore updated: Opponent HP decreased by ${500 * darkCardCount}.`);
                        toast.success(`Firestore updated: Opponent HP decreased by ${500 * darkCardCount}.`);
                    }).catch(error => {
                        console.error("Error updating Firestore: ", error);
                        toast.error("Failed to update Firestore.");
                    });

                    return newHP;
                });
                console.log(`Venom Dragon's effect activated: Opponent HP decreased by ${500 * darkCardCount} due to ${darkCardCount} dark cards in opponent's deck.`);
                toast.success(`Venom Dragon's effect activated: Opponent HP decreased by ${500 * darkCardCount} due to ${darkCardCount} dark cards in opponent's deck.`);
            }
        }

        let hasBlazingMinotaur = myDeck.some(card => card.cardName === "Blazing Minotaur");
        if (hasBlazingMinotaur) {
            const checkedCards = [];
            myDeck.forEach(card => {
                if (fireCards.includes(card.cardName) && card.cardName !== "Blazing Minotaur" && !checkedCards.includes(card.cardName)) {
                    const cardId = "EY45LZZyMhLdPQONWess";
                    const cardDocRef = doc(firestore, 'cards', cardId);
                    getDoc(cardDocRef).then(docSnapshot => {
                        if (docSnapshot.exists()) {

                            const currentAtkPts = docSnapshot.data().inGameAtkPts;
                            const newAtkPts = currentAtkPts + 200;
                            if (typeof newAtkPts !== 'number') {
                                console.error("Invalid newAtkPts value:", newAtkPts);
                                return;
                            }
                            updateDoc(cardDocRef, {
                                inGameAtkPts: newAtkPts
                            }).then(() => {
                                toast.info("Blazing Minotaur's Attack increased.");
                                console.log("Blazing Minotaur's Attack increased.");

                            });
                        } else {
                            console.error("Blazing Minotaur document does not exist.");
                        }
                    }).catch((error) => {
                        toast.info("Error fetching Blazing Minotaur.");
                        console.error("Error fetching Blazing Minotaur:", error);
                    });
                    checkedCards.push(card.cardName);
                }
            });
        }

        const tidecallerOverlord = myDeck.find(card => card.cardName === "Tidecaller Overlord");
        if (tidecallerOverlord) {
            const checkedCards = [];
            const enemycheckedCards = [];
            let opponentWaterCount = 0;
            let userWaterCount = 0;

            myDeck.forEach(card => { 
            if (waterCards.includes(card.cardName) && card.cardName !== "Tidecaller Overlord" && !checkedCards.includes(card.cardName)){
                userWaterCount += 1;
            }
            });
            opponentDeck.forEach(card => {
            if (waterCards.includes(card.cardName) && card.cardName !== "Tidecaller Overlord" && !enemycheckedCards.includes(card.cardName)){
                opponentWaterCount += 1;
            }
            });
        
            const tidecallerOverlordId = "wfU4vJS1yIy3A8GGSUqr";
            const cardDocRef = doc(firestore, 'cards', tidecallerOverlordId);
            getDoc(cardDocRef).then(docSnapshot => {
                if (docSnapshot.exists()) {
                    const currentAtkPts = docSnapshot.data().inGameAtkPts || 0;
                    const currentDefPts = docSnapshot.data().inGameDefPts || 0;

                    const newAtkPts = currentAtkPts + (opponentWaterCount * 200);
                    const newDefPts = currentDefPts + (userWaterCount * 500);
        
                    updateDoc(cardDocRef, {
                        inGameAtkPts: newAtkPts,
                        inGameDefPts: newDefPts
                    }).then(() => {
                        console.log(`Tidecaller Overlord's stats updated in Firestore: ATK = ${newAtkPts}, DEF = ${newDefPts}.`);
                        toast.info(`Tidecaller Overlord's stats updated in Firestore: ATK = ${newAtkPts}, DEF = ${newDefPts}.`);
                    }).catch(error => {
                        console.error('Error updating Tidecaller Overlord in Firestore:', error);
                        toast.error('Failed to update Tidecaller Overlord stats in Firestore.');
                    });
                } else {
                    console.error("Tidecaller Overlord document does not exist.");
                }
                checkedCards.push(card.cardName);
                enemycheckedCards.push(card.cardName);
            }).catch(error => {
                console.error("Error fetching Tidecaller Overlord document:", error);
            
            });
        }

    }, [myDeck, playerGraveyard, setPlayerHP, setOpponentHP, firestore, cards, opponentDeck]);

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
                case 'fate swap': {
                    // Function to swap player and opponent HP
                    const switchPlayerHpWithOpponent = async (playerId, opponentId, playerHP, opponentHP) => {
                       
                        const playerRef = doc(firestore, 'rooms', roomId, 'players', playerId);
                        const opponentRef = doc(firestore, 'rooms', roomId, 'players', opponentId);
    
                        // Swap HP values
                        const tempHP = playerHP;
                        playerHP = opponentHP;
                        opponentHP = tempHP;
    
                        // Update Firestore
                        await updateDoc(playerRef, { hp: playerHP });
                        await updateDoc(opponentRef, { hp: opponentHP });
    
                        return { playerHP, opponentHP };
                    };
    
                    const { playerHP: newPlayerHP, opponentHP: newOpponentHP } =
                        await switchPlayerHpWithOpponent(playerId, opponentId, playerHP, opponentHP);
    
                    // Update local state
                    setPlayerHP(newPlayerHP);
                    setOpponentHP(newOpponentHP);
                    console.log(`Player HP (${newPlayerHP}) and Opponent HP (${newOpponentHP}) swapped.`);
                    toast.info(`Player HP and Opponent HP have been swapped.`);
                    break;
                }
    
                case 'sudden storm': {
                    // Reduce defense points for all opponent's monster cards
                    const updateCards = opponentDeck.map(async (card) => {
                        if (card.cardType === 'monster') {
                            const newDefPts = card.inGameDefPts - 200;
                            card.inGameDefPts = newDefPts;
    
                            console.log(`${card.cardName}'s defense decreased by 200.`);
                            toast.info(`${card.cardName}'s defense decreased by 200.`);
    
                            // Update Firestore
                            const cardRef = doc(firestore, 'cards', card.id);
                            await updateDoc(cardRef, { inGameDefPts: newDefPts });
                        }
                    });
    
                    // Await all updates to complete
                    await Promise.all(updateCards);
                    break;
                }
    
                default:
                    toast.warn('Unknown spell effect.');
                    console.warn(`Spell effect for ${spellCard.cardName} is not defined.`);
                    return;
            }
    
            // Remove the spell card from the player's hand and move it to the graveyard
            const handDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'hand', spellCard.id);
            await deleteDoc(handDocRef);
    
            const graveyardRef = collection(firestore, 'rooms', roomId, 'players', playerId, 'graveyard');
            await addDoc(graveyardRef, spellCard);
    
            // Update local state
            setMyCards((prevCards) => prevCards.filter((card) => card.id !== spellCard.id));
            toast.success(`Used spell card: ${spellCard.cardName}`);
            console.log(`Used spell card: ${spellCard.cardName}`);
            await switchTurn();


    
        } catch (error) {
            console.error('Error using spell card:', error);
            toast.error('Failed to use spell card.');
        }
    }, [gameStage, isActiveTurnFlag, roomId, playerId, playerHP, opponentHP, opponentDeck, firestore]);

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

    // Function to handle battle card placement
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
                inGameDefPts: selectedCard.card.inGameDefPts || 0,
                inGameAtkPts: selectedCard.card.inGameAtkPts || 0
            }, { merge: true });

            // Update lastCard in Firestore
            const lastCardRef = doc(firestore, 'rooms', roomId);
            await updateDoc(lastCardRef, {
                lastCard: {
                    card: { ...selectedCard.card, slotIndex: index, inGameDefPts: selectedCard.card.inGameDefPts, owner: username, inGameAtkPts: selectedCard.card.inGameAtkPts || 0 },
                    timestamp: serverTimestamp()
                }
            });

            // Update local state
            setMyDeck(prevDeck => {
                const updatedDeck = [...prevDeck];
                updatedDeck[index] = {
                    ...selectedCard.card,
                    position: 'attack',
                    slotIndex: index,
                    inGameDefPts: selectedCard.card.inGameDefPts || 0,
                    inGameAtkPts: selectedCard.card.inGameAtkPts || 0,
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

    const handleSlotClick = useCallback(async (index) => {
        if (gameStage === 'preparation') {
            await handlePreparationSlotClick(index);
        } else if (gameStage === 'battle') {
            if (!isActiveTurnFlag) {
                toast.warn("It's not your turn!");
                return;
            }

            // Check if it's an opponent's slot
            if (index >= 5) {
                // Only process opponent card click if we have an attack source card
                if (attackSourceCard) {
                    handleTargetSelection(index - 5);
                } else {
                    toast.warn('Select your card and click Attack button first.');
                }
                return;
            }

            // Player's own slot
            const card = myDeck[index];
            if (!card.id) {
                // Empty slot - try to place a card if one is selected
                if (selectedCard) {
                    await handleBattleCardPlacement(index);
                }
            } else {
                // Select the card for potential attack
                setSelectedCard({ card, index });
                toast.info(`Selected ${card.cardName}. Use the Attack button to initiate an attack.`);
            }
        } else {
            toast.warn('Cannot place or remove cards at this stage.');
        }
    }, [gameStage, handlePreparationSlotClick, handleBattleCardPlacement, isActiveTurnFlag, myDeck, attackSourceCard, selectedCard]);

    const handleFlipCard = useCallback((card, index) => {
        if (card.position === 'defense') {
            // Update the card's position to attack
            const updatedCard = { ...card, position: 'attack' };

            // Update Firestore
            const cardDocRef = doc(firestore, 'rooms', roomId, 'players', playerId, 'deck', index.toString());
            updateDoc(cardDocRef, { position: 'attack' }).then(() => {
                console.log(`Card ${card.cardName} flipped to attack position.`);
                toast.success(`${card.cardName} is now in attack position.`);
            }).catch(error => {
                console.error('Error updating card position:', error);
                toast.error('Failed to flip card position.');
            });

            // Update local state
            setMyDeck(prevDeck => {
                const newDeck = [...prevDeck];
                newDeck[index] = updatedCard;
                return newDeck;
            });
        } else {
            toast.info('Card is already in attack position.');
        }
    }, [firestore, roomId, playerId, setMyDeck]);

    // Function to handle multiplayer game state updates
    useEffect(() => {
        if (isRoomJoined && roomId && playerId) {
            const roomRef = doc(firestore, 'rooms', roomId);

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
                        const player1HP = data.hp.player1 || 0;
                        const player2HP = data.hp.player2 || 0;

                        // Update local HP states
                        if (playerId === 'player1') {
                            setPlayerHP(player1HP);
                            setOpponentHP(player2HP);
                        } else {
                            setPlayerHP(player2HP);
                            setOpponentHP(player1HP);
                        }

                        // Only determine winner if game is finished
                        if (data.gameState.gameStage === 'finished') {
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
            const unsubscribeOpponentDeck = onSnapshot(collection(firestore, 'rooms', roomId, 'players', opponentIdLocal, 'deck'), async (querySnapshot) => {
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
                        inGameDefPts: null,
                        inGameAtkPts: null
                    };
                });
                setOpponentDeck(filledDeck);
                console.log('Updated opponentDeck:', filledDeck);
            }, (error) => {
                console.error('Error listening to opponent deck:', error);
                toast.error('Failed to listen to opponent deck updates.');
            });

            // Listen to opponent's hand changes
            const unsubscribeOpponentHand = onSnapshot(collection(firestore, 'rooms', roomId, 'players', opponentIdLocal, 'hand'), async (querySnapshot) => {
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
            const unsubscribePlayerDeck = onSnapshot(collection(firestore, 'rooms', roomId, 'players', playerId, 'deck'), async (querySnapshot) => {
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
                        inGameDefPts: null,
                        inGameAtkPts: null
                    };
                });
                setMyDeck(filledDeck);
                console.log('Updated myDeck:', filledDeck);
            }, (error) => {
                console.error('Error listening to player deck:', error);
                toast.error('Failed to listen to your deck updates.');
            });

            // Listen to player's hand changes
            const unsubscribePlayerHand = onSnapshot(collection(firestore, 'rooms', roomId, 'players', playerId, 'hand'), async (querySnapshot) => {
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
            const unsubscribeHasPlacedCard = onSnapshot(doc(firestore, 'rooms', roomId, 'players', playerId), (docSnap) => {
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
            const unsubscribePlayers = onSnapshot(collection(firestore, 'rooms', roomId, 'players'), async (querySnapshot) => {
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
                        setGameStage('preparation');
                        setTimer(120);
                        toast.success('Both players are ready. Starting Preparation Phase.');
                        console.log('Both players are ready. Starting Preparation Phase.');
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
    }, [isRoomJoined, roomId, playerId, firestore, gameStage]);
    

    // Function to listen to graveyard changes
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

    // Function to listen to HP changes
    useEffect(() => {
        if (!roomId) return;

        const unsubscribe = onSnapshot(doc(firestore, 'rooms', roomId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const player1HP = data.hp?.player1 || 0;
                const player2HP = data.hp?.player2 || 0;

                // Update local HP states
                if (playerId === 'player1') {
                    setPlayerHP(player1HP);
                    setOpponentHP(player2HP);
                } else {
                    setPlayerHP(player2HP);
                    setOpponentHP(player1HP);
                }

                // Only determine winner if game is finished
                if (data.gameState.gameStage === 'finished') {
                    determineWinner();
                }
            }
        });

        return () => unsubscribe();
    }, [roomId, playerId, firestore]);
    
    // Function to get the active player's username
    const getActivePlayerUsername = useCallback(() => {
        return currentTurn === 'player1' ? player1Username : player2Username;
    }, [currentTurn, player1Username, player2Username]);

    // Add new state variables at the top of the component
    const [showCardTransferModal, setShowCardTransferModal] = useState(false);
    const [transferableCards, setTransferableCards] = useState([]);
    const [selectedTransferCard, setSelectedTransferCard] = useState(null);

    /**
     * Renders the Battlefield component UI.
     * This includes the game overlay, lobby, room actions, and the main game area.
     * @returns {JSX.Element} The rendered Battlefield component
     */
    return (
        <div
          className={styles.background}
          style={{ backgroundImage: `url(${background})` }}
        >
          {showGameOverlay && gameStage === "battle" && (
            <GameOverlay
              isWinner={isWinner}
              playerHP={Math.max(playerHP, 0)}
              opponentHP={Math.max(opponentHP, 0)}
              playerName={playerId === "player1" ? "Player 1" : "Player 2"}
              opponentName={playerId === "player1" ? "Player 2" : "Player 1"}
            />
          )}
    
          {/* Push */}
          {!isRoomJoined && (
            <div className="text-white text-center">
              <h2 className="text-5xl mb-4">Welcome to the Battle</h2>
              <div className={styles.roomActions}>
                <button
                  onClick={handleCreateRoom}
                  className={`me-4 ${styles.roomButton}`}
                  aria-label="Create Room"
                >
                  Create Room
                </button>
                <button
                  onClick={() => setShowAvailableRooms((prev) => !prev)}
                  className={`mb-4 ${styles.roomButton}`}
                  aria-label="Join Room"
                >
                  {showAvailableRooms ? "Close Room List" : "Join Room"}
                </button>
              </div>
              {showAvailableRooms && (
                <div className={styles.rooms}>
                  <h3>Available Rooms</h3>
                  {loadingRooms ? (
                    <p>Loading rooms...</p>
                  ) : errorLoadingRooms ? (
                    <p className={styles.error}>{errorLoadingRooms}</p>
                  ) : availableRooms.length === 0 ? (
                    <p>No available rooms. Create one!</p>
                  ) : (
                    <ul>
                      {availableRooms.map((room) => (
                        <li key={room.id}>
                          <span>
                            Room ID: {room.id} <br />
                          </span>
                          {/* **Display the host's username from the 'host' field** */}
                          <span>Host: {room.host || "Unknown"}</span>
                          <div>
                            <button
                              onClick={() => handleJoinRoom(room.id)}
                              className={styles.roomButton}
                              aria-label={`Join Room ${room.id}`}
                            >
                              Join
                            </button>
                            {/* **Conditional Rendering of Delete Button** */}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteRoom(room.id)}
                                className={styles.roomButton}
                                aria-label={`Delete Room ${room.id}`}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Push */}
    
          {isRoomJoined && (
            <div className={styles.gameContainer}>
              {/* Conditional Rendering Based on gameStage */}
              {gameStage === "waiting" && (
                <WaitingForPlayer roomId={roomId} playerId={playerId} />
              )}
    
              {gameStage === "preparation" && (
                <PreparationStage
                  handleReady={handleReady}
                  playerReady={playerReady}
                  opponentReady={opponentReady}
                  opponentUsername={opponentUsername}
                  preparationTimer={timer}
                  myDeck={myDeck}
                  handleSlotClick={handleSlotClick}
                  handleCardSelection={handleCardSelection}
                  myCards={myCards}
                  selectedCard={selectedCard}
                  handlePositionToggle={handlePositionToggle}
                  handleRemoveCard={handleRemoveCard}
                />
              )}
    
              {gameStage === "battle" && (
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
                  <div className={`text-white ${styles.opponentSection}`}>
                    {/* Opponent's Graveyard */}
                    <div className={styles.opponentGraveyard}>
                      <h3 className="text-2xl">{opponentGraveyard.length} Cards</h3>
                      {/* Hide opponent's graveyard cards and show only the count */}
                      <p>{opponentUsername}'s Graveyard</p>
                    </div>
    
                    {/* Opponent's Hand */}
                    <div className={styles.opponentHand}>
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
                      <h3 className="text-2xl">{opponentUsername}'s Stats</h3>
                      <p className="text-xl">HP: {opponentHP}</p>
                      <p className="text-xl">
                        Cards in Hand: {opponentCards.length}
                      </p>
                    </div>
                  </div>
    
                  {/* Middle Section: Decks */}
                  <div
                    className={`flex justify-evenly items-center h-1/2 ${styles.midRow}`}
                  >
                    <div className={styles.decksSection}>
                      {/* Opponent's Deck */}
                      <CardSlots
                        title={`${opponentUsername}'s Deck`}
                        cards={opponentDeck}
                        selectedCard={attackSourceCard ? attackSourceCard : null}
                        onSlotClick={
                          attackSourceCard ? handleTargetSelection : () => {}
                        }
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
                    <div className="flex flex-col w-1/4 text-white">
                      <div className={styles.lastCardContainer}>
                        <h3>Last Card Played</h3>
                        {lastCard ? (
                          <>
                            {lastCard.position === "defense" ? (
                              <img
                                className={styles.lastCard}
                                src={backCard}
                                alt="Last Card (Defense Position)"
                              />
                            ) : (
                              <img
                                className={styles.lastCard}
                                src={lastCard.imageUrl}
                                alt="Last Card"
                              />
                            )}
                            {lastCardOwner && (
                              <p>{lastCardOwner} played this card.</p>
                            )}
                          </>
                        ) : (
                          <>
                            <img
                              className={styles.lastCard}
                              src={blankCardImage}
                              alt="No Last Card"
                            />
                            <p>No cards have been played yet.</p>
                          </>
                        )}
                      </div>
    
                      {/* Action Buttons */}
                      <div className={styles.actionButtons}>
                        <button
                          className={
                            isActiveTurnFlag
                              ? styles.actionButton
                              : styles.actionButtonDisabled
                          }
                          onClick={
                            isActiveTurnFlag && !attackSourceCard
                              ? handleAttackInitiation
                              : undefined
                          }
                          disabled={!isActiveTurnFlag || attackSourceCard !== null}
                          aria-label="Attack"
                        >
                          Attack
                        </button>
    
                        <button
                          className={
                            isActiveTurnFlag
                              ? styles.actionButton
                              : styles.actionButtonDisabled
                          }
                          onClick={
                            isActiveTurnFlag ? handleCardUseEffect : undefined
                          }
                          disabled={!isActiveTurnFlag}
                          aria-label={
                            selectedCard?.card?.cardType === "monster"
                              ? "Use Effect"
                              : "Use Card"
                          }
                        >
                          {selectedCard?.card?.cardType === "monster"
                            ? "Use Effect"
                            : "Use Card"}
                        </button>

                        <button
                            className={
                                isActiveTurnFlag 
                                    ? styles.actionButton 
                                    : styles.actionButtonDisabled
                            }
                            onClick={
                                isActiveTurnFlag ? handleFlipCard : undefined
                            }
                            disabled={!isActiveTurnFlag}
                            aria-label={
                                selectedCard?.card?.cardType === 'monster' ? "Flip Card" : "Card Cannot be Flipped"
                            }
                        >
                            {selectedCard?.card?.cardType === 'monster' 
                                ? "Flip Card" 
                                : "Card Cannot be Flipped"}
                                </button>
    
                        <button
                          className={
                            isActiveTurnFlag
                              ? styles.actionButton
                              : styles.actionButtonDisabled
                          }
                          onClick={isActiveTurnFlag ? switchTurn : undefined}
                          disabled={!isActiveTurnFlag}
                          aria-label="End Turn"
                        >
                          End Turn
                        </button>
    
                        {attackSourceCard && (
                          <button
                            className={
                              isActiveTurnFlag
                                ? styles.actionButton
                                : styles.actionButtonDisabled
                            }
                            onClick={() => {
                              setAttackSourceCard(null);
                              toast.info("Attack cancelled.");
                            }}
                            aria-label="Cancel Attack"
                          >
                            Cancel Attack
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
    
                  {/* Player's Section */}
                  <div className={`text-white ${styles.playerSection}`}>
                    {/* Player's Graveyard */}
                    <div className={styles.playerGraveyard}>
                      <h3 className="text-2xl">{playerGraveyard.length} Cards</h3>
                      <p>Your Graveyard</p>
                    </div>
    
                    {/* Player's Hand */}
                    <div className={styles.playerHand}>
                      <div className={styles.hand}>
                        {myCards.length === 0 ? (
                          <p className={styles.emptyMessage}>No cards in hand.</p>
                        ) : (
                          myCards.map((card, index) => (
                            <img
                              key={`player-hand-card-${index}`}
                              src={card.imageUrl}
                              alt={`Hand Card ${index + 1}`}
                              className={`${styles.handCard} ${
                                selectedCard && selectedCard.card.id === card.id
                                  ? styles.selected
                                  : ""
                              }`}
                              onClick={() => {
                                if (gameStage === "preparation") {
                                  handleCardSelection(card, index, "hand");
                                } else if (
                                  isActiveTurnFlag &&
                                  gameStage === "battle" &&
                                  card.cardType === "spell"
                                ) {
                                  handleSpellUsage(card);
                                }
                              }}
                              role={
                                isActiveTurnFlag &&
                                gameStage === "battle" &&
                                card.cardType === "spell"
                                  ? "button"
                                  : "img"
                              }
                              tabIndex={
                                isActiveTurnFlag &&
                                gameStage === "battle" &&
                                card.cardType === "spell"
                                  ? 0
                                  : -1
                              }
                              onKeyPress={
                                isActiveTurnFlag &&
                                gameStage === "battle" &&
                                card.cardType === "spell"
                                  ? (e) => {
                                      if (e.key === "Enter") handleSpellUsage(card);
                                    }
                                  : undefined
                              }
                              style={{
                                cursor:
                                  gameStage === "preparation" ||
                                  (isActiveTurnFlag &&
                                    gameStage === "battle" &&
                                    card.cardType === "spell")
                                    ? "pointer"
                                    : "default",
                              }}
                            />
                          ))
                        )}
                      </div>
                    </div>
    
                    {/* Player's Stats */}
                    <div className={styles.playerStats}>
                      <h3 className="text-2xl">Your Stats</h3>
                      <p className="text-xl">HP: {playerHP}</p>
                      <p className="text-xl">Cards in Hand: {myCards.length}</p>
                    </div>
                  </div>
                </>
              )}
    
              {gameStage === "finished" && (
                <EndStage
                  roomId={roomId}
                  winner={winner}
                  player1Username={player1Username}
                  player2Username={player2Username}
                  userDocId={userDocId}
                  handleCardTransfer={handleCardTransfer}
                  showCardTransferModal={showCardTransferModal}
                  setShowCardTransferModal={setShowCardTransferModal}
                  transferableCards={transferableCards}
                  selectedTransferCard={selectedTransferCard}
                  setSelectedTransferCard={setSelectedTransferCard}
                />
              )}
              {CardTransferModal()}
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

/**
 * 12/06 Changelog
 * Game stage loop done 
 * Card Transfer done
*/
