import { GoogleGenAI } from '@google/genai';

async function run() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const modelStr = process.argv[2] || 'gemini-2.0-flash-exp';
    const modalities = process.argv[3] ? process.argv[3].split(',') : ['AUDIO', 'TEXT'];

    console.log(`Connecting to ${modelStr} with modalities ${modalities}...`);
    try {
        const session = await ai.live.connect({
            model: modelStr,
            config: {
                responseModalities: modalities,
                systemInstruction: { parts: [{ text: "Hello" }] },
            },
        });

        console.log("SUCCESSFULLY CONNECTED!");
        // wait a bit
        await new Promise(r => setTimeout(r, 2000));
        session.close();
    } catch (err) {
        console.error("FAILED TO CONNECT:");
        console.error(err);
    }
}
run();
