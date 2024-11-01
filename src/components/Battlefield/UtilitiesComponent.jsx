// UtilitiesComponent.jsx
import React, { useState, useMemo, useCallback } from 'react';
import styles from './UtilitiesComponent.module.css'; // CSS Module
import backCard from '../../assets/cards/back-card.png';
import blankCardImage from '../../assets/cards/blank.png';
import graveyardCard from '../../assets/cards/graveyard.png';
import leftBtn from '../../assets/others/leftBtn.png';
import rightBtn from '../../assets/others/rightBtn.png';
import heartIcon from '../../assets/others/heart.png';
import cardsIcon from '../../assets/others/card.png';
import boneIcon from '../../assets/others/bone.png';
import { ref as dbRef, update, push } from 'firebase/database';
import { database } from '../firebaseConfig'; // Adjust import path

/**
 * UtilitiesComponent
 * Manages graveyard visibility and deck interactions.
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
    toggleGraveyard,
    handleCardClick // Passed from Battlefield to handle card selection
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
                    <div className={styles.graveyardCards}>
                        {graveyard.map((card, index) => (
                            <img
                                className={styles.graveyardCard}
                                key={index}
                                src={card}
                                alt={`Graveyard Card ${index + 1}`}
                            />
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
                <div className={styles.graveyard}>
                    <button className={styles.closeGraveyardButton} onClick={toggleGraveyard} aria-label="Close Graveyard">
                        <img className={styles.boneIcon} src={boneIcon} alt="Close Graveyard" />
                    </button>
                    <h2 className={styles.graveyardTitle}>{username}'s Graveyard</h2>
                    {graveyardContent}
                </div>
            )}

            <div className={styles.row}>
                {/* Graveyard Icon */}
                {/* Only allow graveyard toggle if it's the player's own graveyard */}
                <img
                    onClick={graveyardClickHandler}
                    src={graveyardCard}
                    alt="Graveyard"
                    className={styles.graveyardIcon}
                    style={{ cursor: isOpponent ? 'default' : 'pointer', opacity: isOpponent ? 0.5 : 1 }}
                />

                {/* Deck Carousel */}
                <div className={styles.carousel}>
                    {/* Only allow deck navigation if it's the player's own deck */}
                    <button
                        onClick={handlePrevious}
                        className={styles.navButton}
                        disabled={currentIndex === 0 || isOpponent}
                        aria-label="Previous Cards"
                        style={{ pointerEvents: isOpponent ? 'none' : 'auto', opacity: isOpponent ? 0.5 : 1 }}
                    >
                        <img src={leftBtn} alt="Previous" />
                    </button>

                    <div className={styles.deck}>
                        {displayedDeck.slice(currentIndex, currentIndex + cardsToShow).map((card, index) => (
                            <img
                                key={index}
                                src={card}
                                alt={`Card ${currentIndex + index + 1}`}
                                className={styles.deckCard}
                                onClick={!isOpponent ? () => handleCardClick(card, currentIndex + index) : undefined}
                            />
                        ))}
                        {Array.from({ length: Math.max(0, cardsToShow - displayedDeck.slice(currentIndex, currentIndex + cardsToShow).length) }).map((_, index) => (
                            <img key={`blank-${index}`} src={blankCard} alt="Blank Card" className={styles.blankCard} />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className={styles.navButton}
                        disabled={currentIndex + cardsToShow >= deck.length || isOpponent}
                        aria-label="Next Cards"
                        style={{ pointerEvents: isOpponent ? 'none' : 'auto', opacity: isOpponent ? 0.5 : 1 }}
                    >
                        <img src={rightBtn} alt="Next" />
                    </button>
                </div>

                {/* Player Stats */}
                <div className={styles.stats}>
                    <p className={styles.username}>{username}</p>
                    <p className={styles.stat}>
                        <img className={styles.icon} src={heartIcon} alt='HP Icon' />HP: 5000
                    </p>
                    <p className={styles.stat}>
                        <img className={styles.icon} src={cardsIcon} alt='Cards Icon' />Cards: {deck.length}
                    </p>
                </div>
            </div>

            {/* Battle Actions */}
            {!isOpponent && gameStage === 'battle' && (
                <div className={styles.battleActions}>
                    <button onClick={handleAction} disabled={!isActiveTurn} className={styles.actionButton}>
                        Attack
                    </button>
                    {/* Add more actions as needed */}
                </div>
            )}
        </>
    )});

export default UtilitiesComponent;
