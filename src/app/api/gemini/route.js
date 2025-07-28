import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request) {
    try {
        const { prompt, images } = await request.json();
        
        // Prepare the request content
        const parts = [{ text: prompt }];
        
        // Add images if provided
        if (images && images.length > 0) {
            for (const image of images) {
                parts.push({
                    inline_data: {
                        mime_type: image.mimeType,
                        data: image.data
                    }
                });
            }
        }
        
        const requestBody = {
            contents: [{
                parts: parts
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        const res = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
            const errorData = await res.text();
            console.error("Gemini API error:", errorData);
            return NextResponse.json({ 
                error: `Gemini API error: ${res.status} ${res.statusText}` 
            }, { status: 500 });
        }

        const data = await res.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            return NextResponse.json({ 
                error: "No response generated from Gemini" 
            }, { status: 500 });
        }

        const candidate = data.candidates[0];
        
        if (candidate.finishReason === "SAFETY") {
            return NextResponse.json({ 
                error: "Content was blocked due to safety concerns" 
            }, { status: 400 });
        }

        const output = candidate.content?.parts?.[0]?.text || "No response from Gemini";
        
        return NextResponse.json({ output });
        
    } catch (error) {
        console.error("Gemini API route error:", error);
        return NextResponse.json({ 
            error: `Failed to process request: ${error.message}` 
        }, { status: 500 });
    }
}