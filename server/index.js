const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// 导入聊天路由
app.use("/neutral", require("./routes/neutral"));
// companion 路由
app.use("/companion", require("./routes/companion"));

// Non-compassion 路由
app.use("/noncompanion", require("./routes/noncompanion"));

app.use("/admin", require("./routes/admin"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
