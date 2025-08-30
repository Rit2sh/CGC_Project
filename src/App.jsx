import React, { useState, useEffect, useRef } from 'react';

// --- Main Application Component ---
const App = () => {
    // --- State Management using React Hooks ---
    const [theme, setTheme] = useState('light'); // 'light' or 'dark'
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationState, setConversationState] = useState('IDLE');
    const [ticketDetails, setTicketDetails] = useState({});
    const [suggestedActions, setSuggestedActions] = useState([]);
    const chatContainerRef = useRef(null);

    // --- API Key Configuration ---
    // IMPORTANT: PASTE YOUR API KEY HERE.
    // Get your free key from Google AI Studio: https://aistudio.google.com/app/apikey
    const GEMINI_API_KEY = "AIzaSyDPyWOWkagmbhMn-uKOLOFMLfVcuKipoUc";

    // --- Data Source & AI Configuration (Constants) ---
    const KNOWLEDGE_BASE = `
    [
        {"id": "KB00123", "topic": "VPN Access", "category": "Connectivity", "solution": "To connect to the VPN, open the 'GlobalProtect' application and click 'Connect'. Use your standard company username and password. If you have issues, ensure you are on a stable internet connection."},
        {"id": "KB00456", "topic": "Password Reset", "category": "Account", "solution": "You can reset your password at password.cgcians.com. You will need to answer your security questions. If you are locked out, you must call the IT Helpdesk at x1234. You can also try this temporary password: \`TempPass123!\`"},
        {"id": "KB00789", "topic": "Printer Setup", "category": "Hardware", "solution": "To add a new printer, follow these steps:\\n1. Go to 'Settings' > 'Printers & Scanners'.\\n2. Click 'Add a printer or scanner'.\\n3. The system should automatically find network printers. Select the one for your floor (e.g., 'PRINTER_FLOOR_4')."},
        {"id": "KB01123", "topic": "Software Installation", "category": "Software", "solution": "Employees can install pre-approved software from the 'Software Center' application on their desktop. If you need software that isn't listed, you must create an IT ticket for approval."},
        {"id": "KB01456", "topic": "Guest Wi-Fi", "category": "Connectivity", "solution": "The guest Wi-Fi network is 'CGCian_Guest'. The password is 'Welcome2CGC!' and it changes on the first day of each month. The new password will be posted at the reception desk."}
    ]
    `;

    const SYSTEM_PROMPT = `You are 'CGCian-GPT', a world-class AI assistant for employees at CGCian. You are helpful, professional, and witty. Your goal is to resolve issues instantly or create detailed IT tickets.

    **Your Instructions:**

    1.  **Answer from Knowledge Base:** ALWAYS try to answer the user's question using the provided JSON knowledge base first. When you provide an answer from the knowledge base, you MUST cite the source ID at the end of your message in this exact format: \`Source: [id]\`. 
    
    2.  **Formatting:** Use Markdown for formatting. Use bold (\`**text**\`) for emphasis, and create lists with hyphens. For any code, passwords, or technical terms, enclose them in backticks like \`this\`.

    3.  **Identify Ticketing Needs:** If the knowledge base doesn't have an answer, or the problem requires human help (e.g., "my laptop is broken"), you must initiate the ticket creation process by responding with a message that includes the special command \`[INITIATE_TICKET]\`.

    4.  **Advanced Ticket Creation Flow:** Once initiated, guide the user through these steps: ask for a **summary**, then **category** ("Hardware", "Software", "Account", "Network"), then **urgency** ("Low", "Medium", "High"). After gathering all three, your final message MUST include the command \`[TICKET_CREATED]\`.

    5.  **Tone & Persona:** Be friendly and conversational. Use emojis where appropriate (e.g., 👍, 🚀). Start your very first message with a warm welcome.
    `;
    
    // --- Effect Hooks ---

    // Load theme and chat history from local storage on initial render
    useEffect(() => {
        const savedTheme = localStorage.getItem('chatTheme') || 'light';
        setTheme(savedTheme);
        const savedMessages = JSON.parse(localStorage.getItem('chatHistory'));
        if (savedMessages && savedMessages.length > 0) {
            setMessages(savedMessages);
        } else {
            initializeChat();
        }
    }, []);

    // Apply theme class to the body and save theme changes
    useEffect(() => {
        document.body.className = theme;
        localStorage.setItem('chatTheme', theme);
    }, [theme]);
    
    // Auto-scroll and save chat history when messages change
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
        // Don't save the initial welcome message to history until a user interacts
        if (messages.length > 1) {
            localStorage.setItem('chatHistory', JSON.stringify(messages));
        }
    }, [messages, isTyping]);


    // --- Core Functions ---
    const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));

    const initializeChat = () => {
        localStorage.removeItem('chatHistory');
        setMessages([{
            sender: 'bot',
            text: "Hello! I'm CGCian-GPT, your advanced AI helpdesk assistant. How can I assist you today? 🚀",
            timestamp: new Date()
        }]);
        setConversationState('IDLE');
        setTicketDetails({});
        setSuggestedActions(["VPN Access", "Password Reset", "Printer Setup", "My laptop is broken"]);
    };
    
    const handleSendMessage = async () => {
        const query = userInput.trim();
        if (!query) return;

        setMessages(prev => [...prev, { sender: 'user', text: query, timestamp: new Date() }]);
        setUserInput('');
        setSuggestedActions([]);
        setIsTyping(true);
        
        if (conversationState !== 'IDLE') {
            await handleTicketCreation(query);
        } else {
            await getAIResponse(query);
        }
    };
    
    const getAIResponse = async (query) => {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GOOGLE_AI_API_KEY_HERE") {
            setMessages(prev => [...prev, { sender: 'bot', text: "API Key not found. Please add your Google AI API key.", timestamp: new Date() }]);
            setIsTyping(false);
            return;
        }

        try {
            const fullPrompt = `Knowledge Base:\n${KNOWLEDGE_BASE}\n\nUser's question: "${query}"`;
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
            const payload = {
                contents: [{ parts: [{ text: fullPrompt }] }],
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            };

            const response = await fetchWithBackoff(apiUrl, payload);
            const result = await response.json();
            const botResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble connecting right now. Please try again.";
            
            const sourceMatch = botResponseText.match(/Source: (KB\d+)/);
            const newBotMessage = {
                sender: 'bot',
                text: botResponseText,
                timestamp: new Date(),
                metadata: { source: sourceMatch ? sourceMatch[1] : null }
            };

            setMessages(prev => [...prev, newBotMessage]);

            if (botResponseText.includes('[INITIATE_TICKET]')) {
                startTicketFlow();
            }

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I encountered an error. Please try again.", timestamp: new Date() }]);
        } finally {
            setIsTyping(false);
        }
    };

    const startTicketFlow = () => {
        setConversationState('AWAITING_SUMMARY');
        setTimeout(() => {
            setMessages(prev => [...prev, {
                sender: 'bot',
                text: "I can certainly create a ticket for you. 👍 First, could you please provide a one-sentence summary of the issue?",
                timestamp: new Date()
            }]);
        }, 500);
    };

    const handleTicketCreation = async (userInput) => {
        setIsTyping(false);
        let newBotMessage = {};
        
        if (conversationState === 'AWAITING_SUMMARY') {
            setTicketDetails({ summary: userInput });
            setConversationState('AWAITING_CATEGORY');
            newBotMessage = { sender: 'bot', text: `Got it. What category does this fall under?`, timestamp: new Date() };
            setSuggestedActions(["Hardware", "Software", "Account", "Network"]);
        } else if (conversationState === 'AWAITING_CATEGORY') {
            setTicketDetails(prev => ({ ...prev, category: userInput }));
            setConversationState('AWAITING_URGENCY');
            newBotMessage = { sender: 'bot', text: `Perfect. And what's the urgency level?`, timestamp: new Date() };
            setSuggestedActions(["Low", "Medium", "High"]);
        } else if (conversationState === 'AWAITING_URGENCY') {
            setTicketDetails(prev => ({ ...prev, urgency: userInput }));
            await finalizeTicket({ ...ticketDetails, urgency: userInput });
            return;
        }
        
        setMessages(prev => [...prev, newBotMessage]);
    };
    
    const finalizeTicket = async (finalDetails) => {
        setIsTyping(true);
        const prompt = `A user has provided the following details for an IT ticket: Summary: "${finalDetails.summary}", Category: "${finalDetails.category}", Urgency: "${finalDetails.urgency}". Confirm that the ticket has been created and include the command [TICKET_CREATED].`;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
        const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] } };
        
        try {
            const response = await fetchWithBackoff(apiUrl, payload);
            const result = await response.json();
            const botResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (botResponseText && botResponseText.includes('[TICKET_CREATED]')) {
                const ticketId = `IT${Math.floor(10000 + Math.random() * 90000)}`;
                const confirmationMsg = `Excellent! I've created ticket **${ticketId}** for you with the following details:\n- **Summary:** ${finalDetails.summary}\n- **Category:** ${finalDetails.category}\n- **Urgency:** ${finalDetails.urgency}\n\nThe IT team will be in touch soon. Is there anything else I can help with?`;
                setMessages(prev => [...prev, { sender: 'bot', text: confirmationMsg, timestamp: new Date() }]);
            } else {
                setMessages(prev => [...prev, { sender: 'bot', text: "There was an issue creating the ticket, please try again.", timestamp: new Date() }]);
            }
        } catch (error) {
             setMessages(prev => [...prev, { sender: 'bot', text: "There was an error finalizing your ticket. Please try again.", timestamp: new Date() }]);
        } finally {
            setConversationState('IDLE');
            setTicketDetails({});
            setIsTyping(false);
            setTimeout(() => setSuggestedActions(["VPN Access", "Password Reset", "Printer Setup"]), 1000);
        }
    };

    const fetchWithBackoff = async (url, payload, maxAttempts = 5) => {
        let delay = 1000;
        for (let i = 0; i < maxAttempts; i++) {
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (response.ok) return response;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
        throw new Error(`API call failed after ${maxAttempts} attempts.`);
    };

    // --- JSX Rendering ---
    return (
        <>
            <style>{`
                :root {
                    --bg-main: #f5f7fa; --bg-container: #ffffff; --text-primary: #1f2937; --text-secondary: #6b7280;
                    --border-color: #e5e7eb; --header-bg: #1f2937; --header-text: #ffffff; --user-bubble: #2563eb;
                    --bot-bubble: #f3f4f6; --input-bg: #ffffff; --shadow-color: rgba(0,0,0,0.1); --suggested-bg: #ffffff;
                    --suggested-hover: #f9fafb; --icon-color: #9ca3af;
                }
                body.dark {
                    --bg-main: #111827; --bg-container: #1f2937; --text-primary: #f9fafb; --text-secondary: #9ca3af;
                    --border-color: #374151; --header-bg: #111827; --header-text: #f9fafb; --user-bubble: #2563eb;
                    --bot-bubble: #374151; --input-bg: #374151; --shadow-color: rgba(0,0,0,0.25); --suggested-bg: #374151;
                    --suggested-hover: #4b5563; --icon-color: #6b7280;
                }
                body { font-family: 'Inter', sans-serif; background: var(--bg-main); transition: background-color 0.3s ease; }
                .chat-container::-webkit-scrollbar { width: 6px; }
                .chat-container::-webkit-scrollbar-thumb { background-color: #a0aec0; border-radius: 3px; }
                .message-bubble { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            `}</style>
            
            <div className={`flex items-center justify-center min-h-screen font-sans bg-[var(--bg-main)]`}>
                <div className="w-full max-w-2xl h-[95vh] flex flex-col bg-[var(--bg-container)] rounded-2xl shadow-2xl m-4 border border-[var(--border-color)] transition-colors duration-300" style={{boxShadow: `0 10px 25px -5px var(--shadow-color), 0 10px 10px -5px var(--shadow-color)`}}>
                    <Header onToggleTheme={toggleTheme} onClearChat={initializeChat} currentTheme={theme} />
                    
                    <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto chat-container">
                        {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                        {isTyping && <TypingIndicator />}
                    </div>
                    
                    <div className="px-6 pb-2 flex flex-wrap gap-2">
                        {suggestedActions.map((action, index) => (
                            <button key={index} onClick={() => { setUserInput(action); setTimeout(handleSendMessage, 0); }} className="bg-[var(--suggested-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] text-sm px-3 py-1 rounded-full hover:bg-[var(--suggested-hover)] transition-all duration-200 ease-in-out hover:shadow-md hover:-translate-y-px">
                                {action}
                            </button>
                        ))}
                    </div>

                    <Footer userInput={userInput} onUserInput={setUserInput} onSendMessage={handleSendMessage} />
                </div>
            </div>
        </>
    );
};

// --- Child Components ---

const Header = ({ onToggleTheme, onClearChat, currentTheme }) => (
    <header className="bg-[var(--header-bg)] text-[var(--header-text)] p-4 rounded-t-2xl flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center">
             <svg className="w-8 h-8 mr-3 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 01-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 013.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 013.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 01-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.5 21.75l-.398-1.178a3.375 3.375 0 00-2.455-2.456L12.75 18l1.178-.398a3.375 3.375 0 002.455-2.456L16.5 14.25l.398 1.178a3.375 3.375 0 002.456 2.456L20.25 18l-1.178.398a3.375 3.375 0 00-2.456 2.456z" /></svg>
            <div>
                <h1 className="text-xl font-bold">CGCian-GPT</h1>
                <p className="text-sm text-[var(--text-secondary)]">Advanced AI Helpdesk (React)</p>
            </div>
        </div>
        <div className="flex items-center space-x-3">
            <button onClick={onToggleTheme} title="Toggle Theme" className="text-[var(--text-secondary)] hover:text-[var(--header-text)] transition">
                {currentTheme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <button onClick={onClearChat} title="Clear Conversation" className="text-[var(--text-secondary)] hover:text-[var(--header-text)] transition"><TrashIcon /></button>
        </div>
    </header>
);

const Footer = ({ userInput, onUserInput, onSendMessage }) => (
    <footer className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-container)] rounded-b-2xl flex-shrink-0 transition-colors duration-300">
        <div className="flex items-center space-x-3">
            <input type="text" value={userInput} onChange={e => onUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSendMessage()} className="flex-1 px-4 py-3 border border-[var(--border-color)] rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-[var(--input-bg)] text-[var(--text-primary)]" placeholder="How can I help you today?" />
            <button onClick={onSendMessage} className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 shadow-lg hover:shadow-xl hover:-translate-y-px"><SendIcon /></button>
        </div>
    </footer>
);

const ChatMessage = ({ message }) => {
    const { sender, text, metadata, timestamp } = message;
    const isUser = sender === 'user';
    const bubbleContent = text.replace(/\[[^\]]+\]/g, '').trim();

    // Simple markdown to HTML parser
    const ParsedContent = () => {
        let html = bubbleContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\n- (.*?)/g, '</li><li class="ml-4 list-disc">$1'); // List items
        
        // Handle code blocks
        const codeBlocks = [];
        html = html.replace(/`([^`]+)`/g, (match, code) => {
            const id = `code-${codeBlocks.length}`;
            codeBlocks.push({ id, code });
            return `<code-placeholder id="${id}"></code-placeholder>`;
        });

        const parts = html.split(/(<code-placeholder.*?>)/);
        return (
            <div className="text-[var(--text-primary)]">
                {parts.map((part, index) => {
                    const match = part.match(/<code-placeholder id="(.*?)"><\/code-placeholder>/);
                    if (match) {
                        const id = match[1];
                        const codeBlock = codeBlocks.find(cb => cb.id === id);
                        return <CodeBlock key={index} code={codeBlock.code} />;
                    }
                    return <p key={index} className="inline" dangerouslySetInnerHTML={{ __html: part.replace(/^<\/li>/, '') }} />;
                })}
            </div>
        );
    };

    return (
        <div className={`flex mb-4 message-bubble ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md lg:max-w-xl`}>
                <div className={`p-4 rounded-2xl shadow-sm ${isUser ? 'bg-[var(--user-bubble)] text-white' : 'bg-[var(--bot-bubble)]'}`}>
                    <ParsedContent />
                    {metadata?.source && <p className="text-xs text-[var(--text-secondary)] mt-2 opacity-75">Source: {metadata.source}</p>}
                </div>
                <p className={`text-xs text-[var(--text-secondary)] mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
                    {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
};

const CodeBlock = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <div className="my-2 bg-gray-900/80 rounded-lg p-3 relative font-mono text-sm">
            <pre className="whitespace-pre-wrap text-white">{code}</pre>
            <button onClick={handleCopy} className="absolute top-2 right-2 p-1 bg-gray-700/50 rounded-md hover:bg-gray-600/50 transition text-white">
                {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
        </div>
    );
};

const TypingIndicator = () => (
    <div className="flex mb-4 justify-start message-bubble">
        <div className="max-w-md p-3 rounded-2xl shadow-sm bg-[var(--bot-bubble)] flex items-center space-x-1.5">
            <span className="block w-2 h-2 bg-[var(--icon-color)] rounded-full animate-bounce" style={{ animationDelay: '-0.32s' }}></span>
            <span className="block w-2 h-2 bg-[var(--icon-color)] rounded-full animate-bounce" style={{ animationDelay: '-0.16s' }}></span>
            <span className="block w-2 h-2 bg-[var(--icon-color)] rounded-full animate-bounce"></span>
        </div>
    </div>
);

// --- SVG Icons ---
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const SendIcon = () => <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;

export default App;

