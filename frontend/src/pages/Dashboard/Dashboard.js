import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Dashboard Pages
import Overview from './Overview';
import Companies from './Companies';
import Investments from './Investments';
import Portfolio from './Portfolio';
import Profile from './Profile';

const Dashboard = () => {
  return (
    <div className="container mx-auto px-6 py-8">
            <Routes>
              <Route index element={<Overview />} />
              <Route path="companies" element={<Companies />} />
              <Route path="investments" element={<Investments />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="profile" element={<Profile />} />
            </Routes>
    </div>
  );
};

export default Dashboard;