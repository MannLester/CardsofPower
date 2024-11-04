// CardSlots.jsx
import React from 'react';
import PropTypes from 'prop-types';
import styles from './CardSlots.module.css';

/**
 * CardSlots Component
 * Displays a set of card slots where players can place their cards.
 */
function CardSlots({ title, cards, selectedCard, onSlotClick, isOpponent, gameStage }) {
    return (
        <div className={styles.cardSlotsContainer}>
            <h3 className={styles.deckTitle}>{title}</h3>
            <div className={styles.cardSlot}>
                {cards.map((card, index) => (
                    <div
                        key={index}
                        className={`${styles.card} ${selectedCard && selectedCard.index === index ? styles.selected : ''} ${isOpponent ? styles.dimmed : ''}`}
                        onClick={() => {
                            if (!isOpponent && (gameStage === 'preparation')) {
                                onSlotClick(index);
                            }
                        }}
                        aria-label={`${title} Slot ${index + 1}`}
                    >
                        <img src={card.imageUrl} alt={`Slot ${index + 1}`} className={styles.cardImage} />
                        {card.cardName && <p>{card.cardName}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}

CardSlots.propTypes = {
    title: PropTypes.string.isRequired,
    cards: PropTypes.arrayOf(PropTypes.shape({
        imageUrl: PropTypes.string.isRequired,
        cardType: PropTypes.string,
        cardName: PropTypes.string,
    })).isRequired,
    selectedCard: PropTypes.shape({
        card: PropTypes.object,
        index: PropTypes.number,
    }),
    onSlotClick: PropTypes.func.isRequired,
    isOpponent: PropTypes.bool.isRequired,
    gameStage: PropTypes.string.isRequired,
};

export default CardSlots;
