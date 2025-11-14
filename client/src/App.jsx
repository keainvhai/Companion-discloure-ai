import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatPage from "./ChatPage";
import UsernamePage from "./UsernamePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 默认主页：Chat 页面 */}
        <Route path="/" element={<UsernamePage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
