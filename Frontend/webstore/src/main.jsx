import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { brand, applyBrand } from './brand';
import '@shared/theme.css';
import '@shared/base.css';
import './styles.css';

applyBrand(brand);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
