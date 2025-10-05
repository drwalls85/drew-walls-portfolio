const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fetch = require('node-fetch');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Validate port
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    console.error('Invalid PORT configuration');
    process.exit(1);
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Compression
app.use(compression());

// Logging
app.use(morgan(isDev ? 'dev' : 'combined'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: isDev ? 0 : '1d',
    etag: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields required' });
    }
    
    try {
        // Forward to Formspree
        const formspreeResponse = await fetch('https://formspree.io/f/xwprgply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                message,
                _subject: `Portfolio Contact: ${name}`
            })
        });

        if (formspreeResponse.ok) {
            console.log('Contact form submission sent to Formspree:', { name, email });
            res.status(200).json({ success: true, message: 'Message sent successfully!' });
        } else {
            const error = await formspreeResponse.text();
            console.error('Formspree error:', error);
            res.status(500).json({ error: 'Failed to send message. Please try again.' });
        }
    } catch (error) {
        console.error('Error sending to Formspree:', error);
        res.status(500).json({ error: 'Network error. Please try again.' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 - Page Not Found</title>
            <style>
                body {
                    font-family: 'Roboto', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #4a90e2, #9b59b6);
                    color: white;
                    text-align: center;
                }
                h1 { font-size: 6em; margin: 0; }
                p { font-size: 1.5em; }
                a { color: white; text-decoration: underline; }
            </style>
        </head>
        <body>
            <div>
                <h1>404</h1>
                <p>Page not found</p>
                <a href="/">Return to homepage</a>
            </div>
        </body>
        </html>
    `);
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: isDev ? err.message : 'Internal server error'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
    console.log(`🔒 Environment: ${isDev ? 'development' : 'production'}`);
});

// Graceful shutdown
const shutdown = (signal) => {
    console.log(`\n${signal} received, closing server gracefully...`);
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
    
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;
// Deployment fix
