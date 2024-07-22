import { generate } from '@genkit-ai/ai';
import { Part } from '@genkit-ai/ai/retriever';
import { configureGenkit } from '@genkit-ai/core';
import { firebase } from '@genkit-ai/firebase';
import { gemini15Pro, googleAI } from '@genkit-ai/googleai';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

const genAiApiKey = defineSecret('GOOGLE_GENAI_API_KEY');

export const generateAlbumDescription = onDocumentWritten(
  {
    document: `albums/{albumId}`,
    secrets: [genAiApiKey],
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    const subject = event.data?.after.data();

    // LOOPING GUARD
    if (!subject || subject?.status) {
      return; // we already processed this album
    }
  
    console.log('genAiApiKey value:', genAiApiKey?.value());
    configureGenkit({
      plugins: [firebase(), googleAI({ apiKey: genAiApiKey.value() })],
      logLevel: 'debug',
      enableTracingAndMetrics: true,
    });

    let promptText =
      'Write a description of the album comprised of the these photos';

    if (subject?.voice) {
      promptText += ` in the voice of ${subject.voice}`;
    }

    const thePrompt = [
      {
        text: promptText,
      },
    ] as Part[];

    subject?.photos.forEach((u: any) => {
      thePrompt.push({
        media: {
          url: u?.src || '',
          contentType: u?.contentType || 'image/jpeg',
        },
      });
    });

    try {
      const response = await generate({
        model: gemini15Pro,
        config: {
          temperature: 0.7, // Adjust temperature for creativity
        },
        prompt: thePrompt,
      });

      return event.data?.after.ref.set(
        {
          description: response.text(),
          status: {
            generated: true,
            error: false,
            message: 'Album description generated successfully',
            generatedAt: new Date(),
          },
        },
        { merge: true }
      );
    } catch (err) {
      console.error(`Error generating album description:`, err);
      return await event.data?.after.ref.set(
        {
          status: {
            generated: false,
            error: true,
            message: 'Error generating album description: ' + err,
            generatedAt: new Date(),
          },
        },
        { merge: true }
      );
    }
  }
);
