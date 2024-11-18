// CardSlots.jsx
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import styles from './CardSlots.module.css';
import { firestore } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
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
    // State for tooltip
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipData, setTooltipData] = useState(null);
    const [hoveredCardId, setHoveredCardId] = useState(null);

    // Fetch card data from Firestore
    const fetchCardData = useCallback(async (cardId) => {
        if (!cardId) return;

        try {
            const cardRef = doc(firestore, 'cards', cardId);
            const cardSnap = await getDoc(cardRef);

            if (cardSnap.exists()) {
                const data = cardSnap.data();
                setTooltipData({
                    name: data.cardName,
                    atkPts: data.inGameAtkPts || 0,
                    defPts: data.inGameDefPts || 0
                });
            }
        } catch (error) {
            console.error('Error fetching card data:', error);
        }
    }, []);

    // Handle mouse movement
    const handleMouseMove = useCallback((e) => {
        if (!hoveredCardId) return;

        // Update tooltip position with offset from cursor
        setTooltipPos({
            x: e.clientX + 15,
            y: e.clientY + 15
        });
    }, [hoveredCardId]);

    // Handle mouse enter
    const handleMouseEnter = useCallback(async (cardId, isPlayerCard, cardPosition) => {
        if (!cardId || gameStage !== 'battle') return;

        // Only show tooltip for:
        // 1. Player's own cards (any position)
        // 2. Opponent's cards in attack position
        if (!isPlayerCard && cardPosition !== 'attack') return;

        setHoveredCardId(cardId);
        setTooltipVisible(true);
        await fetchCardData(cardId);
    }, [gameStage, fetchCardData]);

    // Handle mouse leave
    const handleMouseLeave = useCallback(() => {
        setHoveredCardId(null);
        setTooltipVisible(false);
        setTooltipData(null);
    }, []);

    // Add global mouse move listener
    useEffect(() => {
        if (tooltipVisible) {
            window.addEventListener('mousemove', handleMouseMove);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [tooltipVisible, handleMouseMove]);

    return (
        <div className={styles.cardSlotsContainer}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.slotsWrapper}>
                {cards.map((card, index) => (
                    <div
                        key={card.id || index}
                        className={`${styles.cardSlot} ${selectedCard && selectedCard.index === index ? styles.selected : ''} ${isPlayer ? styles.playerSlot : styles.opponentSlot}`}
                        onClick={() => {
                            if ((isPlayer || isOpponent) && onSlotClick) {
                                onSlotClick(index);
                            }
                        }}
                        onMouseEnter={() => handleMouseEnter(card.id, isPlayer, card.position)}
                        onMouseLeave={handleMouseLeave}
                        aria-label={`Card Slot ${index + 1} ${isPlayer ? '(Your Slot)' : "(Opponent's Slot)"}`}
                        role={(isPlayer || isOpponent) ? 'button' : 'img'}
                        tabIndex={(isPlayer || isOpponent) ? 0 : -1}
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

            {/* Cursor-following tooltip */}
            {tooltipVisible && tooltipData && hoveredCardId && (
                <div 
                    className={styles.tooltip}
                    style={{
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y}px`
                    }}
                >
                    <div className={styles.tooltipTitle}>{tooltipData.name}</div>
                    <div className={styles.tooltipStats}>
                        <div className={styles.tooltipStat}>
                            <span>⚔️</span>
                            <span>{tooltipData.atkPts}</span>
                        </div>
                        <div className={styles.tooltipStat}>
                            <span>🛡️</span>
                            <span>{tooltipData.defPts}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

CardSlots.propTypes = {
    title: PropTypes.string.isRequired,
    cards: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        imageUrl: PropTypes.string.isRequired,
        cardType: PropTypes.string,
        cardName: PropTypes.string,
        position: PropTypes.oneOf(['attack', 'defense']).isRequired,
        hp: PropTypes.number,
    })).isRequired,
    selectedCard: PropTypes.shape({
        card: PropTypes.object,
        index: PropTypes.number,
    }),
    onSlotClick: PropTypes.func,
    isOpponent: PropTypes.bool.isRequired,
    isPlayer: PropTypes.bool.isRequired,
    gameStage: PropTypes.string.isRequired,
    backCardImage: PropTypes.string.isRequired,
};

export default CardSlots;
