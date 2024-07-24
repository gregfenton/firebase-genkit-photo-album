These are the rough notes I made to guide the presentation of this demo. They are not meant to be read as a standalone document, but rather as a reference for the author.

#MindMapExport FreeplaneVersion:

# Demo Steps

1. Using Firebase Console, add a new Firebase project
   1. initialize Authentication & enable Google provider
   2. initialize Firestore
   3. initialize Storage
   4. create a "web app"
2. create NextJS app
   1. `mkdir gdg-firebase-genkit-talk`
   2. `cd gdg-firebase-genkit-talk`
   3. `npm init @apphosting`
      1. directory: web-app
      2. NextJS
   4. create github repo
      1. use VSCode
      2. set name
      3. create a public repo
   5. create App Hosting backend
      1. `firebase apphosting:backends:create --project genkit-test-8b8aa --location us-central1`
         1. this will install the Firebase app to your GH account
            1. GH Profile >> Settings >> Applications >> Firebase App Hosting
         2. if already installed, you can simply add the new repo to expose to the Firebase command
         3. default root directory (/)
         4. default branch (main)
         5. default name (my-web-app)
         6. leave it to install
      2. run locally
         1. `npm run dev`
            1. vanilla app
      3. delete `src` folder
      4. extract ZIP file to `web-app` dir
      5. contains tailswind.config.ts, package.json & src
      6. `cd web-app`
      7. `tar xzvf ~/Downloads/gdg-web-app-20240720.tgz`
      8. `npm i`
      9. copy Firebase Config
      10. `npm run dev`
          1. show off the app
             1. upload some photos
             2. show Firestore & Storage
             3. create an album
             4. show Firestore
      11. commit & push
          1. Firebase will auto-deploy
3. Genkit get-started
   1. `npm i -g genkit`
   2. `mkdir gdg-firebase-genkit-talk`
   3. `cd gdg-firebase-genkit-talk`
   4. `npm init -y`
   5. `genkit init`
      1. Firebase
      2. Google AI
      3. update package.json?
         1. Y
      4. generate sample flow?
         1. Y
   6. generate API key using Google AI Studio
   7. `export GOOGLE_GENAI_API_KEY="<THE_KEY_VALUE_FROM_GOOGLE_AI_STUDIO>"`
   8. `genkit start`
      1. open http://localhost:4000/
      2. click menuSuggestionFlow
      3. click Input JSON
         1. type name of a theme
            1. "Pi"
         2. click Run
         3. see error
      4. click Auth JSON
         1. set to
            1. {"uid": "123"}
      5. click Run
         1. read response
      6. click Inspect
         1. see traces
      7. create a new function named `generateAlbumDescription`

         1. want inputSchema to reflect what we have in Firestore
         2. paste following code for the function

         ```ts
         {
           name: 'generateAlbumDescription',
           inputSchema: z.object({
             photoUrls: z.array(
               z.object({ src: z.string(), contentType: z.string().optional() })
             ),
             voice: z.string().optional(),
           }),
           outputSchema: z.string(),
           authPolicy: firebaseAuth((user) => {})
         },
         async (subject) => {
           let promptText =
             'Write a description of the album comprised of the these photos';

           if (subject.voice) {
             promptText += ` in the voice of ${subject.voice}`;
           }

           const thePrompt = [
             {
               text: promptText,
             },
           ] as Part[];

           subject.photoUrls.forEach((u) => {
             thePrompt.push({
               media: {
                 url: u.src,
                 contentType: u.contentType,
               },
             });
           });

           const response = await generate({
             model: gemini15Pro,
             config: {
               temperature: 0.7, // Adjust temperature for creativity
             },
             prompt: thePrompt,
           });

           return response.text();
         }
         ```

         3. data for testing with

         ```json
         {
           "photoUrls": [
             {
               "src": "https://firebasestorage.googleapis.com/v0/b/genkit-test-8b8aa.appspot.com/o/photos%2Ftest1%2F20070807_1500_B086.jpg?alt=media&token=0535cffe-5d53-44a6-864a-cf48af5a61ce",
               "contentType": "image/jpeg"
             },
             {
               "src": "https://firebasestorage.googleapis.com/v0/b/genkit-test-8b8aa.appspot.com/o/photos%2Ftest1%2F20080715_1300_B166.jpg?alt=media&token=deccf19c-4f53-4545-b8a9-257987ce1098",
               "contentType": "image/jpeg"
             },
             {
               "src": "https://firebasestorage.googleapis.com/v0/b/genkit-test-8b8aa.appspot.com/o/photos%2Ftest1%2F20180622_164436.jpg?alt=media&token=88ae4505-a99d-4a09-98a4-38c81d353863",
               "contentType": "image/jpeg"
             },
             {
               "src": "https://firebasestorage.googleapis.com/v0/b/genkit-test-8b8aa.appspot.com/o/photos%2Ftest1%2F20190307_132920.jpg?alt=media&token=d8e1f2b1-ea77-445c-b5a2-876c2e666543",
               "contentType": "image/jpeg"
             }
           ]
         }
         ```
4. firebase init
   1. Functions
   2. edit functions/index.ts
   3. put code from `generateAlbumDescription` into `onDocumentWrite()`

      ```ts
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
      ```

   4. edit `tsconfig.json` and add:
      1. `"esModuleInterop": true`
   5. `firebase deploy --only functions`
      1. will be prompted for the AI key
