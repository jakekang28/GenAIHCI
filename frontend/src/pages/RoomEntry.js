import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import { Users, Plus, LogIn, User, Hash } from 'lucide-react';
import config from '../config/config.js';
import HelpButton from '../components/shared/HelpButton';

const API_BASE = config.BACKEND_URL;

export default function RoomEntry() {
  const navigate = useNavigate();

  // NEW: 게스트 정보 (localStorage 재사용)
  const [guestName, setGuestName] = useState(localStorage.getItem('guestName') || '');
  const [guestUserId, setGuestUserId] = useState(localStorage.getItem('guestUserId') || '');

  // Add this useEffect to monitor changes
  useEffect(() => {
    console.log('guestUserId state changed to:', guestUserId);
  }, [guestUserId]);

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [sessionKey, setSessionKey] = useState('');
  const [error, setError] = useState(null);

  const persistGuest = (id, name) => {
    // Store in separate keys (legacy format)
    localStorage.setItem('guestUserId', id);
    localStorage.setItem('guestName', name);
    
    // Store in unified JSON format in both sessionStorage (primary) and localStorage (backup)
    const guestData = { guestUserId: id, guestName: name };
    const jsonData = JSON.stringify(guestData);
    sessionStorage.setItem('guestUser', jsonData);
    localStorage.setItem('guestUser', jsonData);
  };

  const goToRoom = (id) => {
    localStorage.setItem('sessionId', id);
    navigate(`/room/${id}`);
  };

  const createRoom = async () => {
    try {
      setError(null);
      setCreating(true);

      // Check if name is provided
      const name = guestName.trim();
      if (!name) throw new Error('Please enter your name.');
      
      console.log('Before API call - guestUserId:', guestUserId); // Debug log
      
      // Create guest user in database first
      const guestUser = await apiService.createGuestUser(name);
      
      console.log('API response - guestUser:', guestUser); // Debug log
      
      // Update the guestUserId with the one from database
      setGuestUserId(guestUser.guestUserId);
      persistGuest(guestUser.guestUserId, guestUser.guestName);
      
      console.log('After setState - new guestUserId:', guestUser.guestUserId); // Debug log

      // Use new room creation endpoint
      const res = await fetch(`${API_BASE}/sessions/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostUserId: guestUser.guestUserId,
          roomName: `${guestUser.guestName}'s Room`
        }),
      });

      if (!res.ok) throw new Error('Room creation failed');
      const data = await res.json();
      if (!data?.sessionId || !data?.roomCode) throw new Error('No session ID or room code');

      // Store room code for sharing
      localStorage.setItem('roomCode', data.roomCode);
      console.log('Room created with code:', data.roomCode);

      goToRoom(data.sessionId);
    } catch (e) {
      setError(e.message || 'Error.');
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async () => {
    try {
      setError(null);
      setJoining(true);

      const roomCode = sessionKey.trim();
      if (!roomCode) throw new Error('Please enter the valid room code.');

      // Check if name is provided
      const name = guestName.trim();
      if (!name) throw new Error('Please enter your name.');
      
      // Create guest user in database first
      const guestUser = await apiService.createGuestUser(name);
      
      // Update the guestUserId with the one from database
      setGuestUserId(guestUser.guestUserId);
      persistGuest(guestUser.guestUserId, guestUser.guestName);

      // Use new room joining endpoint
      const res = await fetch(`${API_BASE}/sessions/join-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomCode: roomCode, 
          userId: guestUser.guestUserId,
          displayName: guestUser.guestName
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to join room. Please check the room code.');
      }

      const roomData = await res.json();
      if (!roomData?.id) {
        throw new Error('Invalid room data received.');
      }

      console.log('Successfully joined room:', roomData.code);
      
      // Store room code for display (same as when creating a room)
      localStorage.setItem('roomCode', roomData.code);
      console.log('Stored room code in localStorage:', roomData.code);
      
      goToRoom(roomData.id);
    } catch (e) {
      setError(e.message || 'Error.');
    } finally {
      setJoining(false);
    }
  };

  const helpContent = (
    <div>
      <h3 className="text-lg font-semibold mb-4">Room Creation - Step 1</h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-800 mb-2">For Group Leaders:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Enter your name in the "Your Name" field</li>
            <li>Click "Create New Room" to start a session</li>
            <li>Share the generated room code (e.g., "ABC123") with your team members</li>
          </ol>
        </div>
        <div>
          <h4 className="font-medium text-gray-800 mb-2">For Participants:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Enter your name in the "Your Name" field</li>
            <li>Enter the room code shared by your group leader</li>
            <li>Click "Join Room" to enter the session</li>
          </ol>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
      <HelpButton content={helpContent} title="Room Creation Help" />
      <div className="max-w-6xl mx-auto w-full">
        <div className="text-center mb-12 fade-in">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Room Management</h1>
          <p className="text-xl text-gray-600">
            Create a new room or join an existing one using the shared room code
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-red-600 text-sm">!</span>
            </div>
            {error}
          </div>
        )}

        {/* Guest Information Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Your Information</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <div className="h-12 px-4 bg-gray-50 border border-gray-300 rounded-lg flex items-center text-gray-600">
                {guestUserId ? (
                  <div className="flex items-center">
                    <Hash className="w-4 h-4 mr-2" />
                    {guestUserId}
                  </div>
                ) : (
                  <span className="text-gray-500">ID will be generated automatically</span>
                )}
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-500">
            * Your name is required to create or join a room. A unique ID will be generated automatically.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Create Room Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mr-4">
                <Plus className="w-6 h-6 text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Create Room</h2>
            </div>
            
            <p className="text-gray-600 mb-6 leading-relaxed flex-grow">
              Start a new collaborative session. You'll receive a room code to share with your group members.
            </p>
            
            <button
              onClick={createRoom}
              disabled={creating}
              className="w-full bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-teal-700 transition-all duration-200 flex items-center justify-center hover:transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none mt-auto"
            >
              {creating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Room
                </>
              )}
            </button>
          </div>

          {/* Join Room Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <LogIn className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Join Room</h2>
            </div>
            
            <p className="text-gray-600 mb-6 leading-relaxed flex-grow">
              Enter the room code shared by the host to join an existing collaborative session.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
              <input
                type="text"
                value={sessionKey}
                onChange={(e) => setSessionKey(e.target.value)}
                placeholder="e.g., ABC123"
                className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <button
              onClick={joinRoom}
              disabled={joining}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-all duration-200 flex items-center justify-center hover:transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none mt-auto"
            >
              {joining ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Joining...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Join Room
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}