import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import KeyRefPro from './KeyRefProWIP';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<KeyRefPro />} />
      </Routes>
    </Router>
  );
}

export default App;
