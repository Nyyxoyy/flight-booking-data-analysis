import React from 'react';
import ChatInterface from './components/ChatInterface';
import ThemeToggle from './components/ThemeToggle';
import './styles.css';

function App() {
  return (
    <div className="app">
      <ThemeToggle />
      <header>
        <h1>Flight Booking Data Analysis</h1>
        <p>Ask natural language questions about flight bookings</p>
      </header>
      <main>
        <ChatInterface />
      </main>
      <footer>
        <p>© {new Date().getFullYear()} Flight Data Explorer</p>
      </footer>
    </div>
  );
}

export default App;
