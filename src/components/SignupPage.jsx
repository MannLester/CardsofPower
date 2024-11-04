import React, { useState } from 'react';
import { firestore } from './firebaseConfig'; // Import Firestore
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    username: ''
    //include more
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Check if the username already exists
      const q = query(collection(firestore, 'users'), where('username', '==', formData.username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Add the new user to Firestore if the username does not exist
        await addDoc(collection(firestore, 'users'), formData);
        navigate(`/home`); // Redirect after successful signup
      } else {
        setError('Username already exists. Please choose another.');
      }
    } catch (error) {
      console.error("Error signing up:", error);
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <div style={styles.container}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div style={styles.inputContainer}>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>
        <div style={styles.inputContainer}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" style={styles.button}>Sign Up</button>
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
    border: '1px solid #ccc'
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

export default SignupPage;
