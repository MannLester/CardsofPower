// CardSlots.jsx
import React from 'react';
import styles from './CardSlots.module.css';
import blankCardImage from '../../assets/cards/blank.png';

/**
 * CardSlots Component
 * Renders a set of card images with an optional title.
 */
function CardSlots({ title, cards, selectedCard, onSlotClick, isOpponent }) {
    return (
        <div className={styles.cardSlotsContainer}>
            {title && <h3 className={styles.deckTitle}>{title}</h3>}
            <div className={styles.cardSlot}>
                {cards.map((card, index) => (
                    <img
                        key={index}
                        src={card || blankCardImage} // Fallback to blankCardImage if card is undefined or null
                        alt={`Card ${index + 1}`}
                        className={`${styles.card} ${selectedCard && selectedCard.index === index ? styles.selected : ''}`}
                        onClick={() => {
                            if (!isOpponent && onSlotClick) {
                                onSlotClick(index);
                            }
                        }}
                        style={{
                            cursor: isOpponent ? 'default' : 'pointer',
                            opacity: isOpponent ? (card === blankCardImage ? 0.6 : 1) : 1
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

export default CardSlots;
