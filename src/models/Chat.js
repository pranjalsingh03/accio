import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  user: { type: String, required: true },
  title: { type: String},
  messages: [{
    user: String,
    content: String,
    createdAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema); 