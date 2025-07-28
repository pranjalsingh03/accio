import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";


export async function POST(request) {
    dotenv.config();
    const { email, password } = await request.json();
    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        return NextResponse.json({ message: "Invalid password" }, { status: 401 });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    return NextResponse.json({ token });
}