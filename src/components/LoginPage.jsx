/* eslint-disable react/prop-types */
/* eslint-disable react/no-unescaped-entities */
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line react/prop-types, no-unused-vars
import React, { useState } from 'react';
import { firestore } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import loginBackground from '../assets/backgrounds/login.jpg';
import './LoginPage.css';

function LoginPage() {
  const [currentSection, setCurrentSection] = useState('log in');

  const handleSectionChange = (section) => {
    setCurrentSection(section);
  };

  return (
    <main style={{ backgroundImage: `url(${loginBackground})` }}>
      <section className='pirata-font sm:p-2 lg:p-6'>
        <h1 className='sm:text-4xl lg:text-5xl text-amber-950 uppercase'>{ currentSection }</h1>

        {currentSection === 'log in' && <LoginForm onSwitch={handleSectionChange} />}
        {currentSection === 'sign up' && <SignupForm onSwitch={handleSectionChange} />}
        {currentSection === 'reset password' && <ForgotPasswordForm onSwitch={handleSectionChange} />}
      </section>
    </main>
  );
}

function LoginForm({ onSwitch }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const q = query(
        collection(firestore, 'users'),
        where('username', '==', username),
        where('password', '==', password)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userDocId = userDoc.id; // Get the user's document ID

        // Navigate to home with the document ID in the URL
        navigate(`/${userDocId}/home`);
        // navigate(`/home`);
      } else {
        setError('Invalid username or password. Please try again.');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <>
      <form onSubmit={handleLogin}>
        <input
          type='text'
          placeholder='Username'
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type='password'
          placeholder='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <a className='mb-2 text-end no-underline' onClick={() => onSwitch('reset password')}>Forgot Password?</a>

        {error && <p className="error" style={{ color: 'red' }}>{error}</p>}
        <button type='submit'>Log in</button>
      </form>
      <p>Don't have an account yet? <a onClick={() => onSwitch('sign up')}> Sign up</a></p>
    </>
  );
}

function ForgotPasswordForm({ onSwitch }) {
  return (
    <>
      <form>
        <input type='email' placeholder='Email' required />

        <button type='submit'>Send</button>
      </form>

      <p>Don't have an account yet? <a onClick={() => onSwitch('sign up')}>Sign up</a></p>
    </>
  );
}

function SignupForm({ onSwitch }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      // Check for existing username
      const usernameQuery = query(collection(firestore, 'users'), where('username', '==', username));
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        setError('Username already exists');
        return;
      }

      // Check for existing email
      const emailQuery = query(collection(firestore, 'users'), where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        setError('Email already exists');
        return;
      }

      // Create new user if no duplicates found
      const newUser = {
        username,
        email,
        password,
        dateCreated: Timestamp.now(),
        friends: [],
        gamesPlayed: 0,
        gamesLost: 0,
        gamesWon: 0,
        goldCount: 300,
        inventory: [], // This will be updated with card IDs
        currentCardCount: 0, // This will be set to 10 after assigning cards
        highestCardCount: 0,
        cardsBought: 0,
        cardsSold: 0,
        cardsTraded: 0,
        cardsCreated: 0,
      };

      const userDocRef = await addDoc(collection(firestore, 'users'), newUser);

      // Fetch and assign 10 random cards (6 monster, 2 spell, 2 trap) from "cards" collection
      const cardIds = []; // Array to store chosen card IDs for user's inventory

      const assignCards = async (cardType, count) => {
        const cardQuery = query(
          collection(firestore, 'cards'),
          where('cardType', '==', cardType),
          where('isOwned', '==', false)
        );

        const cardSnapshot = await getDocs(cardQuery);
        const availableCards = cardSnapshot.docs.slice(0, count); // Get the first 'count' cards

        const updateCardPromises = availableCards.map((cardDoc) => {
          cardIds.push(cardDoc.id); // Add card ID to array for user's inventory

          return updateDoc(doc(firestore, 'cards', cardDoc.id), {
            isOwned: true,
            currentOwnerId: userDocRef.id,
            currentOwnerUsername: username,
          });
        });

        await Promise.all(updateCardPromises);
      };

      // Assign cards by type
      await assignCards('monster', 6);
      await assignCards('spell', 2);
      await assignCards('trap', 2);

      // Update user with inventory and card count
      await updateDoc(userDocRef, {
        inventory: cardIds,
        currentCardCount: 10,
      });

      navigate('/');
    } catch (err) {
      console.error("Signup error:", err);
      setError('An error occurred during Signup. Please try again later.');
    }
  };

  return (
    <>
      <form onSubmit={handleSignup}>
        <div className="flex flex-wrap gap-1">
          <input
            className="flex-1 min-w-[calc(50%-8px)]"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="flex-1 min-w-[calc(50%-8px)]"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <input
            className="flex-1 min-w-[calc(50%-8px)]"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            className="flex-1 min-w-[calc(50%-8px)]"
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          /> 
        </div>

        {error && <p className="error" style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Sign up</button>
      </form>

      <p>Already have an account? <a onClick={() => onSwitch('log in')}>Log in</a></p>
    </>
  );
}

export default LoginPage;
