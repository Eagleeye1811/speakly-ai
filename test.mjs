import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    const genai = await import('@google/genai');
    const ai = new genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    try {
        const session = await ai.live.connect({ model: 'gemini-2.0-flash-exp' });

        // In @google/genai 1.x, session emits events with a `receive` function or similar?
        // Let's just catch server messages:
        session.receive(async (message) => {
            console.log("SERVER MESSAGE:", message);
        });

        session.sendRealtimeInput({
            mediaChunks: [{
                mimeType: "audio/pcm;rate=16000",
                data: "dummy"
            }]
        }); // Does it expect 'mediaChunks'? Yes, that's what genai sdk v1 usually uses

        console.log("SENT! Waiting...");
        setTimeout(() => { process.exit(0); }, 2000);
    } catch (err) {
        console.error("error!", err);
        process.exit(1);
    }
}
run();
