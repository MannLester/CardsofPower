// UtilitiesComponent.jsx
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import styles from './UtilitiesComponent.module.css';
import backCard from '../../assets/cards/back-card.png'; // Import back card image
import blankCardImage from '../../assets/cards/blank.png';
import graveyardCard from '../../assets/cards/graveyard.png';
import leftBtn from '../../assets/others/leftBtn.png';
import rightBtn from '../../assets/others/rightBtn.png';
import boneIcon from '../../assets/others/bone.png';
import heartIcon from '../../assets/others/heart.png';
import cardsIcon from '../../assets/others/card.png';

import { storage } from '../firebaseConfig'; // Ensure storage is correctly initialized
import { ref as storageRef, getDownloadURL } from 'firebase/storage';

import CardSlots from './CardSlots'; // Import CardSlots component

const UtilitiesComponent = React.memo(({
    isOpponent,
    username,
    deck, // Placed Monster/Trap cards
    hand,  // Remaining Spell and unused cards
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
    onSlotClick,   // Added onSlotClick as a prop
    handleSpellUsage // Added handleSpellUsage as a prop
}) => {
    const [deckImages, setDeckImages] = useState([]);
    const [handImages, setHandImages] = useState([]);
    const [graveyardImages, setGraveyardImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const cardsToShow = 5; // Updated to 5 cards

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

    // Fetch hand images
    useEffect(() => {
        const fetchHandImages = async () => {
            if (!hand || hand.length === 0) {
                setHandImages([]);
                return;
            }

            const promises = hand.map(async (card) => {
                if (card.imageUrl && card.imageUrl !== blankCardImage) {
                    try {
                        const url = await getDownloadURL(storageRef(storage, card.imageUrl));
                        return url;
                    } catch (error) {
                        console.error('Error fetching hand card image:', error);
                        return blankCardImage;
                    }
                }
                return blankCardImage;
            });

            const images = await Promise.all(promises);
            setHandImages(images);
        };

        fetchHandImages();
    }, [hand, storage]);

    // Fetch graveyard images
    useEffect(() => {
        const fetchGraveyardImages = async () => {
            if (!graveyard || graveyard.length === 0) {
                setGraveyardImages([]);
                return;
            }

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
                {/* Graveyard Icon */}
                <img
                    onClick={!isOpponent && gameStage !== 'finished' ? toggleGraveyard : undefined}
                    src={graveyardCard}
                    alt="Graveyard"
                    className={styles.graveyardIcon}
                />

                {/* Deck Carousel */}
                <div className={styles.carousel}>
                    <button
                        onClick={handlePrevious}
                        className={styles.navButton}
                        disabled={currentIndex === 0 || isOpponent}
                        aria-label="Previous Deck Cards"
                    >
                        <img src={leftBtn} alt="Previous" />
                    </button>

                    {/* Player's Deck */}
                    <CardSlots
                        title="Your Deck"
                        cards={deck}
                        selectedCard={selectedCard}
                        onSlotClick={isInteractive ? onSlotClick : null}
                        isOpponent={isOpponent}
                        isPlayer={!isOpponent} // **Indicate if this is player's deck**
                        gameStage={gameStage}
                        backCardImage={backCard} // **Pass back card image**
                    />

                    <button
                        onClick={handleNext}
                        className={styles.navButton}
                        disabled={currentIndex + cardsToShow >= deckImages.length || isOpponent}
                        aria-label="Next Deck Cards"
                    >
                        <img src={rightBtn} alt="Next" />
                    </button>
                </div>

                {/* Hand Section */}
                <div className={styles.handContainer}>
                    <h3>Your Hand</h3>
                    <div className={styles.hand}>
                        {handImages.length === 0 ? (
                            <p className={styles.emptyMessage}>No cards in hand.</p>
                        ) : (
                            Array.from({ length: 5 }).map((_, index) => (
                                <div key={`hand-slot-${index}`} className={styles.handSlot}>
                                    {handImages[index] ? (
                                        <img
                                            src={handImages[index]}
                                            alt={`Hand Card ${index + 1}`}
                                            className={styles.handCard}
                                            onClick={() => {
                                                if (isActiveTurn && gameStage === 'battle') {
                                                    // Find the card object based on imageUrl
                                                    const card = hand.find(c => c.imageUrl === handImages[index]);
                                                    if (card && card.cardType === 'spell') {
                                                        handleSpellUsage(card);
                                                    }
                                                }
                                            }}
                                            role={isActiveTurn && gameStage === 'battle' && hand[index].cardType === 'spell' ? 'button' : undefined}
                                            tabIndex={isActiveTurn && gameStage === 'battle' && hand[index].cardType === 'spell' ? 0 : undefined}
                                            onKeyPress={
                                                isActiveTurn && gameStage === 'battle' && hand[index].cardType === 'spell'
                                                    ? (e) => {
                                                          if (e.key === 'Enter') handleSpellUsage(hand[index]);
                                                      }
                                                    : undefined
                                            }
                                            style={{
                                                cursor:
                                                    isActiveTurn && gameStage === 'battle' && hand[index].cardType === 'spell'
                                                        ? 'pointer'
                                                        : 'default',
                                            }}
                                        />
                                    ) : (
                                        <img src={blankCardImage} alt="Empty Hand Slot" className={styles.blankCard} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.stats}>
                    <p className={styles.username}>{username}</p>
                    <p className={styles.stat}>
                        <img className={styles.icon} src={heartIcon} alt="HP" /> HP: 100
                    </p>
                    <p className={styles.stat}>
                        <img className={styles.icon} src={cardsIcon} alt="Cards" /> Cards in Hand: {hand ? hand.length : 0}
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
        position: PropTypes.oneOf(['attack', 'defense']).isRequired,
        cardAttribute: PropTypes.string
    })).isRequired,
    hand: PropTypes.arrayOf(PropTypes.shape({
        imageUrl: PropTypes.string.isRequired,
        cardType: PropTypes.string,
        cardName: PropTypes.string,
        id: PropTypes.string,
        cardAttribute: PropTypes.string // Assuming each hand card has a unique ID
    })).isRequired, // **New Prop**
    graveyard: PropTypes.arrayOf(PropTypes.shape({
        imageUrl: PropTypes.string.isRequired,
        cardType: PropTypes.string,
        cardName: PropTypes.string,
        cardAttribute: PropTypes.string
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
        cardAttribute: PropTypes.string
    }),
    onSlotClick: PropTypes.func.isRequired,
    handleSpellUsage: PropTypes.func.isRequired, // **New Prop**
};

// Define defaultProps to prevent undefined props
UtilitiesComponent.defaultProps = {
    selectedCard: null,
};

export default UtilitiesComponent;
