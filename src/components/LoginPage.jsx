import React, { useState } from 'react';
import { firestore } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

function LoginPage() {
  const [currentSection, setCurrentSection] = useState('log in');

  const handleSectionChange = (section) => {
    setCurrentSection(section);
  };

  return (
    <main>
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

      if(!querySnapshot.empty){
        navigate('/home');
      }else{
        setError('Invalid username or password. Please try again.')
      }
    } catch (err){
      console.error("Login error:", err);
      setError('An error occured. Please try again later');
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
  )
}

function SignupForm({ onSwitch }) {
  return (
    <>
      <form>
        <div className="flex flex-wrap gap-1">
          <input className="flex-1 min-w-[calc(50%-8px)]" type="text" placeholder="Username" required />
          <input className="flex-1 min-w-[calc(50%-8px)]" type="email" placeholder="Email" required />
        </div>  

        <div className="flex flex-wrap gap-1">
          <input className="flex-1 min-w-[calc(50%-8px)]" type="password" placeholder="Password" required />
          <input className="flex-1 min-w-[calc(50%-8px)]" type="password" placeholder="Confirm Password" required />
        </div>  

        <button type='submit'>Sign up</button>
      </form>

      <p>Already have an account? <a onClick={() => onSwitch('log in')}>Log in</a></p>
    </>
  );
}

export default LoginPage;