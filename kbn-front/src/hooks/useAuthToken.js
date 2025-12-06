// src/hooks/useAuthToken.js
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

const useAuthToken = () => {
    const { token } = useContext(AuthContext);
    return token;
};

export default useAuthToken;
