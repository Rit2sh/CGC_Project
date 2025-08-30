CGCian-GPT: AI-Powered Employee Helpdesk (React Version)
CGCian-GPT is a modern, AI-powered chatbot designed to serve as a first line of IT support for employees. It leverages Google's Gemini API to provide instant answers from a knowledge base and intelligently create detailed IT tickets when human intervention is required. This prototype was built for a hackathon to showcase a solution for process automation and employee experience enhancement.

✨ Features
Conversational AI: Natural language understanding to answer a wide range of IT questions.

Knowledge Base Integration: Instantly provides solutions for common issues based on a pre-defined knowledge base.

Intelligent Ticket Creation: Guides users through a multi-step process to gather necessary details (summary, category, urgency) for a perfect IT ticket.

Advanced UI/UX:

Light & Dark Mode: Toggle between themes for user comfort.

Persistent Chat History: Conversations are saved to local storage, so you never lose your place.

Markdown & Code Formatting: Renders AI responses with rich text and provides a copy button for code snippets.

Typing Indicators & Timestamps: A polished and intuitive chat experience.

Responsive Design: Fully usable on desktop and mobile devices.

🛠️ Tech Stack
Frontend: React (with Hooks)

Styling: Tailwind CSS

AI Model: Google Gemini API

Build Tool: Vite

Package Manager: NPM

Version Control: Git

🚀 Getting Started
Follow these instructions to set up and run the project on your local machine for development and testing purposes.

Prerequisites
You must have Node.js (which includes npm) installed on your computer. Version 18.x or higher is recommended.

You can verify your installation by running:

node -v
npm -v

1. Clone the Repository
First, clone this repository to your local machine.

git clone [https://github.com/your-username/cgciangpt-helpdesk.git](https://github.com/your-username/cgciangpt-helpdesk.git)
cd cgciangpt-helpdesk

2. Install Dependencies
Install all the necessary project dependencies using npm.

npm install

3. Configure Your API Key
The application requires a Google Gemini API key to function.

Get your key: Visit Google AI Studio to create your free API key.

Add the key to the project:

Open the src/App.jsx file.

Find the line: const GEMINI_API_KEY = "PASTE_YOUR_GOOGLE_AI_API_KEY_HERE";

Replace the placeholder text with your actual API key, keeping the quotation marks.

// Example:
const GEMINI_API_KEY = "AIzaSy...your...long...api...key...here...";

4. Run the Development Server
You are now ready to run the application!

npm run dev

This command will start the Vite development server. Open your web browser and navigate to the local URL provided in the terminal (usually http://localhost:5173/).

📂 Project Structure
cgc_project/
├── node_modules/       # Project dependencies
├── public/             # Static assets
├── src/
│   ├── assets/         # Images, fonts, etc.
│   ├── App.jsx         # The main React component containing all logic and UI
│   ├── index.css       # Main stylesheet with Tailwind directives
│   └── main.jsx        # The entry point of the React application
├── .eslintrc.cjs       # ESLint configuration
├── .gitignore          # Files to be ignored by Git
├── index.html          # The main HTML template
├── package.json        # Project metadata and dependencies
├── postcss.config.js   # PostCSS configuration for Tailwind
├── README.md           # You are here!
└── tailwind.config.js  # Tailwind CSS configuration
