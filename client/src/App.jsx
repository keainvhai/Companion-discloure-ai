import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatPage from "./ChatPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 默认主页：Chat 页面 */}
        <Route path="/" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
