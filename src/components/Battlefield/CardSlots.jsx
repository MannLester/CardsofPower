// CardSlots.jsx
import React from 'react';
import styles from './CardSlots.module.css'; // CSS Module

/**
 * CardSlots Component
 * Renders a set of card images.
 */
function CardSlots({ cards, selectedCard, onSlotClick }) {
    return (
        <div className={styles.cardSlot}>
            {cards.map((card, index) => (
                <img
                    key={index}
                    src={card}
                    alt={`Card ${index + 1}`}
                    className={`${styles.card} ${selectedCard && selectedCard.index === index ? styles.selected : ''}`}
                    onClick={() => onSlotClick(index)}
                />
            ))}
        </div>
    );
}

export default CardSlots;
