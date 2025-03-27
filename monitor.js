import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const url = 'https://b-u.ac.in/'; // Change to your target website
const SEO_THRESHOLD = 60; // Minimum acceptable SEO score

async function analyzeWebsite() {
    const chrome = await launch({ chromeFlags: ['--headless'] });
    const options = { logLevel: 'info', output: 'json', port: chrome.port };
    const result = await lighthouse(url, options);
    await chrome.kill();

    const seoScore = result.lhr.categories.seo.score * 100;
    console.log(`🔍 SEO Score: ${seoScore}`);

    if (seoScore < SEO_THRESHOLD) {
        const message = `🚨 Warning! Your website's SEO score dropped to ${seoScore}%. Check and fix meta tags!`;
        sendEmailAlert(message);
        sendWhatsAppAlert(message);
        sendTelegramAlert(message);
    }
}

async function sendEmailAlert(message) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'recipient@example.com', // Change this
        subject: '🚨 SEO Alert: Low Score Detected!',
        text: message
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('📧 Email alert sent successfully.');
    } catch (error) {
        console.error('❌ Email alert failed:', error);
    }
}

async function sendWhatsAppAlert(message) {
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

    try {
        await client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_PHONE}`,
            to: `whatsapp:${process.env.RECIPIENT_PHONE}`
        });
        console.log('📲 WhatsApp alert sent successfully.');
    } catch (error) {
        console.error('❌ WhatsApp alert failed:', error);
    }
}

async function sendTelegramAlert(message) {
    try {
        await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message
        });
        console.log('🤖 Telegram alert sent successfully.');
    } catch (error) {
        console.error('❌ Telegram alert failed:', error);
    }
}

// Run the analysis
analyzeWebsite();
