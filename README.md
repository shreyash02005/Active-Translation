# Real-Time Language Translator 🇮🇳

A production-ready, real-time language translator web application supporting major Indian languages. Powered by Google Gemini 1.5 Flash (via `gemini-3-flash-preview`).

## Project Overview
This application provides a seamless translation experience with live speech-to-text, real-time streaming translation as you type, and text-to-speech playback. It is designed with a modern, responsive UI inspired by the Indian flag colors.

## Features
- **Real-Time Streaming**: Translation appears word-by-word as Gemini generates it.
- **Speech Input**: Live transcription using the Web Speech API.
- **Text-to-Speech**: Audio playback of translations in the target language.
- **Language Support**: English, Hindi, Tamil, Marathi, Telugu, and Kannada.
- **Responsive Design**: Fully optimized for mobile and desktop.
- **Security**: API keys are handled server-side; rate limiting is implemented to prevent abuse.

## Tech Stack
- **Frontend**: HTML5, CSS3, Bootstrap 5, Vanilla JavaScript, Web Speech API.
- **Backend**: Node.js, Express, @google/genai SDK.
- **AI Model**: Gemini 1.5 Flash (`gemini-3-flash-preview`).

## How to Run Locally

1. **Clone the repository** (or download the files).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up environment variables**:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3000
   ```
4. **Start the server**:
   ```bash
   npm run dev
   ```
5. **Open in browser**:
   Navigate to `http://localhost:3000`.

## How to Deploy to Railway

1. **Create a new project** on Railway.
2. **Connect your GitHub repository**.
3. **Add Environment Variables**:
   In the Railway dashboard, go to "Variables" and add `GEMINI_API_KEY`.
4. **Deploy**: Railway will automatically detect the `Procfile` and `package.json` to start the app.

## How to Get a Gemini API Key
1. Visit the [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click on "Get API key" in the sidebar.
4. Create a new API key in a new project.

## Environment Variables
| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API Key |
| `PORT` | The port the server will run on (default: 3000) |

## Browser Compatibility
- **Speech Recognition**: Best supported in Google Chrome and Microsoft Edge.
- **Text-to-Speech**: Supported in most modern browsers.
- **Kannada TTS**: Some browsers (like Safari) may not have native Kannada voices. Chrome is recommended for the best experience.
