import React, { useState } from 'react';
import { firestore } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Create a query to find the username in Firestore
      const q = query(collection(firestore, 'users'), where('username', '==', username)); // Change 'users' to your collection name

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Username exists, navigate to the home page or another page
        navigate(`/home`);
      } else {
        // Username does not exist
        setError('Username does not exist. Please try again.');
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <div style={styles.container}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={styles.inputContainer}>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={styles.input}
          />
        </div>
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" style={styles.button}>Login</button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    width: '300px',
    margin: 'auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    boxShadow: '2px 2px 12px #aaa'
  },
  inputContainer: {
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    color: 'black'
  },
  button: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    cursor: 'pointer'
  },
  error: {
    color: 'red',
    marginTop: '10px'
  }
};

export default LoginPage;
