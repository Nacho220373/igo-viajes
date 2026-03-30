import React from 'react';
import { Plane } from 'lucide-react';
import './Loader.css';

const Loader = ({ message = "Cargando..." }) => {
  return (
    <div className="airplane-loader-wrapper">
      <div className="airplane-loader-container">
        <Plane size={32} strokeWidth={2.5} className="airplane-icon" />
      </div>
      <div className="airplane-loader-message">{message}</div>
    </div>
  );
};

export default Loader;
