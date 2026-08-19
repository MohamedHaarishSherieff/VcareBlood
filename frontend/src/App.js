import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import DonorRegistration from './components/DonorRegistration';
import SearchDonors from './components/SearchDonors';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<DonorRegistration />} />
          <Route path="/search" element={<SearchDonors />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;