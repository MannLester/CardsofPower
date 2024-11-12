// CardSlots.jsx
import React from 'react';
import PropTypes from 'prop-types';
import styles from './CardSlots.module.css';
import blankCardImage from '../../assets/cards/blank.png';
import backCard from '../../assets/cards/back-card.png'; // Import back card image

/**
 * CardSlots Component
 * Renders a set of card slots, displaying cards based on their positions.
 */
function CardSlots({
    title,
    cards,
    selectedCard,
    onSlotClick,
    isOpponent,
    isPlayer,
    gameStage,
    backCardImage
}) {
    return (
        <div className={styles.cardSlotsContainer}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.slotsWrapper}>
                {cards.map((card, index) => (
                    <div
                        key={card.id || index} // Preferably use unique ID
                        className={`${styles.cardSlot} ${selectedCard && selectedCard.index === index ? styles.selected : ''} ${isPlayer ? styles.playerSlot : styles.opponentSlot}`}
                        onClick={() => {
                            if ((isPlayer || isOpponent) && onSlotClick) {
                                onSlotClick(index);
                            }
                        }}
                        aria-label={`Card Slot ${index + 1} ${isPlayer ? '(Your Slot)' : "(Opponent's Slot)"}`}
                        role={(isPlayer || isOpponent) ? 'button' : 'img'}
                        tabIndex={(isPlayer || isOpponent) ? 0 : -1}
                        onKeyPress={
                            (isPlayer || isOpponent) && onSlotClick
                                ? (e) => {
                                      if (e.key === 'Enter') onSlotClick(index);
                                  }
                                : undefined
                        }
                        style={{
                            cursor: (isPlayer || isOpponent) && onSlotClick ? 'pointer' : 'default',
                        }}
                    >
                        {card.cardName ? (
                            <img
                                src={
                                    (isPlayer || isOpponent)
                                        ? (card.position === 'attack' ? card.imageUrl : backCardImage)
                                        : (card.position === 'attack' ? card.imageUrl : backCardImage)
                                }
                                alt={card.cardName}
                                className={styles.cardImage}
                            />
                        ) : (
                            <img src={blankCardImage} alt="Empty Slot" className={styles.blankCard} />
                        )}
                        {card.cardName && (
                            <p className={styles.cardName}>{card.cardName}</p>
                        )}
                        {card.cardName && isPlayer && (gameStage === 'preparation' || gameStage === 'battle') && (
                            <p className={styles.cardPosition}>Position: {card.position.charAt(0).toUpperCase() + card.position.slice(1)}</p>
                        )}
                        {card.cardName && isPlayer && gameStage === 'battle' && card.hp !== null && (
                            <p className={styles.cardHP}>HP: {card.hp}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

CardSlots.propTypes = {
    title: PropTypes.string.isRequired,
    cards: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string, // Added ID prop
        imageUrl: PropTypes.string.isRequired,
        cardType: PropTypes.string,
        cardName: PropTypes.string,
        position: PropTypes.oneOf(['attack', 'defense']).isRequired,
        hp: PropTypes.number, // Added HP prop
    })).isRequired,
    selectedCard: PropTypes.shape({
        card: PropTypes.object,
        index: PropTypes.number,
    }),
    onSlotClick: PropTypes.func,
    isOpponent: PropTypes.bool.isRequired,
    isPlayer: PropTypes.bool.isRequired, // **New Prop**
    gameStage: PropTypes.string.isRequired,
    backCardImage: PropTypes.string.isRequired, // **New Prop**
};

export default CardSlots;
