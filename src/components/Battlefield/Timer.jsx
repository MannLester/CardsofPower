// Timer.jsx
import React from 'react';
import styles from './Timer.module.css'; // CSS Module

/**
 * Timer Component
 * Displays the game timer and current stage.
 */
function Timer({ gameStage, timer, currentRound, totalRounds, activePlayer }) {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    let stageText = '';
    switch (gameStage) {
        case 'waiting':
            stageText = 'Waiting for Opponent...';
            break;
        case 'preparation':
            stageText = 'Preparation Stage';
            break;
        case 'battle':
            stageText = `Turn: ${activePlayer}`;
            break;
        case 'finished':
            stageText = 'Battle Finished';
            break;
        default:
            stageText = '';
    }

    return (
        <div className={styles.timer}>
            <p>{stageText}</p>
            {(gameStage === 'preparation' || gameStage === 'battle') && (
                <p>Time Remaining: {formatTime(timer)}</p>
            )}
            {gameStage === 'battle' && (
                <p>Round {currentRound} of {totalRounds}</p>
            )}
        </div>
    );
}

export default Timer;
