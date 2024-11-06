import React from 'react';
import { useUser } from './UserContext';

const User = () => {
  const { user } = useUser();

  // Loading state in case user data is not yet available
  if (!user) {
    return <p>Loading user data...</p>;
  }

  // Destructuring to simplify rendering
  const {
    username,
    email,
    currentCardCount,
    dateCreated,
    gamesPlayed,
    gamesWon,
    gamesLost,
    goldCount,
    highestCardCount,
    friends = [],
    inventory = []
  } = user;

  // Safely handle the dateCreated field
  const formattedDate = dateCreated ? dateCreated.toDate().toLocaleString() : 'Unknown';

  return (
    <div>
      <h2>User Profile</h2>
      <p>Username: {username || 'N/A'}</p>
      <p>Email: {email || 'N/A'}</p>
      <p>Current Card Count: {currentCardCount || '0'}</p>
      <p>Date Created: {formattedDate}</p>
      <p>Games Played: {gamesPlayed || '0'}</p>
      <p>Games Won: {gamesWon || '0'}</p>
      <p>Games Lost: {gamesLost || '0'}</p>
      <p>Gold Count: {goldCount || '0'}</p>
      <p>Highest Card Count: {highestCardCount || '0'}</p>
      <p>Friends: {friends.length ? friends.join(', ') : 'No friends'}</p>
      <p>Inventory: {inventory.length ? inventory.join(', ') : 'No items in inventory'}</p>
    </div>
  );
};

export default User;
