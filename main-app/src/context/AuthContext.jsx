import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Detect tokens that were set by the old broken loginDirect (dummy_token_xxxx)
function isValidToken(token) {
  if (!token) return false;
  if (token.startsWith('dummy_token_')) return false;
  // JWTs are 3 base64url sections separated by dots
  return token.split('.').length === 3;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token   = localStorage.getItem('murato_token');
    const stored  = localStorage.getItem('murato_user');

    // If the stored token is a dummy (from the old broken flow), wipe the session
    if (!isValidToken(token)) {
      localStorage.removeItem('murato_token');
      localStorage.removeItem('murato_user');
      return null;
    }

    return stored ? JSON.parse(stored) : null;
  });

  // Set user after OTP login — preserves any real JWT already in localStorage
  const loginDirect = (userData) => {
    // If a real token is passed with userData, save it; otherwise keep existing token
    const token = userData.token || localStorage.getItem('murato_token');
    if (token && isValidToken(token)) {
      localStorage.setItem('murato_token', token);
    }

    // Don't store token inside the user object in localStorage
    const { token: _t, ...userToStore } = userData;
    localStorage.setItem('murato_user', JSON.stringify(userToStore));
    setUser(userToStore);
  };

  const updateUser = (updates) => {
    const { token, ...rest } = updates;
    if (token && isValidToken(token)) {
      localStorage.setItem('murato_token', token);
    }
    const merged = { ...user, ...rest };
    localStorage.setItem('murato_user', JSON.stringify(merged));
    setUser(merged);
  };

  const logout = () => {
    localStorage.removeItem('murato_token');
    localStorage.removeItem('murato_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginDirect, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
