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

const UtilitiesComponent = React.memo(({
    isOpponent,
    username,
    deck,
    graveyard,
    roomId,
    playerId,
    isActiveTurn,
    switchTurn,
    gameStage,
    currentRound,
    isGraveyardVisible,
    toggleGraveyard,
    handleCardClick
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const cardsToShow = 5;
    const blankCard = blankCardImage;

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => Math.min(prev + cardsToShow, deck.length - cardsToShow));
    }, [deck.length]);

    const handlePrevious = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - cardsToShow, 0));
    }, []);

    const graveyardContent = useMemo(() => {
        if (isGraveyardVisible) {
            return (
                <div className={styles.graveyardCards}>
                    {graveyard.length === 0 ? (
                        <p className={styles.emptyMessage}>Your graveyard is currently empty.</p>
                    ) : (
                        graveyard.map((card, index) => (
                            <img
                                className={styles.graveyardCard}
                                key={index}
                                src={card}
                                alt={`Graveyard Card ${index + 1}`}
                            />
                        ))
                    )}
                </div>
            );
        }
        return null;
    }, [isGraveyardVisible, graveyard]);

    const displayedDeck = deck.map((card, index) => (
        <img
            key={index}
            src={isOpponent ? backCard : card}
            alt={isOpponent ? `Back of Card ${index + 1}` : `Card ${index + 1}`}
            className={styles.deckCard}
            onClick={!isOpponent ? () => handleCardClick(card, index) : undefined}
        />
    ));

    const handleAction = async () => {
        if (!isActiveTurn) {
            alert("It's not your turn!");
            return;
        }

        // Select a valid random card from the deck
        const validCards = deck.filter(card => card && card !== blankCardImage);
        if (validCards.length === 0) {
            alert('No valid card found for action.');
            console.error('No valid card available in the deck.');
            return;
        }

        const randomCard = validCards[Math.floor(Math.random() * validCards.length)];

        try {
            console.log(`${username} performed an action in round ${currentRound}`);

            // Ensure that `randomCard` is defined before updating Firebase
            if (randomCard) {
                const roomRef = dbRef(database, `rooms/${roomId}`);
                await update(roomRef, {
                    lastCard: {
                        card: randomCard,
                        owner: playerId
                    }
                });

                const graveyardPath = `rooms/${roomId}/players/${playerId}/graveyard`;
                const graveyardRef = dbRef(database, graveyardPath);
                await push(graveyardRef, randomCard);

                await switchTurn();
                console.log(`Action performed by ${username}. Turn switched.`);
            } else {
                alert('Error: No card selected for the action.');
                console.error('Error: Selected card is undefined.');
            }
        } catch (error) {
            console.error('Error during action:', error);
            alert('There was an error performing the action. Please try again.');
        }
    };

    return (
        <>
            {isGraveyardVisible && (
                <div className={styles.graveyardOverlay}>
                    <button className={styles.closeButton} onClick={toggleGraveyard} aria-label="Close Graveyard">
                        <img className={styles.boneIcon} src={boneIcon} alt="Close Graveyard" />
                    </button>
                    <h2 className={styles.graveyardTitle}>{username}'s Graveyard</h2>
                    {graveyardContent}
                </div>
            )}

            <div className={styles.utilitiesRow}>
                <img
                    onClick={isOpponent ? undefined : toggleGraveyard}
                    src={graveyardCard}
                    alt="Graveyard"
                    className={styles.graveyardIcon}
                />

                <div className={styles.carousel}>
                    <button
                        onClick={handlePrevious}
                        className={styles.navButton}
                        disabled={currentIndex === 0 || isOpponent}
                    >
                        <img src={leftBtn} alt="Previous" />
                    </button>

                    <div className={styles.deck}>
                        {displayedDeck.slice(currentIndex, currentIndex + cardsToShow)}
                        {Array.from({ length: Math.max(0, cardsToShow - displayedDeck.length) }).map((_, index) => (
                            <img key={`blank-${index}`} src={blankCard} alt="Blank Card" className={styles.blankCard} />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className={styles.navButton}
                        disabled={currentIndex + cardsToShow >= deck.length || isOpponent}
                    >
                        <img src={rightBtn} alt="Next" />
                    </button>
                </div>

                <div className={styles.stats}>
                    <p className={styles.username}>{username}</p>
                    <p className={styles.stat}>
                        <img className={styles.icon} src={heartIcon} alt="HP" /> HP: 100
                    </p>
                    <p className={styles.stat}>
                        <img className={styles.icon} src={cardsIcon} alt="Cards" /> Cards: {deck.length}
                    </p>
                </div>
            </div>

            {!isOpponent && gameStage === 'battle' && (
                <div className={styles.battleActions}>
                    <button onClick={handleAction} disabled={!isActiveTurn} className={isActiveTurn ? styles.actionButton : styles.actionButtonDisabled}>
                        Attack
                    </button>
                </div>
            )}
        </>
    );
});

export default UtilitiesComponent;
