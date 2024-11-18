import React from 'react';
import styles from './GameOverlay.module.css';

function GameOverlay({ isWinner }) {
    return (
        <div className={`${styles.overlay} ${isWinner ? styles.winner : styles.loser}`}>
            <div className={styles.content}>
                <h1>{isWinner ? 'YOU WIN!' : 'YOU LOST!'}</h1>
                <p>Game will end in a few seconds...</p>
            </div>
        </div>
    );
}

export default GameOverlay;
