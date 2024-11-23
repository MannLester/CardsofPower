import React from 'react';
import styles from './GameOverlay.module.css';

function GameOverlay({ isWinner, playerHP, opponentHP, playerName, opponentName }) {
    const isDraw = playerHP === opponentHP;

    return (
        <div className={`${styles.overlay} ${isDraw ? styles.draw : isWinner ? styles.winner : styles.loser}`}>
            <div className={styles.content}>
                <h1>{isDraw ? 'DRAW!' : isWinner ? 'YOU WIN!' : 'YOU LOST!'}</h1>
                <div className={styles.statsContainer}>
                    <div className={`${styles.playerStats} ${isWinner && !isDraw ? styles.winnerStats : ''}`}>
                        <h2>{playerName}</h2>
                        <div className={styles.hpBar}>
                            <div 
                                className={styles.hpFill} 
                                style={{ width: `${Math.max(playerHP, 0)}%` }}
                            />
                            <span>{Math.max(playerHP, 0)}%</span>
                        </div>
                    </div>
                    <div className={styles.vsContainer}>
                        <span>VS</span>
                    </div>
                    <div className={`${styles.playerStats} ${!isWinner && !isDraw ? styles.winnerStats : ''}`}>
                        <h2>{opponentName}</h2>
                        <div className={styles.hpBar}>
                            <div 
                                className={styles.hpFill} 
                                style={{ width: `${Math.max(opponentHP, 0)}%` }}
                            />
                            <span>{Math.max(opponentHP, 0)}%</span>
                        </div>
                    </div>
                </div>
                <p className={styles.endMessage}>Game will end in a few seconds...</p>
            </div>
        </div>
    );
}

export default GameOverlay;
