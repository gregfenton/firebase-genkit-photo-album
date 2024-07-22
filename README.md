# NextJS photo gallery app with Firebase Genkit album description generator

This app leverages several Firebase technologies to create a photo gallery app with a Genkit album description generator.

The app is built with:
- NextJS
- Firebase Authentication for user login (uses Google Sign In)
- Firestore for storing user data
- Cloud Storage for storing images
- Cloud Functions for generating album descriptions
- Genkit API leveraging the Gemini 1.5 Pro model

## Features
- User authentication with Google Sign In
- Upload images in the Gallery
- Select images to create an Album
- Automatic generation of an Album's description from the selected images

## Setup
1. Clone the repository
2. Create a Firebase project and:
   1. enable Google Sign In in the Firebase Authentication settings
   2. create a Firestore database
   3. create a Cloud Storage bucket
   4. copy the Firebase configuration object from the Firebase project settings to your clipboard
3. For the web app, in the cloned repository:
   1. edit the file `nextjs-app/src/lib/firebase.config.js` and paste the Firebase configuration (step 1.4) into `firebaseConfig`
   2. `cd nextjs-app`
   3. `npm install`
   4. `npm run dev` to start the NextJS app running locally
4. Go to Google AI Studio (https://aistudio.google.com/app/apikey) and:
   1. create an account if you don't already have one
   2. generate a new API key
   3. copy the API key to your clipboard
5. For the Cloud Functions, in the cloned repository:
   1. `cd firebase/functions`
   2. `npm install`
   3. `cd ..`  to go back to the `firebase` directory
   4. `firebase deploy --only functions` to deploy the Cloud Functions
      1. during the deploy you will be prompted for the value of GOOGLE_GENAI_API_KEY; paste the API key from step 4.3

## Usage
1. Open the NextJS app running locally (http://localhost:3000)
2. Click the "Sign In With Google" button to log in using an existing Google account; this will create a new user in your Firebase project's Authentication user list
3. On the Gallery page, drag some images from your computer to the "Drag 'n' Drop" zone to upload them; alternatively, click the "Upload" button to select images from your computer
4. On the Gallery page, drag some images from your computer to the "Drag 'n' Drop" zone to upload them; alternatively, click the "Upload" button to open a file select dialog
5. Once the images display in the Gallery, you can select (click on) to highlight 1 to 4 images, then click the "Create My Album" button
6. On the Album page, you will see a list of the Albums you have created; approximately 30 seconds after you create the Album, the description will be generated and displayed

### Regenerate Album Description
If you want to regenerate the description for an Album, you can simply remove the `status` field from the Album document in Firestore. The Cloud Function will detect the missing field and regenerate the description.

### Bonus Feature(!!)
If you add a `voice` field as a string to the Album document in Firestore, the Cloud Function will generate the description in that "voice".  For example, set `voice` to the value of "Dr. Seuss" or "Dr. Evil from Austin Powers".  Remember to delete the `status` field to cause the description to be regenerated.
