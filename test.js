const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

async function run() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    try {
        console.log("Connecting...");
        const session = await ai.live.connect({
            model: 'gemini-2.0-flash-exp'
        });

        console.log("Connected! Keys:", Object.keys(session));
        if (typeof session.send === 'function') console.log("Has send()");
        else if (typeof session.sendRealtimeInput === 'function') console.log("Has sendRealtimeInput()");

        // session.close();
        process.exit(0);
    } catch (err) {
        console.error("error!", err);
        process.exit(1);
    }
}
run();
