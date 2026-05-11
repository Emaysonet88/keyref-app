import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import KeyRefPro from './KeyRefProWIP';
import Settings from './Settings';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<KeyRefPro />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
