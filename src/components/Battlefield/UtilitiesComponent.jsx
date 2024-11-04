// UtilitiesComponent.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './UtilitiesComponent.module.css';
import backCard from '../../assets/cards/back-card.png';
import blankCardImage from '../../assets/cards/blank.png';
import graveyardCard from '../../assets/cards/graveyard.png';
import leftBtn from '../../assets/others/leftBtn.png';
import rightBtn from '../../assets/others/rightBtn.png';
import boneIcon from '../../assets/others/bone.png';
import heartIcon from '../../assets/others/heart.png';
import cardsIcon from '../../assets/others/card.png';

import { storage } from '../firebaseConfig'; // Ensure storage is correctly initialized
import { ref as storageRef, getDownloadURL } from 'firebase/storage';

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
    handleCardClick,
    onAttack,
    cardsData,
    selectedCard, // Added selectedCard as a prop
    onSlotClick // Added onSlotClick as a prop
}) => {
    const [deckImages, setDeckImages] = useState([]);
    const [graveyardImages, setGraveyardImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const cardsToShow = 3; // Number of cards to show at once

    // Fetch deck images
    useEffect(() => {
        const fetchDeckImages = async () => {
            const promises = deck.map(async (card) => {
                if (card.imageUrl && card.imageUrl !== blankCardImage) {
                    try {
                        const url = await getDownloadURL(storageRef(storage, card.imageUrl));
                        return url;
                    } catch (error) {
                        console.error('Error fetching deck card image:', error);
                        return blankCardImage;
                    }
                }
                return blankCardImage;
            });

            const images = await Promise.all(promises);
            setDeckImages(images);
        };

        fetchDeckImages();
    }, [deck, storage]);

    // Fetch graveyard images
    useEffect(() => {
        const fetchGraveyardImages = async () => {
            const promises = graveyard.map(async (card) => {
                if (card.imageUrl && card.imageUrl !== blankCardImage) {
                    try {
                        const url = await getDownloadURL(storageRef(storage, card.imageUrl));
                        return url;
                    } catch (error) {
                        console.error('Error fetching graveyard card image:', error);
                        return blankCardImage;
                    }
                }
                return blankCardImage;
            });

            const images = await Promise.all(promises);
            setGraveyardImages(images);
        };

        fetchGraveyardImages();
    }, [graveyard, storage]);

    // Determine which image to show based on game stage and ownership
    const getCardImage = (card) => {
        if (isOpponent) {
            // Opponent's cards: always show back
            return backCard;
        } else {
            // Player's own cards: show front
            return card.imageUrl || blankCardImage;
        }
    };

    const isInteractive = !isOpponent && (gameStage === 'preparation' || gameStage === 'battle');

    // Handle Previous Button Click
    const handlePrevious = () => {
        setCurrentIndex((prevIndex) => Math.max(prevIndex - cardsToShow, 0));
    };

    // Handle Next Button Click
    const handleNext = () => {
        setCurrentIndex((prevIndex) => Math.min(prevIndex + cardsToShow, deckImages.length - cardsToShow));
    };

    return (
        <>
            {isGraveyardVisible && (
                <div className={styles.graveyardOverlay}>
                    <button className={styles.closeButton} onClick={toggleGraveyard} aria-label="Close Graveyard">
                        <img className={styles.boneIcon} src={boneIcon} alt="Close Graveyard" />
                    </button>
                    <h2 className={styles.graveyardTitle}>{username}'s Graveyard</h2>
                    <div className={styles.graveyardCards}>
                        {graveyardImages.length === 0 ? (
                            <p className={styles.emptyMessage}>Graveyard is empty.</p>
                        ) : (
                            graveyardImages.map((url, index) => (
                                <img
                                    className={styles.graveyardCard}
                                    key={index}
                                    src={url}
                                    alt={`Graveyard Card ${index + 1}`}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            <div className={styles.utilitiesRow}>
                <img
                    onClick={!isOpponent && gameStage !== 'finished' ? toggleGraveyard : undefined}
                    src={graveyardCard}
                    alt="Graveyard"
                    className={styles.graveyardIcon}
                />

                <div className={styles.carousel}>
                    <button
                        onClick={handlePrevious}
                        className={styles.navButton}
                        disabled={currentIndex === 0 || isOpponent}
                        aria-label="Previous Cards"
                    >
                        <img src={leftBtn} alt="Previous" />
                    </button>

                    <div className={styles.deck}>
                        {deckImages.slice(currentIndex, currentIndex + cardsToShow).map((url, index) => (
                            <img
                                key={`deck-${currentIndex + index}`}
                                src={url}
                                alt={`Deck Card ${currentIndex + index + 1}`}
                                className={`${styles.deckCard} ${
                                    isInteractive && selectedCard && selectedCard.index === (currentIndex + index)
                                        ? styles.selected
                                        : ''
                                } ${
                                    isOpponent && url === blankCardImage
                                        ? styles.dimmed
                                        : ''
                                }`}
                                onClick={() => {
                                    if (!isOpponent && isInteractive) {
                                        onSlotClick(currentIndex + index);
                                    }
                                }}
                                role={!isOpponent && isInteractive ? 'button' : undefined}
                                tabIndex={!isOpponent && isInteractive ? 0 : undefined}
                                onKeyPress={
                                    !isOpponent && isInteractive
                                        ? (e) => {
                                              if (e.key === 'Enter') onSlotClick(currentIndex + index);
                                          }
                                        : undefined
                                }
                                style={{
                                    cursor:
                                        isOpponent || !isInteractive
                                            ? 'default'
                                            : 'pointer',
                                    opacity:
                                        isOpponent && url === blankCardImage
                                            ? 0.6
                                            : 1,
                                }}
                            />
                        ))}
                        {/* Fill remaining slots with blank images if necessary */}
                        {Array.from({ length: Math.max(0, cardsToShow - (deckImages.length - currentIndex)) }).map((_, index) => (
                            <img key={`blank-deck-${index}`} src={blankCardImage} alt="Blank Card" className={styles.blankCard} />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className={styles.navButton}
                        disabled={currentIndex + cardsToShow >= deckImages.length || isOpponent}
                        aria-label="Next Cards"
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

            {gameStage === 'battle' && (
                <div className={styles.battleActions}>
                    <button
                        className={isActiveTurn ? styles.actionButton : styles.actionButtonDisabled}
                        onClick={isActiveTurn ? onAttack : undefined}
                        disabled={!isActiveTurn}
                        aria-label="Attack"
                    >
                        Attack
                    </button>
                    <button
                        className={isActiveTurn ? styles.actionButton : styles.actionButtonDisabled}
                        onClick={isActiveTurn ? switchTurn : undefined}
                        disabled={!isActiveTurn}
                        aria-label="End Turn"
                    >
                        End Turn
                    </button>
                </div>
            )}
        </>
    )});

    UtilitiesComponent.propTypes = {
        isOpponent: PropTypes.bool.isRequired,
        username: PropTypes.string.isRequired,
        deck: PropTypes.arrayOf(PropTypes.shape({
            imageUrl: PropTypes.string.isRequired,
            cardType: PropTypes.string,
            cardName: PropTypes.string,
        })).isRequired,
        graveyard: PropTypes.arrayOf(PropTypes.shape({
            imageUrl: PropTypes.string.isRequired,
            cardType: PropTypes.string,
            cardName: PropTypes.string,
        })).isRequired,
        roomId: PropTypes.string.isRequired,
        playerId: PropTypes.string.isRequired,
        isActiveTurn: PropTypes.bool.isRequired,
        switchTurn: PropTypes.func.isRequired,
        gameStage: PropTypes.string.isRequired,
        currentRound: PropTypes.number.isRequired,
        isGraveyardVisible: PropTypes.bool.isRequired,
        toggleGraveyard: PropTypes.func.isRequired,
        handleCardClick: PropTypes.func,
        onAttack: PropTypes.func,
        cardsData: PropTypes.array.isRequired,
        selectedCard: PropTypes.shape({
            card: PropTypes.object,
            index: PropTypes.number,
        }),
        onSlotClick: PropTypes.func.isRequired, // Ensure this prop is required
    };

export default UtilitiesComponent;