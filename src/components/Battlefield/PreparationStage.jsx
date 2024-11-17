// PreparationStage.jsx
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './PreparationStage.module.css';
import backCard from '../../assets/cards/back-card.png'; // Import back card image

/**
 * PreparationStage Component
 * Handles the preparation phase where players place their Monster and Trap cards.
 */
function PreparationStage({
    handleReady,
    playerReady,
    opponentReady,
    opponentUsername,
    preparationTimer,
    myDeck,
    handleSlotClick,
    handleCardSelection,
    myCards,
    selectedCard,
    handlePositionToggle, // **New Prop: Handle Position Toggle**
    handleRemoveCard, // **New Prop: Handle Remove Card**
}) {
    const [selectedSlot, setSelectedSlot] = useState(null);
    const preparationRef = useRef(null);

    // Debugging: Log props
    React.useEffect(() => {
        console.log('PreparationStage - myDeck:', myDeck);
        console.log('PreparationStage - myCards:', myCards);
        console.log('PreparationStage - selectedCard:', selectedCard);
    }, [myDeck, myCards, selectedCard]);

    // Handle clicks outside the preparation container to deselect slots
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (preparationRef.current && !preparationRef.current.contains(event.target)) {
                setSelectedSlot(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className={styles.preparationContainer} ref={preparationRef}>
            <h2>Preparation Phase</h2>
            <p>Place your Monster and Trap cards in the slots.</p>
            <p><strong>Opponent:</strong> {opponentUsername}</p>
            <p><strong>Time Remaining:</strong> {preparationTimer} seconds</p>

            <div className={styles.deckSlots}>
                <h3>Your Deck Slots</h3>
                <div className={styles.slotsContainer}>
                    {myDeck.map((card, index) => (
                        <div
                            key={index}
                            className={`${styles.slot} ${selectedSlot === index ? styles.selectedSlot : ''}`}
                            onClick={() => {
                                if (card.cardName) {
                                    setSelectedSlot(index);
                                } else {
                                    handleSlotClick(index);
                                    setSelectedSlot(null);
                                }
                            }}
                            aria-label={`Deck Slot ${index + 1}`}
                        >
                            <img
                                src={card.imageUrl !== backCard ? card.imageUrl : backCard}
                                alt={card.cardName || `Slot ${index + 1}`}
                                className={styles.cardImage}
                            />
                            {card.cardName ? (
                                <div className={styles.cardDetails}>
                                    <p>{card.cardName}</p>
                                    {/* **Conditionally render the position toggle button only for Monster cards** */}
                                    {card.cardType === 'monster' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent triggering slot click
                                                handlePositionToggle(index, card.position);
                                            }}
                                            className={styles.positionButton}
                                            aria-label={`Toggle position for ${card.cardName}`}
                                        >
                                            {card.position === 'attack' ? 'Switch to Defense' : 'Switch to Attack'}
                                        </button>
                                    )}
                                    <p>Position: {card.position.charAt(0).toUpperCase() + card.position.slice(1)}</p>
                                    {/* **Render Remove Button if this slot is selected** */}
                                    {selectedSlot === index && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent triggering slot click
                                                handleRemoveCard(index);
                                                setSelectedSlot(null);
                                            }}
                                            className={styles.removeButton}
                                            aria-label={`Remove ${card.cardName} from slot ${index + 1}`}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <p>Empty Slot</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.handContainer}>
                <h3>Your Hand</h3>
                <div className={styles.handCards}>
                    {myCards.length === 0 ? (
                        <p className={styles.emptyHand}>No cards in hand. Acquire more cards!</p>
                    ) : (
                        myCards.map((card, index) => (
                            <div
                                key={card.id}
                                className={`${styles.handCard} ${selectedCard && selectedCard.card.id === card.id ? styles.selectedCard : ''}`}
                                onClick={() => handleCardSelection(card, index)}
                                aria-label={`Hand Card ${index + 1}`}
                            >
                                <img src={card.imageUrl} alt={card.cardName} className={styles.handCardImage} />
                                <p className={styles.handCardName}>{card.cardName}</p>
                                <p className={styles.handCardType}>{card.cardType}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <button
                onClick={handleReady}
                className={styles.readyButton}
                disabled={playerReady}
                aria-label="Ready to Battle"
            >
                {playerReady ? 'Ready!' : 'Ready to Battle'}
            </button>

            {playerReady && <p className={styles.readyStatus}>You are ready!</p>}
            {opponentReady && <p className={styles.readyStatus}>{opponentUsername} is ready!</p>}
        </div>
    );
}

PreparationStage.propTypes = {
    handleReady: PropTypes.func.isRequired,
    playerReady: PropTypes.bool.isRequired,
    opponentReady: PropTypes.bool.isRequired,
    opponentUsername: PropTypes.string.isRequired,
    preparationTimer: PropTypes.number.isRequired,
    myDeck: PropTypes.arrayOf(PropTypes.shape({
        imageUrl: PropTypes.string.isRequired,
        cardType: PropTypes.string,
        cardName: PropTypes.string,
        position: PropTypes.oneOf(['attack', 'defense']).isRequired,
    })).isRequired,
    handleSlotClick: PropTypes.func.isRequired,
    handleCardSelection: PropTypes.func.isRequired,
    myCards: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        imageUrl: PropTypes.string.isRequired,
        cardType: PropTypes.string,
        cardName: PropTypes.string,
    })).isRequired,
    selectedCard: PropTypes.shape({
        card: PropTypes.object,
        slotIndex: PropTypes.number,
    }),
    handlePositionToggle: PropTypes.func.isRequired,
    handleRemoveCard: PropTypes.func.isRequired,
};

export default PreparationStage;
