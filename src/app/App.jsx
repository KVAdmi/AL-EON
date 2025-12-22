
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import ChatPage from '@/features/chat/pages/ChatPage'; // Import ChatPage

function App() {
    return (
        <Routes>
            <Route path="/" element={<ChatPage />} />
            {/* Add other routes here if needed */}
        </Routes>
    );
}

export default App;
