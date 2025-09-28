import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Components
import Sidebar from '../../components/Layout/Sidebar';
import Header from '../../components/Layout/Header';

// Dashboard Pages
import Overview from './Overview';
import Companies from './Companies';
import Investments from './Investments';
import Portfolio from './Portfolio';
import Profile from './Profile';

const Dashboard = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            <Routes>
              <Route index element={<Overview />} />
              <Route path="companies" element={<Companies />} />
              <Route path="investments" element={<Investments />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="profile" element={<Profile />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;