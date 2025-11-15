import { BrowserRouter, Routes, Route } from "react-router-dom";
import CompassionChatPage from "./CompanionChatPage";
import UsernamePage from "./UsernamePage";
import NeutralChatPage from "./NeutralChatPage";
import NonCompanionChatPage from "./NonCompanionChatPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 默认主页：Chat 页面 */}
        <Route path="/" element={<UsernamePage />} />
        <Route path="/chatA" element={<CompassionChatPage />} />
        <Route path="/chatB" element={<NeutralChatPage />} />
        <Route path="/chatC" element={<NonCompanionChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
