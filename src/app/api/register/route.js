import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";


export async function POST(request) {
  const { email, password } = await request.json();
  await connectDB();
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json({ message: "User already exists" }, { status: 400 });
  }
  const user = new User({ email, password });
  await user.save();
  return NextResponse.json({ message: "User registered successfully" });
} 